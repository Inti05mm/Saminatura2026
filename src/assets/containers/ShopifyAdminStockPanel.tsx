import React, { useEffect, useMemo, useState } from "react";

type ShopifyProductApi = {
  id: string;
  numeric_id: string | null;

  title: string;
  vendor: string;
  product_type: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | string;

  published_online_store?: boolean;

  variant: {
    available: number;
  };

  metafields: {
    isgood: boolean;
    is_discontinued: boolean;
    supplier_name: string | null;
  };
};

type ProductsResponse = {
  ok: boolean;
  products: ShopifyProductApi[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  error?: string;
  errors?: Array<{
    message?: string;
  }>;
};

type ProductStock = {
  id: string;
  numeric_id: string | null;

  name: string;
  brand: string;
  category: string;

  stock: number;
  supplier_name: string | null;

  isgood: boolean;
  is_active: boolean;
  is_discontinued: boolean;

  // Estado real de publicación en Online Store.
  // Si tu API todavía no lo devuelve, usamos status ACTIVE
  // como fallback para mantener el panel funcionando.
  is_visible: boolean;
};

type NormalizedProductStock =
  ProductStock & {
    stockN: number;
  };

const SHOPIFY_API_BASE = "/api";

const API_PAGE_SIZE = 100;

function getApiError(
  data: any,
  fallback: string
) {
  if (data?.error) {
    return String(data.error);
  }

  if (Array.isArray(data?.errors)) {
    const message = data.errors
      .map(
        (item: any) =>
          item?.message
      )
      .filter(Boolean)
      .join(", ");

    if (message) {
      return message;
    }
  }

  return fallback;
}

function normalizeProduct(
  product: ShopifyProductApi
): ProductStock {
  const active =
    String(
      product.status ?? ""
    ).toUpperCase() ===
    "ACTIVE";

  const published =
    typeof product.published_online_store ===
    "boolean"
      ? product.published_online_store
      : active;

  return {
    id: product.id,
    numeric_id:
      product.numeric_id,

    name:
      product.title ?? "",

    brand:
      product.vendor ?? "",

    category:
      product.product_type ?? "",

    stock: Number(
      product.variant
        ?.available ?? 0
    ),

    supplier_name:
      product.metafields
        ?.supplier_name ?? null,

    isgood:
      Boolean(
        product.metafields
          ?.isgood
      ),

    is_active:
      active,

    is_discontinued:
      Boolean(
        product.metafields
          ?.is_discontinued
      ),

    is_visible:
      active && published,
  };
}

export default function ShopifyAdminStockPanel() {
  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState<string | null>(
      null
    );

  const [rows, setRows] =
    useState<ProductStock[]>(
      []
    );

  const [
    threshold,
    setThreshold,
  ] =
    useState<number>(5);

  const [
    includeHidden,
    setIncludeHidden,
  ] =
    useState(false);

  const loadProducts =
    async () => {
      setLoading(true);
      setErr(null);

      try {
        const collected:
          ShopifyProductApi[] =
          [];

        let page = 1;
        let totalPages = 1;

        do {
          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(page)
          );

          params.set(
            "page_size",
            String(
              API_PAGE_SIZE
            )
          );

          // Stock/reposición solo trabaja
          // con productos ya revisados.
          params.set(
            "reviewed",
            "true"
          );

          // DRAFT = pendiente de revisión,
          // así que no entra en stock.
          params.set(
            "status",
            "ACTIVE"
          );

          params.set(
            "include_discontinued",
            "false"
          );

          const response =
            await fetch(
              `${SHOPIFY_API_BASE}/shopify/admin/products?${params.toString()}`,
              {
                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          const data =
            (await response.json()) as ProductsResponse;

          if (
            !response.ok ||
            data.ok === false
          ) {
            throw new Error(
              getApiError(
                data,
                `Error API (${response.status})`
              )
            );
          }

          collected.push(
            ...(Array.isArray(
              data.products
            )
              ? data.products
              : [])
          );

          totalPages =
            Math.max(
              1,
              Number(
                data.total_pages ??
                  1
              )
            );

          page += 1;
        } while (
          page <= totalPages
        );

        const normalized =
          collected
            .map(
              normalizeProduct
            )
            .filter(
              (product) =>
                product.isgood &&
                !product.is_discontinued
            );

        setRows(normalized);
      } catch (
        error: any
      ) {
        console.error(
          "Error cargando panel stock Shopify:",
          error
        );

        setErr(
          error?.message ??
            "Error cargando stock de Shopify."
        );

        setRows([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadProducts();
  }, []);

  const visibleRows =
    useMemo(() => {
      if (
        includeHidden
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          row.is_visible
      );
    }, [
      rows,
      includeHidden,
    ]);

  const normalized =
    useMemo<
      NormalizedProductStock[]
    >(() => {
      return visibleRows.map(
        (row) => ({
          ...row,
          stockN:
            Number(
              row.stock ?? 0
            ) || 0,
        })
      );
    }, [visibleRows]);

  const outOfStock =
    useMemo(() => {
      return normalized.filter(
        (row) =>
          row.stockN <= 0
      );
    }, [normalized]);

  const lowStock =
    useMemo(() => {
      return normalized.filter(
        (row) =>
          row.stockN > 0 &&
          row.stockN <=
            threshold
      );
    }, [
      normalized,
      threshold,
    ]);

  const groupedBySupplier =
    useMemo(() => {
      const map =
        new Map<
          string,
          NormalizedProductStock[]
        >();

      for (
        const row of lowStock
      ) {
        const supplier =
          row.supplier_name?.trim() ||
          "Sin proveedor";

        const current =
          map.get(
            supplier
          ) ?? [];

        current.push(row);

        map.set(
          supplier,
          current
        );
      }

      return Array.from(
        map.entries()
      ).sort(
        (a, b) =>
          b[1].length -
          a[1].length
      );
    }, [lowStock]);

  const stateBadge = (
    row: ProductStock
  ) => {
    if (
      !row.is_active
    ) {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
          Borrador
        </span>
      );
    }

    if (
      !row.is_visible
    ) {
      return (
        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
          Oculto
        </span>
      );
    }

    return (
      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
        Visible
      </span>
    );
  };

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[#191919]">
            Stock / Alertas
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Productos revisados y no descatalogados, agrupados por alertas de stock.
            El stock es solo lectura y viene de FireSoft a través de Shopify.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={
                includeHidden
              }
              onChange={(
                event
              ) =>
                setIncludeHidden(
                  event.target
                    .checked
                )
              }
            />

            Incluir productos ocultos
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Umbral:
            </span>

            <input
              type="number"
              min={0}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={
                threshold
              }
              onChange={(
                event
              ) => {
                const nextValue =
                  Number(
                    event.target
                      .value
                  );

                setThreshold(
                  Number.isFinite(
                    nextValue
                  ) &&
                    nextValue >=
                      0
                    ? nextValue
                    : 0
                );
              }}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              void loadProducts()
            }
            disabled={
              loading
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading
              ? "Actualizando…"
              : "Recargar"}
          </button>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Agotados
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {
              outOfStock.length
            }
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Bajo stock (≤{" "}
            {threshold})
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {
              lowStock.length
            }
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Productos revisados leídos
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {
              visibleRows.length
            }
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="text-xs text-gray-500">
            Proveedores con alertas
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {
              groupedBySupplier.length
            }
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-gray-600">
          Cargando…
        </div>
      ) : err ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* AGOTADOS */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold text-gray-900">
              🚨 Agotados
            </div>

            {outOfStock.length ===
            0 ? (
              <div className="mt-3 text-sm text-gray-600">
                Ninguno.
              </div>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="w-full min-w-[750px] text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        Producto
                      </th>

                      <th className="px-3 py-2 text-left">
                        Marca
                      </th>

                      <th className="px-3 py-2 text-left">
                        Categoría
                      </th>

                      <th className="px-3 py-2 text-left">
                        Proveedor
                      </th>

                      <th className="px-3 py-2 text-left">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {outOfStock.map(
                      (row) => (
                        <tr
                          key={
                            row.id
                          }
                          className="hover:bg-gray-50"
                        >
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {
                              row.name
                            }
                          </td>

                          <td className="px-3 py-2">
                            {row.brand ||
                              "—"}
                          </td>

                          <td className="px-3 py-2">
                            {row.category ||
                              "—"}
                          </td>

                          <td className="px-3 py-2">
                            {row.supplier_name?.trim()
                              ? row.supplier_name
                              : "—"}
                          </td>

                          <td className="px-3 py-2">
                            {stateBadge(
                              row
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BAJO STOCK */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold text-gray-900">
              ⚠️ Bajo stock (≤{" "}
              {threshold})
            </div>

            {lowStock.length ===
            0 ? (
              <div className="mt-3 text-sm text-gray-600">
                Ninguno con ese umbral.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {groupedBySupplier.map(
                  ([
                    supplier,
                    list,
                  ]) => (
                    <div
                      key={
                        supplier
                      }
                      className="rounded-xl border bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">
                          {
                            supplier
                          }
                        </div>

                        <div className="text-xs text-gray-600">
                          Productos:{" "}
                          <b>
                            {
                              list.length
                            }
                          </b>
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
                            {list.map(
                              (
                                row
                              ) => (
                                <tr
                                  key={
                                    row.id
                                  }
                                >
                                  <td className="px-2 py-1 font-medium text-gray-900">
                                    {
                                      row.name
                                    }
                                  </td>

                                  <td className="px-2 py-1">
                                    {row.brand ||
                                      "—"}
                                  </td>

                                  <td className="px-2 py-1">
                                    {row.category ||
                                      "—"}
                                  </td>

                                  <td className="px-2 py-1">
                                    {
                                      row.stockN
                                    }
                                  </td>

                                  <td className="px-2 py-1">
                                    {stateBadge(
                                      row
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}