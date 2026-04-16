import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  paid_at: string | null;
  currency: string | null;
};

type OrderItemRow = {
  order_id: string;
  product_id: number;
  unit_price: number | null;
  quantity: number | null;
};

type ProductCostRow = {
  id: number;
  purchase_price: number | null;
  vat_rate: number | null;
  recargo_rate?: number | null; // ✅ puede o no existir en tu DB
};

const formatEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDayKey(d: Date) {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Serie por días (7/30) */
function buildSeries(orders: OrderRow[], days: number) {
  const now = new Date();
  const start = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 3600 * 1000));

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const key = isoDayKey(new Date(start.getTime() + i * 24 * 3600 * 1000));
    map.set(key, 0);
  }

  for (const o of orders) {
    const amt = Number(o.total_amount ?? 0);
    const ref = o.paid_at ?? o.created_at;
    const key = isoDayKey(startOfDay(new Date(ref)));
    if (map.has(key)) map.set(key, (map.get(key) || 0) + amt);
  }

  const labels: string[] = [];
  const values: number[] = [];
  map.forEach((v, k) => {
    labels.push(k);
    values.push(v);
  });

  return { labels, values };
}

/** Serie por horas (HOY) */
function buildTodaySeries(orders: OrderRow[]) {
  const start = startOfDay(new Date());
  const labels: string[] = [];
  const values: number[] = [];

  for (let h = 0; h < 24; h++) {
    labels.push(`${h}:00`);
    values.push(0);
  }

  for (const o of orders) {
    const ref = new Date(o.paid_at ?? o.created_at);
    if (ref < start) continue;

    const hour = ref.getHours();
    const amt = Number(o.total_amount ?? 0);
    values[hour] = (values[hour] || 0) + amt;
  }

  return { labels, values };
}

function LineChartWithTooltip({
  labels,
  values,
  height = 150,
  showHourAxis = true,
  dimmed = false,
}: {
  labels: string[];
  values: number[];
  height?: number;
  showHourAxis?: boolean;
  dimmed?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxV = Math.max(1, ...(values.length ? values : [1]));
  const w = 560;
  const h = height;
  const padX = 24;
  const padY = 22;

  const pts = useMemo(() => {
    const n = values.length || 1;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    return (values.length ? values : [0]).map((v, i) => {
      const x = padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = padY + (1 - v / maxV) * innerH;
      return { x, y, v, label: labels[i] ?? "" };
    });
  }, [labels, values, maxV]);

  const d = useMemo(() => {
    if (pts.length === 0) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [pts]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const scaleX = w / rect.width;
    const vx = x * scaleX;

    let best = 0;
    let bestDist = Infinity;
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - vx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });

    setHoverIdx(best);
  };

  const hover = hoverIdx != null ? pts[hoverIdx] : null;

  return (
    <div
      className={`relative w-full transition-opacity ${dimmed ? "opacity-60" : "opacity-100"}`}
      onMouseMove={onMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <g opacity={0.25}>
          {[0, 1, 2, 3].map((i) => {
            const y = 16 + (i / 3) * (h - 32);
            return <line key={i} x1="24" x2={w - 24} y1={y} y2={y} stroke="currentColor" />;
          })}
        </g>

        <path d={d} fill="none" stroke="currentColor" strokeWidth="1" style={{ transition: "d 200ms ease" } as any} />

        {showHourAxis ? (
          <g opacity={0.7} fontSize="8">
            {[
              { x: padX, label: "0:00" },
              { x: padX + (w - padX * 2) * 0.25, label: "6:00" },
              { x: padX + (w - padX * 2) * 0.5, label: "12:00" },
              { x: padX + (w - padX * 2) * 0.75, label: "18:00" },
              { x: w - padX, label: "0:00" },
            ].map((t, i) => (
              <text
                key={i}
                x={t.x}
                y={h - 6}
                textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                fill="currentColor"
              >
                {t.label}
              </text>
            ))}
          </g>
        ) : null}

        {hover ? (
          <>
            <line x1={hover.x} x2={hover.x} y1={16} y2={h - 16} stroke="currentColor" opacity={0.25} />
            <circle cx={hover.x} cy={hover.y} r="3" fill="currentColor" />
          </>
        ) : null}
      </svg>

      {hover ? (
        <div
          className="absolute rounded-lg border bg-white px-2 py-1.5 text-[11px] shadow-md"
          style={{
            left: `calc(${(hover.x / w) * 100}% - 60px)`,
            top: 6,
            width: 120,
          }}
        >
          <div className="font-medium text-gray-700">Volumen bruto</div>
          <div className="text-gray-500">{hover.label}</div>
          <div className="font-semibold text-gray-900">{formatEUR(hover.v)}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<"today" | 7 | 30>("today");

  const [isFetching, setIsFetching] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [ordersPaid, setOrdersPaid] = useState<OrderRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ✅ NUEVO: margen total de esos pedidos
  const [profit, setProfit] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setErr(null);
        setIsFetching(true);

        const since = new Date();
        if (range === "today") {
          since.setHours(0, 0, 0, 0);
        } else {
          since.setDate(since.getDate() - (range - 1));
          since.setHours(0, 0, 0, 0);
        }

        const { data, error } = await supabase
          .from("orders")
          .select("id,status,total_amount,created_at,paid_at,currency")
          .eq("status", "paid")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        const paid = (data ?? []) as OrderRow[];

        if (!cancelled) {
          setOrdersPaid(paid);
          setHasLoadedOnce(true);
        }

        // ✅ NUEVO: calcular margen de esos pedidos
        // Si no hay pedidos, margen 0
        if (paid.length === 0) {
          if (!cancelled) setProfit(0);
          return;
        }

        const orderIds = paid.map((o) => o.id);

        // 1) Traer líneas (order_items) de esos pedidos
        const { data: itemsData, error: itemsErr } = await supabase
          .from("order_items")
          .select("order_id, product_id, unit_price, quantity")
          .in("order_id", orderIds);

        if (itemsErr) throw itemsErr;

        const items = (itemsData ?? []) as OrderItemRow[];
        const productIds = Array.from(new Set(items.map((it) => it.product_id)));

        if (productIds.length === 0) {
          if (!cancelled) setProfit(0);
          return;
        }

        // 2) Traer costes de productos (intentamos con recargo_rate; si no existe, reintentamos)
        let productsCost: ProductCostRow[] = [];

        const tryWithRecargo = await supabase
          .from("products")
          .select("id,purchase_price,vat_rate,recargo_rate")
          .in("id", productIds);

        if (tryWithRecargo.error) {
          // fallback sin recargo_rate (por si la columna no existe aún)
          const fallback = await supabase
            .from("products")
            .select("id,purchase_price,vat_rate")
            .in("id", productIds);

          if (fallback.error) throw fallback.error;
          productsCost = (fallback.data ?? []) as ProductCostRow[];
        } else {
          productsCost = (tryWithRecargo.data ?? []) as ProductCostRow[];
        }

        const costMap = new Map<number, ProductCostRow>();
        for (const p of productsCost) costMap.set(p.id, p);

        // 3) Calcular margen total
        let totalProfit = 0;

        for (const it of items) {
          const qty = Number(it.quantity ?? 0);
          const saleUnit = Number(it.unit_price ?? 0); // asumimos precio final (con IVA) guardado en order_items
          if (!qty || qty <= 0) continue;

          const prod = costMap.get(it.product_id);
          const costBase = Number(prod?.purchase_price ?? 0);
          const vat = Number(prod?.vat_rate ?? 0);
          const recargo = Number((prod as any)?.recargo_rate ?? 0);

          // coste total con IVA + recargo (tu fórmula)
          const costTotalUnit = costBase * (1 + (vat + recargo) / 100);

          const marginUnit = saleUnit - costTotalUnit;
          totalProfit += marginUnit * qty;
        }

        if (!cancelled) setProfit(totalProfit);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error cargando analytics");
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const { labels, values } = useMemo(() => {
    if (range === "today") return buildTodaySeries(ordersPaid);
    return buildSeries(ordersPaid, range);
  }, [ordersPaid, range]);

  const gross = useMemo(() => values.reduce((a, b) => a + b, 0), [values]);
  const paidCount = ordersPaid.length;

  const safeLabels = hasLoadedOnce ? labels : Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const safeValues = hasLoadedOnce ? values : Array.from({ length: 24 }, () => 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#191919]">Gráficos</h3>
          <p className="text-sm text-gray-500 mt-1">Ingresos (pedidos pagados) desde Supabase.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRange("today")}
            className={`rounded-full px-4 py-2 text-sm font-semibold border ${
              range === "today" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            Hoy
          </button>

          <button
            onClick={() => setRange(7)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border ${
              range === 7 ? "bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            7 días
          </button>

          <button
            onClick={() => setRange(30)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border ${
              range === 30 ? "bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            30 días
          </button>
        </div>
      </div>

      {/* ✅ QUITAMOS ticket medio, y ponemos margen */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold">Volumen bruto</div>
          <div className="mt-2 text-2xl font-bold">{formatEUR(gross)}</div>
          <div className="mt-1 text-xs text-gray-500">
            {range === "today" ? "rango: hoy" : `rango: últimos ${range} días`}
          </div>
        </div>

        {/* ✅ NUEVO: margen de ganancias */}
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold">Margen de ganancias</div>
          <div className="mt-2 text-2xl font-bold">{formatEUR(profit)}</div>
          <div className="mt-1 text-xs text-gray-500">
            suma de líneas (venta - coste con IVA+recargo)
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500 uppercase font-semibold">Pedidos pagados</div>
          <div className="mt-2 text-2xl font-bold">{paidCount}</div>
          <div className="mt-1 text-xs text-gray-500">status = paid</div>
        </div>
      </div>

      <div className="mt-6 text-gray-900">
        <div className="rounded-2xl border p-4 relative">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
            {range === "today" ? "Evolución hoy (por horas)" : "Evolución (con eje estable)"}
          </div>

          <LineChartWithTooltip labels={safeLabels} values={safeValues} showHourAxis={true} dimmed={isFetching} height={150} />

          {isFetching ? <div className="absolute right-4 top-4 text-[11px] text-gray-500">Actualizando…</div> : null}
          {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
        </div>
      </div>
    </section>
  );
}
