import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../supabaseClient";
import { useUser } from "./useUser";

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
  status: string;
  total_amount: number;
  order_items: OrderItem[];
};

type ReturnReason =
  | ""
  | "withdrawal"
  | "damaged"
  | "bad_condition"
  | "wrong_product"
  | "missing"
  | "other";

type SealedStatus =
  | ""
  | "yes"
  | "no"
  | "not_applicable";

type ReturnItemForm = {
  selected: boolean;
  quantity: number;
  reason: ReturnReason;
  description: string;
  sealed_status: SealedStatus;
};

type ReturnForms = Record<
  string,
  ReturnItemForm
>;

type ExistingRequest = {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
};

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

function requestStatusLabel(
  status: string
) {
  if (status === "pending") {
    return "Pendiente de revisión";
  }

  if (status === "reviewing") {
    return "En revisión";
  }

  if (status === "approved") {
    return "Aprobada";
  }

  if (
    status === "partially_approved"
  ) {
    return "Parcialmente aprobada";
  }

  if (status === "rejected") {
    return "Rechazada";
  }

  if (status === "refunded") {
    return "Reembolsada";
  }

  if (status === "closed") {
    return "Cerrada";
  }

  return status;
}

function requestStatusClass(
  status: string
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

  return "border-[#d6ddcf] bg-[#f5f7f2] text-[#5e6957]";
}

export default function UserReturnsPanel() {
  const { user } = useUser();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [
    existingRequests,
    setExistingRequests,
  ] = useState<ExistingRequest[]>([]);

  const [
    selectedOrderId,
    setSelectedOrderId,
  ] = useState("");

  const [forms, setForms] =
    useState<ReturnForms>({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const selectedOrder = useMemo(
    () =>
      orders.find(
        (order) =>
          order.id === selectedOrderId
      ) ?? null,
    [orders, selectedOrderId]
  );

  const selectedItems = useMemo(
    () =>
      selectedOrder?.order_items.filter(
        (item) =>
          forms[item.id]?.selected
      ) ?? [],
    [selectedOrder, forms]
  );

  const loadRequests = async () => {
    if (!user) return;

    const { data, error } =
      await supabase
        .from("return_requests")
        .select(
          "id, order_id, status, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Error cargando devoluciones:",
        error
      );
      return;
    }

    setExistingRequests(
      (data ?? []) as ExistingRequest[]
    );
  };

  const loadData = async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    /*
     * Cargamos únicamente pedidos
     * que ya han sido pagados o preparados.
     */
    const {
      data,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(
        `
          id,
          created_at,
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
      .eq("user_id", user.id)
      .in("status", [
        "paid",
        "fulfilled",
      ])
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      setError(
        "No se han podido cargar tus pedidos: " +
          ordersError.message
      );

      setLoading(false);
      return;
    }

    const rows =
      (data ?? []) as unknown as Order[];

    /*
     * Igual que en UserPedidosPanel:
     * añadimos imagen y marca.
     */
    const productIds = Array.from(
      new Set(
        rows.flatMap((order) =>
          (
            order.order_items ?? []
          ).map((item) =>
            Number(item.product_id)
          )
        )
      )
    ).filter((id) =>
      Number.isFinite(id)
    );

    let productsMap = new Map<
      number,
      PublicProductRow
    >();

    if (productIds.length > 0) {
      const {
        data: productsData,
        error: productsError,
      } = await supabase
        .from("public_products")
        .select("id, img, brand")
        .in("id", productIds);

      if (!productsError) {
        productsMap = new Map(
          (
            (productsData ??
              []) as PublicProductRow[]
          ).map((product) => [
            Number(product.id),
            product,
          ])
        );
      }
    }

    const enrichedOrders =
      rows.map((order) => ({
        ...order,

        order_items:
          (
            order.order_items ?? []
          ).map((item) => {
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
          }),
      }));

    setOrders(enrichedOrders);

    await loadRequests();

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectOrder = (
    order: Order
  ) => {
    setSelectedOrderId(order.id);
    setError(null);
    setSuccess(null);

    const nextForms: ReturnForms =
      {};

    order.order_items.forEach(
      (item) => {
        nextForms[item.id] = {
          selected: false,
          quantity: 1,
          reason: "",
          description: "",
          sealed_status: "",
        };
      }
    );

    setForms(nextForms);
  };

  const updateForm = (
    itemId: string,
    patch: Partial<ReturnItemForm>
  ) => {
    setForms((current) => ({
      ...current,

      [itemId]: {
        ...current[itemId],
        ...patch,
      },
    }));
  };

  const submitRequest = async () => {
    if (
      !user ||
      !selectedOrder
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (
      selectedItems.length === 0
    ) {
      setError(
        "Selecciona al menos un producto."
      );

      return;
    }

    for (const item of selectedItems) {
      const form = forms[item.id];

      if (!form?.reason) {
        setError(
          `Selecciona el motivo para "${item.product_name}".`
        );

        return;
      }

      if (
        form.quantity < 1 ||
        form.quantity >
          item.quantity
      ) {
        setError(
          `La cantidad seleccionada para "${item.product_name}" no es válida.`
        );

        return;
      }

      if (
        form.reason ===
          "withdrawal" &&
        !form.sealed_status
      ) {
        setError(
          `Indica el estado de "${item.product_name}".`
        );

        return;
      }

      if (
        form.reason ===
          "other" &&
        !form.description.trim()
      ) {
        setError(
          `Describe el motivo de la devolución de "${item.product_name}".`
        );

        return;
      }
    }

    setSubmitting(true);

    /*
     * 1. Creamos la solicitud general.
     */
    const {
      data: request,
      error: requestError,
    } = await supabase
      .from("return_requests")
      .insert({
        user_id: user.id,
        order_id:
          selectedOrder.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (
      requestError ||
      !request
    ) {
      setSubmitting(false);

      setError(
        "No se ha podido crear la solicitud: " +
          (
            requestError?.message ??
            "Error desconocido"
          )
      );

      return;
    }

    /*
     * 2. Guardamos los productos.
     */
    const payload =
      selectedItems.map((item) => {
        const form =
          forms[item.id];

        return {
          return_request_id:
            request.id,

          order_item_id:
            item.id,

          product_id:
            item.product_id,

          product_name:
            item.product_name,

          unit_price:
            Number(
              item.unit_price
            ),

          quantity:
            form.quantity,

          reason:
            form.reason,

          description:
            form.description.trim() ||
            null,

          sealed_status:
            form.reason ===
            "withdrawal"
              ? form.sealed_status
              : null,

          status: "pending",
        };
      });

    const {
      error: itemsError,
    } = await supabase
      .from(
        "return_request_items"
      )
      .insert(payload);

    setSubmitting(false);

    if (itemsError) {
      setError(
        "La solicitud se creó, pero hubo un problema guardando los productos: " +
          itemsError.message
      );

      return;
    }

    setSuccess(
      "Tu solicitud se ha enviado correctamente. La revisaremos antes de aprobarla."
    );

    setSelectedOrderId("");
    setForms({});

    await loadRequests();
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#6e7867]">
          Cargando devoluciones…
        </p>
      </div>
    );
  }

  return (
    <section>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
          Postventa
        </p>

        <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
          Devoluciones
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#737d6c]">
          Selecciona uno de tus pedidos y
          los productos sobre los que
          quieres solicitar una devolución
          o comunicar una incidencia.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-xl border border-[#cadabd] bg-[#f2f7ee] px-4 py-3 text-sm text-[#34502a]">
          {success}
        </div>
      )}

      {/* PEDIDOS */}
      <div className="mt-8">
        <h3 className="text-base font-semibold text-[#34412d]">
          1. Selecciona un pedido
        </h3>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#ccd5c3] bg-[#fafbf8] p-8 text-center">
            <p className="font-semibold text-[#394631]">
              No tienes pedidos disponibles
            </p>

            <p className="mt-2 text-sm text-[#788170]">
              Los pedidos pagados aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {orders.map((order) => {
              const selected =
                selectedOrderId ===
                order.id;

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
                        {formatDate(
                          order.created_at
                        )}
                      </p>
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
            })}
          </div>
        )}
      </div>

      {/* PRODUCTOS */}
      {selectedOrder && (
        <div className="mt-10">
          <h3 className="text-base font-semibold text-[#34412d]">
            2. Elige los productos
          </h3>

          <p className="mt-1 text-sm text-[#788170]">
            Puedes incluir varios productos en
            una misma solicitud.
          </p>

          <div className="mt-4 space-y-4">
            {selectedOrder.order_items.map(
              (item) => {
                const form =
                  forms[item.id];

                if (!form) {
                  return null;
                }

                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-5 transition ${
                      form.selected
                        ? "border-[#718360] bg-[#f8faf6]"
                        : "border-[#dce2d5] bg-white"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-4">
                      <input
                        type="checkbox"
                        checked={
                          form.selected
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            item.id,
                            {
                              selected:
                                event
                                  .target
                                  .checked,
                            }
                          )
                        }
                        className="mt-5 h-4 w-4"
                      />

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
                    </label>

                    {form.selected && (
                      <div className="mt-5 grid gap-5 border-t border-[#e2e7dd] pt-5 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-semibold text-[#34412d]">
                            Cantidad
                          </label>

                          <select
                            value={
                              form.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              updateForm(
                                item.id,
                                {
                                  quantity:
                                    Number(
                                      event
                                        .target
                                        .value
                                    ),
                                }
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none focus:border-[#718360]"
                          >
                            {Array.from(
                              {
                                length:
                                  item.quantity,
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
                                  {
                                    quantity
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-[#34412d]">
                            Motivo
                          </label>

                          <select
                            value={
                              form.reason
                            }
                            onChange={(
                              event
                            ) =>
                              updateForm(
                                item.id,
                                {
                                  reason:
                                    event
                                      .target
                                      .value as ReturnReason,

                                  sealed_status:
                                    "",
                                }
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none focus:border-[#718360]"
                          >
                            <option value="">
                              Selecciona un motivo
                            </option>

                            <option value="withdrawal">
                              He cambiado de opinión
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
                              Otro motivo
                            </option>
                          </select>
                        </div>

                        {form.reason ===
                          "withdrawal" && (
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-semibold text-[#34412d]">
                              Estado del producto
                            </label>

                            <select
                              value={
                                form.sealed_status
                              }
                              onChange={(
                                event
                              ) =>
                                updateForm(
                                  item.id,
                                  {
                                    sealed_status:
                                      event
                                        .target
                                        .value as SealedStatus,
                                  }
                                )
                              }
                              className="mt-2 w-full rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none focus:border-[#718360]"
                            >
                              <option value="">
                                Selecciona el estado
                              </option>

                              <option value="yes">
                                Cerrado y con el precinto intacto
                              </option>

                              <option value="no">
                                Abierto o desprecintado
                              </option>

                              <option value="not_applicable">
                                No tiene precinto / no aplica
                              </option>
                            </select>
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-semibold text-[#34412d]">
                            Información adicional
                          </label>

                          <textarea
                            rows={3}
                            value={
                              form.description
                            }
                            onChange={(
                              event
                            ) =>
                              updateForm(
                                item.id,
                                {
                                  description:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            placeholder="Cuéntanos brevemente qué ha ocurrido..."
                            className="mt-2 w-full resize-none rounded-xl border border-[#d6ddcf] bg-white px-4 py-3 text-sm text-[#26341f] outline-none placeholder:text-[#a1a99b] focus:border-[#718360]"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-[#dce3d5] bg-[#f7f9f5] p-4">
            <p className="text-xs leading-5 text-[#697361]">
              El envío de una solicitud no
              supone su aprobación automática.
              Revisaremos el motivo, el estado
              del producto y las condiciones
              aplicables antes de comunicarte
              la resolución.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void submitRequest()
            }
            disabled={
              submitting ||
              selectedItems.length === 0
            }
            className="mt-6 rounded-xl bg-[#425530] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#344526] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Enviando solicitud…"
              : `Enviar solicitud${
                  selectedItems.length >
                  0
                    ? ` (${selectedItems.length})`
                    : ""
                }`}
          </button>
        </div>
      )}

      {/* SOLICITUDES YA ENVIADAS */}
      <div className="mt-12 border-t border-[#dde3d7] pt-8">
        <h3 className="text-lg font-semibold text-[#2d3a26]">
          Mis solicitudes
        </h3>

        <p className="mt-1 text-sm text-[#788170]">
          Aquí puedes consultar el estado de
          las solicitudes que ya has enviado.
        </p>

        {existingRequests.length ===
        0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#d7ddd0] p-6 text-sm text-[#788170]">
            Todavía no has enviado ninguna solicitud.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {existingRequests.map(
              (request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-[#dce2d5] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8a9383]">
                        Solicitud
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold text-[#2b3625]">
                        {request.id}
                      </p>

                      <p className="mt-2 text-xs text-[#788170]">
                        Pedido:{" "}
                        {request.order_id}
                      </p>

                      <p className="mt-1 text-xs text-[#788170]">
                        Enviada:{" "}
                        {formatDate(
                          request.created_at
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${requestStatusClass(
                        request.status
                      )}`}
                    >
                      {requestStatusLabel(
                        request.status
                      )}
                    </span>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}