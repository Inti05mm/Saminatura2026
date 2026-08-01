import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type ProductStock = {
  id: number;
  name: string;
  brand: string;
  category: string;
  stock: number | null;
  supplier_name: string | null;

  isgood: boolean;
  is_active: boolean;
  is_discontinued: boolean;
};

type NormalizedProductStock = ProductStock & {
  stockN: number;
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
        let query = supabase
          .from("products")
          .select(`
            id,
            name,
            brand,
            category,
            stock,
            supplier_name,
            isgood,
            is_active,
            is_discontinued
          `)
          // Solo productos que ya has revisado.
          .eq("isgood", true)
          // Nunca mostrar productos descatalogados en reposición.
          .eq("is_discontinued", false);

        // Si no se incluyen inactivos, mostrar únicamente los visibles.
        if (!includeInactive) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query
          .order("stock", { ascending: true })
          .order("name", { ascending: true })
          .limit(5000);

        if (!alive) return;
        if (error) throw error;

        const normalizedData: ProductStock[] = (data ?? []).map(
          (product: any) => ({
            id: Number(product.id),
            name: String(product.name ?? ""),
            brand: String(product.brand ?? ""),
            category: String(product.category ?? ""),
            stock:
              product.stock === null || product.stock === undefined
                ? null
                : Number(product.stock),
            supplier_name:
              product.supplier_name === null ||
              product.supplier_name === undefined
                ? null
                : String(product.supplier_name),

            isgood: Boolean(product.isgood),
            is_active: Boolean(product.is_active),
            is_discontinued: Boolean(product.is_discontinued),
          })
        );

        setRows(normalizedData);
      } catch (error: any) {
        if (!alive) return;

        console.error("Error cargando el panel de stock:", error);
        setErr(error?.message ?? "Error cargando stock");
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [includeInactive]);

  const normalized = useMemo<NormalizedProductStock[]>(() => {
    return rows.map((row) => ({
      ...row,
      stockN: Number(row.stock ?? 0) || 0,
    }));
  }, [rows]);

  const outOfStock = useMemo(() => {
    return normalized.filter((row) => row.stockN <= 0);
  }, [normalized]);

  const lowStock = useMemo(() => {
    return normalized.filter(
      (row) => row.stockN > 0 && row.stockN <= threshold
    );
  }, [normalized, threshold]);

  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, NormalizedProductStock[]>();

    for (const row of lowStock) {
      const supplier = row.supplier_name?.trim() || "Sin proveedor";
      const current = map.get(supplier) ?? [];

      current.push(row);
      map.set(supplier, current);
    }

    return Array.from(map.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );
  }, [lowStock]);

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[#191919]">
            Stock / Alertas
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Productos revisados, no descatalogados, agotados o con bajo stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) =>
                setIncludeInactive(event.target.checked)
              }
            />

            Incluir productos ocultos
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Umbral:</span>

            <input
              type="number"
              min={0}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={threshold}
              onChange={(event) => {
                const nextValue = Number(event.target.value);

                setThreshold(
                  Number.isFinite(nextValue) && nextValue >= 0
                    ? nextValue
                    : 0
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">Agotados</div>

          <div className="text-2xl font-bold text-gray-900">
            {outOfStock.length}
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Bajo stock (≤ {threshold})
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {lowStock.length}
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Productos revisados leídos
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {rows.length}
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Proveedores con alertas
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {groupedBySupplier.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-gray-600">Cargando…</div>
      ) : err ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Agotados */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold text-gray-900">
              🚨 Agotados
            </div>

            {outOfStock.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">
                Ninguno.
              </div>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="w-full min-w-[750px] text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-left">Marca</th>
                      <th className="px-3 py-2 text-left">Categoría</th>
                      <th className="px-3 py-2 text-left">Proveedor</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {outOfStock.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.name}
                        </td>

                        <td className="px-3 py-2">
                          {row.brand || "—"}
                        </td>

                        <td className="px-3 py-2">
                          {row.category || "—"}
                        </td>

                        <td className="px-3 py-2">
                          {row.supplier_name?.trim()
                            ? row.supplier_name
                            : "—"}
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              row.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {row.is_active ? "Visible" : "Oculto"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bajo stock agrupado por proveedor */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold text-gray-900">
              ⚠️ Bajo stock (≤ {threshold})
            </div>

            {lowStock.length === 0 ? (
              <div className="mt-3 text-sm text-gray-600">
                Ninguno con ese umbral.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {groupedBySupplier.map(([supplier, list]) => (
                  <div
                    key={supplier}
                    className="rounded-xl border bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">
                        {supplier}
                      </div>

                      <div className="text-xs text-gray-600">
                        Productos: <b>{list.length}</b>
                      </div>
                    </div>

                    <div className="mt-2 overflow-auto">
                      <table className="w-full min-w-[750px] text-sm">
                        <thead className="text-gray-700">
                          <tr>
                            <th className="px-2 py-1 text-left">
                              Producto
                            </th>

                            <th className="px-2 py-1 text-left">
                              Marca
                            </th>

                            <th className="px-2 py-1 text-left">
                              Categoría
                            </th>

                            <th className="px-2 py-1 text-left">
                              Stock
                            </th>

                            <th className="px-2 py-1 text-left">
                              Estado
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {list.map((row) => (
                            <tr key={row.id}>
                              <td className="px-2 py-1 font-medium text-gray-900">
                                {row.name}
                              </td>

                              <td className="px-2 py-1">
                                {row.brand || "—"}
                              </td>

                              <td className="px-2 py-1">
                                {row.category || "—"}
                              </td>

                              <td className="px-2 py-1">
                                {row.stockN}
                              </td>

                              <td className="px-2 py-1">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    row.is_active
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {row.is_active
                                    ? "Visible"
                                    : "Oculto"}
                                </span>
                              </td>
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