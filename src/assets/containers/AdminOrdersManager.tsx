import React, { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "../supabaseClient";
import { UserContext } from "./UserContext";

type OrderRow = {
  id: string;
  user_id: string | null;

  guest_token: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;

  shipping_address: any | null;
  shipping_method: string | null;
  shipping_amount: number | null;

  status: string;
  currency: string | null;
  total_amount: number | null;
  stripe_session_id: string | null;
  paid_at: string | null;

  stock_reserved: boolean | null;
  stock_released: boolean | null;
  firesoft_processed_at: string | null;
  cancelled_at: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  created_at: string | null;

  product?: {
    id: number;
    brand: string | null;
    img: string | null;
  } | null;
};

const formatEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function formatDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShippingAddress(a: any | null) {
  if (!a) return "—";
  const parts = [
    [a.first_name, a.last_name].filter(Boolean).join(" ").trim(),
    a.company,
    a.line1,
    a.line2,
    [a.postal_code, a.city].filter(Boolean).join(" ").trim(),
    a.region,
    a.country,
  ]
    .map((x: any) => (typeof x === "string" ? x.trim() : x))
    .filter(Boolean);

  return parts.join(", ");
}

function formatAddressShort(a: any | null) {
  if (!a) return "—";
  const city = [a.postal_code, a.city].filter(Boolean).join(" ").trim();
  const parts = [a.line1, a.line2, city, a.region, a.country]
    .map((x: any) => (typeof x === "string" ? x.trim() : x))
    .filter(Boolean);
  return parts.join(", ");
}

function getStatusLabel(status: string) {
  if (status === "paid") return "Pagado";
  if (status === "pending") return "Pendiente";
  if (status === "fulfilled") return "Preparado / pasado por Firesoft";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function getStatusClass(status: string) {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "pending") return "bg-yellow-100 text-yellow-800";
  if (status === "fulfilled") return "bg-blue-100 text-blue-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function CustomerTag({ o }: { o: OrderRow }) {
  if (o.user_id) {
    return (
      <div className="text-xs text-gray-500 mt-1">
        <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 font-semibold">
          Usuario
        </span>
        <span className="ml-2">id: {o.user_id}</span>
      </div>
    );
  }

  if (o.customer_email) {
    return (
      <div className="text-xs text-gray-500 mt-1">
        <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-semibold">
          Invitado
        </span>
        <span className="ml-2">{o.customer_email}</span>
        {o.customer_name ? <span className="ml-2">({o.customer_name})</span> : null}
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-500 mt-1">
      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 font-semibold">
        Invitado
      </span>
      {o.guest_token ? <span className="ml-2">token: {o.guest_token.slice(0, 8)}…</span> : null}
    </div>
  );
}

function CustomerLine({ o }: { o: OrderRow }) {
  const name = o.customer_name ?? "—";
  const email = o.customer_email ?? "—";
  const phone = o.customer_phone ?? "—";
  return (
    <div className="text-sm text-gray-700">
      <div className="font-semibold text-[#191919]">{name}</div>
      <div className="text-gray-700">{email}</div>
      <div className="text-gray-700">{phone}</div>
    </div>
  );
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
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close modal" />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-5xl max-h-[92vh] overflow-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-[#191919]">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export default function AdminOrdersManager() {
  const { user } = useContext(UserContext) as any;

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showPaid, setShowPaid] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showFulfilled, setShowFulfilled] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsErr, setItemsErr] = useState<string | null>(null);

  const [processingFiresoft, setProcessingFiresoft] = useState(false);
  const [firesoftActionErr, setFiresoftActionErr] = useState<string | null>(null);
  const [firesoftActionOk, setFiresoftActionOk] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  useEffect(() => {
    if (!user) return;
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, showPaid, showPending, showFulfilled]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void loadOrders();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadOrders = async () => {
    try {
      setErr(null);
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let statuses: string[] = [];
      if (showPaid) statuses.push("paid");
      if (showPending) statuses.push("pending");
      if (showFulfilled) statuses.push("fulfilled");

      let q = supabase
        .from("orders")
        .select(
          [
            "id",
            "user_id",
            "guest_token",
            "customer_email",
            "customer_name",
            "customer_phone",
            "shipping_address",
            "shipping_method",
            "shipping_amount",
            "status",
            "currency",
            "total_amount",
            "stripe_session_id",
            "paid_at",
            "stock_reserved",
            "stock_released",
            "firesoft_processed_at",
            "cancelled_at",
          ].join(","),
          { count: "exact" }
        )
        .order("paid_at", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (statuses.length > 0) q = q.in("status", statuses);
      else q = q.eq("id", "__none__");

      const s = search.trim();
      if (s) {
        q = q.or(`id.ilike.%${s}%,customer_email.ilike.%${s}%,customer_name.ilike.%${s}%`);
      }

      const { data, error, count } = await q;
      if (error) throw error;

      setOrders((data ?? []) as OrderRow[]);
      setTotalCount(count ?? 0);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Error cargando pedidos");
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (order: OrderRow) => {
    setSelectedOrder(order);
    setOpen(true);

    setItems([]);
    setItemsErr(null);
    setItemsLoading(true);
    setFiresoftActionErr(null);
    setFiresoftActionOk(null);

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,order_id,product_id,product_name,unit_price,quantity,created_at,products(brand,img)")
        .eq("order_id", order.id);

      if (error) throw error;

      const normalized = (data ?? []).map((row: any) => ({
        id: row.id,
        order_id: row.order_id,
        product_id: Number(row.product_id),
        product_name: row.product_name,
        unit_price: Number(row.unit_price),
        quantity: Number(row.quantity),
        created_at: row.created_at ?? null,
        product: row.products
          ? {
              id: Number(row.product_id),
              brand: row.products.brand ?? null,
              img: row.products.img ?? null,
            }
          : null,
      })) as OrderItemRow[];

      setItems(normalized);
    } catch (e: any) {
      console.error(e);
      setItemsErr(e?.message ?? "Error cargando items del pedido");
    } finally {
      setItemsLoading(false);
    }
  };

  const closeDetails = () => {
    setOpen(false);
    setSelectedOrder(null);
    setItems([]);
    setItemsErr(null);
    setFiresoftActionErr(null);
    setFiresoftActionOk(null);
  };

  const markAsFiresoftProcessed = async () => {
    if (!selectedOrder) return;

    const ok = window.confirm(
      "¿Seguro que ya has pasado físicamente este pedido por Firesoft?\n\n" +
        "Esto liberará la reserva online y marcará el pedido como preparado."
    );

    if (!ok) return;

    try {
      setProcessingFiresoft(true);
      setFiresoftActionErr(null);
      setFiresoftActionOk(null);

      const { error: releaseError } = await supabase.rpc("release_online_stock_for_order", {
        p_order_id: selectedOrder.id,
      });

      if (releaseError) throw releaseError;

      const now = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "fulfilled",
          firesoft_processed_at: now,
        })
        .eq("id", selectedOrder.id)
        .select(
          [
            "id",
            "user_id",
            "guest_token",
            "customer_email",
            "customer_name",
            "customer_phone",
            "shipping_address",
            "shipping_method",
            "shipping_amount",
            "status",
            "currency",
            "total_amount",
            "stripe_session_id",
            "paid_at",
            "stock_reserved",
            "stock_released",
            "firesoft_processed_at",
            "cancelled_at",
          ].join(",")
        )
        .single();

      if (updateError) throw updateError;

      const updated = data as OrderRow;

      setSelectedOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setFiresoftActionOk("Pedido marcado como pasado por Firesoft y reserva liberada.");
      void loadOrders();
    } catch (e: any) {
      console.error(e);
      setFiresoftActionErr(e?.message ?? "Error marcando el pedido como pasado por Firesoft");
    } finally {
      setProcessingFiresoft(false);
    }
  };

  const itemsTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
  }, [items]);

  const canMarkFiresoftProcessed =
    selectedOrder?.status === "paid" &&
    selectedOrder?.stock_reserved === true &&
    selectedOrder?.stock_released !== true &&
    !selectedOrder?.firesoft_processed_at;

  if (!user) {
    return (
      <section className="w-full bg-white py-10 px-6">
        <h1 className="text-2xl font-semibold text-[#191919]">Pedidos</h1>
        <p className="mt-4 text-gray-600">Inicia sesión como admin para ver esta página.</p>
      </section>
    );
  }

  return (
    <section className="w-full bg-white py-9 px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[#191919] text-[28px] font-semibold leading-[34px]">Pedidos (Admin)</h1>
          <p className="text-sm text-gray-500 mt-1">Lista de pedidos con la info para preparar el envío.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Order ID, nombre o email…"
            className="w-full sm:w-[360px] rounded-full border border-gray-200 px-5 py-2.5 outline-none focus:ring-2 focus:ring-black/10"
          />

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
              <input type="checkbox" checked={showPaid} onChange={(e) => setShowPaid(e.target.checked)} />
              Pagados
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                checked={showPending}
                onChange={(e) => setShowPending(e.target.checked)}
              />
              Pending
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                checked={showFulfilled}
                onChange={(e) => setShowFulfilled(e.target.checked)}
              />
              Preparados
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[1150px] w-full bg-white">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Pagado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={7}>
                    Cargando pedidos…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td className="px-4 py-6 text-red-600" colSpan={7}>
                    {err}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-600" colSpan={7}>
                    No hay pedidos con esos filtros.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0 align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#191919]">{o.id}</div>
                      <CustomerTag o={o} />
                    </td>

                    <td className="px-4 py-4">
                      <CustomerLine o={o} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700">{formatAddressShort(o.shipping_address)}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Envío: {o.shipping_method ?? "—"}{" "}
                        {o.shipping_amount != null ? `(${formatEUR(Number(o.shipping_amount))})` : ""}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          o.status
                        )}`}
                      >
                        {getStatusLabel(o.status)}
                      </span>

                      <div className="mt-2 text-xs text-gray-500">
                        Reserva:{" "}
                        {o.stock_reserved ? (
                          o.stock_released ? (
                            <span className="font-semibold text-blue-700">liberada</span>
                          ) : (
                            <span className="font-semibold text-green-700">activa</span>
                          )
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700">{formatDate(o.paid_at)}</div>
                      {o.firesoft_processed_at ? (
                        <div className="mt-1 text-xs text-blue-700">
                          Firesoft: {formatDate(o.firesoft_processed_at)}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#191919]">
                        {o.total_amount != null ? formatEUR(Number(o.total_amount)) : "—"}
                      </div>
                      <div className="text-xs text-gray-500">{o.currency ?? "—"}</div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => openDetails(o)}
                        className="rounded-full bg-[#f2f2f2] px-4 py-2 text-sm font-semibold text-[#4c4c4c] hover:bg-gray-200"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-white">
          <div className="text-sm text-gray-600">
            Página <span className="font-semibold">{page}</span> de{" "}
            <span className="font-semibold">{totalPages}</span> · Total:{" "}
            <span className="font-semibold">{totalCount}</span>
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              ◀
            </button>
            <button
              className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={closeDetails} title={`Detalle del pedido ${selectedOrder?.id ?? ""}`}>
        {!selectedOrder ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500 uppercase">Pagado</div>
                <div className="mt-2 font-semibold">{formatDate(selectedOrder.paid_at)}</div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                      selectedOrder.status
                    )}`}
                  >
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500 uppercase">Reserva online</div>
                <div className="mt-2 text-sm text-gray-800">
                  <div>
                    Reservado:{" "}
                    <span className="font-semibold">{selectedOrder.stock_reserved ? "Sí" : "No"}</span>
                  </div>
                  <div>
                    Liberado:{" "}
                    <span className="font-semibold">{selectedOrder.stock_released ? "Sí" : "No"}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Firesoft: {formatDate(selectedOrder.firesoft_processed_at)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500 uppercase">Acción Firesoft</div>

                {canMarkFiresoftProcessed ? (
                  <button
                    onClick={markAsFiresoftProcessed}
                    disabled={processingFiresoft}
                    className="mt-2 w-full rounded-full bg-[#2f5d3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#24482d] disabled:opacity-60"
                  >
                    {processingFiresoft ? "Procesando…" : "Marcar como pasado por Firesoft"}
                  </button>
                ) : (
                  <div className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                    {selectedOrder.status !== "paid"
                      ? "Solo disponible en pedidos pagados."
                      : selectedOrder.stock_released
                      ? "La reserva ya está liberada."
                      : selectedOrder.firesoft_processed_at
                      ? "Ya está marcado como pasado por Firesoft."
                      : "No disponible para este pedido."}
                  </div>
                )}

                <p className="mt-2 text-xs text-orange-700">
                  Pulsa solo después de pasar los productos por Firesoft.
                </p>
              </div>
            </div>

            {firesoftActionErr ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {firesoftActionErr}
              </div>
            ) : null}

            {firesoftActionOk ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {firesoftActionOk}
              </div>
            ) : null}

            <div className="rounded-xl border p-4">
              <div className="text-xs text-gray-500 uppercase">Stripe session</div>
              <div className="mt-2 text-sm text-gray-800 font-mono break-all">
                {selectedOrder.stripe_session_id ?? "—"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500 uppercase">Cliente</div>
                <div className="mt-2 text-sm text-gray-800">
                  <div className="font-semibold">{selectedOrder.customer_name ?? "—"}</div>
                  <div>{selectedOrder.customer_email ?? "—"}</div>
                  <div>{selectedOrder.customer_phone ?? "—"}</div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500 uppercase">Envío</div>
                <div className="mt-2 text-sm text-gray-800">
                  <div className="font-semibold">
                    {selectedOrder.shipping_method ?? "—"}{" "}
                    {selectedOrder.shipping_amount != null
                      ? `(${formatEUR(Number(selectedOrder.shipping_amount))})`
                      : ""}
                  </div>
                  <div className="mt-1">{formatShippingAddress(selectedOrder.shipping_address)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                <h4 className="font-semibold text-[#191919]">Productos del pedido</h4>
                <div className="text-sm text-gray-600">
                  Total items: <span className="font-semibold">{items.length}</span>
                </div>
              </div>

              {itemsLoading ? (
                <div className="p-4 text-gray-600">Cargando productos…</div>
              ) : itemsErr ? (
                <div className="p-4 text-red-600">{itemsErr}</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-gray-600">No hay items para este pedido.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[700px] w-full bg-white">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Precio unit.</th>
                        <th className="px-4 py-3">Cantidad</th>
                        <th className="px-4 py-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const sub = it.unit_price * it.quantity;

                        return (
                          <tr key={it.id} className="border-b last:border-b-0">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={it.product?.img ?? "https://via.placeholder.com/48"}
                                  alt={it.product_name}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                                <div>
                                  <div className="font-semibold text-[#191919]">{it.product_name}</div>
                                  {it.product?.brand ? (
                                    <div className="text-xs text-gray-500">{it.product.brand}</div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">{formatEUR(it.unit_price)}</td>
                            <td className="px-4 py-4">{it.quantity}</td>
                            <td className="px-4 py-4 font-semibold">{formatEUR(sub)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td className="px-4 py-4" colSpan={3}>
                          <div className="text-right text-sm text-gray-600">Total calculado</div>
                        </td>
                        <td className="px-4 py-4 font-bold">{formatEUR(itemsTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={closeDetails}
                className="rounded-full bg-[#333333] px-6 py-3 text-white text-sm font-semibold"
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