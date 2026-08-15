import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllShopifyProducts, type ShopifyCatalogProduct } from "../../shopifyCatalog";

type RelatedProduct = {
  productId: string;
  handle: string;
  category: string;
  name: string;
  brand: string;
  price: number;
  old_price: number | null;
  img: string | null;
  stock: number | null;
};

const FALLBACK_IMG = "https://placehold.co/600x600?text=Sin+imagen";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mapProduct(product: ShopifyCatalogProduct): RelatedProduct | null {
  const variant = product.variants.nodes[0];
  if (!variant) return null;

  return {
    productId: product.id,
    handle: product.handle,
    category: product.productType ?? "",
    name: product.title ?? "",
    brand: product.vendor ?? "",
    price: Number(variant.price.amount ?? 0),
    old_price:
      variant.compareAtPrice?.amount != null
        ? Number(variant.compareAtPrice.amount)
        : null,
    img: variant.image?.url ?? product.featuredImage?.url ?? null,
    stock: variant.quantityAvailable ?? null,
  };
}

export default function ShopifyRelatedBrand({
  brand,
  currentProductId,
  title = "Más productos de esta marca",
  limit = 12,
}: {
  brand: string;
  currentProductId: string;
  title?: string;
  limit?: number;
}) {
  const navigate = useNavigate();

  const [items, setItems] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [perView, setPerView] = useState(6);
  const [index, setIndex] = useState(0);

  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerView(1);
      else if (w < 1024) setPerView(3);
      else setPerView(6);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setErr(null);

      if (!brand?.trim()) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const products = await getAllShopifyProducts();
        if (!alive) return;

        const mapped = products
          .filter(
            (product) =>
              product.vendor === brand &&
              product.id !== currentProductId
          )
          .map(mapProduct)
          .filter((product): product is RelatedProduct => product !== null)
          .filter((product) => product.stock === null || product.stock > 0)
          .slice(0, limit);

        setItems(mapped);
        setIndex(0);
      } catch (error) {
        if (!alive) return;

        console.error("Error cargando marca Shopify:", error);

        setErr(
          error instanceof Error
            ? error.message
            : "Error cargando productos de la marca"
        );

        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [brand, currentProductId, limit]);

  const itemsWithMore = useMemo(
    () => [
      ...items,
      {
        productId: "__MORE__",
        handle: "",
        category: "",
        name: "__MORE__",
        brand,
        price: 0,
        old_price: null,
        img: null,
        stock: null,
      },
    ],
    [items, brand]
  );

  const maxIndex = useMemo(
    () => Math.max(0, itemsWithMore.length - perView),
    [itemsWithMore.length, perView]
  );

  useEffect(() => {
    setIndex((value) => clamp(value, 0, maxIndex));
  }, [maxIndex]);

  const canPrev = index > 0;
  const canNext = index < maxIndex;

  const goPrev = () => setIndex((value) => clamp(value - 1, 0, maxIndex));
  const goNext = () => setIndex((value) => clamp(value + 1, 0, maxIndex));

  const stepPct = 100 / perView;
  const translatePct = index * stepPct;

  const dots = useMemo(
    () => Array.from({ length: maxIndex + 1 }, (_, i) => i),
    [maxIndex]
  );

  if (loading) {
    return (
      <div className="mt-10">
        <div className="w-full px-4 md:px-8">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_16px_45px_rgba(17,24,39,0.05)]">
            <p className="text-gray-600">Cargando productos de la marca…</p>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mt-10">
        <div className="w-full px-4 md:px-8">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_16px_45px_rgba(17,24,39,0.05)]">
            <p className="font-semibold text-red-700">No se pudieron cargar productos de la marca</p>
            <p className="mt-1 text-sm text-gray-600">{err}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="mt-10">
      <div className="w-full px-4 md:px-8">
        <section
          className="rounded-[30px] border border-gray-200/80 bg-white px-4 py-6 shadow-[0_18px_55px_rgba(17,24,39,0.055)] md:px-7 md:py-8"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          <div className="flex items-center justify-between gap-5 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gray-300" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Descubre más
                </span>
              </div>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-gray-950 md:text-2xl">
                {title}
              </h2>

              <p className="mt-1 text-sm font-medium text-gray-500">
                {brand}
              </p>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button type="button" onClick={goPrev} disabled={!canPrev} className={[
                "flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition",
                canPrev ? "hover:border-gray-400 hover:bg-gray-50" : "cursor-not-allowed opacity-35",
              ].join(" ")}>‹</button>

              <button type="button" onClick={goNext} disabled={!canNext} className={[
                "flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition",
                canNext ? "hover:border-gray-400 hover:bg-gray-50" : "cursor-not-allowed opacity-35",
              ].join(" ")}>›</button>
            </div>
          </div>

          <div className="relative mt-6">
            <div className="overflow-hidden">
              <div
                ref={trackRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${translatePct}%)` }}
              >
                {itemsWithMore.map((product) => {
                  const itemWidth = `${100 / perView}%`;

                  if (product.productId === "__MORE__") {
                    return (
                      <div key="moreWrap" className="shrink-0 px-2" style={{ width: itemWidth }}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/tienda?brand=${encodeURIComponent(brand)}#products`)
                          }
                          className="flex min-h-[270px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-gray-300 bg-gray-50/70 p-5 text-center transition hover:border-gray-400 hover:bg-gray-50"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-xl">
                            ›
                          </div>

                          <div className="mt-4 text-sm font-semibold text-gray-950">
                            Ver más de esta marca
                          </div>

                          <div className="mt-1 text-sm text-gray-500">
                            {brand}
                          </div>
                        </button>
                      </div>
                    );
                  }

                  const img =
                    product.img && product.img.trim() !== ""
                      ? product.img
                      : FALLBACK_IMG;

                  return (
                    <div key={product.productId} className="shrink-0 px-2" style={{ width: itemWidth }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/tienda/${product.handle}`)}
                        className="group w-full overflow-hidden rounded-[22px] border border-gray-200/80 bg-white text-left transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_14px_34px_rgba(17,24,39,0.08)]"
                      >
                        <div className="m-2 overflow-hidden rounded-[16px] bg-gray-50">
                          <img
                            src={img}
                            alt={product.name}
                            className="h-40 w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03] md:h-44"
                            onError={(event) => {
                              event.currentTarget.src = FALLBACK_IMG;
                            }}
                          />
                        </div>

                        <div className="px-3 pb-4 pt-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                            {product.category}
                          </div>

                          <div className="mt-2 min-h-[44px] line-clamp-2 text-[15px] font-semibold leading-[1.35] text-gray-950">
                            {product.name}
                          </div>

                          <div className="mt-1 truncate text-xs font-medium text-gray-500">
                            {product.brand}
                          </div>

                          <div className="mt-4 flex items-end gap-2 border-t border-gray-100 pt-3">
                            {product.old_price !== null && product.old_price > product.price ? (
                              <span className="text-sm text-gray-400 line-through">
                                {product.old_price.toFixed(2)}€
                              </span>
                            ) : null}

                            <span className="text-lg font-semibold tracking-[-0.02em] text-gray-950">
                              {product.price.toFixed(2)}€
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {dots.length > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                {dots.map((dot) => (
                  <button
                    key={dot}
                    type="button"
                    onClick={() => setIndex(dot)}
                    className={[
                      "h-1.5 rounded-full transition-all duration-300",
                      dot === index
                        ? "w-6 bg-gray-900"
                        : "w-1.5 bg-gray-300 hover:bg-gray-400",
                    ].join(" ")}
                    aria-label={`Ir a ${dot + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
