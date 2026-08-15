import React, { useEffect, useMemo, useState } from "react";

type ExpirationPrecision = "day" | "month";

type ShopifyProductApi = {
  id: string;
  numeric_id: string | null;
  title: string;
  vendor: string;
  product_type: string;
  status: string;

  variant: {
    available: number;
  };

  metafields: {
    isgood: boolean;
    is_discontinued: boolean;
    supplier_name: string | null;

    expiration_date: string | null;
    expiration_date_precision: ExpirationPrecision | null;
    expiration_date_manual: boolean | null;
  };
};

type ProductExpiry = {
  id: string;
  numeric_id: string | null;
  name: string;
  brand: string;
  category: string;
  stock: number;
  supplier_name: string | null;
  expiration_date: string | null;
  expiration_date_precision: ExpirationPrecision | null;
  expiration_date_manual: boolean | null;
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

type Mode =
  | "allExpired"
  | "today"
  | "last15Days"
  | "thisMonth"
  | "nextMonth";

const SHOPIFY_API_BASE = "/api";
const API_PAGE_SIZE = 100;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(
    d.getMonth() + 1
  )}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

function startOfMonth(d: Date) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    1
  );
}

function endOfMonth(d: Date) {
  return new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0
  );
}

function addMonths(d: Date, n: number) {
  return new Date(
    d.getFullYear(),
    d.getMonth() + n,
    1
  );
}

function subDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
}

function ymLabel(d: Date) {
  return d.toLocaleDateString(
    "es-ES",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function parseYMD(
  value: string | null
) {
  if (!value) return null;

  const [year, month, day] =
    value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatExpiryLabel(
  product: ProductExpiry
) {
  if (!product.expiration_date) {
    return "—";
  }

  const precision =
    product.expiration_date_precision ??
    "day";

  const date = parseYMD(
    product.expiration_date
  );

  if (!date) {
    return product.expiration_date;
  }

  if (precision === "month") {
    return date.toLocaleDateString(
      "es-ES",
      {
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  return date.toLocaleDateString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function getGroupKey(
  product: ProductExpiry
) {
  if (!product.expiration_date) {
    return "Sin fecha";
  }

  const precision =
    product.expiration_date_precision ??
    "day";

  const date = parseYMD(
    product.expiration_date
  );

  if (!date) {
    return product.expiration_date;
  }

  if (precision === "month") {
    return `Mes/año: ${date.toLocaleDateString(
      "es-ES",
      {
        month: "2-digit",
        year: "numeric",
      }
    )}`;
  }

  return date.toLocaleDateString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function getSortDate(
  product: ProductExpiry
) {
  return product.expiration_date ?? "";
}

/**
 * Día exacto:
 * caducado cuando la fecha es anterior a hoy.
 *
 * Solo mes/año:
 * caducado cuando ha terminado por completo ese mes.
 */
function isExpired(
  product: ProductExpiry,
  today: Date
) {
  if (!product.expiration_date) {
    return false;
  }

  const expirationDate = parseYMD(
    product.expiration_date
  );

  if (!expirationDate) {
    return false;
  }

  const precision =
    product.expiration_date_precision ??
    "day";

  const todayStart =
    startOfDay(today);

  if (precision === "month") {
    return (
      endOfMonth(expirationDate) <
      todayStart
    );
  }

  return (
    startOfDay(expirationDate) <
    todayStart
  );
}

function isProductInRange(
  product: ProductExpiry,
  from: string,
  to: string,
  mode: Mode
) {
  if (!product.expiration_date) {
    return false;
  }

  const precision =
    product.expiration_date_precision ??
    "day";

  if (precision === "day") {
    return (
      product.expiration_date >= from &&
      product.expiration_date <= to
    );
  }

  const productDate = parseYMD(
    product.expiration_date
  );
  const fromDate = parseYMD(from);
  const toDate = parseYMD(to);

  if (
    !productDate ||
    !fromDate ||
    !toDate
  ) {
    return false;
  }

  // Si solo conocemos mes/año,
  // no lo enseñamos en la vista "Hoy".
  if (mode === "today") {
    return false;
  }

  const productMonthStart =
    startOfMonth(productDate);

  const productMonthEnd =
    endOfMonth(productDate);

  return (
    productMonthEnd >= fromDate &&
    productMonthStart <= toDate
  );
}

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
): ProductExpiry {
  return {
    id: product.id,
    numeric_id:
      product.numeric_id,
    name:
      product.title || "Producto",
    brand:
      product.vendor || "Sin marca",
    category:
      product.product_type ||
      "Sin categoría",
    stock: Number(
      product.variant?.available ?? 0
    ),
    supplier_name:
      product.metafields
        ?.supplier_name ?? null,
    expiration_date:
      product.metafields
        ?.expiration_date ?? null,
    expiration_date_precision:
      product.metafields
        ?.expiration_date_precision ??
      "day",
    expiration_date_manual:
      product.metafields
        ?.expiration_date_manual ??
      false,
  };
}

export default function ShopifyAdminExpiryPanel() {
  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState<string | null>(null);

  const [mode, setMode] =
    useState<Mode>("allExpired");

  const [rows, setRows] =
    useState<ProductExpiry[]>([]);

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(null);

  const [
    editPrecision,
    setEditPrecision,
  ] =
    useState<ExpirationPrecision>(
      "day"
    );

  const [editDate, setEditDate] =
    useState("");

  const [editMonth, setEditMonth] =
    useState("");

  const [
    savingId,
    setSavingId,
  ] =
    useState<string | null>(null);

  const [
    saveError,
    setSaveError,
  ] =
    useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setErr(null);

    try {
      const collected:
        ShopifyProductApi[] = [];

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
          String(API_PAGE_SIZE)
        );

        // Solo productos ya revisados/activos.
        // Los ocultos temporalmente siguen siendo ACTIVE,
        // así que también aparecen aquí.
        params.set(
          "status",
          "ACTIVE"
        );

        params.set(
          "reviewed",
          "true"
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

        totalPages = Math.max(
          1,
          Number(
            data.total_pages ?? 1
          )
        );

        page += 1;
      } while (
        page <= totalPages
      );

      const expiryRows =
        collected
          .filter(
            (product) =>
              Boolean(
                product.metafields
                  ?.expiration_date
              )
          )
          .map(normalizeProduct)
          .sort((a, b) =>
            getSortDate(a).localeCompare(
              getSortDate(b)
            )
          );

      setRows(expiryRows);
    } catch (error: any) {
      console.error(error);

      setErr(
        error?.message ??
          "Error cargando las caducidades de Shopify."
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const today = useMemo(
    () => new Date(),
    []
  );

  const todayYMD = useMemo(
    () => toYMD(today),
    [today]
  );

  const range = useMemo(() => {
    if (mode === "allExpired") {
      return {
        kind: "expired" as const,
        title:
          "Todos los productos caducados",
        from: "",
        to: todayYMD,
      };
    }

    if (mode === "today") {
      return {
        kind: "day" as const,
        title: todayYMD,
        from: todayYMD,
        to: todayYMD,
      };
    }

    if (
      mode === "last15Days"
    ) {
      const from = toYMD(
        subDays(today, 15)
      );

      return {
        kind: "range" as const,
        title:
          "Últimos 15 días",
        from,
        to: todayYMD,
      };
    }

    if (
      mode === "thisMonth"
    ) {
      const monthStart =
        startOfMonth(today);

      const monthEnd =
        endOfMonth(today);

      return {
        kind: "month" as const,
        title: `Este mes (${ymLabel(
          monthStart
        )})`,
        from: toYMD(
          monthStart
        ),
        to: toYMD(monthEnd),
      };
    }

    const nextMonth =
      addMonths(today, 1);

    const monthStart =
      startOfMonth(nextMonth);

    const monthEnd =
      endOfMonth(nextMonth);

    return {
      kind: "month" as const,
      title: `Mes que viene (${ymLabel(
        monthStart
      )})`,
      from: toYMD(monthStart),
      to: toYMD(monthEnd),
    };
  }, [
    mode,
    today,
    todayYMD,
  ]);

  const filtered = useMemo(() => {
    return rows
      .filter((product) => {
        if (
          mode === "allExpired"
        ) {
          return isExpired(
            product,
            today
          );
        }

        return isProductInRange(
          product,
          range.from,
          range.to,
          mode
        );
      })
      .sort((a, b) =>
        getSortDate(
          a
        ).localeCompare(
          getSortDate(b)
        )
      );
  }, [
    rows,
    mode,
    range,
    today,
  ]);

  const groupedByDate =
    useMemo(() => {
      const map =
        new Map<
          string,
          ProductExpiry[]
        >();

      for (
        const product of filtered
      ) {
        const key =
          getGroupKey(product);

        const currentProducts =
          map.get(key) ?? [];

        currentProducts.push(
          product
        );

        map.set(
          key,
          currentProducts
        );
      }

      return Array.from(
        map.entries()
      ).sort((a, b) => {
        const firstDateA =
          a[1][0]
            ?.expiration_date ??
          "";

        const firstDateB =
          b[1][0]
            ?.expiration_date ??
          "";

        return firstDateA.localeCompare(
          firstDateB
        );
      });
    }, [filtered]);

  const startEditing = (
    product: ProductExpiry
  ) => {
    const precision =
      product.expiration_date_precision ??
      "day";

    setSaveError(null);

    setEditingId(
      product.id
    );

    setEditPrecision(
      precision
    );

    if (
      precision === "month"
    ) {
      setEditMonth(
        product.expiration_date
          ? product.expiration_date.slice(
              0,
              7
            )
          : ""
      );

      setEditDate("");
    } else {
      setEditDate(
        product.expiration_date ??
          ""
      );

      setEditMonth("");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate("");
    setEditMonth("");
    setEditPrecision("day");
    setSaveError(null);
  };

  const changeEditPrecision = (
    precision:
      ExpirationPrecision
  ) => {
    setEditPrecision(
      precision
    );

    setSaveError(null);

    if (
      precision === "month"
    ) {
      if (editDate) {
        setEditMonth(
          editDate.slice(0, 7)
        );
      }
    } else {
      if (editMonth) {
        setEditDate(
          `${editMonth}-01`
        );
      }
    }
  };

  const saveExpirationDate =
    async (
      product: ProductExpiry
    ) => {
      setSaveError(null);

      let expirationDate:
        string;

      if (
        editPrecision ===
        "month"
      ) {
        if (!editMonth) {
          setSaveError(
            "Selecciona el mes y el año."
          );

          return;
        }

        expirationDate =
          `${editMonth}-01`;
      } else {
        if (!editDate) {
          setSaveError(
            "Selecciona la fecha de caducidad."
          );

          return;
        }

        expirationDate =
          editDate;
      }

      setSavingId(
        product.id
      );

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products/${product.numeric_id ?? product.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                metafields: {
                  expiration_date:
                    expirationDate,

                  expiration_date_precision:
                    editPrecision,

                  expiration_date_manual:
                    true,
                },
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            getApiError(
              data,
              "No se ha podido actualizar la fecha."
            )
          );
        }

        setRows(
          (currentRows) =>
            currentRows.map(
              (current) =>
                current.id ===
                product.id
                  ? {
                      ...current,
                      expiration_date:
                        expirationDate,
                      expiration_date_precision:
                        editPrecision,
                      expiration_date_manual:
                        true,
                    }
                  : current
            )
        );

        cancelEditing();
      } catch (error: any) {
        console.error(error);

        setSaveError(
          error?.message ??
            "No se ha podido actualizar la fecha."
        );
      } finally {
        setSavingId(null);
      }
    };

  const btnClass = (
    active: boolean
  ) =>
    [
      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
      active
        ? "bg-[#00bf63]/15 text-[#0b6b3a] ring-1 ring-[#00bf63]/30"
        : "bg-gray-100 text-gray-800 hover:bg-gray-200",
    ].join(" ");

  const emptyText =
    mode === "allExpired"
      ? "No hay productos caducados."
      : mode === "today"
      ? "No hay productos que caduquen hoy. Los productos con caducidad solo mes/año no aparecen en esta vista."
      : mode === "last15Days"
      ? "No hay productos con caducidad en los últimos 15 días."
      : mode === "thisMonth"
      ? "No hay productos que caduquen este mes."
      : "No hay productos que caduquen el mes que viene.";

  const renderProduct = (
    product: ProductExpiry
  ) => {
    const precision =
      product.expiration_date_precision ??
      "day";

    const isManual =
      !!product.expiration_date_manual;

    const editing =
      editingId === product.id;

    const expired =
      isExpired(
        product,
        today
      );

    const saving =
      savingId === product.id;

    return (
      <li
        key={product.id}
        className="border-b pb-4 last:border-b-0"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-medium text-gray-900">
                {product.name}
              </div>

              {expired && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Caducado
                </span>
              )}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              {product.brand}
              {" · "}
              {product.category}
              {" · "}
              {product.supplier_name?.trim()
                ? product.supplier_name
                : "Sin proveedor"}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 ${
                  expired
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Caducidad:{" "}
                <b>
                  {formatExpiryLabel(
                    product
                  )}
                </b>
              </span>

              <span
                className={`rounded-full px-2 py-0.5 ${
                  precision ===
                  "month"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {precision ===
                "month"
                  ? "Solo mes/año"
                  : "Día exacto"}
              </span>

              {isManual ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                  Fecha manual
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  FireSoft/API
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="whitespace-nowrap text-sm text-gray-700">
              Stock:{" "}
              <b>
                {product.stock ?? 0}
              </b>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() =>
                  startEditing(
                    product
                  )
                }
                className="rounded-lg bg-[#00bf63] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00a956]"
              >
                {expired
                  ? "Reponer / actualizar"
                  : "Actualizar fecha"}
              </button>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50/50 p-4">
            <div className="mb-3">
              <div className="font-semibold text-gray-900">
                Nueva fecha de caducidad
              </div>

              <div className="mt-1 text-xs text-gray-600">
                Esta fecha se guardará directamente en los metafields del producto de Shopify y se marcará como manual.
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de fecha
                </span>

                <select
                  value={
                    editPrecision
                  }
                  onChange={(
                    event
                  ) =>
                    changeEditPrecision(
                      event.target
                        .value as ExpirationPrecision
                    )
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00bf63] focus:ring-2 focus:ring-[#00bf63]/20 md:w-48"
                >
                  <option value="day">
                    Día exacto
                  </option>

                  <option value="month">
                    Solo mes y año
                  </option>
                </select>
              </label>

              {editPrecision ===
              "day" ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha
                  </span>

                  <input
                    type="date"
                    value={
                      editDate
                    }
                    onChange={(
                      event
                    ) =>
                      setEditDate(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      saving
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00bf63] focus:ring-2 focus:ring-[#00bf63]/20 md:w-52"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Mes y año
                  </span>

                  <input
                    type="month"
                    value={
                      editMonth
                    }
                    onChange={(
                      event
                    ) =>
                      setEditMonth(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      saving
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00bf63] focus:ring-2 focus:ring-[#00bf63]/20 md:w-52"
                  />
                </label>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void saveExpirationDate(
                      product
                    )
                  }
                  disabled={saving}
                  className="rounded-lg bg-[#00bf63] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00a956] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : "Guardar nueva fecha"}
                </button>

                <button
                  type="button"
                  onClick={
                    cancelEditing
                  }
                  disabled={saving}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {saveError && (
              <div className="mt-3 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <section className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnClass(
            mode ===
              "allExpired"
          )}
          onClick={() => {
            cancelEditing();
            setMode(
              "allExpired"
            );
          }}
        >
          Todos los caducados
        </button>

        <button
          type="button"
          className={btnClass(
            mode === "today"
          )}
          onClick={() => {
            cancelEditing();
            setMode("today");
          }}
        >
          Hoy
        </button>

        <button
          type="button"
          className={btnClass(
            mode ===
              "last15Days"
          )}
          onClick={() => {
            cancelEditing();
            setMode(
              "last15Days"
            );
          }}
        >
          Últimos 15 días
        </button>

        <button
          type="button"
          className={btnClass(
            mode ===
              "thisMonth"
          )}
          onClick={() => {
            cancelEditing();
            setMode(
              "thisMonth"
            );
          }}
        >
          Este mes
        </button>

        <button
          type="button"
          className={btnClass(
            mode ===
              "nextMonth"
          )}
          onClick={() => {
            cancelEditing();
            setMode(
              "nextMonth"
            );
          }}
        >
          Mes que viene
        </button>

        <button
          type="button"
          onClick={() =>
            void loadProducts()
          }
          disabled={loading}
          className="ml-auto rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Actualizando..."
            : "Recargar"}
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode ===
              "allExpired"
                ? "Todos los productos caducados"
                : mode ===
                  "today"
                ? `Productos que caducan el ${range.title}`
                : mode ===
                  "last15Days"
                ? "Productos de los últimos 15 días"
                : `Productos que caducan ${range.title}`}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {mode ===
              "allExpired"
                ? "Muestra todos los productos cuya fecha ya ha pasado, incluidos los de meses anteriores."
                : mode ===
                  "today"
                ? "Solo muestra productos con un día exacto de caducidad."
                : mode ===
                  "last15Days"
                ? `Muestra productos con fecha entre ${range.from} y ${range.to}.`
                : "Incluye fechas exactas y productos guardados solamente con mes y año."}
            </p>
          </div>

          <div className="whitespace-nowrap text-sm text-gray-600">
            Total:{" "}
            <span className="font-semibold">
              {filtered.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-gray-600">
            Cargando…
          </div>
        ) : err ? (
          <div className="mt-6 rounded-lg bg-red-50 p-3 text-red-700">
            {err}
          </div>
        ) : filtered.length ===
          0 ? (
          <div className="mt-6 text-gray-700">
            {emptyText}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {mode ===
            "today" ? (
              <ul className="space-y-4">
                {filtered.map(
                  renderProduct
                )}
              </ul>
            ) : (
              groupedByDate.map(
                ([
                  date,
                  products,
                ]) => (
                  <div key={date}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {date}
                      </div>

                      <div className="h-px flex-1 bg-gray-200" />

                      <div className="text-xs text-gray-500">
                        {
                          products.length
                        }{" "}
                        {products.length ===
                        1
                          ? "producto"
                          : "productos"}
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {products.map(
                        renderProduct
                      )}
                    </ul>
                  </div>
                )
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}