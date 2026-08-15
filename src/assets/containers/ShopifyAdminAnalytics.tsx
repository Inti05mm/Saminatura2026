import React, { useEffect, useMemo, useState } from "react";



const SHOPIFY_API_BASE = "/api";

type AnalyticsRange = "today" | 7 | 30;

type ShopifyAnalyticsResponse = {
  ok: boolean;
  range: "today" | "7" | "30";
  currency: string;
  gross: number;
  estimated_profit: number;
  paid_orders: number;
  series: {
    labels: string[];
    values: number[];
  };
  profit_note?: string;
  error?: string;
};

const formatEUR = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number.isFinite(n) ? n : 0);

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



export default function ShopifyAdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>("today");
  const [isFetching, setIsFetching] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [gross, setGross] = useState(0);
  const [profit, setProfit] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [profitNote, setProfitNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setErr(null);
        setIsFetching(true);

        const rangeParam = range === "today" ? "today" : String(range);

        const response = await fetch(
          `${SHOPIFY_API_BASE}/shopify/admin/analytics?range=${rangeParam}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        const data = (await response.json()) as ShopifyAnalyticsResponse;

        if (!response.ok || data.ok === false) {
          throw new Error(
            data.error || `Error API (${response.status})`
          );
        }

        if (cancelled) return;

        setGross(Number(data.gross ?? 0));
        setProfit(Number(data.estimated_profit ?? 0));
        setPaidCount(Number(data.paid_orders ?? 0));
        setCurrency(data.currency || "EUR");
        setLabels(Array.isArray(data.series?.labels) ? data.series.labels : []);
        setValues(
          Array.isArray(data.series?.values)
            ? data.series.values.map((v) => Number(v ?? 0))
            : []
        );
        setProfitNote(data.profit_note ?? null);
        setHasLoadedOnce(true);
      } catch (e: any) {
        if (!cancelled) {
          console.error(e);
          setErr(e?.message ?? "Error cargando analytics de Shopify.");
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const safeLabels = hasLoadedOnce
    ? labels
    : Array.from({ length: 24 }, (_, i) => `${i}:00`);

  const safeValues = hasLoadedOnce
    ? values
    : Array.from({ length: 24 }, () => 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#191919]">Gráficos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Ingresos y pedidos pagados desde Shopify.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRange("today")}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              range === "today" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => setRange(7)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              range === 7 ? "bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            7 días
          </button>

          <button
            type="button"
            onClick={() => setRange(30)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              range === 30 ? "bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            30 días
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs font-semibold uppercase text-gray-500">
            Volumen bruto
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatEUR(gross, currency)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {range === "today" ? "rango: hoy" : `rango: últimos ${range} días`}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs font-semibold uppercase text-gray-500">
            Margen estimado
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatEUR(profit, currency)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            venta - coste unitario guardado en Shopify
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs font-semibold uppercase text-gray-500">
            Pedidos pagados
          </div>
          <div className="mt-2 text-2xl font-bold">{paidCount}</div>
          <div className="mt-1 text-xs text-gray-500">
            financial status = PAID
          </div>
        </div>
      </div>

      <div className="mt-6 text-gray-900">
        <div className="relative rounded-2xl border p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
            {range === "today"
              ? "Evolución hoy (por horas)"
              : `Evolución últimos ${range} días`}
          </div>

          <LineChartWithTooltip
            labels={safeLabels}
            values={safeValues}
            showHourAxis={range === "today"}
            dimmed={isFetching}
            height={150}
          />

          {isFetching ? (
            <div className="absolute right-4 top-4 text-[11px] text-gray-500">
              Actualizando…
            </div>
          ) : null}

          {err ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
              <div className="mt-1 text-xs">
                API usada: <span className="font-mono">{SHOPIFY_API_BASE}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {profitNote ? (
        <p className="mt-3 text-xs text-gray-500">{profitNote}</p>
      ) : null}
    </section>
  );
}