import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

type Banner = {
  id: string;
  handle: string;
  title: string | null;
  imageUrl: string;
  sortOrder: number;
  productHandle: string | null;
};

type ShopifyBannerMetaobject = {
  id: string;
  handle: string;

  titulo: {
    value: string | null;
  } | null;

  orden: {
    value: string | null;
  } | null;

  imagen: {
    reference: {
      image: {
        url: string;
        altText: string | null;
      } | null;
    } | null;
  } | null;

  productos: {
    references: {
      nodes: Array<{
        handle?: string;
      }>;
    } | null;
  } | null;
};

const SHOP_DOMAIN =
  import.meta.env
    .VITE_SHOPIFY_STORE_DOMAIN
    ?.trim();

const STOREFRONT_TOKEN =
  import.meta.env
    .VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN
    ?.trim();

const SHOPIFY_API_VERSION =
  "2026-07";

const BANNERS_QUERY = `
  query ProductBanners {
    metaobjects(
      type: "banner_de_productos"
      first: 50
    ) {
      nodes {
        id
        handle

        titulo: field(
          key: "titulo"
        ) {
          value
        }

        orden: field(
          key: "orden"
        ) {
          value
        }

        imagen: field(
          key: "imagen"
        ) {
          reference {
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
        }

        productos: field(
          key: "productos"
        ) {
          references(
            first: 100
          ) {
            nodes {
              ... on Product {
                handle
              }
            }
          }
        }
      }
    }
  }
`;

export default function ProductBanners() {
  const navigate =
    useNavigate();

  const [
    banners,
    setBanners,
  ] =
    useState<Banner[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    currentIndex,
    setCurrentIndex,
  ] =
    useState(0);

  /* ============================================================
     CARGAR BANNERS DESDE SHOPIFY
     ============================================================ */

  useEffect(() => {
    let alive =
      true;

    const loadBanners =
      async () => {
        setLoading(true);

        try {
          if (!SHOP_DOMAIN) {
            throw new Error(
              "Falta VITE_SHOPIFY_STORE_DOMAIN."
            );
          }

          if (!STOREFRONT_TOKEN) {
            throw new Error(
              "Falta VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN."
            );
          }

          const response =
            await fetch(
              `https://${SHOP_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  "X-Shopify-Storefront-Access-Token":
                    STOREFRONT_TOKEN,
                },

                body:
                  JSON.stringify({
                    query:
                      BANNERS_QUERY,
                  }),
              }
            );

          const raw =
            await response.text();

          if (!response.ok) {
            throw new Error(
              `Shopify respondió ${response.status}: ${raw}`
            );
          }

          let parsed: {
            data?: {
              metaobjects?: {
                nodes:
                  ShopifyBannerMetaobject[];
              };
            };

            errors?: Array<{
              message?: string;
            }>;
          };

          try {
            parsed =
              JSON.parse(
                raw
              );
          } catch {
            throw new Error(
              "Shopify devolvió una respuesta no válida."
            );
          }

          if (
            parsed.errors
              ?.length
          ) {
            throw new Error(
              parsed.errors
                .map(
                  (error) =>
                    error.message ??
                    "Error desconocido"
                )
                .join("\n")
            );
          }

          const nodes =
            parsed.data
              ?.metaobjects
              ?.nodes ?? [];

          const normalizedBanners =
            nodes
              .map(
                (
                  node
                ): Banner | null => {
                  const imageUrl =
                    node.imagen
                      ?.reference
                      ?.image
                      ?.url
                      ?.trim();

                  if (!imageUrl) {
                    return null;
                  }

                  const parsedOrder =
                    Number(
                      node.orden
                        ?.value ??
                        9999
                    );

                  const productHandle =
                    (
                      node.productos
                        ?.references
                        ?.nodes ??
                      []
                    )
                      .map(
                        (
                          product
                        ) =>
                          product.handle
                            ?.trim() ??
                          ""
                      )
                      .filter(
                        Boolean
                      )[0] ?? null;

                  return {
                    id:
                      node.id,

                    handle:
                      node.handle,

                    title:
                      node.titulo
                        ?.value
                        ?.trim() ||
                      null,

                    imageUrl,

                    sortOrder:
                      Number.isFinite(
                        parsedOrder
                      )
                        ? parsedOrder
                        : 9999,

                    productHandle,
                  };
                }
              )
              .filter(
                (
                  banner
                ): banner is Banner =>
                  banner !==
                  null
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  first.sortOrder -
                  second.sortOrder
              );

          if (!alive) {
            return;
          }

          setBanners(
            normalizedBanners
          );

          setCurrentIndex(
            0
          );
        } catch (error) {
          if (!alive) {
            return;
          }

          console.error(
            "Error cargando banners desde Shopify:",
            error
          );

          setBanners([]);
        } finally {
          if (alive) {
            setLoading(
              false
            );
          }
        }
      };

    void loadBanners();

    return () => {
      alive =
        false;
    };
  }, []);

  /* ============================================================
     PRECARGAR IMÁGENES
     ============================================================ */

  useEffect(() => {
    if (
      banners.length ===
      0
    ) {
      return;
    }

    banners.forEach(
      (
        banner
      ) => {
        const image =
          new Image();

        image.src =
          banner.imageUrl;
      }
    );
  }, [
    banners,
  ]);

  /* ============================================================
     AJUSTAR ÍNDICE
     ============================================================ */

  useEffect(() => {
    if (
      banners.length ===
      0
    ) {
      setCurrentIndex(
        0
      );

      return;
    }

    setCurrentIndex(
      (
        current
      ) =>
        Math.min(
          current,
          banners.length -
            1
        )
    );
  }, [
    banners.length,
  ]);

  /* ============================================================
     AUTOPLAY
     ============================================================ */

  useEffect(() => {
    if (
      banners.length <=
      1
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          setCurrentIndex(
            (
              previous
            ) =>
              (
                previous +
                1
              ) %
              banners.length
          );
        },
        5000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    banners.length,
  ]);

  /* ============================================================
     NAVEGACIÓN
     ============================================================ */

  const handleBannerClick = (
    banner:
      Banner
  ) => {
    if (!banner.productHandle) {
      console.warn(
        `El banner "${banner.title ?? banner.handle}" no tiene ningún producto asociado.`
      );

      return;
    }

    navigate(
      `/tienda/${banner.productHandle}`
    );
  };

  const goPrev = () => {
    if (
      banners.length ===
      0
    ) {
      return;
    }

    setCurrentIndex(
      (
        previous
      ) =>
        (
          previous -
          1 +
          banners.length
        ) %
        banners.length
    );
  };

  const goNext = () => {
    if (
      banners.length ===
      0
    ) {
      return;
    }

    setCurrentIndex(
      (
        previous
      ) =>
        (
          previous +
          1
        ) %
        banners.length
    );
  };

  /* ============================================================
     ESTADOS
     ============================================================ */

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">
        Cargando novedades…
      </div>
    );
  }

  if (
    banners.length ===
    0
  ) {
    return null;
  }

  const currentBanner =
    banners[
      currentIndex
    ];

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <section className="py-8">
      <div className="w-full">
        <div className="mb-4 gap-4 px-4 sm:px-6 lg:px-8" />

        <div className="group relative w-full overflow-hidden bg-gray-100">
          <button
            type="button"
            onClick={() =>
              handleBannerClick(
                currentBanner
              )
            }
            className="relative block w-full text-left"
            aria-label={
              currentBanner.title ??
              "Ver novedades"
            }
          >
            <img
              src={
                currentBanner.imageUrl
              }
              alt={
                currentBanner.title ??
                "Banner de novedades"
              }
              className="block h-auto w-full object-contain"
              loading="eager"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/10 to-black/0" />

            <div className="pointer-events-none absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
              <span
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-white/60
                  bg-white/70
                  px-5 py-2.5
                  text-sm font-semibold
                  text-[#26341f]
                  shadow-lg shadow-black/10
                  backdrop-blur-md
                  transition-all duration-300
                  group-hover:scale-[1.03]
                  group-hover:bg-white/85
                  sm:px-6 sm:py-3
                "
              >
                Ver producto

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </button>

          {banners.length >
            1 && (
            <>
              <button
                type="button"
                onClick={
                  goPrev
                }
                aria-label="Banner anterior"
                className="
                  absolute left-3 top-1/2 z-10
                  flex h-11 w-11 -translate-y-1/2
                  items-center justify-center
                  rounded-full bg-black/0 text-white
                  transition-all duration-200
                  group-hover:bg-black/50
                  hover:!bg-black/60
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={
                  goNext
                }
                aria-label="Siguiente banner"
                className="
                  absolute right-3 top-1/2 z-10
                  flex h-11 w-11 -translate-y-1/2
                  items-center justify-center
                  rounded-full bg-black/0 text-white
                  transition-all duration-200
                  group-hover:bg-black/50
                  hover:!bg-black/60
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {banners.map(
                  (
                    banner,
                    index
                  ) => (
                    <button
                      key={
                        banner.id
                      }
                      type="button"
                      onClick={() =>
                        setCurrentIndex(
                          index
                        )
                      }
                      aria-label={`Ir al banner ${index + 1}`}
                      className={[
                        "h-2.5 rounded-full transition-all",

                        index ===
                        currentIndex
                          ? "w-6 bg-white"
                          : "w-2.5 bg-white/60 hover:bg-white/90",
                      ].join(
                        " "
                      )}
                    />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}