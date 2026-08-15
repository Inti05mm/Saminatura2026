import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
} from "react-router-dom";

import Header from "../containers/Header";
import Footer from "../containers/Footer";
import HeroMarcas from "../containers/HeroMarcas";

import FiltersContainer from "../containers/FilterContainer";
import ProductBanners from "../containers/ShopifyProductBanner.tsx";

import type {
  Filters,
} from "../containers/FilterContainer";

import ShopifyAllProductsGrid, {
  type ShopifyUiProduct,
} from "../containers/ShopifyAllProductsGrid";

import {
  getAllShopifyProducts,
  type ShopifyCatalogProduct,
} from "../../shopifyCatalog";

function boolValue(
  value: {
    value: string;
  } | null
) {
  return (
    String(
      value?.value ??
        ""
    ).toLowerCase() ===
    "true"
  );
}

function promoTypeValue(
  value:
    | {
        value: string;
      }
    | null
):
  | "none"
  | "percent"
  | "2x1"
  | "3x2"
  | "second_half" {
  const raw =
    String(
      value?.value ??
        "none"
    );

  if (
    raw === "percent" ||
    raw === "2x1" ||
    raw === "3x2" ||
    raw ===
      "second_half"
  ) {
    return raw;
  }

  return "none";
}

function cleanVariantTitle(
  value:
    | string
    | null
    | undefined
) {
  const text =
    String(value ?? "").trim();

  if (
    !text ||
    text.toLowerCase() ===
      "default title"
  ) {
    return "";
  }

  return text;
}

/*
 * IMPORTANTE:
 *
 * En Shopify un producto puede tener varias variantes.
 * Para que el listado se comporte como tu tienda antigua,
 * convertimos cada VARIANTE en una card propia.
 *
 * Así:
 * - cada sabor/tamaño se puede buscar;
 * - cada variante tiene su propio precio;
 * - cada variante tiene su propio stock;
 * - "Añadir a cesta" añade exactamente esa variante.
 */
function mapShopifyProduct(
  product:
    ShopifyCatalogProduct
): ShopifyUiProduct[] {
  const promo_type =
    promoTypeValue(
      product.promoType
    );

  const promo_active =
    boolValue(
      product.promoActive
    );

  const variants =
    product.variants.nodes ??
    [];

  return variants.map(
    (variant) => ({
      key:
        `${product.id}::${variant.id}`,

      productId:
        product.id,

      variantId:
        variant.id,

      slug:
        product.handle,

      category:
        product.productType ??
        "",

      name:
        product.title ?? "",

      brand:
        product.vendor ?? "",

      price:
        Number(
          variant.price.amount ??
            0
        ),

      old_price:
        variant.compareAtPrice
          ?.amount != null
          ? Number(
              variant.compareAtPrice
                .amount
            )
          : null,

      img:
        variant.image?.url ??
        product.featuredImage
          ?.url ??
        null,

      description:
        product.description ||
        null,

      stock:
        variant.quantityAvailable ??
        null,

      availableForSale:
        !!variant.availableForSale,

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

      promo_type,
      promo_active,

      variantTitle:
        cleanVariantTitle(
          variant.title
        ) || null,
    })
  );
}

function fullProductName(
  product:
    ShopifyUiProduct
) {
  return [
    product.name,
    cleanVariantTitle(
      product.variantTitle
    ),
  ]
    .filter(Boolean)
    .join(" ");
}

function hasPromo(
  product:
    ShopifyUiProduct
) {
  const hasOldPrice =
    product.old_price !==
      null &&
    product.old_price >
      product.price &&
    product.old_price > 0;

  const hasActivePromo =
    product.promo_active &&
    product.promo_type !==
      "none";

  return (
    hasOldPrice ||
    hasActivePromo
  );
}

function normalizeSearchText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "es"
    )
    .trim();
}

export default function ShopifyShopPage() {
  const location =
    useLocation();

  const productsRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    products,
    setProducts,
  ] =
    useState<
      ShopifyUiProduct[]
    >([]);

  const [
    filteredProducts,
    setFilteredProducts,
  ] =
    useState<
      ShopifyUiProduct[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMsg,
    setErrorMsg,
  ] =
    useState<
      string | null
    >(null);

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

  const urlSearch =
    (
      urlParams.get(
        "search"
      ) ?? ""
    ).trim();

  const urlCategory =
    (
      urlParams.get(
        "category"
      ) ?? ""
    ).trim();

  const urlBrand =
    (
      urlParams.get(
        "brand"
      ) ?? ""
    ).trim();

  const hasAnyUrlFilter =
    !!(
      urlSearch ||
      urlCategory ||
      urlBrand
    );

  /*
   * Igual que antes:
   * si vienes desde buscador/categoría/marca,
   * bajamos automáticamente hasta productos.
   */
  useEffect(() => {
    if (loading) {
      return;
    }

    const shouldScroll =
      location.hash ===
        "#products" ||
      hasAnyUrlFilter;

    if (!shouldScroll) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          document
            .getElementById(
              "products"
            )
            ?.scrollIntoView(
              {
                behavior:
                  "smooth",
                block:
                  "start",
              }
            );
        },
        80
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    loading,
    location.hash,
    location.search,
    hasAnyUrlFilter,
  ]);

  useEffect(() => {
    let alive = true;

    const load =
      async () => {
        setLoading(true);
        setErrorMsg(
          null
        );

        try {
          /*
           * getAllShopifyProducts usa Storefront API.
           *
           * Por tanto Shopify ya devuelve únicamente
           * productos PUBLICADOS para la tienda online:
           * los DRAFT y los ocultos no aparecen aquí.
           */
          const shopifyProducts =
            await getAllShopifyProducts();

          if (!alive) {
            return;
          }

          let list =
            shopifyProducts.flatMap(
              mapShopifyProduct
            );

          if (urlSearch) {
            const query =
              normalizeSearchText(
                urlSearch
              );

            list =
              list.filter(
                (product) => {
                  const haystack =
                    normalizeSearchText(
                      [
                        fullProductName(
                          product
                        ),
                        product.brand,
                        product.category,
                        product.description ??
                          "",
                      ].join(
                        " "
                      )
                    );

                  return haystack.includes(
                    query
                  );
                }
              );
          }

          if (
            urlCategory
          ) {
            list =
              list.filter(
                (product) =>
                  product.category ===
                  urlCategory
              );
          }

          if (
            urlBrand
          ) {
            list =
              list.filter(
                (product) =>
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
            "Error cargando catálogo Shopify:",
            error
          );

          if (!alive) {
            return;
          }

          setProducts([]);
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
      };

    void load();

    return () => {
      alive = false;
    };
  }, [
    urlSearch,
    urlCategory,
    urlBrand,
  ]);

  const applyFilters =
    (
      filters:
        Filters,

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
            (product) =>
              product.category ===
              filters.category
          );
      }

      if (
        filters.brand
      ) {
        result =
          result.filter(
            (product) =>
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
            (product) =>
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
            (product) =>
              product.price <=
              filters.priceTo!
          );
      }

      if (
        filters.promotionsOnly
      ) {
        result =
          result.filter(
            hasPromo
          );
      }

      if (
        filters.glutenFree
      ) {
        result =
          result.filter(
            (product) =>
              product.gluten_free
          );
      }

      if (
        filters.lactoseFree
      ) {
        result =
          result.filter(
            (product) =>
              product.lactose_free
          );
      }

      if (
        filters.vegan
      ) {
        result =
          result.filter(
            (product) =>
              product.vegan
          );
      }

      if (
        filters.bio
      ) {
        result =
          result.filter(
            (product) =>
              product.bio
          );
      }

      if (
        filters.sort ===
        "price-asc"
      ) {
        result.sort(
          (a, b) =>
            a.price -
            b.price
        );
      }

      if (
        filters.sort ===
        "price-desc"
      ) {
        result.sort(
          (a, b) =>
            b.price -
            a.price
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
            productsRef.current?.scrollIntoView(
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

  const brands =
    useMemo(
      () =>
        Array.from(
          new Set(
            products
              .map(
                (product) =>
                  product.brand
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (a, b) =>
            a.localeCompare(
              b,
              "es",
              {
                sensitivity:
                  "base",
              }
            )
        ),
      [products]
    );

  return (
    <main>
      <Header />
      <ProductBanners />
      <HeroMarcas />

      <div className="max-w-8xl mx-auto px-4 py-8">
        {loading && (
          <p className="text-gray-600">
            Cargando productos
            desde Shopify...
          </p>
        )}

        {!loading &&
          errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-semibold">
                No se pudieron
                cargar los productos
              </p>

              <p className="mt-1 text-sm">
                {
                  errorMsg
                }
              </p>
            </div>
          )}

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

              {(urlSearch ||
                urlCategory ||
                urlBrand) && (
                <div className="text-sm text-gray-600">
                  {urlSearch && (
                    <span>
                      Resultados
                      para:{" "}
                      <b>
                        {
                          urlSearch
                        }
                      </b>{" "}
                    </span>
                  )}

                  {urlCategory && (
                    <span>
                      en categoría:{" "}
                      <b>
                        {
                          urlCategory
                        }
                      </b>{" "}
                    </span>
                  )}

                  {urlBrand && (
                    <span>
                      en marca:{" "}
                      <b>
                        {
                          urlBrand
                        }
                      </b>
                    </span>
                  )}
                </div>
              )}

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
                    No hay
                    productos con
                    esos filtros
                    {urlSearch
                      ? " (prueba otra palabra)"
                      : ""}
                    .
                  </p>
                ) : (
                  <ShopifyAllProductsGrid
                    products={
                      filteredProducts
                    }
                  />
                )}
              </div>
            </div>
          )}
      </div>

      <Footer />
    </main>
  );
}
