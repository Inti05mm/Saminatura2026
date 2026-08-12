import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import Header from "../containers/Header";
import Footer from "../containers/Footer";
import HeroMarcas from "../containers/HeroMarcas";
import FiltersContainer from "../containers/FilterContainer";
import type { Filters } from "../containers/FilterContainer";
import { useShopifyCart } from "../containers/ShopifyCartContext";

import {
  getAllShopifyProducts,
  type ShopifyCatalogProduct,
} from "../../shopifyCatalog";

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

function boolValue(v: { value: string } | null) {
  return v?.value === "true";
}

function mapShopifyProduct(
  product: ShopifyCatalogProduct
): UiProduct {
  const firstVariant =
    product.variants.nodes[0] ?? null;

  return {
    id: product.id,
    slug: product.handle,
    category: product.productType ?? "",
    name: product.title ?? "",
    brand: product.vendor ?? "",

    price: firstVariant
      ? Number(firstVariant.price.amount)
      : 0,

    old_price:
      firstVariant?.compareAtPrice?.amount != null
        ? Number(firstVariant.compareAtPrice.amount)
        : null,

    img:
      firstVariant?.image?.url ??
      product.featuredImage?.url ??
      null,

    description:
      product.description || null,

    stock:
      firstVariant?.quantityAvailable ??
      null,

    bio: boolValue(product.bio),
    vegan: boolValue(product.vegan),

    gluten_free: boolValue(
      product.glutenFree
    ),

    lactose_free: boolValue(
      product.lactoseFree
    ),

    variantId:
      firstVariant?.id ?? null,

    variantTitle:
      firstVariant?.title ?? null,
  };
}

export default function ShopifyShopPage() {
  const location = useLocation();

  const productsRef =
    useRef<HTMLDivElement | null>(null);

  const {
    addToCart,
    totalItems,
    loading: cartLoading,
  } = useShopifyCart();

  const [
    addedVariantId,
    setAddedVariantId,
  ] = useState<string | null>(null);

  const [products, setProducts] =
    useState<UiProduct[]>([]);

  const [
    filteredProducts,
    setFilteredProducts,
  ] = useState<UiProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const urlParams = useMemo(
    () =>
      new URLSearchParams(
        location.search
      ),
    [location.search]
  );

  const urlSearch = (
    urlParams.get("search") ?? ""
  )
    .trim()
    .toLowerCase();

  const urlCategory = (
    urlParams.get("category") ?? ""
  ).trim();

  const urlBrand = (
    urlParams.get("brand") ?? ""
  ).trim();

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

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

        if (urlSearch) {
          list = list.filter((p) => {
            const haystack = [
              p.name,
              p.brand,
              p.category,
              p.description ?? "",
            ]
              .join(" ")
              .toLowerCase();

            return haystack.includes(
              urlSearch
            );
          });
        }

        if (urlCategory) {
          list = list.filter(
            (p) =>
              p.category ===
              urlCategory
          );
        }

        if (urlBrand) {
          list = list.filter(
            (p) =>
              p.brand ===
              urlBrand
          );
        }

        setProducts(list);
        setFilteredProducts(list);
      } catch (error) {
        console.error(
          "Error Shopify:",
          error
        );

        if (!alive) {
          return;
        }

        setProducts([]);
        setFilteredProducts([]);

        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Error cargando Shopify"
        );
      } finally {
        if (alive) {
          setLoading(false);
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

  const applyFilters = (
    filters: Filters,
    shouldScroll = false
  ) => {
    let result = [...products];

    if (filters.category) {
      result = result.filter(
        (p) =>
          p.category ===
          filters.category
      );
    }

    if (filters.brand) {
      result = result.filter(
        (p) =>
          p.brand ===
          filters.brand
      );
    }

    if (
      filters.priceFrom !==
      undefined
    ) {
      result = result.filter(
        (p) =>
          p.price >=
          filters.priceFrom!
      );
    }

    if (
      filters.priceTo !==
      undefined
    ) {
      result = result.filter(
        (p) =>
          p.price <=
          filters.priceTo!
      );
    }

    if (filters.glutenFree) {
      result = result.filter(
        (p) => p.gluten_free
      );
    }

    if (filters.lactoseFree) {
      result = result.filter(
        (p) => p.lactose_free
      );
    }

    if (filters.vegan) {
      result = result.filter(
        (p) => p.vegan
      );
    }

    if (filters.bio) {
      result = result.filter(
        (p) => p.bio
      );
    }

    if (
      filters.sort ===
      "price-asc"
    ) {
      result.sort(
        (a, b) =>
          a.price - b.price
      );
    }

    if (
      filters.sort ===
      "price-desc"
    ) {
      result.sort(
        (a, b) =>
          b.price - a.price
      );
    }

    setFilteredProducts(result);

    if (shouldScroll) {
      requestAnimationFrame(() => {
        productsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const brands = [
    ...new Set(
      products
        .map((p) => p.brand)
        .filter(Boolean)
    ),
  ];

  return (
    <main>
      <Header />

      <HeroMarcas />

      <div className="max-w-8xl mx-auto px-4 py-8">
        {loading && (
          <p className="text-gray-600">
            Cargando productos desde
            Shopify...
          </p>
        )}

        {!loading && errorMsg && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">
              Error cargando Shopify
            </p>

            <p className="mt-1 text-sm">
              {errorMsg}
            </p>
          </div>
        )}

        {!loading &&
          !errorMsg && (
            <div className="mx-10 space-y-6">
              <FiltersContainer
                brands={brands}
                onApply={applyFilters}
              />

              {/* CONTADOR TEMPORAL DEL CARRITO SHOPIFY */}
              <div className="rounded-xl bg-white p-4 shadow-sm">
                Productos en carrito Shopify:{" "}
                <b>{totalItems}</b>
              </div>

              <div
                id="products"
                ref={productsRef}
                className="scroll-mt-40"
              >
                {filteredProducts.length ===
                0 ? (
                  <p className="text-gray-600">
                    No hay productos con
                    esos filtros
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
                      (product) => {
                        const outOfStock =
                          product.stock !==
                            null &&
                          product.stock <= 0;

                        const isAdded =
                          addedVariantId ===
                          product.variantId;

                        return (
                          <div
                            key={product.id}
                            className="
                              gris
                              overflow-hidden
                              rounded-xl
                              shadow-md
                            "
                          >
                            {/* IMAGEN */}
                            <div
                              className="
                                flex h-64 w-full
                                items-center
                                justify-center
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
                                  product.name
                                }
                                className="
                                  max-h-full
                                  max-w-full
                                  object-contain
                                "
                              />
                            </div>

                            {/* INFORMACIÓN */}
                            <div className="px-4 py-3">
                              <span className="text-xs uppercase text-gray-400">
                                {
                                  product.brand
                                }
                              </span>

                              <p className="truncate text-lg font-bold text-black">
                                {
                                  product.name
                                }
                              </p>

                              {product.variantTitle &&
                                product.variantTitle !==
                                  "Default Title" && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    {
                                      product.variantTitle
                                    }
                                  </p>
                                )}

                              {/* PRECIO */}
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

                              {/* STOCK */}
                              <p
                                className={[
                                  "mt-2 text-sm font-semibold",

                                  outOfStock
                                    ? "text-red-600"
                                    : "text-green-700",
                                ].join(" ")}
                              >
                                {outOfStock
                                  ? "Sin stock"
                                  : `Stock: ${
                                      product.stock ??
                                      "—"
                                    }`}
                              </p>

                              {/* AÑADIR AL CARRITO SHOPIFY */}
                              <button
                                type="button"
                                disabled={
                                  outOfStock ||
                                  cartLoading ||
                                  !product.variantId
                                }
                                onClick={async () => {
                                  if (
                                    !product.variantId ||
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
                                }}
                                className={[
                                  "mt-3 w-full",
                                  "flex items-center justify-center",
                                  "rounded-md px-4 py-2.5",
                                  "font-semibold transition",

                                  outOfStock
                                    ? "cursor-not-allowed bg-gray-300 text-gray-600"
                                    : "verde-3 text-black hover:opacity-80",

                                  cartLoading
                                    ? "opacity-60"
                                    : "",
                                ].join(" ")}
                              >
                                {outOfStock
                                  ? "Sin stock"
                                  : isAdded
                                  ? "¡Añadido!"
                                  : "Añadir a la cesta"}
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