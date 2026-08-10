import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

type RequestStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "refunded"
  | "closed";

type ItemStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded";

type ReturnRequestRow = {
  id: string;
  user_id: string;
  order_id: string;
  status: RequestStatus;
  customer_message: string | null;
  created_at: string;
  updated_at: string;
};

type ReturnItemRow = {
  id: string;
  return_request_id: string;
  order_item_id: string;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  reason:
    | "withdrawal"
    | "damaged"
    | "bad_condition"
    | "wrong_product"
    | "missing"
    | "other";
  description: string | null;
  sealed_status:
    | "yes"
    | "no"
    | "not_applicable"
    | null;
  status: ItemStatus;
  created_at: string;
};

type OrderRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_amount: number | null;
  created_at: string | null;
};

type AdminReturnRequest =
  ReturnRequestRow & {
    items: ReturnItemRow[];
    order: OrderRow | null;
  };

function formatDate(
  value?: string | null
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

const formatEUR = (
  value: number
) =>
  new Intl.NumberFormat(
    "es-ES",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(
    Number.isFinite(Number(value))
      ? Number(value)
      : 0
  );

function reasonLabel(
  reason: ReturnItemRow["reason"]
) {
  if (reason === "withdrawal") {
    return "Cambio de opinión";
  }

  if (reason === "damaged") {
    return "Producto dañado";
  }

  if (
    reason === "bad_condition"
  ) {
    return "Producto en mal estado";
  }

  if (
    reason === "wrong_product"
  ) {
    return "Producto incorrecto";
  }

  if (reason === "missing") {
    return "Falta producto o unidad";
  }

  return "Otro";
}

function sealedLabel(
  value:
    | ReturnItemRow["sealed_status"]
    | undefined
) {
  if (value === "yes") {
    return "Cerrado y precintado";
  }

  if (value === "no") {
    return "Abierto o desprecintado";
  }

  if (
    value === "not_applicable"
  ) {
    return "No aplica";
  }

  return "—";
}

function requestStatusLabel(
  status: RequestStatus
) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "reviewing") {
    return "En revisión";
  }

  if (status === "approved") {
    return "Aprobada";
  }

  if (
    status ===
    "partially_approved"
  ) {
    return "Parcialmente aprobada";
  }

  if (status === "rejected") {
    return "Rechazada";
  }

  if (status === "refunded") {
    return "Reembolsada";
  }

  return "Cerrada";
}

function itemStatusLabel(
  status: ItemStatus
) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "approved") {
    return "Aprobado";
  }

  if (status === "rejected") {
    return "Rechazado";
  }

  return "Reembolsado";
}

function requestStatusClass(
  status: RequestStatus
) {
  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "reviewing") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    status === "approved" ||
    status === "refunded"
  ) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default function AdminReturnsManager() {
  const [
    requests,
    setRequests,
  ] = useState<
    AdminReturnRequest[]
  >([]);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    updatingItemId,
    setUpdatingItemId,
  ] =
    useState<string | null>(null);

  const [
    updatingRequest,
    setUpdatingRequest,
  ] = useState(false);

  const selectedRequest =
    useMemo(
      () =>
        requests.find(
          (request) =>
            request.id ===
            selectedId
        ) ?? null,
      [requests, selectedId]
    );

  const loadRequests =
    async () => {
      setLoading(true);
      setError(null);

      const {
        data: requestsData,
        error: requestsError,
      } = await supabase
        .from(
          "return_requests"
        )
        .select(
          `
            id,
            user_id,
            order_id,
            status,
            customer_message,
            created_at,
            updated_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (requestsError) {
        setError(
          requestsError.message
        );
        setLoading(false);
        return;
      }

      const baseRequests =
        (requestsData ??
          []) as ReturnRequestRow[];

      if (
        baseRequests.length ===
        0
      ) {
        setRequests([]);
        setSelectedId(null);
        setLoading(false);
        return;
      }

      const requestIds =
        baseRequests.map(
          (request) =>
            request.id
        );

      const orderIds =
        Array.from(
          new Set(
            baseRequests.map(
              (request) =>
                request.order_id
            )
          )
        );

      const {
        data: itemsData,
        error: itemsError,
      } = await supabase
        .from(
          "return_request_items"
        )
        .select(
          `
            id,
            return_request_id,
            order_item_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            reason,
            description,
            sealed_status,
            status,
            created_at
          `
        )
        .in(
          "return_request_id",
          requestIds
        )
        .order("created_at", {
          ascending: true,
        });

      if (itemsError) {
        setError(
          itemsError.message
        );
        setLoading(false);
        return;
      }

      let orderMap =
        new Map<
          string,
          OrderRow
        >();

      if (
        orderIds.length > 0
      ) {
        const {
          data: ordersData,
          error: ordersError,
        } = await supabase
          .from("orders")
          .select(
            `
              id,
              customer_name,
              customer_email,
              customer_phone,
              total_amount,
              created_at
            `
          )
          .in(
            "id",
            orderIds
          );

        if (
          ordersError
        ) {
          console.error(
            "Error cargando pedidos:",
            ordersError
          );
        } else {
          orderMap =
            new Map(
              (
                (ordersData ??
                  []) as OrderRow[]
              ).map(
                (order) => [
                  order.id,
                  order,
                ]
              )
            );
        }
      }

      const items =
        (itemsData ??
          []) as ReturnItemRow[];

      const enriched =
        baseRequests.map(
          (request) => ({
            ...request,

            order:
              orderMap.get(
                request.order_id
              ) ?? null,

            items:
              items.filter(
                (item) =>
                  item.return_request_id ===
                  request.id
              ),
          })
        );

      setRequests(enriched);

      setSelectedId(
        (current) => {
          if (
            current &&
            enriched.some(
              (request) =>
                request.id ===
                current
            )
          ) {
            return current;
          }

          return (
            enriched[0]?.id ??
            null
          );
        }
      );

      setLoading(false);
    };

  useEffect(() => {
    void loadRequests();
  }, []);

  const updateRequestStatus =
    async (
      requestId: string,
      status: RequestStatus
    ) => {
      setUpdatingRequest(true);
      setError(null);

      const { error } =
        await supabase
          .from(
            "return_requests"
          )
          .update({
            status,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            requestId
          );

      setUpdatingRequest(false);

      if (error) {
        setError(error.message);
        return;
      }

      await loadRequests();
    };

  const updateItemStatus =
    async (
      itemId: string,
      status: ItemStatus
    ) => {
      setUpdatingItemId(itemId);
      setError(null);

      const { error } =
        await supabase
          .from(
            "return_request_items"
          )
          .update({
            status,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", itemId);

      setUpdatingItemId(null);

      if (error) {
        setError(error.message);
        return;
      }

      await loadRequests();
    };

  const pendingCount =
    requests.filter(
      (request) =>
        request.status ===
          "pending" ||
        request.status ===
          "reviewing"
    ).length;

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-600">
        Cargando devoluciones…
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
            Postventa
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
            Devoluciones
          </h2>

          <p className="mt-2 text-sm text-[#737d6c]">
            Revisa y gestiona las solicitudes enviadas por los clientes.
          </p>
        </div>

        <div className="flex gap-3">
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              {pendingCount} por revisar
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              void loadRequests()
            }
            className="rounded-xl border border-[#ccd5c3] bg-white px-4 py-2 text-sm font-semibold text-[#425530] hover:bg-[#f3f6ef]"
          >
            Recargar
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {requests.length ===
      0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-semibold text-gray-800">
            No hay solicitudes
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Las solicitudes de los clientes aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#dbe1d4] bg-white lg:grid-cols-[0.8fr_1.2fr]">
          {/* LISTA */}
          <aside className="max-h-[700px] overflow-y-auto border-b p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {requests.map(
                (request) => (
                  <button
                    key={
                      request.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        request.id
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left ${
                      selectedId ===
                      request.id
                        ? "border-[#718360] bg-[#f3f6ef]"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                      Solicitud
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-[#283421]">
                      {
                        request.id
                      }
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(
                        request.created_at
                      )}
                    </p>

                    <span
                      className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${requestStatusClass(
                        request.status
                      )}`}
                    >
                      {requestStatusLabel(
                        request.status
                      )}
                    </span>
                  </button>
                )
              )}
            </div>
          </aside>

          {/* DETALLE */}
          <div className="max-h-[700px] overflow-y-auto p-6">
            {selectedRequest && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#26341f]">
                      Solicitud
                    </h3>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {
                        selectedRequest.id
                      }
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${requestStatusClass(
                      selectedRequest.status
                    )}`}
                  >
                    {requestStatusLabel(
                      selectedRequest.status
                    )}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Cliente
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {selectedRequest
                        .order
                        ?.customer_name ??
                        "—"}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {selectedRequest
                        .order
                        ?.customer_email ??
                        "—"}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {selectedRequest
                        .order
                        ?.customer_phone ??
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Pedido
                    </p>

                    <p className="mt-2 break-all text-sm text-gray-600">
                      {
                        selectedRequest.order_id
                      }
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {formatDate(
                        selectedRequest
                          .order
                          ?.created_at
                      )}
                    </p>

                    <p className="mt-1 font-semibold text-[#425530]">
                      {formatEUR(
                        Number(
                          selectedRequest
                            .order
                            ?.total_amount ??
                            0
                        )
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      updatingRequest
                    }
                    onClick={() =>
                      void updateRequestStatus(
                        selectedRequest.id,
                        "reviewing"
                      )
                    }
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                  >
                    Marcar en revisión
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingRequest
                    }
                    onClick={() =>
                      void updateRequestStatus(
                        selectedRequest.id,
                        "approved"
                      )
                    }
                    className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"
                  >
                    Aprobar solicitud
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingRequest
                    }
                    onClick={() =>
                      void updateRequestStatus(
                        selectedRequest.id,
                        "rejected"
                      )
                    }
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                  >
                    Rechazar solicitud
                  </button>
                </div>

                <div className="mt-8">
                  <h4 className="font-semibold text-[#2d3a26]">
                    Productos
                  </h4>

                  <div className="mt-4 space-y-4">
                    {selectedRequest.items.map(
                      (item) => (
                        <article
                          key={
                            item.id
                          }
                          className="rounded-2xl border border-gray-200 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-[#2b3625]">
                                {
                                  item.product_name
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {item.quantity} ×{" "}
                                {formatEUR(
                                  Number(
                                    item.unit_price
                                  )
                                )}
                              </p>
                            </div>

                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold">
                              {itemStatusLabel(
                                item.status
                              )}
                            </span>
                          </div>

                          <div className="mt-4 rounded-xl bg-[#f8faf6] p-4 text-sm">
                            <p>
                              <strong>
                                Motivo:
                              </strong>{" "}
                              {reasonLabel(
                                item.reason
                              )}
                            </p>

                            {item.reason ===
                              "withdrawal" && (
                              <p className="mt-2">
                                <strong>
                                  Estado:
                                </strong>{" "}
                                {sealedLabel(
                                  item.sealed_status
                                )}
                              </p>
                            )}

                            {item.description && (
                              <p className="mt-2">
                                <strong>
                                  Comentario:
                                </strong>{" "}
                                {
                                  item.description
                                }
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={
                                updatingItemId ===
                                item.id
                              }
                              onClick={() =>
                                void updateItemStatus(
                                  item.id,
                                  "approved"
                                )
                              }
                              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"
                            >
                              Aprobar producto
                            </button>

                            <button
                              type="button"
                              disabled={
                                updatingItemId ===
                                item.id
                              }
                              onClick={() =>
                                void updateItemStatus(
                                  item.id,
                                  "rejected"
                                )
                              }
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              Rechazar producto
                            </button>

                            <button
                              type="button"
                              disabled={
                                updatingItemId ===
                                item.id
                              }
                              onClick={() =>
                                void updateItemStatus(
                                  item.id,
                                  "refunded"
                                )
                              }
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                            >
                              Marcar reembolsado
                            </button>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}