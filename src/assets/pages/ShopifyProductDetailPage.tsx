import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Header from "../containers/Header";
import Footer from "../containers/Footer";
import { useShopifyCart } from "../containers/ShopifyCartContext";

import {
  getShopifyProductByHandle,
  type ShopifyDetailProduct,
  type ShopifyDetailVariant,
} from "../../shopifyProductDetail";

import ShopifyRelatedProducts
  from "../containers/ShopifyRelatedProducts";

import ShopifyRelatedBrand
  from "../containers/ShopifyRelatedBrand";

import ShopifyFavoriteButton
  from "../containers/ShopifyFavoriteButton";

type ExtraInfo = {
  ingredients: string | null;
  nutritionalInfo: string | null;
  usageInstructions: string | null;
  warnings: string | null;
  allergens: string | null;
  usageTips: string | null;
  medicalDisclaimer: string | null;
  legalRegulation: string | null;
};

function boolValue(
  value: { value: string } | null
) {
  return value?.value === "true";
}

function valueOf(
  value: { value: string } | null
) {
  return value?.value?.trim() || null;
}

export default function ShopifyProductDetailPage() {
  const { handle } =
    useParams<{
      handle: string;
    }>();

  const navigate = useNavigate();

  const {
    addToCart,
    loading: cartLoading,
  } = useShopifyCart();

  const [product, setProduct] =
    useState<ShopifyDetailProduct | null>(
      null
    );

  const [
    selectedVariant,
    setSelectedVariant,
  ] =
    useState<ShopifyDetailVariant | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [added, setAdded] =
    useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [handle]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!handle) {
        setError("Producto inválido");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result =
          await getShopifyProductByHandle(
            handle
          );

        if (!alive) return;

        if (!result) {
          setProduct(null);
          setError(
            "Producto no encontrado"
          );
          return;
        }

        setProduct(result);

        const firstAvailable =
          result.variants.nodes.find(
            (variant) =>
              variant.availableForSale
          ) ??
          result.variants.nodes[0] ??
          null;

        setSelectedVariant(
          firstAvailable
        );
      } catch (e) {
        console.error(e);

        if (!alive) return;

        setError(
          e instanceof Error
            ? e.message
            : "Error cargando producto"
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
  }, [handle]);

  const activeImage =
    selectedVariant?.image?.url ??
    product?.featuredImage?.url ??
    product?.images.nodes[0]?.url ??
    "https://placehold.co/900x900?text=Sin+imagen";

  const price =
    Number(
      selectedVariant?.price.amount ??
        0
    );

  const oldPrice =
    selectedVariant?.compareAtPrice
      ?.amount
      ? Number(
          selectedVariant
            .compareAtPrice.amount
        )
      : null;

  const stock =
    selectedVariant
      ?.quantityAvailable ?? null;

  const outOfStock =
    selectedVariant
      ? !selectedVariant.availableForSale ||
        (stock !== null &&
          stock <= 0)
      : true;

  const extraInfo: ExtraInfo =
    useMemo(() => {
      if (!product) {
        return {
          ingredients: null,
          nutritionalInfo: null,
          usageInstructions: null,
          warnings: null,
          allergens: null,
          usageTips: null,
          medicalDisclaimer: null,
          legalRegulation: null,
        };
      }

      return {
        ingredients:
          valueOf(
            selectedVariant
              ?.ingredients ?? null
          ) ??
          valueOf(
            product.ingredients
          ),

        nutritionalInfo:
          valueOf(
            selectedVariant
              ?.nutritionalInfo ??
              null
          ) ??
          valueOf(
            product.nutritionalInfo
          ),

        usageInstructions:
          valueOf(
            selectedVariant
              ?.usageInstructions ??
              null
          ) ??
          valueOf(
            product.usageInstructions
          ),

        warnings:
          valueOf(
            selectedVariant
              ?.warnings ?? null
          ) ??
          valueOf(
            product.warnings
          ),

        allergens:
          valueOf(
            selectedVariant
              ?.allergens ?? null
          ) ??
          valueOf(
            product.allergens
          ),

        usageTips:
          valueOf(
            selectedVariant
              ?.usageTips ?? null
          ) ??
          valueOf(
            product.usageTips
          ),

        medicalDisclaimer:
          valueOf(
            selectedVariant
              ?.medicalDisclaimer ??
              null
          ) ??
          valueOf(
            product.medicalDisclaimer
          ),

        legalRegulation:
          valueOf(
            selectedVariant
              ?.legalRegulation ??
              null
          ) ??
          valueOf(
            product.legalRegulation
          ),
      };
    }, [
      product,
      selectedVariant,
    ]);

  const addCurrentVariant =
    async () => {
      if (
        !selectedVariant ||
        outOfStock ||
        cartLoading
      ) {
        return;
      }

      try {
        await addToCart(
          selectedVariant.id,
          1
        );

        setAdded(true);

        window.setTimeout(() => {
          setAdded(false);
        }, 1200);
      } catch (error) {
        console.error(
          "Error añadiendo variante:",
          error
        );
      }
    };

  if (loading) {
    return (
      <main>
        <Header />

        <div className="flex min-h-[60vh] items-center justify-center">
          Cargando producto…
        </div>

        <Footer />
      </main>
    );
  }

  if (
    error ||
    !product ||
    !selectedVariant
  ) {
    return (
      <main>
        <Header />

        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="font-semibold text-red-700">
            No se pudo cargar el producto
          </p>

          <p className="text-sm text-gray-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/tienda"
              )
            }
            className="rounded-full bg-black px-5 py-2 text-white"
          >
            Volver
          </button>
        </div>

        <Footer />
      </main>
    );
  }

  const hasVariants =
    product.variants.nodes.length > 1;

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-[1500px] px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* IMAGEN */}
          <div className="rounded-[28px] bg-[#fafafa] p-6">
            <div className="flex h-[520px] items-center justify-center rounded-[22px] bg-white">
              <img
                src={activeImage}
                alt={
                  selectedVariant.image
                    ?.altText ??
                  product.title
                }
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          {/* INFORMACIÓN */}
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {product.productType}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">
              {product.title}
            </h1>

            <p className="mt-2 text-gray-500">
              {product.vendor}
            </p>

            {selectedVariant.title !==
              "Default Title" && (
              <p className="mt-3 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-700">
                {
                  selectedVariant.title
                }
              </p>
            )}

            <div className="mt-7 flex items-end gap-4 border-y border-gray-100 py-6">
              {oldPrice !== null &&
                oldPrice > price && (
                  <del className="text-xl text-gray-400">
                    {oldPrice.toFixed(2)} €
                  </del>
                )}

              <span className="text-4xl font-semibold text-gray-950">
                {price.toFixed(2)} €
              </span>
            </div>

            {/* BADGES */}
            <div className="mt-5 flex flex-wrap gap-2">
              {boolValue(
                product.bio
              ) && (
                <Badge text="Bio" />
              )}

              {boolValue(
                product.vegan
              ) && (
                <Badge text="Vegan" />
              )}

              {boolValue(
                product.glutenFree
              ) && (
                <Badge text="Sin gluten" />
              )}

              {boolValue(
                product.lactoseFree
              ) && (
                <Badge text="Sin lactosa" />
              )}

              <Badge
                text={
                  outOfStock
                    ? "Fuera de stock"
                    : stock !== null &&
                      stock < 5
                    ? `Solo quedan ${stock}`
                    : "En stock"
                }
                danger={
                  outOfStock ||
                  (stock !== null &&
                    stock < 5)
                }
              />
            </div>

            {/* VARIANTES */}
            {hasVariants && (
              <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                <p className="text-sm font-semibold text-gray-900">
                  Elige otra opción
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.nodes.map(
                    (variant) => {
                      const selected =
                        variant.id ===
                        selectedVariant.id;

                      return (
                        <button
                          key={
                            variant.id
                          }
                          type="button"
                          onClick={() => {
                            setSelectedVariant(
                              variant
                            );
                            setAdded(false);
                          }}
                          className={[
                            "rounded-full border px-4 py-2 text-sm font-medium transition",

                            selected
                              ? "border-black bg-black text-white"
                              : "border-gray-200 bg-white text-gray-800 hover:border-gray-400",

                            !variant.availableForSale
                              ? "opacity-50"
                              : "",
                          ].join(" ")}
                        >
                          {variant.title}

                          {!variant.availableForSale
                            ? " · Sin stock"
                            : ""}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* ACCIONES */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  void addCurrentVariant();
                }}
                disabled={
                  outOfStock ||
                  cartLoading
                }
                className={[
                  "h-14 flex-1 rounded-full px-6 font-semibold transition",

                  outOfStock
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "bg-gray-950 text-white hover:bg-gray-800",

                  cartLoading
                    ? "opacity-60"
                    : "",
                ].join(" ")}
              >
                {outOfStock
                  ? "Fuera de stock"
                  : added
                  ? "¡Añadido!"
                  : "Añadir a la cesta"}
              </button>

              <div className="flex gap-3">
                <ShopifyFavoriteButton
                  variantId={
                    selectedVariant.id
                  }
                  productName={
                    product.title
                  }
                  className="h-14 w-14 shrink-0"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.history.length > 1
                    ) {
                      navigate(-1);
                    } else {
                      navigate(
                        "/tienda"
                      );
                    }
                  }}
                  className="h-14 shrink-0 rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                >
                  Volver atrás
                </button>
              </div>
            </div>

            {/* INFO */}
            <div className="mt-8">
              <InfoAccordion
                description={
                  product.description ||
                  null
                }
                extraInfo={
                  extraInfo
                }
              />
            </div>
          </div>
        </div>
      </section>

      <ShopifyRelatedProducts
  category={product.productType}
  currentProductId={product.id}
/>

<ShopifyRelatedBrand
  brand={product.vendor}
  currentProductId={product.id}
/>

      <Footer />
    </main>
  );
}

function Badge({
  text,
  danger = false,
}: {
  text: string;
  danger?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1.5 text-xs font-medium",

        danger
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-gray-200 bg-gray-50 text-gray-700",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function InfoAccordion({
  description,
  extraInfo,
}: {
  description: string | null;
  extraInfo: ExtraInfo;
}) {
  const [
    openKey,
    setOpenKey,
  ] = useState<string | null>(
    null
  );

  const sections = [
    {
      key: "description",
      title: "Descripción",
      content: description,
    },
    {
      key: "ingredients",
      title: "Ingredientes",
      content:
        extraInfo.ingredients,
    },
    {
      key: "nutrition",
      title:
        "Información nutricional",
      content:
        extraInfo.nutritionalInfo,
    },
    {
      key: "usage",
      title: "Modo de uso",
      content:
        extraInfo.usageInstructions,
    },
    {
      key: "warnings",
      title: "Advertencias",
      content:
        extraInfo.warnings,
    },
    {
      key: "allergens",
      title: "Alérgenos",
      content:
        extraInfo.allergens,
    },
    {
      key: "tips",
      title: "Consejos de uso",
      content:
        extraInfo.usageTips,
    },
    {
      key: "medical",
      title: "Aviso médico",
      content:
        extraInfo.medicalDisclaimer,
    },
    {
      key: "legal",
      title: "Información legal",
      content:
        extraInfo.legalRegulation,
    },
  ].filter(
    (section) =>
      typeof section.content ===
        "string" &&
      section.content.trim()
        .length > 0
  );

  return (
    <div className="space-y-2">
      {sections.map(
        (section) => {
          const isOpen =
            openKey ===
            section.key;

          return (
            <div
              key={
                section.key
              }
              className="overflow-hidden rounded-xl border border-gray-200"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenKey(
                    isOpen
                      ? null
                      : section.key
                  )
                }
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold">
                  {
                    section.title
                  }
                </span>

                <span>
                  {isOpen
                    ? "−"
                    : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-5 whitespace-pre-line text-sm leading-7 text-gray-600">
                  {
                    section.content
                  }
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}