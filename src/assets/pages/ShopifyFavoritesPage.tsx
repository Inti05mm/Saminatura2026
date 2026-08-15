import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Check,
  Heart,
  ShoppingCart,
  Square,
  SquareCheckBig,
  X,
} from "lucide-react";

import {
  getAllShopifyProducts,
  type ShopifyCatalogProduct,
} from "../../shopifyCatalog";

import {
  useShopifyFavorites,
} from "../containers/ShopifyFavoritesContext";

import {
  useShopifyCart,
} from "../containers/ShopifyCartContext";

import Header from "../containers/Header";
import Footer from "../containers/Footer";

type ShopifyFavoriteVariant = {
  variantId: string;
  productId: string;
  handle: string;

  name: string;
  brand: string;

  price: number;
  old_price:
    | number
    | null;

  img:
    | string
    | null;

  stock:
    | number
    | null;

  availableForSale:
    boolean;

  variantTitle:
    | string
    | null;
};

function cleanVariantTitle(
  value:
    | string
    | null
    | undefined
) {
  const text =
    String(
      value ?? ""
    ).trim();

  if (
    !text ||
    text.toLowerCase() ===
      "default title"
  ) {
    return null;
  }

  return text;
}

function fullProductName(
  product:
    ShopifyFavoriteVariant
) {
  return [
    product.name,
    product.variantTitle,
  ]
    .filter(Boolean)
    .join(" · ");
}

function mapFavoriteVariants(
  product:
    ShopifyCatalogProduct
):
  ShopifyFavoriteVariant[] {
  return (
    product.variants.nodes ??
    []
  ).map(
    (
      variant
    ) => ({
      variantId:
        variant.id,

      productId:
        product.id,

      handle:
        product.handle,

      name:
        product.title ??
        "",

      brand:
        product.vendor ??
        "",

      price:
        Number(
          variant.price
            .amount ??
            0
        ),

      old_price:
        variant
          .compareAtPrice
          ?.amount != null
          ? Number(
              variant
                .compareAtPrice
                .amount
            )
          : null,

      img:
        variant.image
          ?.url ??
        product
          .featuredImage
          ?.url ??
        null,

      stock:
        variant
          .quantityAvailable ??
        null,

      availableForSale:
        Boolean(
          variant
            .availableForSale
        ),

      variantTitle:
        cleanVariantTitle(
          variant.title
        ),
    })
  );
}

function isOutOfStock(
  product:
    ShopifyFavoriteVariant
) {
  return (
    !product.availableForSale ||
    (
      product.stock !==
        null &&
      product.stock <=
        0
    )
  );
}

export default function ShopifyFavoritesPage() {
  const navigate =
    useNavigate();

  const {
    favorites,
    loading:
      favoritesLoading,
    removeFavorite,
  } =
    useShopifyFavorites();

  const {
    addToCart,
    loading:
      cartLoading,
  } =
    useShopifyCart();

  const [
    products,
    setProducts,
  ] =
    useState<
      ShopifyFavoriteVariant[]
    >([]);

  const [
    loadingProducts,
    setLoadingProducts,
  ] =
    useState(true);

  const [
    productToRemove,
    setProductToRemove,
  ] =
    useState<
      ShopifyFavoriteVariant | null
    >(null);

  const [
    removing,
    setRemoving,
  ] =
    useState(false);

  const [
    addedMap,
    setAddedMap,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});

  /* ============================================================
     SELECCIÓN MÚLTIPLE
     ============================================================ */

  const [
    selectionMode,
    setSelectionMode,
  ] =
    useState(false);

  const [
    selectedVariantIds,
    setSelectedVariantIds,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );

  const [
    bulkProcessing,
    setBulkProcessing,
  ] =
    useState(false);

  const [
    bulkMessage,
    setBulkMessage,
  ] =
    useState<
      string | null
    >(null);

  const favoriteVariantIds =
    useMemo(
      () =>
        favorites.map(
          (
            favorite
          ) =>
            favorite.variant_id
        ),
      [favorites]
    );

  const selectedCount =
    selectedVariantIds.size;

  const availableProducts =
    useMemo(
      () =>
        products.filter(
          (
            product
          ) =>
            !isOutOfStock(
              product
            )
        ),
      [products]
    );

  const selectedProducts =
    useMemo(
      () =>
        products.filter(
          (
            product
          ) =>
            selectedVariantIds.has(
              product.variantId
            )
        ),
      [
        products,
        selectedVariantIds,
      ]
    );

  const selectedAvailableProducts =
    useMemo(
      () =>
        selectedProducts.filter(
          (
            product
          ) =>
            !isOutOfStock(
              product
            )
        ),
      [selectedProducts]
    );

  /* ============================================================
     CARGA FAVORITOS
     ============================================================ */

  useEffect(() => {
    let alive = true;

    const load =
      async () => {
        if (
          favoritesLoading
        ) {
          return;
        }

        if (
          favoriteVariantIds.length ===
          0
        ) {
          if (alive) {
            setProducts(
              []
            );

            setSelectedVariantIds(
              new Set()
            );

            setSelectionMode(
              false
            );

            setLoadingProducts(
              false
            );
          }

          return;
        }

        setLoadingProducts(
          true
        );

        try {
          const all =
            await getAllShopifyProducts();

          if (!alive) {
            return;
          }

          const byVariantId =
            new Map<
              string,
              ShopifyFavoriteVariant
            >();

          for (
            const product
            of all
          ) {
            for (
              const variant
              of mapFavoriteVariants(
                product
              )
            ) {
              if (
                favoriteVariantIds.includes(
                  variant.variantId
                )
              ) {
                byVariantId.set(
                  variant.variantId,
                  variant
                );
              }
            }
          }

          const ordered =
            favoriteVariantIds
              .map(
                (variantId) =>
                  byVariantId.get(
                    variantId
                  )
              )
              .filter(
                (
                  product
                ): product is ShopifyFavoriteVariant =>
                  Boolean(
                    product
                  )
              );

          setProducts(
            ordered
          );

          /*
            Si se eliminó un favorito mientras
            estábamos seleccionando, lo quitamos
            también de la selección.
          */
          setSelectedVariantIds(
            (
              current
            ) => {
              const next =
                new Set<string>();

              for (
                const id
                of current
              ) {
                if (
                  ordered.some(
                    (
                      product
                    ) =>
                      product.variantId ===
                      id
                  )
                ) {
                  next.add(
                    id
                  );
                }
              }

              return next;
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Error cargando variantes favoritas Shopify:",
            error
          );

          if (alive) {
            setProducts(
              []
            );
          }
        } finally {
          if (alive) {
            setLoadingProducts(
              false
            );
          }
        }
      };

    void load();

    return () => {
      alive = false;
    };
  }, [
    favoriteVariantIds,
    favoritesLoading,
  ]);

  useEffect(() => {
    if (
      !bulkMessage
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setBulkMessage(
            null
          );
        },
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    bulkMessage,
  ]);

  /* ============================================================
     PRODUCTO
     ============================================================ */

  const openProduct = (
    product:
      ShopifyFavoriteVariant
  ) => {
    if (
      selectionMode
    ) {
      toggleSelection(
        product
      );

      return;
    }

    navigate(
      `/tienda/${product.handle}`
    );
  };

  /* ============================================================
     SELECCIONAR
     ============================================================ */

  const startSelectionMode =
    () => {
      setBulkMessage(
        null
      );

      setSelectedVariantIds(
        new Set()
      );

      setSelectionMode(
        true
      );
    };

  const cancelSelectionMode =
    () => {
      if (
        bulkProcessing
      ) {
        return;
      }

      setSelectedVariantIds(
        new Set()
      );

      setSelectionMode(
        false
      );

      setBulkMessage(
        null
      );
    };

  const toggleSelection = (
    product:
      ShopifyFavoriteVariant
  ) => {
    if (
      bulkProcessing
    ) {
      return;
    }

    /*
      Los agotados no se pueden mover
      a la cesta, así que no permitimos
      seleccionarlos.
    */
    if (
      isOutOfStock(
        product
      )
    ) {
      setBulkMessage(
        "Este producto está agotado y no se puede seleccionar para moverlo a la cesta."
      );

      return;
    }

    setSelectedVariantIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            product.variantId
          )
        ) {
          next.delete(
            product.variantId
          );
        } else {
          next.add(
            product.variantId
          );
        }

        return next;
      }
    );
  };

  /* ============================================================
     AÑADIR UNO
     ============================================================ */

  const handleAddToCart =
    async (
      product:
        ShopifyFavoriteVariant
    ) => {
      const outOfStock =
        isOutOfStock(
          product
        );

      if (
        outOfStock ||
        cartLoading ||
        bulkProcessing
      ) {
        return;
      }

      try {
        await addToCart(
          product.variantId,
          1
        );

        setAddedMap(
          (
            current
          ) => ({
            ...current,

            [product.variantId]:
              true,
          })
        );

        window.setTimeout(
          () => {
            setAddedMap(
              (
                current
              ) => ({
                ...current,

                [product.variantId]:
                  false,
              })
            );
          },
          1200
        );
      } catch (
        error
      ) {
        console.error(
          "Error añadiendo favorito a cesta Shopify:",
          error
        );
      }
    };

  /* ============================================================
     AÑADIR TODOS
     Mantiene los productos en favoritos.
     ============================================================ */

  const handleAddAllToCart =
    async () => {
      if (
        bulkProcessing ||
        cartLoading ||
        availableProducts.length ===
          0
      ) {
        return;
      }

      setBulkProcessing(
        true
      );

      setBulkMessage(
        null
      );

      let added =
        0;

      try {
        /*
          Secuencial para no lanzar varias
          mutaciones de carrito simultáneas.
        */
        for (
          const product
          of availableProducts
        ) {
          try {
            await addToCart(
              product.variantId,
              1
            );

            added +=
              1;

            setAddedMap(
              (
                current
              ) => ({
                ...current,

                [product.variantId]:
                  true,
              })
            );
          } catch (
            error
          ) {
            console.error(
              `No se pudo añadir ${fullProductName(
                product
              )}:`,
              error
            );
          }
        }

        if (
          added > 0
        ) {
          setBulkMessage(
            added ===
              availableProducts.length
              ? `Se han añadido ${added} producto${added === 1 ? "" : "s"} a la cesta.`
              : `Se han añadido ${added} de ${availableProducts.length} productos disponibles.`
          );
        } else {
          setBulkMessage(
            "No se pudo añadir ningún producto a la cesta."
          );
        }

        window.setTimeout(
          () => {
            setAddedMap(
              {}
            );
          },
          1400
        );
      } finally {
        setBulkProcessing(
          false
        );
      }
    };

  /* ============================================================
     MOVER SELECCIONADOS A CESTA
     Añade a cesta y, si se añade correctamente,
     lo elimina de favoritos.
     ============================================================ */

  const handleMoveSelectedToCart =
    async () => {
      if (
        bulkProcessing ||
        cartLoading ||
        selectedAvailableProducts.length ===
          0
      ) {
        return;
      }

      setBulkProcessing(
        true
      );

      setBulkMessage(
        null
      );

      const successfullyMoved:
        string[] =
        [];

      try {
        for (
          const product
          of selectedAvailableProducts
        ) {
          try {
            /*
              Primero añadimos.
              Solo si funciona lo quitamos
              de favoritos.
            */
            await addToCart(
              product.variantId,
              1
            );

            await removeFavorite(
              product.variantId
            );

            successfullyMoved.push(
              product.variantId
            );
          } catch (
            error
          ) {
            console.error(
              `No se pudo mover ${fullProductName(
                product
              )}:`,
              error
            );
          }
        }

        if (
          successfullyMoved.length >
          0
        ) {
          setSelectedVariantIds(
            (
              current
            ) => {
              const next =
                new Set(
                  current
                );

              for (
                const id
                of successfullyMoved
              ) {
                next.delete(
                  id
                );
              }

              return next;
            }
          );

          setBulkMessage(
            `Se han movido ${successfullyMoved.length} producto${successfullyMoved.length === 1 ? "" : "s"} a la cesta.`
          );

          /*
            Si todos los seleccionados
            se movieron correctamente,
            salimos del modo selección.
          */
          if (
            successfullyMoved.length ===
            selectedAvailableProducts.length
          ) {
            setSelectionMode(
              false
            );

            setSelectedVariantIds(
              new Set()
            );
          }
        } else {
          setBulkMessage(
            "No se pudo mover ningún producto a la cesta."
          );
        }
      } finally {
        setBulkProcessing(
          false
        );
      }
    };

  /* ============================================================
     QUITAR FAVORITO
     ============================================================ */

  const closeRemoveConfirm =
    () => {
      if (
        removing
      ) {
        return;
      }

      setProductToRemove(
        null
      );
    };

  const confirmRemove =
    async () => {
      if (
        !productToRemove ||
        removing
      ) {
        return;
      }

      setRemoving(
        true
      );

      try {
        await removeFavorite(
          productToRemove.variantId
        );

        setSelectedVariantIds(
          (
            current
          ) => {
            const next =
              new Set(
                current
              );

            next.delete(
              productToRemove.variantId
            );

            return next;
          }
        );

        setProductToRemove(
          null
        );
      } catch (
        error
      ) {
        console.error(
          "Error eliminando favorito Shopify:",
          error
        );
      } finally {
        setRemoving(
          false
        );
      }
    };

  const loading =
    favoritesLoading ||
    loadingProducts;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="gris flex min-h-screen flex-col">
        <Header />

        <section className="flex-1 bg-[#f7f5ef] px-4 py-12">
          <div className="mx-auto max-w-7xl">
            {/* ================================================= */}
            {/* CABECERA */}
            {/* ================================================= */}

            <div className="mb-8">
              <div className="text-center">
                <h1 className="text-3xl font-semibold text-[#2f3a1f]">
                  Mis favoritos
                </h1>

                <p className="mt-2 text-sm text-gray-600">
                  Guarda exactamente la variante que te interesa: sabor, tamaño o formato.
                </p>
              </div>

              {!loading &&
                products.length >
                  0 && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {!selectionMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            void handleAddAllToCart();
                          }}
                          disabled={
                            bulkProcessing ||
                            cartLoading ||
                            availableProducts.length ===
                              0
                          }
                          className="
                            inline-flex items-center justify-center
                            gap-2 rounded-full
                            bg-[#425530]
                            px-5 py-2.5
                            text-sm font-semibold
                            text-white
                            shadow-sm
                            transition
                            hover:-translate-y-0.5
                            hover:bg-[#344426]
                            hover:shadow-md
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <ShoppingCart className="h-4 w-4" />

                          {bulkProcessing
                            ? "Añadiendo…"
                            : "Añadir todo a cesta"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            startSelectionMode
                          }
                          disabled={
                            bulkProcessing
                          }
                          className="
                            inline-flex items-center justify-center
                            gap-2 rounded-full
                            border border-[#b8c3a7]
                            bg-white
                            px-5 py-2.5
                            text-sm font-semibold
                            text-[#425530]
                            shadow-sm
                            transition
                            hover:-translate-y-0.5
                            hover:border-[#425530]
                            hover:shadow-md
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <SquareCheckBig className="h-4 w-4" />

                          Seleccionar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={
                            cancelSelectionMode
                          }
                          disabled={
                            bulkProcessing
                          }
                          className="
                            inline-flex items-center justify-center
                            gap-2 rounded-full
                            border border-gray-300
                            bg-white
                            px-5 py-2.5
                            text-sm font-semibold
                            text-gray-700
                            shadow-sm
                            transition
                            hover:bg-gray-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <X className="h-4 w-4" />

                          Cancelar
                        </button>

                        {selectedCount >
                          0 && (
                          <button
                            type="button"
                            onClick={() => {
                              void handleMoveSelectedToCart();
                            }}
                            disabled={
                              bulkProcessing ||
                              cartLoading ||
                              selectedAvailableProducts.length ===
                                0
                            }
                            className="
                              inline-flex items-center justify-center
                              gap-2 rounded-full
                              bg-[#425530]
                              px-5 py-2.5
                              text-sm font-semibold
                              text-white
                              shadow-sm
                              transition
                              hover:-translate-y-0.5
                              hover:bg-[#344426]
                              hover:shadow-md
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            <ShoppingCart className="h-4 w-4" />

                            {bulkProcessing
                              ? "Moviendo…"
                              : `Mover a cesta (${selectedCount})`}
                          </button>
                        )}

                        <span className="text-sm font-medium text-gray-500">
                          {selectedCount ===
                          0
                            ? "Selecciona los productos que quieras mover"
                            : `${selectedCount} seleccionado${selectedCount === 1 ? "" : "s"}`}
                        </span>
                      </>
                    )}
                  </div>
                )}

              {bulkMessage && (
                <div
                  className="
                    mx-auto mt-4
                    max-w-2xl
                    rounded-2xl
                    border border-[#d9dfcf]
                    bg-white
                    px-4 py-3
                    text-center
                    text-sm
                    text-[#425530]
                    shadow-sm
                  "
                >
                  {
                    bulkMessage
                  }
                </div>
              )}
            </div>

            {/* ================================================= */}
            {/* CONTENIDO */}
            {/* ================================================= */}

            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <p className="text-center text-[#425530]">
                  Cargando favoritos…
                </p>
              </div>
            ) : products.length ===
              0 ? (
              <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
                <Heart className="mx-auto h-10 w-10 text-[#8c3342]" />

                <h2 className="mt-4 text-xl font-semibold text-[#2f3a1f]">
                  Todavía no tienes favoritos
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Pulsa el corazón de cualquier variante para guardarla.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/tienda"
                    )
                  }
                  className="mt-6 rounded-full bg-[#425530] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#344426]"
                >
                  Ver productos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map(
                  (
                    product
                  ) => {
                    const displayName =
                      fullProductName(
                        product
                      );

                    const outOfStock =
                      isOutOfStock(
                        product
                      );

                    const selected =
                      selectedVariantIds.has(
                        product.variantId
                      );

                    return (
                      <article
                        key={
                          product.variantId
                        }
                        className={[
                          "relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200",

                          selectionMode
                            ? selected
                              ? "ring-2 ring-[#425530] shadow-lg"
                              : "hover:shadow-md"
                            : "hover:-translate-y-1 hover:shadow-lg",

                          selectionMode &&
                          !outOfStock
                            ? "cursor-pointer"
                            : "",
                        ].join(
                          " "
                        )}
                        onClick={() => {
                          if (
                            selectionMode
                          ) {
                            toggleSelection(
                              product
                            );
                          }
                        }}
                      >
                        {/* ======================================= */}
                        {/* CORAZÓN / SELECCIÓN */}
                        {/* ======================================= */}

                        {!selectionMode ? (
                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setProductToRemove(
                                product
                              );
                            }}
                            className="
                              absolute right-3 top-3 z-10
                              flex h-10 w-10
                              items-center justify-center
                              rounded-full
                              border border-[#8c3342]/25
                              bg-[#fff1f3]
                              text-[#8c3342]
                              shadow-md
                              transition
                              hover:scale-110
                              hover:bg-[#ffe5e9]
                            "
                            aria-label="Eliminar de favoritos"
                            title="Eliminar de favoritos"
                          >
                            <Heart className="h-5 w-5 fill-current text-current" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              toggleSelection(
                                product
                              );
                            }}
                            disabled={
                              outOfStock ||
                              bulkProcessing
                            }
                            className={[
                              "absolute right-3 top-3 z-10",
                              "flex h-11 w-11 items-center justify-center",
                              "rounded-full border shadow-md",
                              "transition-all duration-200",
                              selected
                                ? "border-[#425530] bg-[#425530] text-white hover:scale-110"
                                : "border-[#425530]/25 bg-white text-[#425530] hover:scale-110 hover:bg-[#f2f5ea]",
                              outOfStock
                                ? "cursor-not-allowed opacity-40"
                                : "",
                            ].join(
                              " "
                            )}
                            aria-label={
                              selected
                                ? "Quitar de la selección"
                                : "Seleccionar producto"
                            }
                            title={
                              outOfStock
                                ? "Producto agotado"
                                : selected
                                ? "Quitar de la selección"
                                : "Seleccionar"
                            }
                          >
                            {selected ? (
                              <SquareCheckBig className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        )}

                        {/* ======================================= */}
                        {/* PRODUCTO */}
                        {/* ======================================= */}

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            openProduct(
                              product
                            );
                          }}
                          className="block w-full bg-transparent p-0 text-left"
                        >
                          <div className="flex h-64 items-center justify-center p-5">
                            <img
                              src={
                                product.img?.trim()
                                  ? product.img
                                  : "https://placehold.co/600x600?text=Producto"
                              }
                              alt={
                                displayName
                              }
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          </div>

                          <div className="px-5 pt-5">
                            <p className="text-xs text-gray-500">
                              {product.brand ||
                                "Sin marca"}
                            </p>

                            <h2 className="mt-2 line-clamp-2 min-h-12 font-semibold text-gray-900">
                              {
                                displayName
                              }
                            </h2>
                          </div>
                        </button>

                        {/* ======================================= */}
                        {/* PRECIO / CESTA */}
                        {/* ======================================= */}

                        <div className="p-5 pt-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-[#2f3a1f]">
                                {product.price.toLocaleString(
                                  "es-ES",
                                  {
                                    style:
                                      "currency",
                                    currency:
                                      "EUR",
                                  }
                                )}
                              </p>

                              {product.old_price !==
                                null &&
                                product.old_price >
                                  product.price && (
                                  <del className="text-sm text-gray-400">
                                    {product.old_price.toLocaleString(
                                      "es-ES",
                                      {
                                        style:
                                          "currency",
                                        currency:
                                          "EUR",
                                      }
                                    )}
                                  </del>
                                )}
                            </div>

                            {!selectionMode ? (
                              <button
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  void handleAddToCart(
                                    product
                                  );
                                }}
                                disabled={
                                  cartLoading ||
                                  bulkProcessing ||
                                  outOfStock
                                }
                                className={[
                                  "flex min-h-[46px] min-w-[154px] shrink-0 items-center justify-center gap-[10px] rounded-full px-4 py-3 transition-all duration-300",

                                  outOfStock
                                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                                    : "cursor-pointer bg-gray-950 text-white shadow-sm hover:bg-gray-800 active:scale-95",

                                  cartLoading ||
                                  bulkProcessing
                                    ? "opacity-60"
                                    : "",
                                ].join(
                                  " "
                                )}
                              >
                                <span className="whitespace-nowrap text-[13px] font-semibold">
                                  {outOfStock
                                    ? "Agotado"
                                    : addedMap[
                                        product.variantId
                                      ]
                                    ? "Añadido"
                                    : "Añadir a la cesta"}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  toggleSelection(
                                    product
                                  );
                                }}
                                disabled={
                                  outOfStock ||
                                  bulkProcessing
                                }
                                className={[
                                  "flex min-h-[46px] min-w-[154px] shrink-0 items-center justify-center gap-2 rounded-full px-4 py-3 text-[13px] font-semibold transition-all duration-200",
                                  selected
                                    ? "bg-[#425530] text-white"
                                    : "border border-[#b8c3a7] bg-white text-[#425530]",
                                  outOfStock
                                    ? "cursor-not-allowed opacity-40"
                                    : "hover:shadow-md",
                                ].join(
                                  " "
                                )}
                              >
                                {selected ? (
                                  <>
                                    <Check className="h-4 w-4" />
                                    Seleccionado
                                  </>
                                ) : outOfStock ? (
                                  "Agotado"
                                ) : (
                                  <>
                                    <Square className="h-4 w-4" />
                                    Seleccionar
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {outOfStock && (
                            <p className="mt-2 text-xs text-red-600">
                              Agotado temporalmente
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===================================================== */}
      {/* CONFIRMAR QUITAR FAVORITO */}
      {/* ===================================================== */}

      {productToRemove && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
          onClick={
            closeRemoveConfirm
          }
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopify-favorites-remove-title"
            aria-describedby="shopify-favorites-remove-description"
            className="w-full max-w-sm rounded-3xl border border-[#ead6d9] bg-white p-6 shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f3] text-[#8c3342]">
              <Heart className="h-6 w-6 fill-current" />
            </div>

            <h2
              id="shopify-favorites-remove-title"
              className="mt-4 text-center text-xl font-semibold text-gray-950"
            >
              ¿Quitar de favoritos?
            </h2>

            <p
              id="shopify-favorites-remove-description"
              className="mt-2 text-center text-sm leading-6 text-gray-600"
            >
              Vas a eliminar
              <span className="font-semibold text-gray-900">
                {" "}
                {fullProductName(
                  productToRemove
                )}
              </span>{" "}
              de tu lista de favoritos.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={
                  closeRemoveConfirm
                }
                disabled={
                  removing
                }
                className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void confirmRemove();
                }}
                disabled={
                  removing
                }
                className="flex-1 rounded-full bg-[#8c3342] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#762a37] disabled:cursor-wait disabled:opacity-70"
              >
                {removing
                  ? "Quitando…"
                  : "Sí, quitar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}