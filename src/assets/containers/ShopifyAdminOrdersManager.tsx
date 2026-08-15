import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { UserContext } from "./UserContext";

type FireSoftStatus =
  | "pending"
  | "pending_implicit"
  | "processed";

type ShopifyAdminOrderItem = {
  id: string;
  name: string | null;
  title: string | null;
  variant_title: string | null;
  quantity: number;
  current_quantity: number;
  sku: string | null;
  barcode: string | null;
  variant_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  unit_price: string | null;
  currency: string | null;
};

type ShopifyAdminOrder = {
  id: string;
  numeric_id: string | null;
  name: string;
  created_at: string | null;
  cancelled_at: string | null;

  financial_status: string | null;
  fulfillment_status: string | null;

  firesoft_status: FireSoftStatus;
  firesoft_status_raw: string | null;
  is_firesoft_pending: boolean;
  is_firesoft_processed: boolean;

  total_amount: string | null;
  currency: string | null;

  customer: {
    id: string | null;
    name: string | null;
    email: string | null;
  };

  shipping_address: {
    name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    country: string | null;
    phone: string | null;
  } | null;

  items: ShopifyAdminOrderItem[];
};

type OrdersResponse = {
  ok: boolean;
  orders: ShopifyAdminOrder[];
  count: number;
  page_info?: {
    has_next_page?: boolean;
    end_cursor?: string | null;
  };
  error?: string;
};

const FIRESOFT_API_BASE =
  import.meta.env.VITE_FIRESOFT_API_URL?.trim() ||
  "http://localhost:8000";

const SHOPIFY_API_BASE = "/api";
const PAGE_SIZE = 15;

const formatEUR = (
  value: number | string | null | undefined,
  currency = "EUR"
) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(
    Number.isFinite(Number(value))
      ? Number(value)
      : 0
  );

function formatDate(
  value?: string | null
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatAddress(
  address:
    | ShopifyAdminOrder["shipping_address"]
    | null
) {
  if (!address) {
    return "—";
  }

  return [
    address.name,
    address.address1,
    address.address2,
    [address.zip, address.city]
      .filter(Boolean)
      .join(" "),
    address.province,
    address.country,
  ]
    .map((value) =>
      typeof value === "string"
        ? value.trim()
        : value
    )
    .filter(Boolean)
    .join(", ");
}

function financialLabel(
  status?: string | null
) {
  const value =
    String(
      status ?? ""
    ).toUpperCase();

  if (value === "PAID") {
    return "Pagado";
  }

  if (value === "PENDING") {
    return "Pago pendiente";
  }

  if (
    value ===
    "PARTIALLY_PAID"
  ) {
    return "Pago parcial";
  }

  if (
    value === "REFUNDED"
  ) {
    return "Reembolsado";
  }

  if (
    value ===
    "PARTIALLY_REFUNDED"
  ) {
    return "Reembolso parcial";
  }

  if (value === "VOIDED") {
    return "Anulado";
  }

  return status || "—";
}

function financialClass(
  status?: string | null
) {
  const value =
    String(
      status ?? ""
    ).toUpperCase();

  if (value === "PAID") {
    return "bg-green-100 text-green-800";
  }

  if (value === "PENDING") {
    return "bg-amber-100 text-amber-800";
  }

  if (
    value === "REFUNDED" ||
    value ===
      "PARTIALLY_REFUNDED"
  ) {
    return "bg-purple-100 text-purple-800";
  }

  if (value === "VOIDED") {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-100 text-gray-700";
}

function fulfillmentLabel(
  status?: string | null
) {
  const value =
    String(
      status ?? ""
    ).toUpperCase();

  if (
    value === "FULFILLED"
  ) {
    return "Preparado";
  }

  if (
    value === "UNFULFILLED"
  ) {
    return "No preparado";
  }

  if (
    value ===
    "PARTIALLY_FULFILLED"
  ) {
    return "Parcialmente preparado";
  }

  if (value === "ON_HOLD") {
    return "En espera";
  }

  return status || "—";
}

function firesoftLabel(
  order: ShopifyAdminOrder
) {
  return order.is_firesoft_processed
    ? "Pasado por FireSoft"
    : "Pendiente de FireSoft";
}

function firesoftClass(
  order: ShopifyAdminOrder
) {
  return order.is_firesoft_processed
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar"
      />

      <div className="absolute left-1/2 top-1/2 max-h-[92vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-[#191919]">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersManager() {
  const { user } =
    useContext(
      UserContext
    ) as any;

  const [
    orders,
    setOrders,
  ] =
    useState<
      ShopifyAdminOrder[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [err, setErr] =
    useState<
      string | null
    >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    showPaid,
    setShowPaid,
  ] = useState(true);

  const [
    showPendingPayment,
    setShowPendingPayment,
  ] = useState(true);

  const [
    showFiresoftPending,
    setShowFiresoftPending,
  ] = useState(true);

  const [
    showFiresoftProcessed,
    setShowFiresoftProcessed,
  ] = useState(true);

  const [page, setPage] =
    useState(1);

  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<
      ShopifyAdminOrder | null
    >(null);

  const [open, setOpen] =
    useState(false);

  const [
    processingFiresoft,
    setProcessingFiresoft,
  ] = useState(false);

  const [
    firesoftActionErr,
    setFiresoftActionErr,
  ] =
    useState<
      string | null
    >(null);

  const [
    firesoftActionOk,
    setFiresoftActionOk,
  ] =
    useState<
      string | null
    >(null);

  const loadOrders =
    async () => {
      setLoading(true);
      setErr(null);

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/orders?first=100&status=all`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const data =
          (await response.json()) as OrdersResponse;

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            data.error ||
              `Error API (${response.status})`
          );
        }

        setOrders(
          Array.isArray(
            data.orders
          )
            ? data.orders
            : []
        );
      } catch (
        error: any
      ) {
        console.error(error);

        setErr(
          error?.message ??
            "No se han podido cargar los pedidos de Shopify."
        );

        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!user) return;

    void loadOrders();
  }, [user]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    showPaid,
    showPendingPayment,
    showFiresoftPending,
    showFiresoftProcessed,
  ]);

  const filteredOrders =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const financial =
            String(
              order.financial_status ??
                ""
            ).toUpperCase();

          const financialAllowed =
            (showPaid &&
              financial ===
                "PAID") ||
            (showPendingPayment &&
              financial !==
                "PAID");

          if (
            !financialAllowed
          ) {
            return false;
          }

          const firesoftAllowed =
            (showFiresoftPending &&
              order.is_firesoft_pending) ||
            (showFiresoftProcessed &&
              order.is_firesoft_processed);

          if (
            !firesoftAllowed
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          const haystack = [
            order.name,
            order.numeric_id,
            order.customer
              ?.name,
            order.customer
              ?.email,
            order.shipping_address
              ?.phone,
            ...order.items.flatMap(
              (item) => [
                item.name,
                item.sku,
                item.barcode,
              ]
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            term
          );
        }
      );
    }, [
      orders,
      search,
      showPaid,
      showPendingPayment,
      showFiresoftPending,
      showFiresoftProcessed,
    ]);

  const totalPages =
    useMemo(
      () =>
        Math.max(
          1,
          Math.ceil(
            filteredOrders.length /
              PAGE_SIZE
          )
        ),
      [filteredOrders.length]
    );

  const paginatedOrders =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredOrders.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      filteredOrders,
      page,
    ]);

  useEffect(() => {
    if (
      page > totalPages
    ) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openDetails = (
    order: ShopifyAdminOrder
  ) => {
    setSelectedOrder(order);
    setOpen(true);
    setFiresoftActionErr(null);
    setFiresoftActionOk(null);
  };

  const closeDetails =
    () => {
      setOpen(false);
      setSelectedOrder(null);
      setFiresoftActionErr(null);
      setFiresoftActionOk(null);
    };

  const updateOrderLocally = (
    nextOrder: ShopifyAdminOrder
  ) => {
    setOrders((current) =>
      current.map((order) =>
        order.id ===
        nextOrder.id
          ? nextOrder
          : order
      )
    );

    setSelectedOrder(
      (current) =>
        current?.id ===
        nextOrder.id
          ? nextOrder
          : current
    );
  };

  const reloadOneOrder =
    async (
      numericId: string
    ) => {
      const response =
        await fetch(
          `${SHOPIFY_API_BASE}/shopify/admin/orders/${numericId}`
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.ok === false ||
        !data.order
      ) {
        throw new Error(
          data.error ||
            "No se pudo recargar el pedido."
        );
      }

      updateOrderLocally(
        data.order as ShopifyAdminOrder
      );
    };

  const markAsFiresoftProcessed =
    async () => {
      if (
        !selectedOrder?.numeric_id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "¿Seguro que YA has pasado físicamente todos los productos de este pedido por FireSoft?\n\n" +
            "Hazlo únicamente después de registrar la venta en FireSoft."
        );

      if (!confirmed) {
        return;
      }

      setProcessingFiresoft(
        true
      );
      setFiresoftActionErr(
        null
      );
      setFiresoftActionOk(
        null
      );

      try {
        const response =
          await fetch(
            `${FIRESOFT_API_BASE}/shopify/admin/orders/${selectedOrder.numeric_id}/mark-processed`,
            {
              method: "POST",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            data.error ||
              data.errors
                ?.map(
                  (x: any) =>
                    x.message
                )
                .join(", ") ||
              "No se pudo marcar como procesado."
          );
        }

        await reloadOneOrder(
          selectedOrder.numeric_id
        );

        setFiresoftActionOk(
          "Pedido marcado como pasado por FireSoft."
        );
      } catch (
        error: any
      ) {
        console.error(error);

        setFiresoftActionErr(
          error?.message ??
            "Error marcando el pedido como pasado por FireSoft."
        );
      } finally {
        setProcessingFiresoft(
          false
        );
      }
    };

  const markAsFiresoftPending =
    async () => {
      if (
        !selectedOrder?.numeric_id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "¿Volver a marcar este pedido como pendiente de FireSoft?\n\nÚsalo solo si lo marcaste como procesado por error."
        );

      if (!confirmed) {
        return;
      }

      setProcessingFiresoft(
        true
      );
      setFiresoftActionErr(
        null
      );
      setFiresoftActionOk(
        null
      );

      try {
        const response =
          await fetch(
            `${FIRESOFT_API_BASE}/shopify/admin/orders/${selectedOrder.numeric_id}/mark-pending`,
            {
              method: "POST",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            data.error ||
              "No se pudo volver a pendiente."
          );
        }

        await reloadOneOrder(
          selectedOrder.numeric_id
        );

        setFiresoftActionOk(
          "Pedido devuelto a pendiente de FireSoft."
        );
      } catch (
        error: any
      ) {
        console.error(error);

        setFiresoftActionErr(
          error?.message ??
            "Error cambiando el estado FireSoft."
        );
      } finally {
        setProcessingFiresoft(
          false
        );
      }
    };

  if (!user) {
    return (
      <section className="w-full bg-white px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#191919]">
          Pedidos
        </h1>

        <p className="mt-4 text-gray-600">
          Inicia sesión como admin para ver esta página.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full bg-white px-6 py-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#718360]">
            Shopify · FireSoft
          </p>

          <h1 className="mt-1 text-[28px] font-semibold leading-[34px] text-[#191919]">
            Pedidos
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Gestiona los pedidos de Shopify y marca cuándo ya se han pasado por FireSoft.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadOrders()
          }
          disabled={loading}
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading
            ? "Actualizando…"
            : "Recargar pedidos"}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Buscar por pedido, cliente, email, SKU o barcode…"
          className="w-full rounded-full border border-gray-200 px-5 py-2.5 outline-none focus:ring-2 focus:ring-black/10 lg:max-w-[460px]"
        />

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 px-4 py-2.5">
          <label className="flex select-none items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showPaid}
              onChange={(event) =>
                setShowPaid(
                  event.target.checked
                )
              }
            />
            Pagados
          </label>

          <label className="flex select-none items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={
                showPendingPayment
              }
              onChange={(event) =>
                setShowPendingPayment(
                  event.target.checked
                )
              }
            />
            Otros pagos
          </label>

          <label className="flex select-none items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={
                showFiresoftPending
              }
              onChange={(event) =>
                setShowFiresoftPending(
                  event.target.checked
                )
              }
            />
            FireSoft pendientes
          </label>

          <label className="flex select-none items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={
                showFiresoftProcessed
              }
              onChange={(event) =>
                setShowFiresoftProcessed(
                  event.target.checked
                )
              }
            />
            FireSoft procesados
          </label>
        </div>
      </div>

      {err && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}

          <div className="mt-2 text-xs">
            API usada:{" "}
            <span className="font-mono">
              Shopify API: {SHOPIFY_API_BASE}
<br />
FireSoft API: {FIRESOFT_API_BASE}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full bg-white">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">
                  Pedido
                </th>

                <th className="px-4 py-3">
                  Cliente
                </th>

                <th className="px-4 py-3">
                  Dirección
                </th>

                <th className="px-4 py-3">
                  Pago
                </th>

                <th className="px-4 py-3">
                  Preparación
                </th>

                <th className="px-4 py-3">
                  FireSoft
                </th>

                <th className="px-4 py-3">
                  Total
                </th>

                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-gray-600"
                  >
                    Cargando pedidos de Shopify…
                  </td>
                </tr>
              ) : paginatedOrders.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-gray-600"
                  >
                    No hay pedidos con esos filtros.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="border-b align-top last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#191919]">
                          {order.name}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {formatDate(
                            order.created_at
                          )}
                        </div>

                        <div className="mt-1 text-[11px] text-gray-400">
                          ID:{" "}
                          {order.numeric_id ??
                            "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-[#191919]">
                          {order.customer
                            ?.name ??
                            order.shipping_address
                              ?.name ??
                            "—"}
                        </div>

                        <div className="text-sm text-gray-600">
                          {order.customer
                            ?.email ??
                            "—"}
                        </div>

                        <div className="text-sm text-gray-600">
                          {order.shipping_address
                            ?.phone ??
                            "—"}
                        </div>
                      </td>

                      <td className="max-w-[300px] px-4 py-4 text-sm text-gray-700">
                        {formatAddress(
                          order.shipping_address
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${financialClass(
                            order.financial_status
                          )}`}
                        >
                          {financialLabel(
                            order.financial_status
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {fulfillmentLabel(
                            order.fulfillment_status
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${firesoftClass(
                            order
                          )}`}
                        >
                          {firesoftLabel(
                            order
                          )}
                        </span>

                        {order.firesoft_status ===
                          "pending_implicit" && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            Estado automático
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#191919]">
                          {formatEUR(
                            order.total_amount,
                            order.currency ||
                              "EUR"
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          {
                            order.currency ??
                            "EUR"
                          }
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openDetails(
                              order
                            )
                          }
                          className="rounded-full bg-[#f2f2f2] px-4 py-2 text-sm font-semibold text-[#4c4c4c] hover:bg-gray-200"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between bg-white px-4 py-3">
          <div className="text-sm text-gray-600">
            Página{" "}
            <span className="font-semibold">
              {page}
            </span>{" "}
            de{" "}
            <span className="font-semibold">
              {totalPages}
            </span>{" "}
            · Total:{" "}
            <span className="font-semibold">
              {filteredOrders.length}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              onClick={() =>
                setPage((current) =>
                  Math.max(
                    1,
                    current - 1
                  )
                )
              }
              disabled={
                page <= 1 ||
                loading
              }
            >
              ◀
            </button>

            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
                )
              }
              disabled={
                page >=
                  totalPages ||
                loading
              }
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={closeDetails}
        title={`Detalle del pedido ${selectedOrder?.name ?? ""}`}
      >
        {!selectedOrder ? null : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase text-gray-500">
                  Pago
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${financialClass(
                      selectedOrder.financial_status
                    )}`}
                  >
                    {financialLabel(
                      selectedOrder.financial_status
                    )}
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Creado:{" "}
                  {formatDate(
                    selectedOrder.created_at
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase text-gray-500">
                  Shopify
                </div>

                <div className="mt-3 text-sm font-semibold text-gray-800">
                  {fulfillmentLabel(
                    selectedOrder.fulfillment_status
                  )}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Estado de preparación del pedido en Shopify.
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase text-gray-500">
                  FireSoft
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${firesoftClass(
                      selectedOrder
                    )}`}
                  >
                    {firesoftLabel(
                      selectedOrder
                    )}
                  </span>
                </div>

                {selectedOrder.is_firesoft_pending ? (
                  <button
                    type="button"
                    onClick={() =>
                      void markAsFiresoftProcessed()
                    }
                    disabled={
                      processingFiresoft
                    }
                    className="mt-4 w-full rounded-full bg-[#2f5d3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#24482d] disabled:opacity-60"
                  >
                    {processingFiresoft
                      ? "Guardando…"
                      : "Pasado por FireSoft"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void markAsFiresoftPending()
                    }
                    disabled={
                      processingFiresoft
                    }
                    className="mt-4 w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Volver a pendiente
                  </button>
                )}

                <p className="mt-2 text-xs text-orange-700">
                  Marca “Pasado por FireSoft” únicamente después de registrar físicamente la venta en FireSoft.
                </p>
              </div>
            </div>

            {firesoftActionErr && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {
                  firesoftActionErr
                }
              </div>
            )}

            {firesoftActionOk && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {
                  firesoftActionOk
                }
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase text-gray-500">
                  Cliente
                </div>

                <div className="mt-2 text-sm text-gray-800">
                  <div className="font-semibold">
                    {selectedOrder.customer
                      ?.name ??
                      selectedOrder
                        .shipping_address
                        ?.name ??
                      "—"}
                  </div>

                  <div>
                    {selectedOrder.customer
                      ?.email ??
                      "—"}
                  </div>

                  <div>
                    {selectedOrder
                      .shipping_address
                      ?.phone ??
                      "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase text-gray-500">
                  Dirección de envío
                </div>

                <div className="mt-2 text-sm text-gray-800">
                  {formatAddress(
                    selectedOrder.shipping_address
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border">
              <div className="flex items-center justify-between border-b bg-white px-4 py-3">
                <h4 className="font-semibold text-[#191919]">
                  Productos del pedido
                </h4>

                <div className="text-sm text-gray-600">
                  Líneas:{" "}
                  <span className="font-semibold">
                    {
                      selectedOrder
                        .items.length
                    }
                  </span>
                </div>
              </div>

              {selectedOrder.items.length ===
              0 ? (
                <div className="p-4 text-gray-600">
                  No hay productos en este pedido.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[780px] w-full bg-white">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">
                          Producto
                        </th>

                        <th className="px-4 py-3">
                          SKU / Barcode
                        </th>

                        <th className="px-4 py-3">
                          Precio unit.
                        </th>

                        <th className="px-4 py-3">
                          Cantidad
                        </th>

                        <th className="px-4 py-3">
                          Subtotal
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedOrder.items.map(
                        (item) => {
                          const quantity =
                            item.current_quantity ||
                            item.quantity ||
                            0;

                          const unitPrice =
                            Number(
                              item.unit_price ??
                                0
                            );

                          return (
                            <tr
                              key={
                                item.id
                              }
                              className="border-b last:border-b-0"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={
                                      item.image_url ||
                                      "https://placehold.co/48x48?text=IMG"
                                    }
                                    alt={
                                      item.image_alt ||
                                      item.name ||
                                      "Producto"
                                    }
                                    className="h-12 w-12 rounded-lg border object-cover"
                                  />

                                  <div>
                                    <div className="font-semibold text-[#191919]">
                                      {item.name ||
                                        item.title ||
                                        "Producto"}
                                    </div>

                                    {item.variant_title &&
                                    item.variant_title !==
                                      "Default Title" ? (
                                      <div className="text-xs text-gray-500">
                                        {
                                          item.variant_title
                                        }
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-700">
                                  SKU:{" "}
                                  {item.sku ??
                                    "—"}
                                </div>

                                <div className="mt-1 font-mono text-xs text-gray-500">
                                  {item.barcode ??
                                    "—"}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                {formatEUR(
                                  unitPrice,
                                  item.currency ||
                                    selectedOrder.currency ||
                                    "EUR"
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {quantity}
                              </td>

                              <td className="px-4 py-4 font-semibold">
                                {formatEUR(
                                  unitPrice *
                                    quantity,
                                  item.currency ||
                                    selectedOrder.currency ||
                                    "EUR"
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#f8faf6] p-4">
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">
                  Total Shopify
                </div>

                <div className="mt-1 text-xl font-bold text-[#26341f]">
                  {formatEUR(
                    selectedOrder.total_amount,
                    selectedOrder.currency ||
                      "EUR"
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-full bg-[#333333] px-6 py-3 text-sm font-semibold text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
