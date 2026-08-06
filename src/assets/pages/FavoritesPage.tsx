import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useFavorites } from "../containers/FavoritesContext";
import { useCart } from "../containers/CartContext";
import Header from "../containers/Header";
import Footer from "../containers/Footer.tsx";

type FavoriteProduct = {
  id: number;
  slug: string | null;
  name: string;
  brand: string;
  price: number;
  old_price: number | null;
  img: string | null;
  stock: number | null;
  is_active: boolean;
  flavor: string | null;
  size: string | null;
};

function fullProductName(
  product: FavoriteProduct
) {
  return [
    product.name?.trim(),
    product.flavor?.trim(),
    product.size?.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

export default function FavoritesPage() {
  const navigate = useNavigate();

  const {
    favorites,
    loading: favoritesLoading,
    removeFavorite,
  } = useFavorites();

  const {
    addToCart,
    loading: cartLoading,
  } = useCart();

  const [products, setProducts] =
    useState<FavoriteProduct[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [
    productToRemove,
    setProductToRemove,
  ] =
    useState<FavoriteProduct | null>(
      null
    );

  const [removing, setRemoving] =
    useState(false);

  const [addedMap, setAddedMap] =
    useState<
      Record<number, boolean>
    >({});

  const favoriteIds = useMemo(
    () =>
      favorites.map(
        (favorite) =>
          favorite.product_id
      ),
    [favorites]
  );

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      if (favoritesLoading) return;

      if (favoriteIds.length === 0) {
        if (alive) {
          setProducts([]);
          setLoadingProducts(false);
        }

        return;
      }

      setLoadingProducts(true);

      const { data, error } =
        await supabase
          .from("public_products")
          .select(`
            id,
            slug,
            name,
            brand,
            price,
            old_price,
            img,
            stock,
            is_active,
            flavor,
            size
          `)
          .in("id", favoriteIds);

      if (!alive) return;

      if (error) {
        console.error(
          "Error cargando productos favoritos:",
          error
        );

        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      const byId = new Map<
        number,
        FavoriteProduct
      >();

      for (const row of data ?? []) {
        byId.set(Number(row.id), {
          id: Number(row.id),
          slug: row.slug
            ? String(row.slug)
            : null,
          name: String(
            row.name ?? ""
          ),
          brand: String(
            row.brand ?? ""
          ),
          price: Number(
            row.price ?? 0
          ),
          old_price:
            row.old_price == null
              ? null
              : Number(
                  row.old_price
                ),
          img: row.img
            ? String(row.img)
            : null,
          stock:
            row.stock == null
              ? null
              : Number(row.stock),
          is_active:
            Boolean(row.is_active),
          flavor: row.flavor
            ? String(row.flavor)
            : null,
          size: row.size
            ? String(row.size)
            : null,
        });
      }

      const ordered =
        favoriteIds
          .map((id) => byId.get(id))
          .filter(
            (
              product
            ): product is FavoriteProduct =>
              Boolean(product)
          );

      setProducts(ordered);
      setLoadingProducts(false);
    };

    void loadProducts();

    return () => {
      alive = false;
    };
  }, [
    favoriteIds,
    favoritesLoading,
  ]);

  const openProduct = (
    product: FavoriteProduct
  ) => {
    const slug = (
      product.slug ?? ""
    ).trim();

    if (slug) {
      const suffix =
        `-${product.id}`;

      const finalSlug =
        slug.endsWith(suffix)
          ? slug
          : `${slug}${suffix}`;

      navigate(
        `/shopping/${finalSlug}`
      );

      return;
    }

    navigate(
      `/shopping/${product.id}`
    );
  };

  const handleAddToCart = async (
    event: React.MouseEvent<HTMLButtonElement>,
    product: FavoriteProduct
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const outOfStock =
      product.stock !== null &&
      product.stock <= 0;

    if (
      outOfStock ||
      cartLoading
    ) {
      return;
    }

    try {
      await addToCart(
        product.id,
        1
      );

      setAddedMap((current) => ({
        ...current,
        [product.id]: true,
      }));

      window.setTimeout(() => {
        setAddedMap((current) => ({
          ...current,
          [product.id]: false,
        }));
      }, 1200);
    } catch (error) {
      console.error(
        "Error añadiendo el producto a la cesta:",
        error
      );
    }
  };

  const openRemoveConfirm = (
    event: React.MouseEvent<HTMLButtonElement>,
    product: FavoriteProduct
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setProductToRemove(
      product
    );
  };

  const closeRemoveConfirm = () => {
    if (removing) return;

    setProductToRemove(null);
  };

  const confirmRemove = async () => {
    if (
      !productToRemove ||
      removing
    ) {
      return;
    }

    setRemoving(true);

    try {
      await removeFavorite(
        productToRemove.id
      );

      setProductToRemove(null);
    } catch (error) {
      console.error(
        "Error eliminando favorito:",
        error
      );
    } finally {
      setRemoving(false);
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
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-semibold text-[#2f3a1f]">
                Mis favoritos
              </h1>

              <p className="mt-2 text-sm text-gray-600">
                Tus favoritos se guardan en tu cuenta cuando inicias sesión y, como invitado, únicamente en este navegador.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <p className="text-center text-[#425530]">
                  Cargando favoritos…
                </p>
              </div>
            ) : products.length ===
              0 ? (
              <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
                <Heart className="mx-auto h-10 w-10 text-[#8a9d76]" />

                <h2 className="mt-4 text-xl font-semibold text-[#2f3a1f]">
                  Todavía no tienes favoritos
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Pulsa el corazón de cualquier producto para guardarlo.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/shopping"
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
                  (product) => {
                    const displayName =
                      fullProductName(
                        product
                      );

                    const outOfStock =
                      product.stock !==
                        null &&
                      product.stock <= 0;

                    return (
                      <article
                        key={
                          product.id
                        }
                        onClick={() =>
                          openProduct(
                            product
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
                            openProduct(
                              product
                            );
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={(
                            event
                          ) =>
                            openRemoveConfirm(
                              event,
                              product
                            )
                          }
                          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#8c3342] bg-[#8c3342] text-white shadow-md transition hover:scale-105 hover:bg-[#762a37]"
                          aria-label="Eliminar de favoritos"
                          title="Eliminar de favoritos"
                        >
                          <Heart className="h-5 w-5 fill-current text-current" />
                        </button>

                        <div className="flex h-64 items-center justify-center p-5">
                          <img
                            src={
                              product.img?.trim()
                                ? product.img
                                : "https://via.placeholder.com/600x600?text=Producto"
                            }
                            alt={
                              displayName
                            }
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>

                        <div className="p-5">
                          <p className="text-xs text-gray-500">
                            {product.brand ||
                              "Sin marca"}
                          </p>

                          <h2 className="mt-2 line-clamp-2 min-h-12 font-semibold text-gray-900">
                            {
                              displayName
                            }
                          </h2>

                          <div className="mt-4 flex items-center justify-between gap-4">
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

                            <button
                              type="button"
                              onClick={(
                                event
                              ) => {
                                void handleAddToCart(
                                  event,
                                  product
                                );
                              }}
                              disabled={
                                cartLoading ||
                                outOfStock
                              }
                              className={[
                                "flex min-h-[46px] min-w-[154px] shrink-0 items-center justify-center gap-[10px] rounded-full px-4 py-3 transition-all duration-300",

                                outOfStock
                                  ? "cursor-not-allowed bg-gray-200 text-gray-500"
                                  : "cursor-pointer bg-gray-950 text-white shadow-sm hover:bg-gray-800 active:scale-95",

                                cartLoading
                                  ? "opacity-60"
                                  : "",
                              ].join(
                                " "
                              )}
                            >
                              <svg
                                viewBox="0 0 16 16"
                                height="21"
                                width="21"
                                xmlns="http://www.w3.org/2000/svg"
                                className={
                                  outOfStock
                                    ? "shrink-0 fill-[#666666]"
                                    : "shrink-0 fill-white"
                                }
                                aria-hidden="true"
                              >
                                <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z" />
                                <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                              </svg>

                              <span className="whitespace-nowrap text-[13px] font-semibold">
                                {outOfStock
                                  ? "Agotado"
                                  : addedMap[
                                      product
                                        .id
                                    ]
                                  ? "Añadido"
                                  : "Añadir a la cesta"}
                              </span>
                            </button>
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
            aria-labelledby="remove-favorite-title"
            aria-describedby="remove-favorite-description"
            className="w-full max-w-sm rounded-3xl border border-[#ead6d9] bg-white p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f3] text-[#8c3342]">
              <Heart className="h-6 w-6 fill-current" />
            </div>

            <h2
              id="remove-favorite-title"
              className="mt-4 text-center text-xl font-semibold text-gray-950"
            >
              ¿Quitar de favoritos?
            </h2>

            <p
              id="remove-favorite-description"
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
                disabled={removing}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void confirmRemove();
                }}
                disabled={removing}
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
