import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

type Brand = {
  id: string;
  name: string;
  image: string;
  sortOrder: number;
};

type ShopifyMetaobject = {
  id: string;

  nombre: {
    value: string | null;
  } | null;

  orden: {
    value: string | null;
  } | null;

  logo: {
    reference: {
      image: {
        url: string;
        altText: string | null;
      } | null;
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

const BRANDS_QUERY = `
  query Brands {
    metaobjects(
      type: "marca"
      first: 100
    ) {
      nodes {
        id

        nombre: field(
          key: "nombre"
        ) {
          value
        }

        orden: field(
          key: "orden"
        ) {
          value
        }

        logo: field(
          key: "logo"
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
      }
    }
  }
`;

export default function HeroMarcas() {
  const navigate =
    useNavigate();

  const [
    offset,
    setOffset,
  ] =
    useState(0);

  const [
    brands,
    setBrands,
  ] =
    useState<Brand[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState<string | null>(
      null
    );

  const speed =
    0.02;

  /* ============================================================
     CARGAR MARCAS DESDE SHOPIFY
     ============================================================ */

  useEffect(() => {
    let alive =
      true;

    const loadBrands =
      async () => {
        setLoading(true);
        setLoadError(null);

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
                      BRANDS_QUERY,
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
                  ShopifyMetaobject[];
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

          const mappedBrands =
            nodes
              .map(
                (
                  node
                ): Brand | null => {
                  const name =
                    node.nombre
                      ?.value
                      ?.trim();

                  const image =
                    node.logo
                      ?.reference
                      ?.image
                      ?.url
                      ?.trim();

                  if (
                    !name ||
                    !image
                  ) {
                    return null;
                  }

                  const parsedOrder =
                    Number(
                      node.orden
                        ?.value ??
                        9999
                    );

                  return {
                    id:
                      node.id,

                    name,

                    image,

                    sortOrder:
                      Number.isFinite(
                        parsedOrder
                      )
                        ? parsedOrder
                        : 9999,
                  };
                }
              )
              .filter(
                (
                  brand
                ): brand is Brand =>
                  brand !==
                  null
              )
              .sort(
                (
                  first,
                  second
                ) => {
                  if (
                    first.sortOrder !==
                    second.sortOrder
                  ) {
                    return (
                      first.sortOrder -
                      second.sortOrder
                    );
                  }

                  return first.name.localeCompare(
                    second.name,
                    "es"
                  );
                }
              );

          if (!alive) {
            return;
          }

          setBrands(
            mappedBrands
          );

          setOffset(0);

          if (
            mappedBrands.length ===
            0
          ) {
            setLoadError(
              "No hay marcas activas para mostrar."
            );
          }
        } catch (error) {
          if (!alive) {
            return;
          }

          console.error(
            "Error cargando marcas desde Shopify:",
            error
          );

          setBrands([]);

          setLoadError(
            error instanceof Error
              ? error.message
              : "Se produjo un error cargando las marcas."
          );
        } finally {
          if (alive) {
            setLoading(
              false
            );
          }
        }
      };

    void loadBrands();

    return () => {
      alive =
        false;
    };
  }, []);

  /* ============================================================
     ANIMACIÓN
     ============================================================ */

  useEffect(() => {
    if (
      brands.length ===
      0
    ) {
      return;
    }

    let animationFrame:
      number;

    const animate =
      () => {
        setOffset(
          (
            previous
          ) =>
            previous <=
            -50
              ? 0
              : previous -
                speed
        );

        animationFrame =
          window.requestAnimationFrame(
            animate
          );
      };

    animationFrame =
      window.requestAnimationFrame(
        animate
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrame
      );
    };
  }, [
    brands.length,
  ]);

  const loopBrands =
    useMemo(
      () => {
        if (
          brands.length <=
          6
        ) {
          return [
            ...brands,
            ...brands,
            ...brands,
          ];
        }

        return [
          ...brands,
          ...brands,
        ];
      },
      [
        brands,
      ]
    );

  /* ============================================================
     ABRIR MARCA
     ============================================================ */

  const openBrand = (
    brandName:
      string
  ) => {
    const params =
      new URLSearchParams({
        brand:
          brandName,
      });

    navigate(
      `/tienda?${params.toString()}#products`
    );
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <section className="w-full overflow-hidden bg-white py-4 pb-4">
      <h2 className="mb-10 text-center text-2xl font-bold text-gray-800 md:text-3xl">
        Descubre nuestras marcas
      </h2>

      {loading ? (
        <div className="text-center text-gray-500">
          Cargando marcas...
        </div>
      ) : brands.length ===
        0 ? (
        <div className="px-4 text-center text-gray-500">
          <p>
            Aún no hay marcas
            para mostrar.
          </p>

          {loadError && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-red-600">
              {loadError}
            </p>
          )}
        </div>
      ) : (
        <>
          {loadError && (
            <div className="mb-4 px-4 text-center">
              <p className="whitespace-pre-wrap text-xs text-amber-700">
                {loadError}
              </p>
            </div>
          )}

          <div className="relative mx-10 w-full overflow-hidden pb-4">
            <div
              className="flex gap-3"
              style={{
                transform:
                  `translateX(${offset}%)`,

                width:
                  "200%",
              }}
            >
              {loopBrands.map(
                (
                  brand,
                  index
                ) => (
                  <button
                    key={`${brand.id}-${index}`}
                    type="button"
                    className="-mr-1 w-20 shrink-0 cursor-pointer md:w-24"
                    title={
                      brand.name
                    }
                    aria-label={`Ver productos de la marca ${brand.name}`}
                    onClick={() =>
                      openBrand(
                        brand.name
                      )
                    }
                  >
                    <div className="verde-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full shadow-md transition-transform hover:scale-[1.03] active:scale-[0.99] md:h-24 md:w-24">
                      <img
                        src={
                          brand.image
                        }
                        alt={
                          brand.name
                        }
                        className="h-full w-full object-contain p-3"
                        loading="lazy"
                        onError={(
                          event
                        ) => {
                          console.error(
                            "Error cargando imagen de marca:",
                            brand.name,
                            brand.image
                          );

                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}