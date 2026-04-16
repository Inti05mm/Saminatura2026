import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type ProductStock = {
  id: number;
  name: string;
  brand: string;
  category: string;
  stock: number | null;
  supplier_name: string | null;
};

export default function AdminStockPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductStock[]>([]);

  const [threshold, setThreshold] = useState<number>(5);
  const [includeInactive, setIncludeInactive] = useState(false);

  
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setErr(null);

      try {
        let q = supabase
          .from("products")
          .select("id, name, brand, category, stock, supplier_name, is_active");

        if (!includeInactive) q = q.eq("is_active", true);

        const { data, error } = await q.order("stock", { ascending: true }).limit(2000);
        if (!alive) return;
        if (error) throw error;

        setRows((data ?? []) as any);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Error cargando stock");
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
  }, [includeInactive]);

  const normalized = useMemo(() => {
    return rows.map((r) => ({ ...r, stockN: Number(r.stock ?? 0) || 0 }));
  }, [rows]);

  const outOfStock = useMemo(() => normalized.filter((r) => r.stockN <= 0), [normalized]);
  const lowStock = useMemo(
    () => normalized.filter((r) => r.stockN > 0 && r.stockN <= threshold),
    [normalized, threshold]
  );

  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, ProductStock[]>();
    for (const r of lowStock) {
      const k = (r.supplier_name?.trim() || "Sin proveedor");
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [lowStock]);

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold text-[#191919]">Stock / Alertas</h3>
          <p className="text-sm text-gray-500 mt-1">
            Agotados, bajo stock y agrupación por proveedor.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Incluir inactivos
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Umbral:</span>
            <input
              type="number"
              min={0}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">Agotados</div>
          <div className="text-2xl font-bold text-gray-900">{outOfStock.length}</div>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">Bajo stock (≤ {threshold})</div>
          <div className="text-2xl font-bold text-gray-900">{lowStock.length}</div>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">Productos activos leídos</div>
          <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">Proveedores con alertas</div>
          <div className="text-2xl font-bold text-gray-900">{groupedBySupplier.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-gray-600">Cargando…</div>
      ) : err ? (
        <div className="mt-4 text-red-700">{err}</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agotados */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold text-gray-900">🚨 Agotados</div>
            {outOfStock.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Ninguno.</div>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="min-w-[650px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Producto</th>
                      <th className="text-left px-3 py-2">Marca</th>
                      <th className="text-left px-3 py-2">Categoría</th>
                      <th className="text-left px-3 py-2">Proveedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {outOfStock.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                        <td className="px-3 py-2">{r.brand}</td>
                        <td className="px-3 py-2">{r.category}</td>
                        <td className="px-3 py-2">{r.supplier_name?.trim() ? r.supplier_name : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bajo stock agrupado por proveedor */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold text-gray-900">⚠️ Bajo stock (≤ {threshold})</div>

            {lowStock.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Ninguno con ese umbral.</div>
            ) : (
              <div className="mt-3 space-y-4">
                {groupedBySupplier.map(([supplier, list]) => (
                  <div key={supplier} className="rounded-xl border bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">{supplier}</div>
                      <div className="text-xs text-gray-600">Items: <b>{list.length}</b></div>
                    </div>

                    <div className="mt-2 overflow-auto">
                      <table className="min-w-[650px] w-full text-sm">
                        <thead className="text-gray-700">
                          <tr>
                            <th className="text-left px-2 py-1">Producto</th>
                            <th className="text-left px-2 py-1">Marca</th>
                            <th className="text-left px-2 py-1">Cat.</th>
                            <th className="text-left px-2 py-1">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(list as any[]).map((r) => (
                            <tr key={r.id}>
                              <td className="px-2 py-1 font-medium text-gray-900">{r.name}</td>
                              <td className="px-2 py-1">{r.brand}</td>
                              <td className="px-2 py-1">{r.category}</td>
                              <td className="px-2 py-1">{Number((r as any).stockN ?? r.stock ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
