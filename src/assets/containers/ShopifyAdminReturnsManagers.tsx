import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ReturnStatus =
  | "REQUESTED"
  | "OPEN"
  | "CLOSED"
  | "CANCELED"
  | "DECLINED"
  | string;

type ShopifyReturnItem = {
  id: string;
  quantity: number;
  processable_quantity: number;
  processed_quantity: number;
  refundable_quantity: number;
  refunded_quantity: number;
  return_reason: string | null;
  return_reason_note: string | null;
  customer_note: string | null;

  product_name: string | null;
  title: string | null;
  sku: string | null;
  barcode: string | null;
  variant_id: string | null;
  image_url: string | null;
  image_alt: string | null;

  unit_price: string | null;
  currency: string | null;
  line_total: string | null;
};

type ShopifyReturn = {
  id: string;
  numeric_id: string | null;
  name: string | null;
  status: ReturnStatus;
  created_at: string | null;
  closed_at: string | null;
  request_approved_at: string | null;
  total_quantity: number;

  decline_reason: string | null;
  decline_note: string | null;

  order: {
    id: string;
    numeric_id: string | null;
    name: string | null;
    created_at: string | null;
    total_amount: string | null;
    currency: string | null;
  };

  customer: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  };

  items: ShopifyReturnItem[];
};

type ReturnsResponse = {
  ok: boolean;
  returns: ShopifyReturn[];
  count: number;
  error?: string;
};

const SHOPIFY_API_BASE = "/api";

function formatDate(
  value?: string | null
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const formatMoney = (
  value: number | string | null | undefined,
  currency = "EUR"
) =>
  new Intl.NumberFormat(
    "es-ES",
    {
      style: "currency",
      currency: currency || "EUR",
    }
  ).format(
    Number.isFinite(Number(value))
      ? Number(value)
      : 0
  );

function reasonLabel(
  reason?: string | null
) {
  const value = String(reason ?? "").toUpperCase();

  if (value === "UNWANTED") return "Cambio de opinión";
  if (value === "DEFECTIVE") return "Producto dañado o defectuoso";
  if (value === "WRONG_ITEM") return "Producto incorrecto";
  if (value === "NOT_AS_DESCRIBED") return "No coincide con la descripción";
  if (value === "SIZE_TOO_LARGE") return "Talla demasiado grande";
  if (value === "SIZE_TOO_SMALL") return "Talla demasiado pequeña";
  if (value === "COLOR") return "Color";
  if (value === "STYLE") return "Estilo";
  if (value === "OTHER") return "Otro";
  if (value === "UNKNOWN") return "Desconocido";

  return reason || "—";
}

function statusLabel(
  status: ReturnStatus
) {
  const value = String(status ?? "").toUpperCase();

  if (value === "REQUESTED") return "Pendiente";
  if (value === "OPEN") return "Aprobada / abierta";
  if (value === "CLOSED") return "Cerrada";
  if (value === "CANCELED") return "Cancelada";
  if (value === "DECLINED") return "Rechazada";

  return status || "—";
}

function statusClass(
  status: ReturnStatus
) {
  const value = String(status ?? "").toUpperCase();

  if (value === "REQUESTED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "OPEN") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "CLOSED") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (
    value === "DECLINED" ||
    value === "CANCELED"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getApiError(data: any, fallback: string) {
  if (data?.error) return data.error;

  if (Array.isArray(data?.errors)) {
    const message = data.errors
      .map((item: any) => item?.message)
      .filter(Boolean)
      .join(", ");

    if (message) return message;
  }

  return fallback;
}

export default function ShopifyAdminReturnsManager() {
  const [
    requests,
    setRequests,
  ] = useState<ShopifyReturn[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
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
            request.id === selectedId
        ) ?? null,
      [requests, selectedId]
    );

  const loadRequests =
    async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${SHOPIFY_API_BASE}/shopify/admin/returns`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data =
          (await response.json()) as ReturnsResponse;

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            data.error ||
              `Error API (${response.status})`
          );
        }

        const next =
          Array.isArray(data.returns)
            ? data.returns
            : [];

        setRequests(next);

        setSelectedId(
          (current) => {
            if (
              current &&
              next.some(
                (request) =>
                  request.id === current
              )
            ) {
              return current;
            }

            return next[0]?.id ?? null;
          }
        );
      } catch (e: any) {
        console.error(e);

        setError(
          e?.message ??
            "Error cargando devoluciones de Shopify."
        );

        setRequests([]);
        setSelectedId(null);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadRequests();
  }, []);

  const approveRequest =
    async () => {
      if (!selectedRequest) return;

      const confirmed =
        window.confirm(
          `¿Aprobar la devolución ${selectedRequest.name ?? selectedRequest.numeric_id ?? ""}?`
        );

      if (!confirmed) return;

      setUpdatingRequest(true);
      setError(null);

      try {
        const response = await fetch(
          `${SHOPIFY_API_BASE}/shopify/admin/returns/${selectedRequest.numeric_id}/approve`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            getApiError(
              data,
              "No se pudo aprobar la devolución."
            )
          );
        }

        await loadRequests();
      } catch (e: any) {
        console.error(e);
        setError(
          e?.message ??
            "No se pudo aprobar la devolución."
        );
      } finally {
        setUpdatingRequest(false);
      }
    };

  const declineRequest =
    async () => {
      if (!selectedRequest) return;

      const reason = window.prompt(
        "Motivo del rechazo:\n\n1 = Otro\n2 = Producto de venta final\n3 = Plazo de devolución finalizado",
        "1"
      );

      if (reason === null) return;

      let declineReason =
        "OTHER";

      if (reason.trim() === "2") {
        declineReason =
          "FINAL_SALE";
      } else if (
        reason.trim() === "3"
      ) {
        declineReason =
          "RETURN_PERIOD_ENDED";
      }

      const note =
        window.prompt(
          "Mensaje opcional para el rechazo:",
          ""
        ) ?? "";

      const confirmed =
        window.confirm(
          "¿Seguro que quieres rechazar esta solicitud de devolución?"
        );

      if (!confirmed) return;

      setUpdatingRequest(true);
      setError(null);

      try {
        const params =
          new URLSearchParams({
            decline_reason:
              declineReason,
          });

        if (note.trim()) {
          params.set(
            "decline_note",
            note.trim()
          );
        }

        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/returns/${selectedRequest.numeric_id}/decline?${params.toString()}`,
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
            getApiError(
              data,
              "No se pudo rechazar la devolución."
            )
          );
        }

        await loadRequests();
      } catch (e: any) {
        console.error(e);

        setError(
          e?.message ??
            "No se pudo rechazar la devolución."
        );
      } finally {
        setUpdatingRequest(false);
      }
    };

  const closeRequest =
    async () => {
      if (!selectedRequest) return;

      const confirmed =
        window.confirm(
          "Cerrar una devolución NO genera por sí solo un reembolso. Hazlo únicamente cuando el proceso ya esté terminado.\n\n¿Cerrar esta devolución?"
        );

      if (!confirmed) return;

      setUpdatingRequest(true);
      setError(null);

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/returns/${selectedRequest.numeric_id}/close`,
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
            getApiError(
              data,
              "No se pudo cerrar la devolución."
            )
          );
        }

        await loadRequests();
      } catch (e: any) {
        console.error(e);

        setError(
          e?.message ??
            "No se pudo cerrar la devolución."
        );
      } finally {
        setUpdatingRequest(false);
      }
    };

  const pendingCount =
    requests.filter(
      (request) =>
        String(
          request.status
        ).toUpperCase() ===
        "REQUESTED"
    ).length;

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-600">
        Cargando devoluciones de Shopify…
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
            Postventa · Shopify
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
            Devoluciones
          </h2>

          <p className="mt-2 text-sm text-[#737d6c]">
            Revisa y gestiona las devoluciones nativas de Shopify.
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

          <div className="mt-1 text-xs">
            API usada:{" "}
            <span className="font-mono">
              {SHOPIFY_API_BASE}
            </span>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-semibold text-gray-800">
            No hay devoluciones
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Las solicitudes nativas de Shopify aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#dbe1d4] bg-white lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="max-h-[700px] overflow-y-auto border-b p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {requests.map(
                (request) => (
                  <button
                    key={request.id}
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
                      {request.order.name ??
                        "Pedido"}
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-[#283421]">
                      {request.name ??
                        request.numeric_id ??
                        request.id}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(
                        request.created_at
                      )}
                    </p>

                    <span
                      className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                        request.status
                      )}`}
                    >
                      {statusLabel(
                        request.status
                      )}
                    </span>
                  </button>
                )
              )}
            </div>
          </aside>

          <div className="max-h-[700px] overflow-y-auto p-6">
            {selectedRequest && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#26341f]">
                      Devolución
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {selectedRequest.name ??
                        selectedRequest.numeric_id ??
                        "—"}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {selectedRequest.id}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                      selectedRequest.status
                    )}`}
                  >
                    {statusLabel(
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
                      {selectedRequest.customer
                        .name ?? "—"}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {selectedRequest.customer
                        .email ?? "—"}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {selectedRequest.customer
                        .phone ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Pedido
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {selectedRequest.order
                        .name ?? "—"}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {selectedRequest.order.id}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {formatDate(
                        selectedRequest.order
                          .created_at
                      )}
                    </p>

                    <p className="mt-1 font-semibold text-[#425530]">
                      {formatMoney(
                        selectedRequest.order
                          .total_amount,
                        selectedRequest.order
                          .currency ||
                          "EUR"
                      )}
                    </p>
                  </div>
                </div>

                {String(
                  selectedRequest.status
                ).toUpperCase() ===
                  "REQUESTED" && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        updatingRequest
                      }
                      onClick={() =>
                        void approveRequest()
                      }
                      className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 disabled:opacity-50"
                    >
                      Aprobar solicitud
                    </button>

                    <button
                      type="button"
                      disabled={
                        updatingRequest
                      }
                      onClick={() =>
                        void declineRequest()
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      Rechazar solicitud
                    </button>
                  </div>
                )}

                {String(
                  selectedRequest.status
                ).toUpperCase() ===
                  "OPEN" && (
                  <div className="mt-6">
                    <button
                      type="button"
                      disabled={
                        updatingRequest
                      }
                      onClick={() =>
                        void closeRequest()
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                    >
                      Cerrar devolución
                    </button>
                  </div>
                )}

                {selectedRequest.decline_reason && (
                  <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    <strong>
                      Motivo del rechazo:
                    </strong>{" "}
                    {selectedRequest.decline_reason}

                    {selectedRequest.decline_note && (
                      <p className="mt-2">
                        {selectedRequest.decline_note}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-8">
                  <h4 className="font-semibold text-[#2d3a26]">
                    Productos
                  </h4>

                  <div className="mt-4 space-y-4">
                    {selectedRequest.items.map(
                      (item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-gray-200 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={
                                    item.image_alt ||
                                    item.product_name ||
                                    "Producto"
                                  }
                                  className="h-14 w-14 rounded-xl border object-cover"
                                />
                              ) : null}

                              <div>
                                <p className="font-semibold text-[#2b3625]">
                                  {item.product_name ||
                                    item.title ||
                                    "Producto"}
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {item.quantity} ×{" "}
                                  {formatMoney(
                                    item.unit_price,
                                    item.currency ||
                                      selectedRequest.order
                                        .currency ||
                                      "EUR"
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  SKU:{" "}
                                  {item.sku ?? "—"}
                                  {" · "}
                                  Barcode:{" "}
                                  {item.barcode ?? "—"}
                                </p>
                              </div>
                            </div>

                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold">
                              Reembolsado:{" "}
                              {item.refunded_quantity}/
                              {item.quantity}
                            </span>
                          </div>

                          <div className="mt-4 rounded-xl bg-[#f8faf6] p-4 text-sm">
                            <p>
                              <strong>
                                Motivo:
                              </strong>{" "}
                              {reasonLabel(
                                item.return_reason
                              )}
                            </p>

                            {item.return_reason_note && (
                              <p className="mt-2">
                                <strong>
                                  Detalle:
                                </strong>{" "}
                                {item.return_reason_note}
                              </p>
                            )}

                            {item.customer_note && (
                              <p className="mt-2">
                                <strong>
                                  Comentario del cliente:
                                </strong>{" "}
                                {item.customer_note}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-gray-500">
                              Procesado:{" "}
                              {item.processed_quantity}/
                              {item.quantity}
                              {" · "}
                              Reembolsable:{" "}
                              {item.refundable_quantity}
                            </p>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
                  Esta pantalla aprueba, rechaza y cierra devoluciones nativas de Shopify.
                  El reembolso económico no se ejecuta automáticamente desde este botón de cierre.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}