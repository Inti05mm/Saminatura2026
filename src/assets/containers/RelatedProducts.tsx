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
};

const FALLBACK_IMG = "https://placehold.co/600x600?text=Sin+imagen";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function RelatedProducts({
  category,
  currentProductId,
  title = "Productos relacionados",
  limit = 12, // ✅ máximo 12
}: {
  category: string;
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

  // cargar relacionados
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setErr(null);

      if (!category?.trim()) {
        setItems([]);
        setLoading(false);
        return;
      }

      // public_products ya devuelve únicamente productos:
      // isgood = true, is_active = true e is_discontinued = false.
      const { data, error } = await supabase
        .from("public_products")
        .select("id, slug, category, name, brand, price, old_price, img, stock")
        .eq("category", category)
        .neq("id", currentProductId)
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
          slug: d.slug ?? null,
          category: d.category ?? "",
          name: d.name ?? "",
          brand: d.brand ?? "",
          price: Number(d.price ?? 0),
          old_price: d.old_price == null ? null : Number(d.old_price),
          img: d.img ?? null,
          stock: d.stock == null ? null : Number(d.stock),
        })) ?? [];

      setItems(mapped);
      setLoading(false);
      setIndex(0);
    };

    run();
    return () => {
      alive = false;
    };
  }, [category, currentProductId, limit]);

  // ✅ añadimos la “card botón” como un item extra al final
  const itemsWithMore = useMemo(() => {
    return [
      ...items,
      {
        id: -1,
        slug: null, // ✅ AÑADIR ESTO
        category,
        name: "__MORE__",
        brand: "",
        price: 0,
        old_price: null,
        img: null,
        stock: null,
      },
    ];
  }, [items, category]);

  // ✅ máximo índice (para que siempre haya perView visibles)
  const maxIndex = useMemo(() => {
    return Math.max(0, itemsWithMore.length - perView);
  }, [itemsWithMore.length, perView]);

  // si cambia perView o items, asegurar index válido
  useEffect(() => {
    setIndex((v) => clamp(v, 0, maxIndex));
  }, [maxIndex]);

  const canPrev = index > 0;
  const canNext = index < maxIndex;

  const goPrev = () => setIndex((v) => clamp(v - 1, 0, maxIndex));
  const goNext = () => setIndex((v) => clamp(v + 1, 0, maxIndex));

  // ✅ translate por 1 card (step = 100/perView)
  const stepPct = 100 / perView;
  const translatePct = index * stepPct;

  // dots: uno por cada posición posible (0..maxIndex)
  const dots = useMemo(() => Array.from({ length: maxIndex + 1 }, (_, i) => i), [maxIndex]);

  if (loading) {
    return (
      <div className="mt-10">
        <div className="w-full px-4 md:px-8">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_16px_45px_rgba(17,24,39,0.05)]">
            <p className="text-gray-600">Cargando productos relacionados…</p>
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
            <p className="text-red-700 font-semibold">No se pudieron cargar relacionados</p>
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
        <section
          className="rounded-[30px] border border-gray-200/80 bg-white px-4 py-6 md:px-7 md:py-8 shadow-[0_18px_55px_rgba(17,24,39,0.055)]"
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
              <p className="mt-1 text-sm font-medium text-gray-500"> {category}</p>
            </div>

            {/* controles desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!canPrev}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  "border border-gray-200 bg-white transition",
                  canPrev ? "hover:border-gray-400 hover:bg-gray-50" : "opacity-35 cursor-not-allowed",
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
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  "border border-gray-200 bg-white transition",
                  canNext ? "hover:border-gray-400 hover:bg-gray-50" : "opacity-35 cursor-not-allowed",
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

            <div className="overflow-hidden">
              <div
                ref={trackRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${translatePct}%)` }}
              >
                {itemsWithMore.map((p) => {
                  const itemWidth = `${100 / perView}%`;

                  if (p.id === -1 && p.name === "__MORE__") {
                    return (
                      <div key="moreWrap" className="shrink-0 px-2" style={{ width: itemWidth }}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/shopping?category=${encodeURIComponent(category)}`);
                          }}
                          className={[
                            "w-full",
                            "flex min-h-[270px] flex-col items-center justify-center rounded-[22px]",
                            "border border-dashed border-gray-300 bg-gray-50/70 p-5 text-center",
                            "transition hover:border-gray-400 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-gray-800">
                              <path
                                fillRule="evenodd"
                                d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="mt-4 text-sm font-semibold text-gray-950">Ver más de esta categoría</div>
                          <div className="text-sm text-gray-500 mt-1">{category}</div>
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
                        className="group w-full overflow-hidden rounded-[22px] border border-gray-200/80 bg-white text-left transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_14px_34px_rgba(17,24,39,0.08)]"
                      >
                        <div className="m-2 overflow-hidden rounded-[16px] bg-gray-50">
                          <img
                            src={img}
                            alt={p.name}
                            className="h-40 w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03] md:h-44"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                            }}
                          />
                        </div>

                        <div className="px-3 pb-4 pt-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">{p.category}</div>
                          <div className="mt-2 min-h-[44px] line-clamp-2 text-[15px] font-semibold leading-[1.35] text-gray-950">{p.name}</div>
                          <div className="mt-1 truncate text-xs font-medium text-gray-500">{p.brand}</div>

                          <div className="mt-4 flex items-end gap-2 border-t border-gray-100 pt-3">
                            {p.old_price !== null && p.old_price > p.price ? (
                              <span className="text-sm text-gray-400 line-through">{p.old_price.toFixed(2)}€</span>
                            ) : null}
                            <span className="text-lg font-semibold tracking-[-0.02em] text-gray-950">{p.price.toFixed(2)}€</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* dots (por posición) */}
            {dots.length > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                {dots.map((d) => (
                  <button
                    key={d}
                    onClick={() => setIndex(d)}
                    className={[
                      "h-1.5 rounded-full transition-all duration-300",
                      d === index ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300 hover:bg-gray-400",
                    ].join(" ")}
                    aria-label={`Ir a ${d + 1}`}
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