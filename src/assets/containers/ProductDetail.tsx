import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import type { PromoType } from "../containers/Products";
import { useCart } from "../containers/CartContext";
import ProductExtraInfo, {
  type ProductExtraInfoData,
} from "../containers/ProductExtraInfo";

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

const FALLBACK_IMG = "https://placehold.co/900x900?text=Sin+imagen";

type FeatureTone = "bio" | "vegan" | "gluten_free" | "lactose_free";

const FEATURE_BADGE_STYLES: Record<
  FeatureTone,
  { chip: string; dot: string }
> = {
  bio: {
    chip: "border-emerald-200 bg-white/90 text-emerald-800 backdrop-blur-sm",
    dot: "bg-emerald-500",
  },
  vegan: {
    chip: "border-lime-200 bg-white/90 text-lime-800 backdrop-blur-sm",
    dot: "bg-lime-500",
  },
  gluten_free: {
    chip: "border-amber-200 bg-white/90 text-amber-800 backdrop-blur-sm",
    dot: "bg-amber-500",
  },
  lactose_free: {
    chip: "border-violet-200 bg-white/90 text-violet-800 backdrop-blur-sm",
    dot: "bg-violet-500",
  },
};

function getPromoInfo(p: Product) {
  if (p.promo_active) {
    if (p.promo_type === "2x1") {
      return { badge: "2x1", text: "Llévate 2 y paga 1", style: "unit" as const };
    }
    if (p.promo_type === "3x2") {
      return { badge: "3x2", text: "Llévate 3 y paga 2", style: "unit" as const };
    }
    if (p.promo_type === "second_half") {
      return {
        badge: "2ª al 50%",
        text: "La segunda unidad al 50%",
        style: "unit" as const,
      };
    }
  }

  if (p.old_price && p.old_price > p.price && p.old_price > 0) {
    const pct = Math.round(((p.old_price - p.price) / p.old_price) * 100);
    if (pct > 0) {
      return { badge: `-${pct}%`, text: "Oferta especial", style: "percent" as const };
    }
  }

  return null;
}

function getStockLabel(stock: number | null) {
  if (stock === null) return { text: "En stock", danger: false };
  if (stock <= 0) return { text: "Fuera de stock", danger: true };
  if (stock < 5) return { text: `¡Solo quedan ${stock} en stock!`, danger: true };
  return { text: "En stock", danger: false };
}

function makeCanonicalSlug(prod: { id: number; slug: string | null }) {
  const baseSlug = (prod.slug ?? "").trim();
  const idSuffix = `-${prod.id}`;

  return baseSlug
    ? baseSlug.endsWith(idSuffix)
      ? baseSlug
      : `${baseSlug}${idSuffix}`
    : String(prod.id);
}

function variantLabel(p: Pick<Product, "flavor" | "size">) {
  const f = (p.flavor ?? "").trim();
  const s = (p.size ?? "").trim();
  if (f && s) return `${f} · ${s}`;
  if (f) return f;
  if (s) return s;
  return "—";
}

function fullProductName(p: Pick<Product, "name" | "flavor" | "size">) {
  const base = (p.name ?? "").trim();
  const f = (p.flavor ?? "").trim();
  const s = (p.size ?? "").trim();
  return [base, f, s].filter(Boolean).join(" ");
}

function normalizeExtraInfoRow(data: any): ProductExtraInfoData {
  return {
    ingredients: data?.ingredients ?? null,
    nutritional_info: data?.nutritional_info ?? null,
    usage_instructions: data?.usage_instructions ?? null,
    warnings: data?.warnings ?? null,
    allergens: data?.allergens ?? null,
    usage_tips: data?.usage_tips ?? null,
    medical_disclaimer: data?.medical_disclaimer ?? null,
    legal_regulation: data?.legal_regulation ?? null,
  };
}

function normalizeProductRow(
  data: any,
  extraInfo: ProductExtraInfoData | null = null,
  productImages: any[] = []
): Product {
  const rawImgs = Array.isArray(productImages) ? productImages : [];

  const images: ProductImage[] = rawImgs
    .map((x: any) => ({
      id: Number(x.id),
      url: String(x.url ?? ""),
      alt: x.alt ?? null,
      sort_order: Number(x.sort_order ?? 0),
      is_primary: !!x.is_primary,
    }))
    .filter((x) => x.url.trim() !== "")
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  return {
    id: Number(data.id),
    slug: data.slug ?? null,
    category: data.category ?? "",
    name: data.name ?? "",
    brand: data.brand ?? "",

    price: Number(data.price ?? 0),
    old_price: data.old_price == null ? null : Number(data.old_price),

purchase_price: null,
vat_rate: 0,
recargo_rate: 0,
supplier_name: null,

    promo_type: (data.promo_type ?? "none") as PromoType,
    promo_active: !!data.promo_active,

    img: data.img ?? null,
    description: data.description ?? null,

    stock: data.stock == null ? null : Number(data.stock),

    bio: !!data.bio,
    vegan: !!data.vegan,
    gluten_free: !!data.gluten_free,
    lactose_free: !!data.lactose_free,

    expiration_date: data.expiration_date ?? null,

    flavor: data.flavor ?? null,
    size: data.size ?? null,

    images,
    extraInfo,
  };
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();

  const productId = useMemo(() => {
    if (!slug) return NaN;
    if (/^\d+$/.test(slug)) return Number(slug);
    const last = slug.split("-").pop();
    return Number(last);
  }, [slug]);

  const navigate = useNavigate();
  const { addToCart, loading } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Product[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [added, setAdded] = useState(false);

  const [descExpanded, setDescExpanded] = useState(false);

  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  const [zoomOpen, setZoomOpen] = useState(false);

  const gallery = useMemo(() => {
    const imgs = product?.images ?? [];
    if (imgs.length > 0) return imgs;

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
    const idx = gallery.findIndex((x) => x.is_primary);
    setActiveImgIdx(idx >= 0 ? idx : 0);
    thumbsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId, product?.id, gallery]);

  const activeImg = gallery[Math.min(activeImgIdx, gallery.length - 1)]?.url ?? FALLBACK_IMG;

  const clampIdx = (i: number) => Math.max(0, Math.min(i, gallery.length - 1));
  const prevImg = () => setActiveImgIdx((i) => clampIdx(i - 1));
  const nextImg = () => setActiveImgIdx((i) => clampIdx(i + 1));

  const openZoom = () => setZoomOpen(true);
  const closeZoom = () => setZoomOpen(false);

  useEffect(() => {
    let alive = true;

    const fetchExtraInfo = async (id: number) => {
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
        console.error("Error cargando product_extra_info:", error);
        return null;
      }

      return data ? normalizeExtraInfoRow(data) : null;
    };

    const fetchOneAndVariants = async () => {
      setErrorMsg(null);

      if (!Number.isFinite(productId)) {
        setErrorMsg("ID inválido");
        setLoadingPage(false);
        return;
      }

      setLoadingPage(true);

      // public_products ya devuelve únicamente productos:
      // isgood = true, is_active = true e is_discontinued = false.
      const { data, error } = await supabase
        .from("public_products")
        .select(`
  id, slug, category, name, brand,
  price, old_price,
  promo_type, promo_active,
  img, description, stock,
  bio, vegan, gluten_free, lactose_free,
  expiration_date,
  flavor, size
`)
        .eq("id", productId)
        .single();

      if (!alive) return;

      if (error || !data) {
        setErrorMsg(error?.message ?? "No se pudo cargar el producto");
        setLoadingPage(false);
        return;
      }

      const { data: imageRows, error: imageErr } = await supabase
        .from("product_images")
        .select(`
          id,
          product_id,
          url,
          alt,
          sort_order,
          is_primary
        `)
        .eq("product_id", Number(data.id))
        .order("sort_order", { ascending: true });

      if (imageErr) {
        console.error("Error cargando imágenes:", imageErr);
      }

      const extraInfo = await fetchExtraInfo(Number(data.id));

      if (!alive) return;

      const prod = normalizeProductRow(data, extraInfo, imageRows ?? []);
      setProduct(prod);

      const canonicalSlug = makeCanonicalSlug(prod);
      if (slug && slug !== canonicalSlug) {
        navigate(`/shopping/${canonicalSlug}`, { replace: true });
      }

      // Las variantes también se consultan desde public_products,
      // por lo que solo pueden aparecer variantes públicas.
      const { data: vData, error: vErr } = await supabase
  .from("public_products")
  .select(`
    id, slug, category, name, brand,
    price, old_price,
    promo_type, promo_active,
    img, description, stock,
    bio, vegan, gluten_free, lactose_free,
    expiration_date,
    flavor, size
  `)
        .eq("name", prod.name)
        .eq("brand", prod.brand)
        .eq("category", prod.category)
        .order("id", { ascending: true });

      if (!alive) return;

      if (!vErr && vData) {
        let imagesByProductId = new Map<number, any[]>();

        if (vData.length > 0) {
          const variantIds = vData.map((row: any) => Number(row.id));

          const { data: variantImages, error: variantImagesErr } = await supabase
            .from("product_images")
            .select(`
              id,
              product_id,
              url,
              alt,
              sort_order,
              is_primary
            `)
            .in("product_id", variantIds)
            .order("sort_order", { ascending: true });

          if (variantImagesErr) {
            console.error("Error cargando imágenes de variantes:", variantImagesErr);
          }

          imagesByProductId = (variantImages ?? []).reduce((map, img) => {
            const pid = Number(img.product_id);
            const arr = map.get(pid) ?? [];
            arr.push(img);
            map.set(pid, arr);
            return map;
          }, new Map<number, any[]>());
        }

        const list = (vData ?? []).map((row: any) =>
          normalizeProductRow(
            row,
            Number(row.id) === prod.id ? extraInfo : null,
            imagesByProductId.get(Number(row.id)) ?? []
          )
        );

        const unique = new Map<number, Product>();
        list.forEach((p) => unique.set(p.id, p));
        unique.set(prod.id, prod);

        setVariants(Array.from(unique.values()));
      } else {
        setVariants([prod]);
      }

      setDescExpanded(false);
      setAdded(false);
      setLoadingPage(false);
    };

    fetchOneAndVariants();

    return () => {
      alive = false;
    };
  }, [productId, slug, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoomOpen) return;
      if (e.key === "ArrowLeft") prevImg();
      if (e.key === "ArrowRight") nextImg();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery.length, zoomOpen]);

  useEffect(() => {
    if (!zoomOpen) return;

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
    };

    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [zoomOpen]);

  const handleBack = () => navigate("/shopping");

  const handleAdd = async () => {
    if (!product) return;
    await addToCart(product.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  const goToVariant = async (p: Product) => {
  if (p.id === product?.id) return;

  setDescExpanded(false);
  setAdded(false);
  setZoomOpen(false);
  setActiveImgIdx(0);

  const existingExtraInfo =
    p.extraInfo ??
    variants.find((v) => v.id === p.id)?.extraInfo ??
    null;

  if (existingExtraInfo) {
    setProduct({
      ...p,
      extraInfo: existingExtraInfo,
    });
  } else {
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
      .eq("product_id", p.id)
      .maybeSingle();

    const extraInfo = !error && data ? normalizeExtraInfoRow(data) : null;

    setProduct({
      ...p,
      extraInfo,
    });

    setVariants((prev) =>
      prev.map((item) =>
        item.id === p.id ? { ...item, extraInfo } : item
      )
    );
  }

  const canonical = makeCanonicalSlug(p);

  // Importante:
  // Esto cambia la URL SIN hacer navigate de React Router.
  // Así no se recarga toda la página ni vuelve a salir "Cargando producto…".
  window.history.pushState(null, "", `/shopping/${canonical}`);
};

  if (loadingPage) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando producto…</p>
      </section>
    );
  }

  if (errorMsg || !product) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-red-700 font-semibold">No se pudo cargar el producto</p>
        <p className="text-gray-600 text-sm">{errorMsg ?? "Producto no encontrado"}</p>

        <div className="flex gap-2">
          <button
            onClick={handleBack}
            className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Volver a la tienda
          </button>
          <button
            onClick={handleBack}
            className="px-5 py-2 rounded-full bg-black text-white hover:bg-gray-900"
          >
            Ir a shopping
          </button>
        </div>
      </section>
    );
  }

  const promo = getPromoInfo(product);
  const stockInfo = getStockLabel(product.stock);
  const outOfStock = product.stock !== null && product.stock <= 0;

  const cornerBadges: Array<{ text: string; tone: FeatureTone }> = [
    ...(product.bio ? [{ text: "Bio", tone: "bio" as const }] : []),
    ...(product.vegan ? [{ text: "Vegan", tone: "vegan" as const }] : []),
    ...(product.gluten_free
      ? [{ text: "Sin gluten", tone: "gluten_free" as const }]
      : []),
    ...(product.lactose_free
      ? [{ text: "Sin lactosa", tone: "lactose_free" as const }]
      : []),
  ];

  const hasVariants = variants.length > 1;
  const currentVariantId = product.id;
  const displayName = fullProductName(product);

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-8 xl:px-12 2xl:px-16">
        <div className="w-full rounded-none bg-white shadow-none overflow-visible">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] gap-6 xl:gap-10 items-start">
            <div className="relative self-start rounded-[24px] bg-[#fafafa] p-4 md:p-5">
              {promo && (
                <div className="absolute top-5 left-5 z-10">
                  <span
                    className={[
                      "px-4 py-2 rounded-full font-extrabold text-sm shadow-lg",
                      promo.style === "unit"
                        ? "bg-[#8c0327] text-white border border-white/30"
                        : "bg-amber-300 text-black border border-black/10",
                    ].join(" ")}
                  >
                    {promo.badge}
                  </span>
                </div>
              )}

              {cornerBadges.length > 0 && (
                <div className="absolute top-5 right-5 z-10 flex flex-wrap justify-end gap-2 max-w-[260px]">
                  {cornerBadges.map((b) => {
                    const styles = FEATURE_BADGE_STYLES[b.tone];

                    return (
                      <span
                        key={b.text}
                        className={[
                          "inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm",
                          styles.chip,
                        ].join(" ")}
                      >
                        <span className={["h-2 w-2 rounded-full", styles.dot].join(" ")} />
                        {b.text}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-3 select-none">
                  <div
                    ref={thumbsRef}
                    className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[640px]"
                  >
                    {gallery.map((im, idx) => {
                      const selected = idx === activeImgIdx;
                      return (
                        <button
                          key={`${im.id}-${im.url}`}
                          type="button"
                          onClick={() => setActiveImgIdx(idx)}
                          className={[
                            "w-20 h-[92px] rounded-xl border overflow-hidden bg-white",
                            selected ? "border-black" : "border-gray-200 hover:border-gray-300",
                          ].join(" ")}
                          title={im.alt ?? displayName}
                          aria-label={`Ver imagen ${idx + 1}`}
                        >
                          <img
                            src={im.url}
                            alt={im.alt ?? displayName}
                            className="w-full h-full object-contain bg-gray-50"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative flex-1 min-h-[500px] flex items-center justify-center rounded-[22px] bg-white">
                  <img
                    src={activeImg}
                    alt={displayName}
                    onClick={openZoom}
                    className="block w-full max-h-[700px] object-contain rounded-[22px] cursor-zoom-in"
                  />

                  <button
                    type="button"
                    onClick={openZoom}
                    className="absolute bottom-4 right-4 rounded-full bg-white/95 border border-gray-200 shadow-sm px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-white"
                  >
                    Ampliar
                  </button>

                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImg}
                        disabled={activeImgIdx <= 0}
                        aria-label="Imagen anterior"
                        className={[
                          "absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-gray-200 bg-white/95 shadow-sm flex items-center justify-center hover:bg-white active:scale-95 transition",
                          activeImgIdx <= 0 ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
                        disabled={activeImgIdx >= gallery.length - 1}
                        aria-label="Imagen siguiente"
                        className={[
                          "absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-gray-200 bg-white/95 shadow-sm flex items-center justify-center hover:bg-white active:scale-95 transition",
                          activeImgIdx >= gallery.length - 1 ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

            <div
              className="my-5 rounded-[28px] border border-gray-200/80 bg-white p-6 md:p-8 xl:p-10 shadow-[0_18px_55px_rgba(17,24,39,0.06)]"
              style={{ fontFamily: '"Inter", sans-serif' }}
            >
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gray-300" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {product.category}
                </span>
              </div>

              <h1
  className="mt-5 text-[2rem] md:text-[2.65rem] font-semibold tracking-[-0.035em] leading-[1.08] text-gray-950"
  style={{ fontFamily: '"Inter", sans-serif' }}
>
                {displayName}
              </h1>

              <p className="mt-3 text-[15px] font-medium text-gray-500">{product.brand}</p>

              {(product.flavor || product.size) && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700">
                    {variantLabel(product)}
                  </span>
                </div>
              )}

              {promo && <p className="mt-4 text-sm font-semibold text-[#8c0327]">{promo.text}</p>}

              <div className="mt-8 flex items-end gap-4 border-y border-gray-100 py-6">
                {product.old_price !== null && product.old_price > product.price && (
                  <span className="line-through text-gray-400 text-xl">
                    {product.old_price.toFixed(2)}€
                  </span>
                )}
                <span
  className="text-[2.55rem] font-semibold tracking-[-0.04em] text-gray-950"
  style={{ fontFamily: '"Inter", sans-serif' }}
>
  {product.price.toFixed(2)}€
</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {product.bio && <Badge text="Bio" tone="bio" />}
                {product.vegan && <Badge text="Vegan" tone="vegan" />}
                {product.gluten_free && <Badge text="Sin gluten" tone="gluten_free" />}
                {product.lactose_free && <Badge text="Sin lactosa" tone="lactose_free" />}
                <Badge text={stockInfo.text} danger={stockInfo.danger} />
              </div>

              {hasVariants && (
                <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                  <div className="text-sm font-semibold text-gray-900">Elige otra opción</div>
                  

                  <div className="mt-3 flex flex-wrap gap-2">
                    {variants
                      .slice()
                      .sort((a, b) => {
                        const la = variantLabel(a).toLowerCase();
                        const lb = variantLabel(b).toLowerCase();
                        return la.localeCompare(lb);
                      })
                      .map((v) => {
                        const selected = v.id === currentVariantId;
                        const label = variantLabel(v);
                        const disabled = v.stock !== null && v.stock <= 0;

                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => goToVariant(v)}
                            disabled={selected}
                            className={[
                              "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                              selected
                                ? "border-gray-950 bg-gray-950 text-white cursor-default"
                                : "border-gray-200 bg-white text-gray-800 hover:border-gray-400",
                              disabled && !selected ? "opacity-60" : "",
                            ].join(" ")}
                            title={disabled ? "Fuera de stock" : "Ver opción"}
                          >
                            {label}
                            {disabled ? " · (sin stock)" : ""}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {product.description?.trim() ? (
                <div className="mt-7">
                  <h3 className="text-base font-semibold text-gray-950">
                    Descripción
                  </h3>

                  <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
                    <div
                      id="product-description"
                      className={[
                        "px-5 pt-5 text-[15px] leading-7 text-gray-600 whitespace-pre-line transition-[max-height] duration-500 ease-in-out",
                        descExpanded
                          ? "max-h-[3000px] pb-5"
                          : "max-h-[210px] overflow-hidden pb-12",
                      ].join(" ")}
                    >
                      {product.description}
                    </div>

                    {!descExpanded && (
                      <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-white via-white/95 to-transparent pb-3">
                        <button
                          type="button"
                          onClick={() => setDescExpanded(true)}
                          aria-expanded={descExpanded}
                          aria-controls="product-description"
                          className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                        >
                          

                          <svg
                            className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {descExpanded && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded(false)}
                      aria-expanded={descExpanded}
                      aria-controls="product-description"
                      className="mx-auto mt-3 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    >
                    

                      <svg
                        className="h-4 w-4 rotate-180"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ) : null}

              <div className="mt-8">
                <ProductExtraInfo
                  productName={displayName}
                  extraInfo={product.extraInfo}
                />
              </div>

              <div className="mt-8 flex gap-3 border-t border-gray-100 pt-7">
                <button
                  onClick={handleBack}
                  className="flex-1 px-5 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Volver
                </button>

                <button
                  onClick={handleAdd}
                  disabled={loading || outOfStock}
                  className={[
                    "flex-1 flex items-center justify-center gap-[12px] rounded-full px-5 py-3.5 transition-all duration-300",
                    outOfStock
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-gray-950 text-white cursor-pointer hover:bg-gray-800",
                    !outOfStock && !loading ? "shadow-sm" : "",
                    loading ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 16 16"
                    height="24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    className={["transition-colors duration-[400ms]", outOfStock ? "fill-[#666666]" : "fill-white"].join(
                      " "
                    )}
                  >
                    <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z" />
                    <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1.1 1.1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                  </svg>

                  <span
                    className={[
                      "text-sm font-semibold transition-colors duration-300",
                      outOfStock ? "text-[#666666]" : "text-white",
                    ].join(" ")}
                  >
                    {outOfStock ? "Fuera de stock" : added ? "Añadido!" : "Añadir a la cesta"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {zoomOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={closeZoom}
        >
          <div
            className="relative max-w-6xl w-full h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeZoom}
              className="absolute top-4 right-4 z-20 h-11 w-11 rounded-full bg-white/90 text-black text-xl font-bold shadow hover:bg-white"
              aria-label="Cerrar zoom"
            >
              ×
            </button>

            <div className="w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center">
              <img
                src={activeImg}
                alt={displayName}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </section>
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
    const styles = FEATURE_BADGE_STYLES[tone];

    return (
      <span
        className={[
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
          styles.chip,
        ].join(" ")}
      >
        <span className={["h-2 w-2 rounded-full", styles.dot].join(" ")} />
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
