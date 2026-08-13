import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import Header from "../containers/Header";
import Footer from "../containers/Footer";
import HeroMarcas from "../containers/HeroMarcas";

import FiltersContainer from "../containers/FilterContainer";

import type {
  Filters,
} from "../containers/FilterContainer";

import {
  useShopifyCart,
} from "../containers/ShopifyCartContext";

import {
  getAllShopifyProducts,
  type ShopifyCatalogProduct,
} from "../../shopifyCatalog";

/* ============================================================
   PRODUCTO PARA LA INTERFAZ
   ============================================================ */

type UiProduct = {
  id: string;

  slug: string;

  category: string;

  name: string;

  brand: string;

  price: number;

  old_price: number | null;

  img: string | null;

  description: string | null;

  stock: number | null;

  bio: boolean;

  vegan: boolean;

  gluten_free: boolean;

  lactose_free: boolean;

  variantId: string | null;

  variantTitle: string | null;
};

/* ============================================================
   HELPERS
   ============================================================ */

function boolValue(
  value: {
    value: string;
  } | null
) {
  return value?.value === "true";
}

/*
  Shopify utiliza "Default Title"
  cuando un producto realmente no tiene variante.

  En ese caso no queremos mostrar nada.
*/
function cleanVariantTitle(
  variantTitle:
    | string
    | null
    | undefined
) {
  const value =
    String(
      variantTitle ?? ""
    ).trim();

  if (!value) {
    return "";
  }

  if (
    value.toLowerCase() ===
    "default title"
  ) {
    return "";
  }

  return value;
}

/*
  Nombre que enseñaremos en la card.

  Ejemplos:

  "Iso Whey Zero · Chocolate · 500 g"

  "Pan tostado · Integral · 270 g"

  Si no tiene variante:

  "Magnesio Citrato"
*/
function fullProductName(
  product: UiProduct
) {
  const baseName =
    String(
      product.name ?? ""
    ).trim();

  const variant =
    cleanVariantTitle(
      product.variantTitle
    );

  if (!variant) {
    return baseName;
  }

  return `${baseName} · ${variant}`;
}

/* ============================================================
   MAP SHOPIFY → UI
   ============================================================ */

function mapShopifyProduct(
  product: ShopifyCatalogProduct
): UiProduct {
  const firstVariant =
    product.variants.nodes[0] ??
    null;

  return {
    id:
      product.id,

    slug:
      product.handle,

    category:
      product.productType ??
      "",

    name:
      product.title ??
      "",

    brand:
      product.vendor ??
      "",

    price:
      firstVariant
        ? Number(
            firstVariant
              .price
              .amount
          )
        : 0,

    old_price:
      firstVariant
        ?.compareAtPrice
        ?.amount != null
        ? Number(
            firstVariant
              .compareAtPrice
              .amount
          )
        : null,

    img:
      firstVariant
        ?.image
        ?.url ??
      product
        .featuredImage
        ?.url ??
      null,

    description:
      product.description ||
      null,

    stock:
      firstVariant
        ?.quantityAvailable ??
      null,

    bio:
      boolValue(
        product.bio
      ),

    vegan:
      boolValue(
        product.vegan
      ),

    gluten_free:
      boolValue(
        product.glutenFree
      ),

    lactose_free:
      boolValue(
        product.lactoseFree
      ),

    variantId:
      firstVariant?.id ??
      null,

    variantTitle:
      firstVariant?.title ??
      null,
  };
}

/* ============================================================
   COMPONENTE
   ============================================================ */

export default function ShopifyShopPage() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const productsRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const {
    addToCart,

    loading:
      cartLoading,
  } =
    useShopifyCart();

  const [
    addedVariantId,
    setAddedVariantId,
  ] =
    useState<string | null>(
      null
    );

  const [
    products,
    setProducts,
  ] =
    useState<UiProduct[]>(
      []
    );

  const [
    filteredProducts,
    setFilteredProducts,
  ] =
    useState<UiProduct[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMsg,
    setErrorMsg,
  ] =
    useState<string | null>(
      null
    );

  /* ============================================================
     PARÁMETROS URL
     ============================================================ */

  const urlParams =
    useMemo(
      () =>
        new URLSearchParams(
          location.search
        ),
      [
        location.search,
      ]
    );

  const urlSearch = (
    urlParams.get(
      "search"
    ) ?? ""
  )
    .trim()
    .toLowerCase();

  const urlCategory = (
    urlParams.get(
      "category"
    ) ?? ""
  ).trim();

  const urlBrand = (
    urlParams.get(
      "brand"
    ) ?? ""
  ).trim();

  /* ============================================================
     CARGAR PRODUCTOS SHOPIFY
     ============================================================ */

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(
        true
      );

      setErrorMsg(
        null
      );

      try {
        const shopifyProducts =
          await getAllShopifyProducts();

        if (!alive) {
          return;
        }

        let list =
          shopifyProducts.map(
            mapShopifyProduct
          );

        /* ========================= */
        /* BÚSQUEDA URL */
        /* ========================= */

        if (urlSearch) {
          list =
            list.filter(
              (
                product
              ) => {
                const haystack =
                  [
                    fullProductName(
                      product
                    ),

                    product.brand,

                    product.category,

                    product.description ??
                      "",
                  ]
                    .join(
                      " "
                    )
                    .toLowerCase();

                return haystack.includes(
                  urlSearch
                );
              }
            );
        }

        /* ========================= */
        /* CATEGORÍA URL */
        /* ========================= */

        if (
          urlCategory
        ) {
          list =
            list.filter(
              (
                product
              ) =>
                product.category ===
                urlCategory
            );
        }

        /* ========================= */
        /* MARCA URL */
        /* ========================= */

        if (
          urlBrand
        ) {
          list =
            list.filter(
              (
                product
              ) =>
                product.brand ===
                urlBrand
            );
        }

        setProducts(
          list
        );

        setFilteredProducts(
          list
        );
      } catch (
        error
      ) {
        console.error(
          "Error Shopify:",
          error
        );

        if (!alive) {
          return;
        }

        setProducts(
          []
        );

        setFilteredProducts(
          []
        );

        setErrorMsg(
          error instanceof
            Error
            ? error.message
            : "Error cargando Shopify"
        );
      } finally {
        if (alive) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [
    urlSearch,
    urlCategory,
    urlBrand,
  ]);

  /* ============================================================
     FILTROS
     ============================================================ */

  const applyFilters =
    (
      filters: Filters,

      shouldScroll =
        false
    ) => {
      let result = [
        ...products,
      ];

      if (
        filters.category
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.category ===
              filters.category
          );
      }

      if (
        filters.brand
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.brand ===
              filters.brand
          );
      }

      if (
        filters.priceFrom !==
        undefined
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.price >=
              filters.priceFrom!
          );
      }

      if (
        filters.priceTo !==
        undefined
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.price <=
              filters.priceTo!
          );
      }

      if (
        filters.glutenFree
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.gluten_free
          );
      }

      if (
        filters.lactoseFree
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.lactose_free
          );
      }

      if (
        filters.vegan
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.vegan
          );
      }

      if (
        filters.bio
      ) {
        result =
          result.filter(
            (
              product
            ) =>
              product.bio
          );
      }

      if (
        filters.sort ===
        "price-asc"
      ) {
        result.sort(
          (
            first,
            second
          ) =>
            first.price -
            second.price
        );
      }

      if (
        filters.sort ===
        "price-desc"
      ) {
        result.sort(
          (
            first,
            second
          ) =>
            second.price -
            first.price
        );
      }

      setFilteredProducts(
        result
      );

      if (
        shouldScroll
      ) {
        requestAnimationFrame(
          () => {
            productsRef
              .current
              ?.scrollIntoView(
                {
                  behavior:
                    "smooth",

                  block:
                    "start",
                }
              );
          }
        );
      }
    };

  /* ============================================================
     MARCAS PARA LOS FILTROS
     ============================================================ */

  const brands = [
    ...new Set(
      products
        .map(
          (
            product
          ) =>
            product.brand
        )
        .filter(
          Boolean
        )
    ),
  ];

  /* ============================================================
     AÑADIR AL CARRITO
     ============================================================ */

  const handleAddToCart =
    async (
      product: UiProduct
    ) => {
      if (
        !product.variantId
      ) {
        return;
      }

      const outOfStock =
        product.stock !==
          null &&
        product.stock <= 0;

      if (
        outOfStock ||
        cartLoading
      ) {
        return;
      }

      try {
        await addToCart(
          product.variantId,
          1
        );

        setAddedVariantId(
          product.variantId
        );

        window.setTimeout(
          () => {
            setAddedVariantId(
              null
            );
          },
          1200
        );
      } catch (
        error
      ) {
        console.error(
          "Error añadiendo a Shopify:",
          error
        );
      }
    };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <main>
      <Header />

      <HeroMarcas />

      <div className="max-w-8xl mx-auto px-4 py-8">
        {/* CARGANDO */}

        {loading && (
          <p className="text-gray-600">
            Cargando productos
            desde Shopify...
          </p>
        )}

        {/* ERROR */}

        {!loading &&
          errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-semibold">
                Error cargando
                Shopify
              </p>

              <p className="mt-1 text-sm">
                {errorMsg}
              </p>
            </div>
          )}

        {/* CONTENIDO */}

        {!loading &&
          !errorMsg && (
            <div className="mx-10 space-y-6">
              <FiltersContainer
                brands={
                  brands
                }
                onApply={
                  applyFilters
                }
              />

              <div
                id="products"
                ref={
                  productsRef
                }
                className="scroll-mt-40"
              >
                {filteredProducts.length ===
                0 ? (
                  <p className="text-gray-600">
                    No hay productos
                    con esos filtros
                  </p>
                ) : (
                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-6
                      sm:grid-cols-2
                      lg:grid-cols-4
                    "
                  >
                    {filteredProducts.map(
                      (
                        product
                      ) => {
                        const outOfStock =
                          product.stock !==
                            null &&
                          product.stock <=
                            0;

                        const isAdded =
                          addedVariantId ===
                          product.variantId;

                        const displayName =
                          fullProductName(
                            product
                          );

                        const productPath =
                          `/shopping-shopify-test/${product.slug}`;

                        return (
                          <div
                            key={
                              product.id
                            }
                            role="button"
                            tabIndex={
                              0
                            }
                            onClick={() =>
                              navigate(
                                productPath
                              )
                            }
                            onKeyDown={(
                              event
                            ) => {
                              if (
                                event.key ===
                                  "Enter" ||
                                event.key ===
                                  " "
                              ) {
                                navigate(
                                  productPath
                                );
                              }
                            }}
                            className="
                              gris
                              relative
                              flex h-full
                              cursor-pointer
                              flex-col
                              overflow-hidden
                              rounded-xl
                              shadow-md
                              transition-transform
                              duration-300
                              hover:scale-105
                            "
                          >
                            {/* ========================== */}
                            {/* SIN STOCK */}
                            {/* ========================== */}

                            {outOfStock && (
                              <div className="absolute right-3 top-3 z-20">
                                <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-white">
                                  Sin stock
                                </span>
                              </div>
                            )}

                            {/* ========================== */}
                            {/* IMAGEN */}
                            {/* ========================== */}

                            <div
                              className="
                                flex h-64
                                w-full
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-t-xl
                                bg-white
                                px-4 py-3
                              "
                            >
                              <img
                                src={
                                  product.img ??
                                  "https://placehold.co/600x600?text=IMG"
                                }
                                alt={
                                  displayName
                                }
                                className="
                                  block
                                  max-h-full
                                  max-w-full
                                  object-contain
                                  transition-transform
                                  duration-300
                                "
                                loading="lazy"
                              />
                            </div>

                            {/* ========================== */}
                            {/* INFORMACIÓN */}
                            {/* ========================== */}

                            <div
                              className="
                                flex
                                flex-1
                                flex-col
                                px-4
                                py-3
                              "
                            >
                              {/* MARCA */}

                              <span className="text-xs uppercase text-gray-400">
                                {
                                  product.brand
                                }
                              </span>

                              {/* NOMBRE + VARIANTE */}

                              <p
                                className="
                                  mt-0.5
                                  line-clamp-2
                                  text-lg
                                  font-bold
                                  leading-snug
                                  text-black
                                "
                                title={
                                  displayName
                                }
                              >
                                {
                                  displayName
                                }
                              </p>

                              {/* ========================== */}
                              {/* PRECIO */}
                              {/* ========================== */}

                              <div className="mt-2 flex items-center">
                                <p className="text-md font-semibold">
                                  €
                                  {product.price.toFixed(
                                    2
                                  )}
                                </p>

                                {product.old_price !==
                                  null &&
                                  product.old_price >
                                    product.price && (
                                    <del className="ml-2 text-sm text-gray-500">
                                      €
                                      {product.old_price.toFixed(
                                        2
                                      )}
                                    </del>
                                  )}
                              </div>

                              {/* ========================== */}
                              {/* ESPACIADOR

                                  Hace que TODOS los botones
                                  queden alineados abajo.
                                 ========================== */}

                              <div className="flex-1" />

                              {/* ========================== */}
                              {/* AÑADIR AL CARRITO */}
                              {/* ========================== */}

                              <button
                                type="button"
                                disabled={
                                  outOfStock ||
                                  cartLoading ||
                                  !product.variantId
                                }
                                onClick={(
                                  event
                                ) => {
                                  /*
                                    Evitamos abrir el
                                    detalle del producto.
                                  */
                                  event.stopPropagation();

                                  void handleAddToCart(
                                    product
                                  );
                                }}
                                className={[
                                  "mt-4 w-full",

                                  "flex items-center justify-center gap-[15px]",

                                  "rounded-[5px]",

                                  "border-none",

                                  "px-[15px] py-[10px]",

                                  "transition-all duration-[400ms]",

                                  outOfStock
                                    ? "cursor-not-allowed bg-gray-300 outline outline-3 outline-offset-[-3px] outline-gray-300"
                                    : "verde-3 cursor-pointer outline outline-3 outline-offset-[-3px] outline-[#c1ce9c]",

                                  !outOfStock &&
                                  !cartLoading
                                    ? "hover:bg-transparent"
                                    : "",

                                  cartLoading
                                    ? "opacity-60"
                                    : "",
                                ].join(
                                  " "
                                )}
                              >
                                {/* ICONO */}

                                <svg
                                  viewBox="0 0 16 16"
                                  height="24"
                                  width="24"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={[
                                    "transition-colors duration-[400ms]",

                                    outOfStock
                                      ? "fill-[#666666]"
                                      : "fill-black",
                                  ].join(
                                    " "
                                  )}
                                  aria-hidden="true"
                                >
                                  <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z" />

                                  <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                                </svg>

                                {/* TEXTO */}

                                <span
                                  className={[
                                    "text-[0.85em] font-bold",

                                    "transition-colors duration-[400ms]",

                                    outOfStock
                                      ? "text-[#666666]"
                                      : "text-black",
                                  ].join(
                                    " "
                                  )}
                                >
                                  {outOfStock
                                    ? "Sin stock"
                                    : isAdded
                                    ? "¡Añadido!"
                                    : "Añadir a la cesta"}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      <Footer />
    </main>
  );
}