import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type RelatedProduct = {
  id: number;
  slug: string | null; // ✅ NUEVO
  category: string;
  name: string;
  brand: string;
  price: number;
  old_price: number | null;
  img: string | null;
  stock: number | null;
  is_active?: boolean;
};

const FALLBACK_IMG = "https://placehold.co/600x600?text=Sin+imagen";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function RelatedBrand({
  brand,
  currentProductId,
  title = "Más productos de esta marca",
  limit = 12, // ✅ máximo 12
}: {
  brand: string;
  currentProductId: number;
  title?: string;
  limit?: number;
}) {
  const navigate = useNavigate();

  const [items, setItems] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ carrusel
  const [perView, setPerView] = useState(6); // desktop
  const [index, setIndex] = useState(0); // ✅ 1 a 1

  const trackRef = useRef<HTMLDivElement | null>(null);

  // responsive: 1 / 3 / 6
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerView(1); // mobile
      else if (w < 1024) setPerView(3); // tablet
      else setPerView(6); // desktop
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // cargar relacionados por marca
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

      const { data, error } = await supabase
        .from("public_products")
        .select("id, slug, category, name, brand, price, old_price, img, stock, is_active")
        .eq("brand", brand)
        .neq("id", currentProductId)
        .eq("is_active", true)
        .order("id", { ascending: false })
        .limit(limit);

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setItems([]);
        setLoading(false);
        return;
      }

      const mapped =
        (data ?? []).map((d: any) => ({
          id: Number(d.id),
          slug: d.slug ?? null, // ✅ NUEVO
          category: d.category ?? "",
          name: d.name ?? "",
          brand: d.brand ?? "",
          price: Number(d.price ?? 0),
          old_price: d.old_price == null ? null : Number(d.old_price),
          img: d.img ?? null,
          stock: d.stock == null ? null : Number(d.stock),
          is_active: d.is_active ?? true,
        })) ?? [];

      setItems(mapped);
      setLoading(false);
      setIndex(0);
    };

    run();
    return () => {
      alive = false;
    };
  }, [brand, currentProductId, limit]);

  // ✅ añadimos la “card botón” como un item extra al final
  const itemsWithMore = useMemo(() => {
    return [
      ...items,
      {
        id: -1,
        slug: null, // ✅
        category: "",
        name: "__MORE__",
        brand,
        price: 0,
        old_price: null,
        img: null,
        stock: null,
        is_active: true,
      },
    ];
  }, [items, brand]);

  // ✅ máximo índice
  const maxIndex = useMemo(() => {
    return Math.max(0, itemsWithMore.length - perView);
  }, [itemsWithMore.length, perView]);

  useEffect(() => {
    setIndex((v) => clamp(v, 0, maxIndex));
  }, [maxIndex]);

  const canPrev = index > 0;
  const canNext = index < maxIndex;

  const goPrev = () => setIndex((v) => clamp(v - 1, 0, maxIndex));
  const goNext = () => setIndex((v) => clamp(v + 1, 0, maxIndex));

  const stepPct = 100 / perView;
  const translatePct = index * stepPct;

  const dots = useMemo(() => Array.from({ length: maxIndex + 1 }, (_, i) => i), [maxIndex]);

  if (loading) {
    return (
      <div className="mt-10">
        <div className="w-full px-4 md:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
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
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-red-700 font-semibold">No se pudieron cargar productos de la marca</p>
            <p className="text-gray-600 text-sm mt-1">{err}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="mt-10">
      <div className="w-full px-4 md:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">Más de la marca: {brand}</p>
            </div>

            {/* controles desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!canPrev}
                className={[
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  "border border-gray-200 bg-white shadow-sm",
                  canPrev ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed",
                ].join(" ")}
                aria-label="Anterior"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path
                    fillRule="evenodd"
                    d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <button
                onClick={goNext}
                disabled={!canNext}
                className={[
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  "border border-gray-200 bg-white shadow-sm",
                  canNext ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed",
                ].join(" ")}
                aria-label="Siguiente"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path
                    fillRule="evenodd"
                    d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* carrusel */}
          <div className="relative mt-6">
            {/* botones overlay móvil */}
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className={[
                "sm:hidden",
                "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                "h-10 w-10 rounded-full flex items-center justify-center",
                "bg-white/90 border border-gray-200 shadow-md",
                canPrev ? "hover:bg-white" : "opacity-40 cursor-not-allowed",
              ].join(" ")}
              aria-label="Anterior"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <button
              onClick={goNext}
              disabled={!canNext}
              className={[
                "sm:hidden",
                "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                "h-10 w-10 rounded-full flex items-center justify-center",
                "bg-white/90 border border-gray-200 shadow-md",
                canNext ? "hover:bg-white" : "opacity-40 cursor-not-allowed",
              ].join(" ")}
              aria-label="Siguiente"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="overflow-hidden rounded-2xl">
              <div
                ref={trackRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${translatePct}%)` }}
              >
                {itemsWithMore.map((p) => {
                  const itemWidth = `${100 / perView}%`;

                  // ✅ card botón final (marca)
                  if (p.id === -1 && p.name === "__MORE__") {
                    return (
                      <div key="moreWrap" className="shrink-0 px-2" style={{ width: itemWidth }}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/shopping?brand=${encodeURIComponent(brand)}`);
                          }}
                          className={[
                            "w-full",
                            "rounded-2xl border-2 border-dashed border-gray-300",
                            "bg-gray-50 hover:bg-gray-100 transition",
                            "p-4 flex flex-col items-center justify-center text-center",
                            "min-h-[240px]",
                          ].join(" ")}
                        >
                          <div className="h-12 w-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-gray-800">
                              <path
                                fillRule="evenodd"
                                d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="mt-4 font-extrabold text-gray-900">Ver más de esta marca</div>
                          <div className="text-sm text-gray-500 mt-1">{brand}</div>
                        </button>
                      </div>
                    );
                  }

                  const img = p.img && p.img.trim() !== "" ? p.img : FALLBACK_IMG;

                  return (
                    <div key={p.id} className="shrink-0 px-2" style={{ width: itemWidth }}>
                      <button
                        type="button"
                        onClick={() => {
                          const s = p.slug?.trim();
                          const param = s ? `${s}-${p.id}` : String(p.id);
                          navigate(`/shopping/${param}`);
                        }}
                        className="w-full text-left rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
                      >
                        <div className="bg-gray-50">
                          <img
                            src={img}
                            alt={p.name}
                            className="w-full h-40 md:h-44 object-contain p-4"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                            }}
                          />
                        </div>

                        <div className="p-4">
                          <div className="text-xs uppercase text-gray-400">{p.category}</div>
                          <div className="mt-1 font-bold text-gray-900 line-clamp-2">{p.name}</div>
                          <div className="text-sm text-gray-500">{p.brand}</div>

                          <div className="mt-3 flex items-end gap-2">
                            {p.old_price !== null && p.old_price > p.price ? (
                              <span className="text-sm text-gray-400 line-through">{p.old_price.toFixed(2)}€</span>
                            ) : null}
                            <span className="text-lg font-extrabold text-gray-900">{p.price.toFixed(2)}€</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* dots */}
            {dots.length > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                {dots.map((d) => (
                  <button
                    key={d}
                    onClick={() => setIndex(d)}
                    className={[
                      "h-2.5 w-2.5 rounded-full transition",
                      d === index ? "bg-gray-900" : "bg-gray-300 hover:bg-gray-400",
                    ].join(" ")}
                    aria-label={`Ir a ${d + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}