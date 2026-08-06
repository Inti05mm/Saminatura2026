import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../supabaseClient";
import type { PromoType } from "../containers/Products";
import { useCart } from "../containers/CartContext";
import { useFavorites } from "../containers/FavoritesContext";
import type { ProductExtraInfoData } from "../containers/ProductExtraInfo";
import GuestFavoriteModal from "./GuestFavoriteModal";

type ProductImage = {
  id: number;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
};

type Product = {
  id: number;
  slug: string | null;
  category: string;
  name: string;
  brand: string;

  price: number;
  old_price: number | null;

  purchase_price: number | null;
  vat_rate: number;
  recargo_rate: number;

  promo_type: PromoType;
  promo_active: boolean;

  img: string | null;
  description: string | null;

  stock: number | null;

  bio: boolean;
  vegan: boolean;
  gluten_free: boolean;
  lactose_free: boolean;

  supplier_name: string | null;
  expiration_date: string | null;

  flavor: string | null;
  size: string | null;

  images: ProductImage[];
  extraInfo: ProductExtraInfoData | null;
};

const FALLBACK_IMG =
  "https://placehold.co/900x900?text=Sin+imagen";

type FeatureTone =
  | "bio"
  | "vegan"
  | "gluten_free"
  | "lactose_free";

const FEATURE_BADGE_STYLES: Record<
  FeatureTone,
  {
    chip: string;
    dot: string;
  }
> = {
  bio: {
    chip:
      "border-emerald-200 bg-white/90 text-emerald-800 backdrop-blur-sm",
    dot: "bg-emerald-500",
  },
  vegan: {
    chip:
      "border-lime-200 bg-white/90 text-lime-800 backdrop-blur-sm",
    dot: "bg-lime-500",
  },
  gluten_free: {
    chip:
      "border-amber-200 bg-white/90 text-amber-800 backdrop-blur-sm",
    dot: "bg-amber-500",
  },
  lactose_free: {
    chip:
      "border-violet-200 bg-white/90 text-violet-800 backdrop-blur-sm",
    dot: "bg-violet-500",
  },
};

function getPromoInfo(p: Product) {
  if (p.promo_active) {
    if (p.promo_type === "2x1") {
      return {
        badge: "2x1",
        text: "Llévate 2 y paga 1",
        style: "unit" as const,
      };
    }

    if (p.promo_type === "3x2") {
      return {
        badge: "3x2",
        text: "Llévate 3 y paga 2",
        style: "unit" as const,
      };
    }

    if (p.promo_type === "second_half") {
      return {
        badge: "2ª al 50%",
        text: "La segunda unidad al 50%",
        style: "unit" as const,
      };
    }
  }

  if (
    p.old_price &&
    p.old_price > p.price &&
    p.old_price > 0
  ) {
    const pct = Math.round(
      ((p.old_price - p.price) / p.old_price) * 100
    );

    if (pct > 0) {
      return {
        badge: `-${pct}%`,
        text: "Oferta especial",
        style: "percent" as const,
      };
    }
  }

  return null;
}

function getStockLabel(stock: number | null) {
  if (stock === null) {
    return {
      text: "En stock",
      danger: false,
    };
  }

  if (stock <= 0) {
    return {
      text: "Fuera de stock",
      danger: true,
    };
  }

  if (stock < 5) {
    return {
      text: `¡Solo quedan ${stock} en stock!`,
      danger: true,
    };
  }

  return {
    text: "En stock",
    danger: false,
  };
}

function makeCanonicalSlug(prod: {
  id: number;
  slug: string | null;
}) {
  const baseSlug = (prod.slug ?? "").trim();
  const idSuffix = `-${prod.id}`;

  return baseSlug
    ? baseSlug.endsWith(idSuffix)
      ? baseSlug
      : `${baseSlug}${idSuffix}`
    : String(prod.id);
}

function variantLabel(
  p: Pick<Product, "flavor" | "size">
) {
  const flavor = (p.flavor ?? "").trim();
  const size = (p.size ?? "").trim();

  if (flavor && size) {
    return `${flavor} · ${size}`;
  }

  if (flavor) return flavor;
  if (size) return size;

  return "—";
}

function fullProductName(
  p: Pick<Product, "name" | "flavor" | "size">
) {
  const base = (p.name ?? "").trim();
  const flavor = (p.flavor ?? "").trim();
  const size = (p.size ?? "").trim();

  return [base, flavor, size]
    .filter(Boolean)
    .join(" ");
}

function normalizeExtraInfoRow(
  data: any
): ProductExtraInfoData {
  return {
    ingredients: data?.ingredients ?? null,
    nutritional_info:
      data?.nutritional_info ?? null,
    usage_instructions:
      data?.usage_instructions ?? null,
    warnings: data?.warnings ?? null,
    allergens: data?.allergens ?? null,
    usage_tips: data?.usage_tips ?? null,
    medical_disclaimer:
      data?.medical_disclaimer ?? null,
    legal_regulation:
      data?.legal_regulation ?? null,
  };
}

function normalizeProductRow(
  data: any,
  extraInfo: ProductExtraInfoData | null = null,
  productImages: any[] = []
): Product {
  const rawImgs = Array.isArray(productImages)
    ? productImages
    : [];

  const images: ProductImage[] = rawImgs
    .map((image: any) => ({
      id: Number(image.id),
      url: String(image.url ?? ""),
      alt: image.alt ?? null,
      sort_order: Number(image.sort_order ?? 0),
      is_primary: !!image.is_primary,
    }))
    .filter((image) => image.url.trim() !== "")
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.id - b.id
    );

  return {
    id: Number(data.id),
    slug: data.slug ?? null,
    category: data.category ?? "",
    name: data.name ?? "",
    brand: data.brand ?? "",

    price: Number(data.price ?? 0),

    old_price:
      data.old_price == null
        ? null
        : Number(data.old_price),

    purchase_price: null,
    vat_rate: 0,
    recargo_rate: 0,
    supplier_name: null,

    promo_type:
      (data.promo_type ?? "none") as PromoType,

    promo_active: !!data.promo_active,

    img: data.img ?? null,
    description: data.description ?? null,

    stock:
      data.stock == null
        ? null
        : Number(data.stock),

    bio: !!data.bio,
    vegan: !!data.vegan,
    gluten_free: !!data.gluten_free,
    lactose_free: !!data.lactose_free,

    expiration_date:
      data.expiration_date ?? null,

    flavor: data.flavor ?? null,
    size: data.size ?? null,

    images,
    extraInfo,
  };
}

export default function ProductDetail() {
  const { slug } = useParams<{
    slug: string;
  }>();

  const productId = useMemo(() => {
    if (!slug) return NaN;

    if (/^\d+$/.test(slug)) {
      return Number(slug);
    }

    const last = slug.split("-").pop();

    return Number(last);
  }, [slug]);

  const navigate = useNavigate();

  const {
    addToCart,
    loading,
  } = useCart();

  const {
    isFavorite,
    toggleFavorite,
  } = useFavorites();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [variants, setVariants] = useState<
    Product[]
  >([]);

  const [loadingPage, setLoadingPage] =
    useState(true);

  const [errorMsg, setErrorMsg] = useState<
    string | null
  >(null);

  const [added, setAdded] = useState(false);

  const thumbsRef =
    useRef<HTMLDivElement | null>(null);

  const [activeImgIdx, setActiveImgIdx] =
    useState(0);

  const [zoomOpen, setZoomOpen] =
    useState(false);

  /*
    Estado exclusivo del botón de favoritos.
  */
  const [
    favoriteAnimating,
    setFavoriteAnimating,
  ] = useState(false);

  const [
    favoriteProcessing,
    setFavoriteProcessing,
  ] = useState(false);

  const [
    removeFavoriteOpen,
    setRemoveFavoriteOpen,
  ] = useState(false);

  const [
    guestFavoriteOpen,
    setGuestFavoriteOpen,
  ] = useState(false);

  const favoriteAnimationTimerRef =
    useRef<number | null>(null);

  const gallery = useMemo(() => {
    const imgs = product?.images ?? [];

    if (imgs.length > 0) {
      return imgs;
    }

    const legacy = (product?.img ?? "").trim();

    if (legacy) {
      return [
        {
          id: -1,
          url: legacy,
          alt: product?.name ?? null,
          sort_order: 0,
          is_primary: true,
        } satisfies ProductImage,
      ];
    }

    return [
      {
        id: -2,
        url: FALLBACK_IMG,
        alt: product?.name ?? null,
        sort_order: 0,
        is_primary: true,
      } satisfies ProductImage,
    ];
  }, [product]);

  useEffect(() => {
    if (!product) return;

    const idx = gallery.findIndex(
      (image) => image.is_primary
    );

    setActiveImgIdx(idx >= 0 ? idx : 0);

    thumbsRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [
    productId,
    product?.id,
    gallery,
  ]);

  useEffect(() => {
    return () => {
      if (
        favoriteAnimationTimerRef.current
      ) {
        window.clearTimeout(
          favoriteAnimationTimerRef.current
        );
      }
    };
  }, []);

  const activeImg =
    gallery[
      Math.min(
        activeImgIdx,
        gallery.length - 1
      )
    ]?.url ?? FALLBACK_IMG;

  const clampIdx = (index: number) =>
    Math.max(
      0,
      Math.min(index, gallery.length - 1)
    );

  const prevImg = () => {
    setActiveImgIdx((index) =>
      clampIdx(index - 1)
    );
  };

  const nextImg = () => {
    setActiveImgIdx((index) =>
      clampIdx(index + 1)
    );
  };

  const openZoom = () => {
    setZoomOpen(true);
  };

  const closeZoom = () => {
    setZoomOpen(false);
  };

  useEffect(() => {
    let alive = true;

    const fetchExtraInfo = async (
      id: number
    ) => {
      const { data, error } = await supabase
        .from("product_extra_info")
        .select(`
          ingredients,
          nutritional_info,
          usage_instructions,
          warnings,
          allergens,
          usage_tips,
          medical_disclaimer,
          legal_regulation
        `)
        .eq("product_id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "Error cargando product_extra_info:",
          error
        );

        return null;
      }

      return data
        ? normalizeExtraInfoRow(data)
        : null;
    };

    const fetchOneAndVariants =
      async () => {
        setErrorMsg(null);

        if (!Number.isFinite(productId)) {
          setErrorMsg("ID inválido");
          setLoadingPage(false);
          return;
        }

        setLoadingPage(true);

        const { data, error } = await supabase
          .from("public_products")
          .select(`
            id,
            slug,
            category,
            name,
            brand,
            price,
            old_price,
            promo_type,
            promo_active,
            img,
            description,
            stock,
            bio,
            vegan,
            gluten_free,
            lactose_free,
            expiration_date,
            flavor,
            size
          `)
          .eq("id", productId)
          .single();

        if (!alive) return;

        if (error || !data) {
          setErrorMsg(
            error?.message ??
              "No se pudo cargar el producto"
          );

          setLoadingPage(false);
          return;
        }

        const {
          data: imageRows,
          error: imageErr,
        } = await supabase
          .from("product_images")
          .select(`
            id,
            product_id,
            url,
            alt,
            sort_order,
            is_primary
          `)
          .eq(
            "product_id",
            Number(data.id)
          )
          .order("sort_order", {
            ascending: true,
          });

        if (imageErr) {
          console.error(
            "Error cargando imágenes:",
            imageErr
          );
        }

        const extraInfo =
          await fetchExtraInfo(
            Number(data.id)
          );

        if (!alive) return;

        const prod = normalizeProductRow(
          data,
          extraInfo,
          imageRows ?? []
        );

        setProduct(prod);

        const canonicalSlug =
          makeCanonicalSlug(prod);

        if (
          slug &&
          slug !== canonicalSlug
        ) {
          navigate(
            `/shopping/${canonicalSlug}`,
            {
              replace: true,
            }
          );
        }

        const {
          data: variantData,
          error: variantError,
        } = await supabase
          .from("public_products")
          .select(`
            id,
            slug,
            category,
            name,
            brand,
            price,
            old_price,
            promo_type,
            promo_active,
            img,
            description,
            stock,
            bio,
            vegan,
            gluten_free,
            lactose_free,
            expiration_date,
            flavor,
            size
          `)
          .eq("name", prod.name)
          .eq("brand", prod.brand)
          .eq("category", prod.category)
          .order("id", {
            ascending: true,
          });

        if (!alive) return;

        if (
          !variantError &&
          variantData
        ) {
          let imagesByProductId =
            new Map<number, any[]>();

          if (variantData.length > 0) {
            const variantIds =
              variantData.map(
                (row: any) =>
                  Number(row.id)
              );

            const {
              data: variantImages,
              error: variantImagesError,
            } = await supabase
              .from("product_images")
              .select(`
                id,
                product_id,
                url,
                alt,
                sort_order,
                is_primary
              `)
              .in(
                "product_id",
                variantIds
              )
              .order("sort_order", {
                ascending: true,
              });

            if (variantImagesError) {
              console.error(
                "Error cargando imágenes de variantes:",
                variantImagesError
              );
            }

            imagesByProductId = (
              variantImages ?? []
            ).reduce(
              (
                map,
                image
              ) => {
                const currentProductId =
                  Number(
                    image.product_id
                  );

                const images =
                  map.get(
                    currentProductId
                  ) ?? [];

                images.push(image);

                map.set(
                  currentProductId,
                  images
                );

                return map;
              },
              new Map<
                number,
                any[]
              >()
            );
          }

          const list = (
            variantData ?? []
          ).map((row: any) =>
            normalizeProductRow(
              row,
              Number(row.id) ===
                prod.id
                ? extraInfo
                : null,
              imagesByProductId.get(
                Number(row.id)
              ) ?? []
            )
          );

          const unique =
            new Map<
              number,
              Product
            >();

          list.forEach((item) => {
            unique.set(
              item.id,
              item
            );
          });

          unique.set(
            prod.id,
            prod
          );

          setVariants(
            Array.from(
              unique.values()
            )
          );
        } else {
          setVariants([prod]);
        }

        setAdded(false);
        setLoadingPage(false);
      };

    void fetchOneAndVariants();

    return () => {
      alive = false;
    };
  }, [
    productId,
    slug,
    navigate,
  ]);

  useEffect(() => {
    const onKey = (
      event: KeyboardEvent
    ) => {
      if (zoomOpen) return;

      if (
        event.key === "ArrowLeft"
      ) {
        prevImg();
      }

      if (
        event.key === "ArrowRight"
      ) {
        nextImg();
      }
    };

    window.addEventListener(
      "keydown",
      onKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKey
      );
    };
  }, [
    gallery.length,
    zoomOpen,
  ]);

  useEffect(() => {
    if (!zoomOpen) return;

    const onEscape = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        setZoomOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onEscape
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        onEscape
      );

      document.body.style.overflow =
        "";
    };
  }, [zoomOpen]);

  const handleBack = () => {
    navigate("/shopping");
  };

  const handleAdd = async () => {
    if (!product) return;

    await addToCart(product.id, 1);

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1200);
  };

  /*
    Añade directamente a favoritos.
    Si ya está guardado, abre el popup de confirmación.
  */
  const handleFavorite = async () => {
    if (
      !product ||
      favoriteProcessing
    ) {
      return;
    }

    if (isFavorite(product.id)) {
      setRemoveFavoriteOpen(true);
      return;
    }

    setFavoriteAnimating(false);

    window.requestAnimationFrame(
      () => {
        setFavoriteAnimating(true);
      }
    );

    if (
      favoriteAnimationTimerRef.current
    ) {
      window.clearTimeout(
        favoriteAnimationTimerRef.current
      );
    }

    favoriteAnimationTimerRef.current =
      window.setTimeout(() => {
        setFavoriteAnimating(false);
        favoriteAnimationTimerRef.current =
          null;
      }, 420);

    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.user) {
      setGuestFavoriteOpen(true);
      return;
    }

    setFavoriteProcessing(true);

    try {
      await toggleFavorite(product.id);
    } catch (error) {
      console.error(
        "Error añadiendo a favoritos:",
        error
      );
    } finally {
      setFavoriteProcessing(false);
    }
  };

  const continueFavoriteAsGuest = async () => {
    if (
      !product ||
      favoriteProcessing
    ) {
      return;
    }

    setFavoriteProcessing(true);

    try {
      await toggleFavorite(product.id);
      setGuestFavoriteOpen(false);
    } catch (error) {
      console.error(
        "Error guardando favorito como invitado:",
        error
      );
    } finally {
      setFavoriteProcessing(false);
    }
  };

  const goToLoginForFavorite = () => {
    if (product?.id) {
      try {
        localStorage.setItem(
          "saminatura_pending_favorite_v1",
          String(product.id)
        );
      } catch {
        // Sin acción.
      }
    }

    setGuestFavoriteOpen(false);

    navigate("/usuario", {
      state: {
        message:
          "Inicia sesión para conservar tus favoritos en tu cuenta.",
        returnTo:
          window.location.pathname +
          window.location.search,
      },
    });
  };

  const closeRemoveFavorite = () => {
    if (favoriteProcessing) return;
    setRemoveFavoriteOpen(false);
  };

  const confirmRemoveFavorite = async () => {
    if (
      !product ||
      favoriteProcessing
    ) {
      return;
    }

    setFavoriteProcessing(true);

    try {
      await toggleFavorite(product.id);
      setRemoveFavoriteOpen(false);
    } catch (error) {
      console.error(
        "Error quitando de favoritos:",
        error
      );
    } finally {
      setFavoriteProcessing(false);
    }
  };

  const goToVariant = async (
    variant: Product
  ) => {
    if (
      variant.id === product?.id
    ) {
      return;
    }

    setAdded(false);
    setZoomOpen(false);
    setActiveImgIdx(0);

    const existingExtraInfo =
      variant.extraInfo ??
      variants.find(
        (item) =>
          item.id === variant.id
      )?.extraInfo ??
      null;

    if (existingExtraInfo) {
      setProduct({
        ...variant,
        extraInfo:
          existingExtraInfo,
      });
    } else {
      const {
        data,
        error,
      } = await supabase
        .from("product_extra_info")
        .select(`
          ingredients,
          nutritional_info,
          usage_instructions,
          warnings,
          allergens,
          usage_tips,
          medical_disclaimer,
          legal_regulation
        `)
        .eq(
          "product_id",
          variant.id
        )
        .maybeSingle();

      const extraInfo =
        !error && data
          ? normalizeExtraInfoRow(
              data
            )
          : null;

      setProduct({
        ...variant,
        extraInfo,
      });

      setVariants((current) =>
        current.map((item) =>
          item.id === variant.id
            ? {
                ...item,
                extraInfo,
              }
            : item
        )
      );
    }

    const canonical =
      makeCanonicalSlug(variant);

    window.history.pushState(
      null,
      "",
      `/shopping/${canonical}`
    );
  };

  if (loadingPage) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">
          Cargando producto…
        </p>
      </section>
    );
  }

  if (errorMsg || !product) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="font-semibold text-red-700">
          No se pudo cargar el producto
        </p>

        <p className="text-sm text-gray-600">
          {errorMsg ??
            "Producto no encontrado"}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-50"
          >
            Volver a la tienda
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-black px-5 py-2 text-white hover:bg-gray-900"
          >
            Ir a shopping
          </button>
        </div>
      </section>
    );
  }

  const promo =
    getPromoInfo(product);

  const stockInfo =
    getStockLabel(product.stock);

  const outOfStock =
    product.stock !== null &&
    product.stock <= 0;

  const productIsFavorite =
    isFavorite(product.id);

  const cornerBadges: Array<{
    text: string;
    tone: FeatureTone;
  }> = [
    ...(product.bio
      ? [
          {
            text: "Bio",
            tone: "bio" as const,
          },
        ]
      : []),

    ...(product.vegan
      ? [
          {
            text: "Vegan",
            tone: "vegan" as const,
          },
        ]
      : []),

    ...(product.gluten_free
      ? [
          {
            text: "Sin gluten",
            tone:
              "gluten_free" as const,
          },
        ]
      : []),

    ...(product.lactose_free
      ? [
          {
            text: "Sin lactosa",
            tone:
              "lactose_free" as const,
          },
        ]
      : []),
  ];

  const hasVariants =
    variants.length > 1;

  const currentVariantId =
    product.id;

  const displayName =
    fullProductName(product);

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <style>{`
        @keyframes productFavoritePop {
          0% {
            transform: scale(1);
          }

          35% {
            transform: scale(1.16);
          }

          65% {
            transform: scale(0.96);
          }

          100% {
            transform: scale(1);
          }
        }

        .product-favorite-pop {
          animation: productFavoritePop 420ms ease-out;
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1700px] px-4 md:px-8 xl:px-12 2xl:px-16">
        <div className="w-full overflow-visible rounded-none bg-white shadow-none">
          <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-10">
            {/* COLUMNA IZQUIERDA: GALERÍA + ACCIONES */}
            <div className="self-start">
              <div className="relative rounded-[24px] bg-[#fafafa] p-4 md:p-5">
              {promo && (
                <div className="absolute left-5 top-5 z-10">
                  <span
                    className={[
                      "rounded-full px-4 py-2 text-sm font-extrabold shadow-lg",

                      promo.style ===
                      "unit"
                        ? "border border-white/30 bg-[#8c0327] text-white"
                        : "border border-black/10 bg-amber-300 text-black",
                    ].join(" ")}
                  >
                    {promo.badge}
                  </span>
                </div>
              )}

              {cornerBadges.length > 0 && (
                <div className="absolute right-5 top-5 z-10 flex max-w-[260px] flex-wrap justify-end gap-2">
                  {cornerBadges.map(
                    (badge) => {
                      const styles =
                        FEATURE_BADGE_STYLES[
                          badge.tone
                        ];

                      return (
                        <span
                          key={badge.text}
                          className={[
                            "inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm",
                            styles.chip,
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-2 w-2 rounded-full",
                              styles.dot,
                            ].join(" ")}
                          />

                          {badge.text}
                        </span>
                      );
                    }
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex select-none flex-col items-center gap-3">
                  <div
                    ref={thumbsRef}
                    className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1"
                  >
                    {gallery.map(
                      (
                        image,
                        index
                      ) => {
                        const selected =
                          index ===
                          activeImgIdx;

                        return (
                          <button
                            key={`${image.id}-${image.url}`}
                            type="button"
                            onClick={() =>
                              setActiveImgIdx(
                                index
                              )
                            }
                            className={[
                              "h-[92px] w-20 overflow-hidden rounded-xl border bg-white",

                              selected
                                ? "border-black"
                                : "border-gray-200 hover:border-gray-300",
                            ].join(" ")}
                            title={
                              image.alt ??
                              displayName
                            }
                            aria-label={`Ver imagen ${
                              index + 1
                            }`}
                          >
                            <img
                              src={
                                image.url
                              }
                              alt={
                                image.alt ??
                                displayName
                              }
                              className="h-full w-full bg-gray-50 object-contain"
                              loading="lazy"
                            />
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

<div className="relative flex h-[430px] flex-1 items-center justify-center rounded-[22px] bg-white md:h-[500px]">                  <img
                    src={activeImg}
                    alt={displayName}
                    onClick={openZoom}
                    className="block max-h-[560px] w-full cursor-zoom-in rounded-[22px] object-contain"
                  />

                  <button
                    type="button"
                    onClick={openZoom}
                    className="absolute bottom-4 right-4 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-white"
                  >
                    Ampliar
                  </button>

                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImg}
                        disabled={
                          activeImgIdx <= 0
                        }
                        aria-label="Imagen anterior"
                        className={[
                          "absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm transition hover:bg-white active:scale-95",

                          activeImgIdx <= 0
                            ? "cursor-not-allowed opacity-50"
                            : "",
                        ].join(" ")}
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={nextImg}
                        disabled={
                          activeImgIdx >=
                          gallery.length - 1
                        }
                        aria-label="Imagen siguiente"
                        className={[
                          "absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm transition hover:bg-white active:scale-95",

                          activeImgIdx >=
                          gallery.length - 1
                            ? "cursor-not-allowed opacity-50"
                            : "",
                        ].join(" ")}
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              </div>

              {/* ACCIONES SIEMPRE VISIBLES DEBAJO DE LA IMAGEN */}
              <div className="mt-4 flex items-stretch gap-3 rounded-[22px] border border-gray-200/80 bg-white p-3 shadow-[0_12px_35px_rgba(17,24,39,0.06)]">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={loading || outOfStock}
                  className={[
                    "flex min-h-[54px] min-w-0 flex-1 items-center justify-center gap-3 rounded-full px-4 py-3.5 transition-all duration-300",
                    outOfStock
                      ? "cursor-not-allowed bg-gray-200 text-gray-500"
                      : "cursor-pointer bg-gray-950 text-white shadow-sm hover:bg-gray-800",
                    loading ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 16 16"
                    height="23"
                    width="23"
                    xmlns="http://www.w3.org/2000/svg"
                    className={outOfStock ? "fill-[#666666]" : "fill-white"}
                    aria-hidden="true"
                  >
                    <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z" />
                    <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1.1 1.1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                  </svg>

                  <span className="truncate text-sm font-semibold sm:text-[15px]">
                    {outOfStock
                      ? "Fuera de stock"
                      : added
                      ? "¡Añadido!"
                      : "Añadir a la cesta"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleFavorite();
                  }}
                  disabled={favoriteProcessing}
                  className={[
                    "flex min-h-[54px] w-[56px] shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2",
                    productIsFavorite
                      ? "border-[#8c3342] bg-[#8c3342] text-white hover:border-[#762a37] hover:bg-[#762a37]"
                      : "border-[#efc8cd] bg-[#fff1f3] text-[#a13f4d] hover:border-[#dda9b0] hover:bg-[#fbe4e7]",
                    favoriteProcessing
                      ? "cursor-wait opacity-70"
                      : "cursor-pointer",
                    favoriteAnimating ? "product-favorite-pop" : "",
                  ].join(" ")}
                  aria-label={
                    productIsFavorite
                      ? "Eliminar de favoritos"
                      : "Añadir a favoritos"
                  }
                  title={
                    productIsFavorite
                      ? "Eliminar de favoritos"
                      : "Añadir a favoritos"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-6 w-6 transition-all duration-200"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill={productIsFavorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="min-h-[54px] shrink-0 rounded-full border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:px-6"
                >
                  Volver
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: INFORMACIÓN Y DESPLEGABLES */}
            <div
              className="rounded-[28px] border border-gray-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(17,24,39,0.06)] md:p-8 xl:p-10"
              style={{
                fontFamily:
                  '"Inter", sans-serif',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gray-300" />

                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {product.category}
                </span>
              </div>

              <h1
                className="mt-5 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-gray-950 md:text-[2.65rem]"
                style={{
                  fontFamily:
                    '"Inter", sans-serif',
                }}
              >
                {displayName}
              </h1>

              <p className="mt-3 text-[15px] font-medium text-gray-500">
                {product.brand}
              </p>

              {(product.flavor ||
                product.size) && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700">
                    {variantLabel(
                      product
                    )}
                  </span>
                </div>
              )}

              {promo && (
                <p className="mt-4 text-sm font-semibold text-[#8c0327]">
                  {promo.text}
                </p>
              )}

              <div className="mt-8 flex items-end gap-4 border-y border-gray-100 py-6">
                {product.old_price !==
                  null &&
                  product.old_price >
                    product.price && (
                    <span className="text-xl text-gray-400 line-through">
                      {product.old_price.toFixed(
                        2
                      )}
                      €
                    </span>
                  )}

                <span
                  className="text-[2.55rem] font-semibold tracking-[-0.04em] text-gray-950"
                  style={{
                    fontFamily:
                      '"Inter", sans-serif',
                  }}
                >
                  {product.price.toFixed(
                    2
                  )}
                  €
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {product.bio && (
                  <Badge
                    text="Bio"
                    tone="bio"
                  />
                )}

                {product.vegan && (
                  <Badge
                    text="Vegan"
                    tone="vegan"
                  />
                )}

                {product.gluten_free && (
                  <Badge
                    text="Sin gluten"
                    tone="gluten_free"
                  />
                )}

                {product.lactose_free && (
                  <Badge
                    text="Sin lactosa"
                    tone="lactose_free"
                  />
                )}

                <Badge
                  text={stockInfo.text}
                  danger={
                    stockInfo.danger
                  }
                />
              </div>

              {hasVariants && (
                <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                  <div className="text-sm font-semibold text-gray-900">
                    Elige otra opción
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {variants
                      .slice()
                      .sort((a, b) => {
                        const first =
                          variantLabel(
                            a
                          ).toLowerCase();

                        const second =
                          variantLabel(
                            b
                          ).toLowerCase();

                        return first.localeCompare(
                          second
                        );
                      })
                      .map(
                        (variant) => {
                          const selected =
                            variant.id ===
                            currentVariantId;

                          const label =
                            variantLabel(
                              variant
                            );

                          const disabled =
                            variant.stock !==
                              null &&
                            variant.stock <=
                              0;

                          return (
                            <button
                              key={
                                variant.id
                              }
                              type="button"
                              onClick={() =>
                                goToVariant(
                                  variant
                                )
                              }
                              disabled={
                                selected
                              }
                              className={[
                                "rounded-full border px-3.5 py-2 text-sm font-medium transition",

                                selected
                                  ? "cursor-default border-gray-950 bg-gray-950 text-white"
                                  : "border-gray-200 bg-white text-gray-800 hover:border-gray-400",

                                disabled &&
                                !selected
                                  ? "opacity-60"
                                  : "",
                              ].join(" ")}
                              title={
                                disabled
                                  ? "Fuera de stock"
                                  : "Ver opción"
                              }
                            >
                              {label}

                              {disabled
                                ? " · (sin stock)"
                                : ""}
                            </button>
                          );
                        }
                      )}
                  </div>
                </div>
              )}

              <div className="mt-8 border-t border-gray-200 pt-5">
                <ProductInformationAccordion
                  description={product.description}
                  extraInfo={product.extraInfo}
                />
              </div>


              </div>
            </div>
          </div>
        </div>

      <GuestFavoriteModal
        open={guestFavoriteOpen}
        productName={displayName}
        processing={favoriteProcessing}
        onClose={() => {
          if (!favoriteProcessing) {
            setGuestFavoriteOpen(false);
          }
        }}
        onContinueAsGuest={
          continueFavoriteAsGuest
        }
        onLogin={goToLoginForFavorite}
      />

      {removeFavoriteOpen && product && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
          onClick={closeRemoveFavorite}
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="
                    M12 21.35
                    l-1.45-1.32
                    C5.4 15.36 2 12.28 2 8.5
                    C2 5.42 4.42 3 7.5 3
                    c1.74 0 3.41.81 4.5 2.09
                    C13.09 3.81 14.76 3 16.5 3
                    C19.58 3 22 5.42 22 8.5
                    c0 3.78-3.4 6.86-8.55 11.54
                    L12 21.35z
                  "
                  fill="currentColor"
                />
              </svg>
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
                {displayName}
              </span>{" "}
              de tu lista de favoritos.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeRemoveFavorite}
                disabled={favoriteProcessing}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void confirmRemoveFavorite();
                }}
                disabled={favoriteProcessing}
                className="flex-1 rounded-full bg-[#8c3342] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#762a37] disabled:cursor-wait disabled:opacity-70"
              >
                {favoriteProcessing
                  ? "Quitando…"
                  : "Sí, quitar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          onClick={closeZoom}
        >
          <div
            className="relative flex h-[85vh] w-full max-w-6xl items-center justify-center"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={closeZoom}
              className="absolute right-4 top-4 z-20 h-11 w-11 rounded-full bg-white/90 text-xl font-bold text-black shadow hover:bg-white"
              aria-label="Cerrar zoom"
            >
              ×
            </button>

            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
              <img
                src={activeImg}
                alt={displayName}
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


type ProductInfoIconName =
  | "description"
  | "ingredients"
  | "nutrition"
  | "usage"
  | "warnings"
  | "allergens"
  | "tips"
  | "medical"
  | "legal";

function ProductInformationAccordion({
  description,
  extraInfo,
}: {
  description: string | null;
  extraInfo: ProductExtraInfoData | null;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const sections = [
    {
      key: "description",
      title: "Descripción",
      content: description,
      icon: "description" as ProductInfoIconName,
    },
    {
      key: "ingredients",
      title: "Ingredientes",
      content: extraInfo?.ingredients,
      icon: "ingredients" as ProductInfoIconName,
    },
    {
      key: "nutritional_info",
      title: "Información nutricional",
      content: extraInfo?.nutritional_info,
      icon: "nutrition" as ProductInfoIconName,
    },
    {
      key: "usage_instructions",
      title: "Modo de uso",
      content: extraInfo?.usage_instructions,
      icon: "usage" as ProductInfoIconName,
    },
    {
      key: "warnings",
      title: "Advertencias",
      content: extraInfo?.warnings,
      icon: "warnings" as ProductInfoIconName,
    },
    {
      key: "allergens",
      title: "Alérgenos",
      content: extraInfo?.allergens,
      icon: "allergens" as ProductInfoIconName,
    },
    {
      key: "usage_tips",
      title: "Consejos de uso",
      content: extraInfo?.usage_tips,
      icon: "tips" as ProductInfoIconName,
    },
    {
      key: "medical_disclaimer",
      title: "Aviso médico",
      content: extraInfo?.medical_disclaimer,
      icon: "medical" as ProductInfoIconName,
    },
    {
      key: "legal_regulation",
      title: "Información legal",
      content: extraInfo?.legal_regulation,
      icon: "legal" as ProductInfoIconName,
    },
  ].filter(
    (section) =>
      typeof section.content === "string" &&
      section.content.trim().length > 0
  );

  if (sections.length === 0) return null;

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isOpen = openKey === section.key;
        const panelId = `product-info-${section.key}`;

        return (
          <div
            key={section.key}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.035)] transition hover:border-gray-300"
          >
            <button
              type="button"
              onClick={() =>
                setOpenKey((current) =>
                  current === section.key ? null : section.key
                )
              }
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-gray-50/70"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-500">
                <ProductInfoIcon name={section.icon} />
              </span>

              <span className="min-w-0 flex-1 text-[15px] font-semibold text-gray-900">
                {section.title}
              </span>

              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className={[
                  "h-5 w-5 shrink-0 text-gray-600 transition-transform duration-300",
                  isOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              >
                <path
                  d="m5.5 7.5 4.5 4.5 4.5-4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div
              id={panelId}
              className={[
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              ].join(" ")}
            >
              <div className="overflow-hidden">
                <div className="border-t border-gray-100 px-5 py-5 pl-[60px] whitespace-pre-line text-[15px] leading-7 text-gray-600">
                  {section.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductInfoIcon({
  name,
}: {
  name: ProductInfoIconName;
}) {
  const common = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "description") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l3 3V20.5H7z" />
        <path d="M14 3.5v3h3" />
        <path d="M10 11h4M10 14.5h4" />
      </svg>
    );
  }

  if (name === "ingredients") {
    return (
      <svg {...common}>
        <path d="M19 4.5C11.5 4.8 6.5 8.5 5 16c6.8.3 11.7-3.6 14-11.5Z" />
        <path d="M5 19c2.3-4.7 5.7-7.7 10.5-9.5" />
      </svg>
    );
  }

  if (name === "nutrition") {
    return (
      <svg {...common}>
        <path d="M5 20V13M9 20V9M13 20V5M17 20v-8M3.5 20h17" />
      </svg>
    );
  }

  if (name === "usage") {
    return (
      <svg {...common}>
        <path d="M12 3.5c-2.4 3.1-5.5 6.7-5.5 10.4A5.5 5.5 0 0 0 12 19.5a5.5 5.5 0 0 0 5.5-5.6C17.5 10.2 14.4 6.6 12 3.5Z" />
      </svg>
    );
  }

  if (name === "warnings") {
    return (
      <svg {...common}>
        <path d="M12 4 21 20H3L12 4Z" />
        <path d="M12 9v5M12 17.2v.1" />
      </svg>
    );
  }

  if (name === "allergens") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.3-7 9-4.2-1.7-7-4.8-7-9V6l7-2.5Z" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }

  if (name === "tips") {
    return (
      <svg {...common}>
        <path d="M8.5 15.5c-1.2-1-2-2.6-2-4.4A5.5 5.5 0 0 1 12 5.5a5.5 5.5 0 0 1 5.5 5.6c0 1.8-.8 3.4-2 4.4-.8.7-1.2 1.3-1.3 2H9.8c-.1-.7-.5-1.3-1.3-2Z" />
        <path d="M9.5 20h5M10 17.5h4" />
      </svg>
    );
  }

  if (name === "medical") {
    return (
      <svg {...common}>
        <path d="M8 4h8v5h5v8h-5v4H8v-4H3V9h5V4Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3.5h12v17H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function Badge({
  text,
  danger = false,
  tone,
}: {
  text: string;
  danger?: boolean;
  tone?: FeatureTone;
}) {
  if (danger) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />

        {text}
      </span>
    );
  }

  if (tone) {
    const styles =
      FEATURE_BADGE_STYLES[tone];

    return (
      <span
        className={[
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
          styles.chip,
        ].join(" ")}
      >
        <span
          className={[
            "h-2 w-2 rounded-full",
            styles.dot,
          ].join(" ")}
        />

        {text}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
      {text}
    </span>
  );
}