import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type ProductExpiry = {
  id: number;
  name: string;
  brand: string;
  category: string;
  stock: number | null;
  supplier_name: string | null;
  expiration_date: string | null; // "YYYY-MM-DD"
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function ymLabel(d: Date) {
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function subDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
}

type Mode = "today" | "last15Days" | "thisMonth" | "nextMonth";

export default function AdminExpiryPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("today");

  // Traemos productos con expiration_date
  const [rows, setRows] = useState<ProductExpiry[]>([]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        // ✅ aquí puedes filtrar activos si quieres:
        // .eq("is_active", true)
        const { data, error } = await supabase
          .from("products")
          .select("id, name, brand, category, stock, supplier_name, expiration_date, is_active")
          .not("expiration_date", "is", null)
          .eq("is_active", true)
          .order("expiration_date", { ascending: true })
          .limit(2000);

        if (!alive) return;
        if (error) throw error;

        setRows((data ?? []) as any);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Error cargando caducidad");
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => toYMD(new Date()), []);

  const range = useMemo(() => {
    if (mode === "today") {
      return { kind: "day" as const, title: todayYMD, from: todayYMD, to: todayYMD };
    }

    if (mode === "last15Days") {
      const to = toYMD(new Date());
      const from = toYMD(subDays(new Date(), 15));
      return {
        kind: "range" as const,
        title: "Últimos 15 días",
        from,
        to,
      };
    }

    if (mode === "thisMonth") {
      const a = startOfMonth(new Date());
      const b = endOfMonth(new Date());
      return { kind: "month" as const, title: `Este mes (${ymLabel(a)})`, from: toYMD(a), to: toYMD(b) };
    }

    // nextMonth
    const m = addMonths(new Date(), 1);
    const a = startOfMonth(m);
    const b = endOfMonth(m);
    return { kind: "month" as const, title: `Mes que viene (${ymLabel(a)})`, from: toYMD(a), to: toYMD(b) };
  }, [mode, todayYMD, now]);

  const filtered = useMemo(() => {
    const from = range.from;
    const to = range.to;

    return rows.filter((r) => {
      const d = r.expiration_date;
      if (!d) return false;
      // YYYY-MM-DD => comparación lexicográfica funciona
      return d >= from && d <= to;
    });
  }, [rows, range]);

  // Si estás en "today", enseñamos la lista de HOY.
  // Si estás en mes o rango, enseñamos lista ordenada por fecha y agrupada visualmente.
  const groupedByDate = useMemo(() => {
    const map = new Map<string, ProductExpiry[]>();
    for (const r of filtered) {
      const key = r.expiration_date!;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const btnClass = (active: boolean) =>
    [
      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
      active ? "bg-[#00bf63]/15 text-[#0b6b3a]" : "bg-gray-100 hover:bg-gray-200 text-gray-800",
    ].join(" ");

  const emptyText =
    range.kind === "day"
      ? "No hay productos ese día."
      : range.kind === "month"
      ? "No hay productos ese mes."
      : "No hay productos en los últimos 15 días.";

  return (
    <section className="w-full">
      {/* ✅ botones */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button className={btnClass(mode === "today")} onClick={() => setMode("today")}>
          Hoy
        </button>

        <button className={btnClass(mode === "last15Days")} onClick={() => setMode("last15Days")}>
          Últimos 15 días
        </button>

        <button className={btnClass(mode === "thisMonth")} onClick={() => setMode("thisMonth")}>
          Este mes
        </button>
        <button className={btnClass(mode === "nextMonth")} onClick={() => setMode("nextMonth")}>
          Mes que viene
        </button>
      </div>

      {/* ✅ container como tu foto */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {range.kind === "day"
                ? `Productos que caducan el ${range.title}`
                : range.kind === "month"
                ? `Productos que caducan ${range.title}`
                : `Productos caducados en los ${range.title}`}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {range.kind === "day"
                ? "Productos que caducan hoy."
                : range.kind === "month"
                ? "Productos que caducan dentro del rango seleccionado."
                : `Productos caducados entre ${range.from} y ${range.to}.`}
            </p>
          </div>

          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{filtered.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-gray-600">Cargando…</div>
        ) : err ? (
          <div className="mt-4 text-red-700">{err}</div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 text-gray-700">{emptyText}</div>
        ) : (
          <div className="mt-4 space-y-5">
            {range.kind === "day" ? (
              <ul className="space-y-2">
                {filtered.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.brand} · {p.category} · {p.supplier_name?.trim() ? p.supplier_name : "—"}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-nowrap">
                      Stock: <b>{p.stock ?? 0}</b>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-6">
                {groupedByDate.map(([date, list]) => (
                  <div key={date}>
                    <div className="text-sm font-semibold text-gray-900 mb-2">{date}</div>
                    <ul className="space-y-2">
                      {list.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-500">
                              {p.brand} · {p.category} · {p.supplier_name?.trim() ? p.supplier_name : "—"}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 whitespace-nowrap">
                            Stock: <b>{p.stock ?? 0}</b>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
