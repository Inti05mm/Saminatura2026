import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../supabaseClient";
import { useUser } from "./useUser";

/* =========================================================
   TIPOS
========================================================= */

type OrderItem = {
  id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;

  product_img?: string | null;
  product_brand?: string | null;
};

type PublicProductRow = {
  id: number;
  img: string | null;
  brand: string | null;
};

type Order = {
  id: string;
  created_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  status: "pending" | "paid" | "cancelled";
  total_amount: number;

  order_items: OrderItem[];
};

type RequestType =
  | ""
  | "withdrawal"
  | "incident";

type IncidentReason =
  | ""
  | "damaged"
  | "bad_condition"
  | "wrong_product"
  | "missing"
  | "other";

type ContactChannel =
  | "whatsapp"
  | "email";

/* =========================================================
   HELPERS
========================================================= */

const formatEUR = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      dateStyle: "medium",
    }
  ).format(date);
}

function getDaysSinceDelivery(
  deliveredAt?: string | null
) {
  if (!deliveredAt) {
    return null;
  }

  const deliveredDate =
    new Date(deliveredAt);

  if (
    Number.isNaN(
      deliveredDate.getTime()
    )
  ) {
    return null;
  }

  const difference =
    Date.now() -
    deliveredDate.getTime();

  return Math.floor(
    difference /
      (1000 * 60 * 60 * 24)
  );
}

function getIncidentReasonLabel(
  reason: IncidentReason
) {
  switch (reason) {
    case "damaged":
      return "El producto ha llegado dañado";

    case "bad_condition":
      return "El producto ha llegado en mal estado";

    case "wrong_product":
      return "He recibido un producto incorrecto";

    case "missing":
      return "Falta un producto o una unidad";

    case "other":
      return "Otro problema";

    default:
      return "";
  }
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function UserReturnsPanel() {
  const { user } = useUser();

  const [
    orders,
    setOrders,
  ] =
    useState<Order[]>([]);

  const [
    profileName,
    setProfileName,
  ] = useState("");

  const [
    selectedOrderId,
    setSelectedOrderId,
  ] = useState("");

  const [
    selectedItemId,
    setSelectedItemId,
  ] = useState("");

  const [
    selectedQuantity,
    setSelectedQuantity,
  ] = useState(1);

  const [
    requestType,
    setRequestType,
  ] =
    useState<RequestType>("");

  const [
    incidentReason,
    setIncidentReason,
  ] =
    useState<IncidentReason>("");

  const [
    incidentDescription,
    setIncidentDescription,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* Errores de Supabase / carga */
  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * NUEVO:
   * aviso de formulario.
   *
   * Este es el mensaje que aparecerá junto
   * a los botones cuando el usuario intente
   * continuar sin completar algo obligatorio.
   */
  const [
    formError,
    setFormError,
  ] =
    useState<string | null>(
      null
    );

  const [
    savingRequest,
    setSavingRequest,
  ] = useState(false);

  const [
    savedRequestId,
    setSavedRequestId,
  ] =
    useState<string | null>(
      null
    );

  /* =======================================================
     DERIVADOS
  ======================================================= */

  const selectedOrder =
    useMemo(
      () =>
        orders.find(
          (order) =>
            order.id ===
            selectedOrderId
        ) ?? null,
      [
        orders,
        selectedOrderId,
      ]
    );

  const selectedItem =
    useMemo(
      () =>
        selectedOrder?.order_items.find(
          (item) =>
            item.id ===
            selectedItemId
        ) ?? null,
      [
        selectedOrder,
        selectedItemId,
      ]
    );

  const daysSinceDelivery =
    useMemo(
      () =>
        selectedOrder
          ? getDaysSinceDelivery(
              selectedOrder.delivered_at
            )
          : null,
      [selectedOrder]
    );

  const canWithdraw =
    daysSinceDelivery !== null &&
    daysSinceDelivery >= 0 &&
    daysSinceDelivery <= 14;

  /* =======================================================
     CARGAR DATOS
  ======================================================= */

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      /* Nombre del usuario */
      const profileResult =
        await supabase
          .from("profiles")
          .select(
            "first_name, last_name"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (
        !profileResult.error
      ) {
        const firstName =
          String(
            profileResult.data
              ?.first_name ?? ""
          ).trim();

        const lastName =
          String(
            profileResult.data
              ?.last_name ?? ""
          ).trim();

        setProfileName(
          [
            firstName,
            lastName,
          ]
            .filter(Boolean)
            .join(" ")
        );
      }

      const {
        data,
        error: ordersError,
      } =
        await supabase
          .from("orders")
          .select(
            `
              id,
              created_at,
              paid_at,
              delivered_at,
              status,
              total_amount,

              order_items (
                id,
                product_id,
                product_name,
                quantity,
                unit_price
              )
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "status",
            "paid"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (ordersError) {
        setError(
          "No se han podido cargar tus pedidos: " +
            ordersError.message
        );

        setOrders([]);
        setLoading(false);
        return;
      }

      const rows =
        (
          data ?? []
        ) as unknown as Order[];

      const productIds =
        Array.from(
          new Set(
            rows.flatMap(
              (order) =>
                (
                  order.order_items ??
                  []
                )
                  .map(
                    (item) =>
                      Number(
                        item.product_id
                      )
                  )
                  .filter(
                    (id) =>
                      Number.isFinite(
                        id
                      )
                  )
            )
          )
        );

      let productsMap =
        new Map<
          number,
          PublicProductRow
        >();

      if (
        productIds.length > 0
      ) {
        const {
          data: productsData,
          error: productsError,
        } =
          await supabase
            .from(
              "public_products"
            )
            .select(
              "id, img, brand"
            )
            .in(
              "id",
              productIds
            );

        if (!productsError) {
          productsMap =
            new Map(
              (
                (
                  productsData ??
                  []
                ) as PublicProductRow[]
              ).map(
                (product) => [
                  Number(
                    product.id
                  ),
                  product,
                ]
              )
            );
        }
      }

      const enrichedOrders =
        rows.map(
          (order) => ({
            ...order,

            order_items:
              (
                order.order_items ??
                []
              ).map(
                (item) => {
                  const product =
                    productsMap.get(
                      Number(
                        item.product_id
                      )
                    );

                  return {
                    ...item,

                    product_img:
                      product?.img ??
                      null,

                    product_brand:
                      product?.brand ??
                      null,
                  };
                }
              ),
          })
        );

      setOrders(
        enrichedOrders
      );

      setLoading(false);
    };

    void loadData();
  }, [user]);

  /* =======================================================
     SELECCIONES
  ======================================================= */

  const resetSavedRequest =
    () => {
      setSavedRequestId(
        null
      );
  };

  const selectOrder = (
    order: Order
  ) => {
    setSelectedOrderId(
      order.id
    );

    setSelectedItemId("");
    setSelectedQuantity(1);
    setRequestType("");
    setIncidentReason("");
    setIncidentDescription("");

    resetSavedRequest();

    setError(null);
    setFormError(null);
  };

  const selectProduct = (
    item: OrderItem
  ) => {
    setSelectedItemId(
      item.id
    );

    setSelectedQuantity(1);
    setRequestType("");
    setIncidentReason("");
    setIncidentDescription("");

    resetSavedRequest();

    setError(null);
    setFormError(null);
  };

  /* =======================================================
     VALIDACIÓN
  ======================================================= */

  const validateRequest =
    () => {
      /*
       * Borramos el mensaje anterior y
       * comprobamos otra vez.
       */
      setFormError(null);

      if (!selectedOrder) {
        setFormError(
          "Selecciona un pedido antes de continuar."
        );

        return false;
      }

      if (!selectedItem) {
        setFormError(
          "Selecciona el producto que quieres gestionar."
        );

        return false;
      }

      if (!requestType) {
        setFormError(
          "Selecciona si quieres realizar un desistimiento o comunicar una incidencia."
        );

        return false;
      }

      if (
        requestType ===
          "withdrawal" &&
        !canWithdraw
      ) {
        if (
          !selectedOrder.delivered_at
        ) {
          setFormError(
            "No consta todavía la fecha de entrega del pedido."
          );
        } else {
          setFormError(
            "Este pedido aparece fuera del plazo general de 14 días desde la recepción."
          );
        }

        return false;
      }

      /*
       * AQUÍ ESTÁ EL CASO QUE TE PASABA:
       * incidencia elegida pero sin motivo.
       */
      if (
        requestType ===
          "incident" &&
        !incidentReason
      ) {
        setFormError(
          "Selecciona el motivo de la incidencia antes de continuar."
        );

        return false;
      }

      /*
       * Si ha elegido "Otro problema",
       * tiene que explicar qué ha ocurrido.
       */
      if (
        requestType ===
          "incident" &&
        incidentReason ===
          "other" &&
        !incidentDescription.trim()
      ) {
        setFormError(
          'Has seleccionado "Otro problema". Escribe brevemente qué ha ocurrido antes de continuar.'
        );

        return false;
      }

      return true;
    };

  /* =======================================================
     CREAR MENSAJE
  ======================================================= */

  const buildMessage =
    () => {
      if (
        !selectedOrder ||
        !selectedItem ||
        !requestType
      ) {
        return null;
      }

      const customerName =
        profileName ||
        user?.email ||
        "Cliente";

      if (
        requestType ===
        "withdrawal"
      ) {
        return `Hola Saminatura.

Quiero comunicar mi DESISTIMIENTO de la compra.

Nombre y apellidos: ${customerName}
Número de pedido: ${selectedOrder.id}
Producto: ${selectedItem.product_name}
Cantidad: ${selectedQuantity}
Fecha de recepción: ${formatDate(
          selectedOrder.delivered_at
        )}

Gracias.`;
      }

      const reason =
        getIncidentReasonLabel(
          incidentReason
        );

      return `Hola Saminatura.

Quiero comunicar una INCIDENCIA con mi pedido.

Nombre y apellidos: ${customerName}
Número de pedido: ${selectedOrder.id}
Producto: ${selectedItem.product_name}
Cantidad: ${selectedQuantity}
Problema: ${reason}${
        incidentDescription.trim()
          ? `

Descripción: ${incidentDescription.trim()}`
          : ""
      }

Adjuntaré fotografías del producto o embalaje si son necesarias.

Gracias.`;
    };

  /* =======================================================
     GUARDAR SOLICITUD EN SUPABASE
  ======================================================= */

  const saveReturnRequest =
    async (
      channel: ContactChannel
    ) => {
      if (
        !user ||
        !selectedOrder ||
        !selectedItem ||
        !requestType
      ) {
        return null;
      }

      /*
       * Evita duplicados si el usuario pulsa
       * varias veces sin cambiar la solicitud.
       */
      if (savedRequestId) {
        return savedRequestId;
      }

      const message =
        buildMessage();

      if (!message) {
        return null;
      }

      setSavingRequest(
        true
      );

      setError(null);

      /* 1. Crear solicitud general */
      const {
        data: request,
        error: requestError,
      } =
        await supabase
          .from(
            "return_requests"
          )
          .insert({
            user_id:
              user.id,

            order_id:
              selectedOrder.id,

            status:
              "pending",

            customer_message:
              message,

            contact_channel:
              channel,

            contact_opened_at:
              new Date().toISOString(),
          })
          .select(
            "id"
          )
          .single();

      if (
        requestError ||
        !request
      ) {
        setSavingRequest(
          false
        );

        setError(
          "No se ha podido registrar la solicitud: " +
            (
              requestError
                ?.message ??
              "Error desconocido"
            )
        );

        return null;
      }

      const reason =
        requestType ===
        "withdrawal"
          ? "withdrawal"
          : incidentReason;

      /* 2. Crear item asociado */
      const {
        error: itemError,
      } =
        await supabase
          .from(
            "return_request_items"
          )
          .insert({
            return_request_id:
              request.id,

            order_item_id:
              selectedItem.id,

            product_id:
              selectedItem.product_id,

            product_name:
              selectedItem.product_name,

            unit_price:
              Number(
                selectedItem.unit_price
              ),

            quantity:
              selectedQuantity,

            reason,

            description:
              requestType ===
                "incident" &&
              incidentDescription.trim()
                ? incidentDescription.trim()
                : null,

            sealed_status:
              null,

            status:
              "pending",
          });

      if (itemError) {
        /*
         * Rollback manual:
         * si falla el item, eliminamos
         * return_request.
         */
        await supabase
          .from(
            "return_requests"
          )
          .delete()
          .eq(
            "id",
            request.id
          )
          .eq(
            "user_id",
            user.id
          );

        setSavingRequest(
          false
        );

        setError(
          "No se ha podido guardar el producto de la solicitud: " +
            itemError.message
        );

        return null;
      }

      setSavedRequestId(
        request.id
      );

      setSavingRequest(
        false
      );

      return request.id;
    };

  /* =======================================================
     WHATSAPP
  ======================================================= */

  const openWhatsApp =
    async () => {
      /*
       * Si falta algo:
       *
       * - NO abre WhatsApp.
       * - NO registra nada.
       * - aparece formError junto a botones.
       */
      if (
        !validateRequest()
      ) {
        return;
      }

      const message =
        buildMessage();

      if (!message) {
        setFormError(
          "No se ha podido preparar la solicitud. Revisa los datos."
        );

        return;
      }

      const requestId =
        await saveReturnRequest(
          "whatsapp"
        );

      if (!requestId) {
        return;
      }

      const completeMessage =
        `${message}

Referencia de solicitud Saminatura: ${requestId}`;

      const url =
        "https://wa.me/34631415075?text=" +
        encodeURIComponent(
          completeMessage
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  /* =======================================================
     EMAIL
  ======================================================= */

  const openEmail =
    async () => {
      /*
       * Mismo comportamiento que WhatsApp.
       */
      if (
        !validateRequest()
      ) {
        return;
      }

      const message =
        buildMessage();

      if (!message) {
        setFormError(
          "No se ha podido preparar la solicitud. Revisa los datos."
        );

        return;
      }

      const requestId =
        await saveReturnRequest(
          "email"
        );

      if (!requestId) {
        return;
      }

      const subject =
        requestType ===
        "withdrawal"
          ? `DESISTIMIENTO - Pedido ${selectedOrder?.id ?? ""}`
          : `INCIDENCIA - Pedido ${selectedOrder?.id ?? ""}`;

      const completeMessage =
        `${message}

Referencia de solicitud Saminatura: ${requestId}`;

      const url =
        "mailto:saminatura369@gmail.com" +
        "?subject=" +
        encodeURIComponent(
          subject
        ) +
        "&body=" +
        encodeURIComponent(
          completeMessage
        );

      window.location.href =
        url;
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#6e7867]">
          Cargando devoluciones…
        </p>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section>
      {/* CABECERA */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
          Postventa
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
          Devoluciones e incidencias
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#737d6c]">
          Selecciona el pedido y el producto que necesitas gestionar.
          Los datos de tu cuenta y de la compra se añadirán
          automáticamente al mensaje que podrás enviar a Saminatura por
          WhatsApp o correo electrónico.
        </p>
      </div>

      {/* ERROR TÉCNICO */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ===================================================
          1. PEDIDO
      =================================================== */}

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#425530] text-xs font-semibold text-white">
            1
          </span>

          <h3 className="text-base font-semibold text-[#34412d]">
            Selecciona un pedido
          </h3>
        </div>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#ccd5c3] bg-[#fafbf8] p-8 text-center">
            <p className="font-semibold text-[#394631]">
              No tienes pedidos disponibles
            </p>

            <p className="mt-2 text-sm text-[#788170]">
              Tus pedidos pagados aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {orders.map(
              (order) => {
                const selected =
                  selectedOrderId ===
                  order.id;

                const days =
                  getDaysSinceDelivery(
                    order.delivered_at
                  );

                const withdrawalAvailable =
                  days !== null &&
                  days >= 0 &&
                  days <= 14;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() =>
                      selectOrder(
                        order
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-[#718360] bg-[#f3f6ef]"
                        : "border-[#dce2d5] bg-white hover:bg-[#fafbf8]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8a9383]">
                          Pedido
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-[#2b3625]">
                          {order.id}
                        </p>

                        <p className="mt-2 text-xs text-[#788170]">
                          Realizado:{" "}
                          {formatDate(
                            order.created_at
                          )}
                        </p>

                        <p className="mt-1 text-xs text-[#788170]">
                          Entregado:{" "}
                          {formatDate(
                            order.delivered_at
                          )}
                        </p>

                        <div className="mt-3">
                          {!order.delivered_at ? (
                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                              Entrega pendiente de registrar
                            </span>
                          ) : withdrawalAvailable ? (
                            <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                              Dentro del plazo general de desistimiento
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-[#ddd8ce] bg-[#f7f5ef] px-2.5 py-1 text-[11px] font-semibold text-[#777266]">
                              Plazo general de desistimiento finalizado
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-[#2f431f]">
                          {formatEUR(
                            Number(
                              order.total_amount
                            )
                          )}
                        </p>

                        {selected && (
                          <span className="mt-2 inline-flex rounded-full bg-[#425530] px-2.5 py-1 text-[11px] font-semibold text-white">
                            Seleccionado
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          2. PRODUCTO
      =================================================== */}

      {selectedOrder && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#425530] text-xs font-semibold text-white">
              2
            </span>

            <h3 className="text-base font-semibold text-[#34412d]">
              Selecciona el producto
            </h3>
          </div>

          <div className="mt-4 grid gap-3">
            {selectedOrder.order_items.map(
              (item) => {
                const selected =
                  selectedItemId ===
                  item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      selectProduct(
                        item
                      )
                    }
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-[#718360] bg-[#f3f6ef]"
                        : "border-[#dce2d5] bg-white hover:bg-[#fafbf8]"
                    }`}
                  >
                    {item.product_img ? (
                      <img
                        src={
                          item.product_img
                        }
                        alt={
                          item.product_name
                        }
                        className="h-20 w-20 shrink-0 rounded-xl border border-[#e1e6db] bg-white object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-[#e1e6db] bg-[#f4f5f1] text-xs text-[#92998c]">
                        Sin imagen
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#2b3625]">
                        {
                          item.product_name
                        }
                      </p>

                      {item.product_brand && (
                        <p className="mt-1 text-xs text-[#8a9383]">
                          {
                            item.product_brand
                          }
                        </p>
                      )}

                      <p className="mt-2 text-sm text-[#788170]">
                        Compraste{" "}
                        {item.quantity}{" "}
                        {item.quantity ===
                        1
                          ? "unidad"
                          : "unidades"}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#425530]">
                        {formatEUR(
                          Number(
                            item.unit_price
                          )
                        )}{" "}
                        / unidad
                      </p>
                    </div>

                    {selected && (
                      <span className="shrink-0 rounded-full bg-[#425530] px-3 py-1 text-[11px] font-semibold text-white">
                        Seleccionado
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          3. CANTIDAD
      =================================================== */}

      {selectedItem && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#425530] text-xs font-semibold text-white">
              3
            </span>

            <h3 className="text-base font-semibold text-[#34412d]">
              Indica la cantidad
            </h3>
          </div>

          <div className="mt-4 max-w-xs">
            <select
              value={
                selectedQuantity
              }
              onChange={(
                event
              ) => {
                setSelectedQuantity(
                  Number(
                    event.target
                      .value
                  )
                );

                resetSavedRequest();
                setFormError(null);
              }}
              className="w-full rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none focus:border-[#718360]"
            >
              {Array.from(
                {
                  length:
                    selectedItem.quantity,
                },
                (_, index) =>
                  index + 1
              ).map(
                (quantity) => (
                  <option
                    key={
                      quantity
                    }
                    value={
                      quantity
                    }
                  >
                    {quantity}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      )}

      {/* ===================================================
          4. TIPO
      =================================================== */}

      {selectedItem && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#425530] text-xs font-semibold text-white">
              4
            </span>

            <h3 className="text-base font-semibold text-[#34412d]">
              ¿Qué necesitas gestionar?
            </h3>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* DESISTIMIENTO */}
            <button
              type="button"
              disabled={
                !canWithdraw
              }
              onClick={() => {
                setRequestType(
                  "withdrawal"
                );

                setIncidentReason(
                  ""
                );

                setIncidentDescription(
                  ""
                );

                resetSavedRequest();

                setError(null);
                setFormError(null);
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                requestType ===
                "withdrawal"
                  ? "border-[#718360] bg-[#f3f6ef]"
                  : canWithdraw
                  ? "border-[#dce2d5] bg-white hover:border-[#aab7a0] hover:bg-[#fafbf8]"
                  : "cursor-not-allowed border-[#e5e3dd] bg-[#f7f6f2] opacity-60"
              }`}
            >
              <p className="font-semibold text-[#2b3625]">
                Quiero desistir de la compra
              </p>

              <p className="mt-2 text-sm leading-6 text-[#788170]">
                Utiliza esta opción cuando quieras comunicar el
                desistimiento de una compra dentro del plazo aplicable.
              </p>

              {canWithdraw ? (
                <p className="mt-3 text-xs font-semibold text-green-700">
                  Dentro del plazo general de 14 días desde la
                  recepción.
                </p>
              ) : selectedOrder?.delivered_at ? (
                <p className="mt-3 text-xs font-semibold text-[#8a655d]">
                  El plazo general de 14 días aparece finalizado.
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold text-amber-700">
                  No consta todavía la fecha de recepción del pedido.
                </p>
              )}
            </button>

            {/* INCIDENCIA */}
            <button
              type="button"
              onClick={() => {
                setRequestType(
                  "incident"
                );

                resetSavedRequest();

                setError(null);
                setFormError(null);
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                requestType ===
                "incident"
                  ? "border-[#718360] bg-[#f3f6ef]"
                  : "border-[#dce2d5] bg-white hover:border-[#aab7a0] hover:bg-[#fafbf8]"
              }`}
            >
              <p className="font-semibold text-[#2b3625]">
                Tengo un problema con el producto
              </p>

              <p className="mt-2 text-sm leading-6 text-[#788170]">
                Utiliza esta opción si el producto ha llegado dañado,
                incorrecto, incompleto o en mal estado.
              </p>

              <p className="mt-3 text-xs text-[#788170]">
                Esta opción no se bloquea por el plazo general de
                desistimiento.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          DATOS INCIDENCIA
      =================================================== */}

      {requestType ===
        "incident" &&
        selectedItem && (
          <div className="mt-8 rounded-2xl border border-[#dce3d5] bg-[#f8faf6] p-5">
            <h3 className="font-semibold text-[#34412d]">
              ¿Qué ha ocurrido?
            </h3>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-[#34412d]">
                Tipo de incidencia
              </label>

              <select
                value={
                  incidentReason
                }
                onChange={(
                  event
                ) => {
                  setIncidentReason(
                    event.target
                      .value as IncidentReason
                  );

                  resetSavedRequest();

                  /*
                   * En cuanto rellena el motivo,
                   * quitamos el aviso anterior.
                   */
                  setFormError(null);
                }}
                className="mt-2 w-full rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none focus:border-[#718360]"
              >
                <option value="">
                  Selecciona una opción
                </option>

                <option value="damaged">
                  El producto ha llegado dañado
                </option>

                <option value="bad_condition">
                  El producto ha llegado en mal estado
                </option>

                <option value="wrong_product">
                  He recibido un producto incorrecto
                </option>

                <option value="missing">
                  Falta un producto o una unidad
                </option>

                <option value="other">
                  Otro problema
                </option>
              </select>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-[#34412d]">
                Información adicional
                {incidentReason !==
                  "other" && (
                  <span className="ml-1 font-normal text-[#8b9385]">
                    (opcional)
                  </span>
                )}
              </label>

              <textarea
                rows={3}
                value={
                  incidentDescription
                }
                onChange={(
                  event
                ) => {
                  setIncidentDescription(
                    event.target
                      .value
                  );

                  resetSavedRequest();

                  setFormError(null);
                }}
                placeholder="Describe únicamente el problema del producto o del envío."
                className="mt-2 w-full resize-none rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none placeholder:text-[#a1a99b] focus:border-[#718360]"
              />

              <p className="mt-2 text-xs leading-5 text-[#788170]">
                No incluyas información médica ni otros datos personales
                innecesarios.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-[#e0e4da] bg-white p-4">
              <p className="text-sm font-semibold text-[#34412d]">
                Fotografías
              </p>

              <p className="mt-1 text-xs leading-5 text-[#788170]">
                Si la incidencia lo requiere, podrás adjuntar
                fotografías del producto o embalaje directamente en
                WhatsApp o en el correo electrónico.
              </p>
            </div>
          </div>
        )}

      {/* ===================================================
          5. ENVÍO
      =================================================== */}

      {requestType && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#425530] text-xs font-semibold text-white">
              5
            </span>

            <h3 className="text-base font-semibold text-[#34412d]">
              Envía tu solicitud
            </h3>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#788170]">
            Los datos de tu cuenta, pedido y producto se añadirán
            automáticamente al mensaje.
          </p>

          {/* RESUMEN */}
          <div className="mt-5 rounded-2xl border border-[#dce3d5] bg-[#f8faf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7d8a70]">
              Resumen
            </p>

            <div className="mt-4 space-y-2 text-sm text-[#53604b]">
              <p>
                <strong>Nombre:</strong>{" "}
                {profileName ||
                  user?.email}
              </p>

              <p>
                <strong>Pedido:</strong>{" "}
                {selectedOrder?.id}
              </p>

              <p>
                <strong>Producto:</strong>{" "}
                {
                  selectedItem?.product_name
                }
              </p>

              <p>
                <strong>Cantidad:</strong>{" "}
                {selectedQuantity}
              </p>

              <p>
                <strong>Solicitud:</strong>{" "}
                {requestType ===
                "withdrawal"
                  ? "Desistimiento"
                  : "Incidencia"}
              </p>

              {requestType ===
                "incident" &&
                incidentReason && (
                  <p>
                    <strong>
                      Problema:
                    </strong>{" "}
                    {getIncidentReasonLabel(
                      incidentReason
                    )}
                  </p>
                )}
            </div>
          </div>

          {/* SOLICITUD REGISTRADA */}
          {savedRequestId && (
            <div className="mt-4 rounded-xl border border-[#cadabd] bg-[#f2f7ee] px-4 py-3 text-sm text-[#34502a]">
              Solicitud registrada correctamente.
              <br />

              <span className="text-xs">
                Referencia:{" "}
                {savedRequestId}
              </span>
            </div>
          )}

          {/* =================================================
              NUEVO:
              MENSAJE SOLO CUANDO INTENTA ENVIAR Y FALTA ALGO
          ================================================= */}

          {formError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          {/* BOTONES - MISMO DISEÑO */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                void openWhatsApp()
              }
              disabled={
                savingRequest
              }
              className="rounded-xl bg-[#425530] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#344526] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingRequest
                ? "Registrando solicitud…"
                : "Continuar por WhatsApp"}
            </button>

            <button
              type="button"
              onClick={() =>
                void openEmail()
              }
              disabled={
                savingRequest
              }
              className="rounded-xl border border-[#718360] bg-white px-5 py-3.5 text-sm font-semibold text-[#425530] transition hover:bg-[#f3f6ef] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingRequest
                ? "Registrando solicitud…"
                : "Continuar por correo electrónico"}
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-[#788170]">
            La solicitud se registrará en Saminatura antes de abrir
            WhatsApp o tu aplicación de correo. Abrir el canal de
            contacto no significa que la devolución o incidencia haya
            sido aprobada automáticamente.
          </p>
        </div>
      )}
    </section>
  );
}