import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type ExpirationPrecision = "day" | "month";

type ProductExpiry = {
  id: number;
  name: string;
  brand: string;
  category: string;
  stock: number | null;
  supplier_name: string | null;
  expiration_date: string | null;
  expiration_date_precision: ExpirationPrecision | null;
  expiration_date_manual: boolean | null;
};

type Mode =
  | "allExpired"
  | "today"
  | "last15Days"
  | "thisMonth"
  | "nextMonth";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

function subDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
}

function ymLabel(d: Date) {
  return d.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function parseYMD(value: string | null) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatExpiryLabel(product: ProductExpiry) {
  if (!product.expiration_date) return "—";

  const precision = product.expiration_date_precision ?? "day";
  const date = parseYMD(product.expiration_date);

  if (!date) return product.expiration_date;

  if (precision === "month") {
    return date.toLocaleDateString("es-ES", {
      month: "2-digit",
      year: "numeric",
    });
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getGroupKey(product: ProductExpiry) {
  if (!product.expiration_date) return "Sin fecha";

  const precision = product.expiration_date_precision ?? "day";
  const date = parseYMD(product.expiration_date);

  if (!date) return product.expiration_date;

  if (precision === "month") {
    return `Mes/año: ${date.toLocaleDateString("es-ES", {
      month: "2-digit",
      year: "numeric",
    })}`;
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getSortDate(product: ProductExpiry) {
  return product.expiration_date ?? "";
}

/**
 * Para una fecha exacta, el producto está caducado cuando la fecha
 * es anterior a hoy.
 *
 * Para una fecha solo mes/año, el producto se considera caducado
 * cuando ha terminado completamente ese mes.
 */
function isExpired(product: ProductExpiry, today: Date) {
  if (!product.expiration_date) return false;

  const expirationDate = parseYMD(product.expiration_date);
  if (!expirationDate) return false;

  const precision = product.expiration_date_precision ?? "day";
  const todayStart = startOfDay(today);

  if (precision === "month") {
    return endOfMonth(expirationDate) < todayStart;
  }

  return startOfDay(expirationDate) < todayStart;
}

function isProductInRange(
  product: ProductExpiry,
  from: string,
  to: string,
  mode: Mode
) {
  if (!product.expiration_date) return false;

  const precision = product.expiration_date_precision ?? "day";

  if (precision === "day") {
    return (
      product.expiration_date >= from &&
      product.expiration_date <= to
    );
  }

  const productDate = parseYMD(product.expiration_date);
  const fromDate = parseYMD(from);
  const toDate = parseYMD(to);

  if (!productDate || !fromDate || !toDate) return false;

  // No conocemos el día exacto, así que no aparece en "Hoy".
  if (mode === "today") return false;

  const productMonthStart = startOfMonth(productDate);
  const productMonthEnd = endOfMonth(productDate);

  return productMonthEnd >= fromDate && productMonthStart <= toDate;
}

export default function AdminExpiryPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("allExpired");
  const [rows, setRows] = useState<ProductExpiry[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrecision, setEditPrecision] =
    useState<ExpirationPrecision>("day");
  const [editDate, setEditDate] = useState("");
  const [editMonth, setEditMonth] = useState("");

  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setErr(null);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
            id,
            name,
            brand,
            category,
            stock,
            supplier_name,
            expiration_date,
            expiration_date_precision,
            expiration_date_manual,
            is_active
          `
        )
        .not("expiration_date", "is", null)
        .eq("is_active", true)
        .order("expiration_date", { ascending: true })
        .limit(5000);

      if (error) throw error;

      setRows((data ?? []) as ProductExpiry[]);
    } catch (error: any) {
      setErr(error?.message ?? "Error cargando las caducidades");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => toYMD(today), [today]);

  const range = useMemo(() => {
    if (mode === "allExpired") {
      return {
        kind: "expired" as const,
        title: "Todos los productos caducados",
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

    if (mode === "last15Days") {
      const from = toYMD(subDays(today, 15));

      return {
        kind: "range" as const,
        title: "Últimos 15 días",
        from,
        to: todayYMD,
      };
    }

    if (mode === "thisMonth") {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      return {
        kind: "month" as const,
        title: `Este mes (${ymLabel(monthStart)})`,
        from: toYMD(monthStart),
        to: toYMD(monthEnd),
      };
    }

    const nextMonth = addMonths(today, 1);
    const monthStart = startOfMonth(nextMonth);
    const monthEnd = endOfMonth(nextMonth);

    return {
      kind: "month" as const,
      title: `Mes que viene (${ymLabel(monthStart)})`,
      from: toYMD(monthStart),
      to: toYMD(monthEnd),
    };
  }, [mode, today, todayYMD]);

  const filtered = useMemo(() => {
    return rows
      .filter((product) => {
        if (mode === "allExpired") {
          return isExpired(product, today);
        }

        return isProductInRange(
          product,
          range.from,
          range.to,
          mode
        );
      })
      .sort((a, b) =>
        getSortDate(a).localeCompare(getSortDate(b))
      );
  }, [rows, mode, range, today]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ProductExpiry[]>();

    for (const product of filtered) {
      const key = getGroupKey(product);
      const currentProducts = map.get(key) ?? [];

      currentProducts.push(product);
      map.set(key, currentProducts);
    }

    return Array.from(map.entries()).sort((a, b) => {
      const firstDateA = a[1][0]?.expiration_date ?? "";
      const firstDateB = b[1][0]?.expiration_date ?? "";

      return firstDateA.localeCompare(firstDateB);
    });
  }, [filtered]);

  const startEditing = (product: ProductExpiry) => {
    const precision =
      product.expiration_date_precision ?? "day";

    setSaveError(null);
    setEditingId(product.id);
    setEditPrecision(precision);

    if (precision === "month") {
      setEditMonth(
        product.expiration_date
          ? product.expiration_date.slice(0, 7)
          : ""
      );
      setEditDate("");
    } else {
      setEditDate(product.expiration_date ?? "");
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
    precision: ExpirationPrecision
  ) => {
    setEditPrecision(precision);
    setSaveError(null);

    if (precision === "month") {
      if (editDate) {
        setEditMonth(editDate.slice(0, 7));
      }
    } else {
      if (editMonth) {
        setEditDate(`${editMonth}-01`);
      }
    }
  };

  const saveExpirationDate = async (productId: number) => {
    setSaveError(null);

    let expirationDate: string;

    if (editPrecision === "month") {
      if (!editMonth) {
        setSaveError("Selecciona el mes y el año.");
        return;
      }

      expirationDate = `${editMonth}-01`;
    } else {
      if (!editDate) {
        setSaveError("Selecciona la fecha de caducidad.");
        return;
      }

      expirationDate = editDate;
    }

    setSavingId(productId);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          expiration_date: expirationDate,
          expiration_date_precision: editPrecision,
          expiration_date_manual: true,
        })
        .eq("id", productId);

      if (error) throw error;

      setRows((currentRows) =>
        currentRows.map((product) =>
          product.id === productId
            ? {
                ...product,
                expiration_date: expirationDate,
                expiration_date_precision: editPrecision,
                expiration_date_manual: true,
              }
            : product
        )
      );

      cancelEditing();
    } catch (error: any) {
      setSaveError(
        error?.message ??
          "No se ha podido actualizar la fecha."
      );
    } finally {
      setSavingId(null);
    }
  };

  const btnClass = (active: boolean) =>
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

  const renderProduct = (product: ProductExpiry) => {
    const precision =
      product.expiration_date_precision ?? "day";
    const isManual = !!product.expiration_date_manual;
    const editing = editingId === product.id;
    const expired = isExpired(product, today);
    const saving = savingId === product.id;

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
              {product.brand} · {product.category} ·{" "}
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
                <b>{formatExpiryLabel(product)}</b>
              </span>

              <span
                className={`rounded-full px-2 py-0.5 ${
                  precision === "month"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {precision === "month"
                  ? "Solo mes/año"
                  : "Día exacto"}
              </span>

              {isManual ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                  Fecha manual
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  Firesoft/API
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="whitespace-nowrap text-sm text-gray-700">
              Stock: <b>{product.stock ?? 0}</b>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() => startEditing(product)}
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
                Esta fecha se guardará como manual para indicar que
                la has actualizado desde el panel.
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de fecha
                </span>

                <select
                  value={editPrecision}
                  onChange={(event) =>
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

              {editPrecision === "day" ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha
                  </span>

                  <input
                    type="date"
                    value={editDate}
                    onChange={(event) =>
                      setEditDate(event.target.value)
                    }
                    disabled={saving}
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
                    value={editMonth}
                    onChange={(event) =>
                      setEditMonth(event.target.value)
                    }
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00bf63] focus:ring-2 focus:ring-[#00bf63]/20 md:w-52"
                  />
                </label>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    saveExpirationDate(product.id)
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
                  onClick={cancelEditing}
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
          className={btnClass(mode === "allExpired")}
          onClick={() => {
            cancelEditing();
            setMode("allExpired");
          }}
        >
          Todos los caducados
        </button>

        <button
          type="button"
          className={btnClass(mode === "today")}
          onClick={() => {
            cancelEditing();
            setMode("today");
          }}
        >
          Hoy
        </button>

        <button
          type="button"
          className={btnClass(mode === "last15Days")}
          onClick={() => {
            cancelEditing();
            setMode("last15Days");
          }}
        >
          Últimos 15 días
        </button>

        <button
          type="button"
          className={btnClass(mode === "thisMonth")}
          onClick={() => {
            cancelEditing();
            setMode("thisMonth");
          }}
        >
          Este mes
        </button>

        <button
          type="button"
          className={btnClass(mode === "nextMonth")}
          onClick={() => {
            cancelEditing();
            setMode("nextMonth");
          }}
        >
          Mes que viene
        </button>

        <button
          type="button"
          onClick={loadProducts}
          disabled={loading}
          className="ml-auto rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Actualizando..." : "Recargar"}
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === "allExpired"
                ? "Todos los productos caducados"
                : mode === "today"
                ? `Productos que caducan el ${range.title}`
                : mode === "last15Days"
                ? "Productos de los últimos 15 días"
                : `Productos que caducan ${range.title}`}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {mode === "allExpired"
                ? "Muestra todos los productos cuya fecha ya ha pasado, incluidos los de meses anteriores."
                : mode === "today"
                ? "Solo muestra productos con un día exacto de caducidad."
                : mode === "last15Days"
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
        ) : filtered.length === 0 ? (
          <div className="mt-6 text-gray-700">
            {emptyText}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {mode === "today" ? (
              <ul className="space-y-4">
                {filtered.map(renderProduct)}
              </ul>
            ) : (
              groupedByDate.map(([date, products]) => (
                <div key={date}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {date}
                    </div>

                    <div className="h-px flex-1 bg-gray-200" />

                    <div className="text-xs text-gray-500">
                      {products.length}{" "}
                      {products.length === 1
                        ? "producto"
                        : "productos"}
                    </div>
                  </div>

                  <ul className="space-y-4">
                    {products.map(renderProduct)}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}