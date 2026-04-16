import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";

type OrderItemRow = {
  id: string;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  created_at?: string | null;
};

type InvoiceRow = {
  id?: string;
  invoice_code: string;
  invoice_date: string;
  pdf_url: string;
};

type OrderRow = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "cancelled";
  total_amount: number;
  currency: string;
  created_at: string | null;
  updated_at: string | null;
  paid_at: string | null;

  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;

  shipping_method: string | null;
  shipping_amount: number;
  shipping_address: any | null;

  order_items?: OrderItemRow[];
  invoices?: InvoiceRow[]; // viene como array desde Supabase
};

const formatEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function formatDate(dt?: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function buildShippingText(addr: any) {
  if (!addr) return "—";
  const parts = [
    [addr.first_name, addr.last_name].filter(Boolean).join(" ").trim(),
    addr.company,
    addr.line1,
    addr.line2,
    [addr.postal_code, addr.city].filter(Boolean).join(" ").trim(),
    addr.region,
    addr.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function statusLabel(s: OrderRow["status"]) {
  if (s === "paid") return "Pagado";
  if (s === "pending") return "Pendiente";
  return "Cancelado";
}

export default function UserPedidosPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const openOrder = useMemo(() => orders.find((o) => o.id === openId) ?? null, [orders, openId]);
  const invoice0 = openOrder?.invoices?.[0];

  const load = async () => {
    setLoading(true);
    setErr(null);

    const { data: auth, error: uErr } = await supabase.auth.getUser();
    if (uErr || !auth?.user) {
      setErr("Necesitas iniciar sesión.");
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,user_id,status,total_amount,currency,created_at,updated_at,paid_at,
        customer_email,customer_name,customer_phone,
        shipping_method,shipping_amount,shipping_address,
        order_items ( id, product_id, product_name, unit_price, quantity, created_at ),
        invoices:invoices!invoices_order_id_fkey ( invoice_code, invoice_date, pdf_url )
      `
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as OrderRow[];
    setOrders(rows);
    setOpenId((prev) => prev ?? rows[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadOrderPdf = (o: OrderRow) => {
    const doc = new jsPDF();

    const left = 14;
    let y = 16;

    doc.setFontSize(16);
    doc.text("Resumen de pedido", left, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Pedido: ${o.id}`, left, y);
    y += 6;

    doc.text(`Estado: ${statusLabel(o.status)}`, left, y);
    y += 6;

    doc.text(`Fecha: ${formatDate(o.created_at)}`, left, y);
    y += 6;

    doc.text(`Cliente: ${o.customer_name ?? "—"}`, left, y);
    y += 6;

    doc.text(`Email: ${o.customer_email ?? "—"}`, left, y);
    y += 6;

    doc.text(`Teléfono: ${o.customer_phone ?? "—"}`, left, y);
    y += 8;

    doc.setFontSize(12);
    doc.text("Envío", left, y);
    y += 6;

    doc.setFontSize(11);
    doc.text(`Método: ${o.shipping_method ?? "—"}`, left, y);
    y += 6;

    doc.text(`Dirección: ${buildShippingText(o.shipping_address)}`, left, y);
    y += 8;

    doc.setFontSize(12);
    doc.text("Artículos", left, y);
    y += 6;

    doc.setFontSize(10);
    const items = o.order_items ?? [];
    if (!items.length) {
      doc.text("—", left, y);
      y += 6;
    } else {
      items.forEach((it) => {
        const lineTotal = Number(it.unit_price) * Number(it.quantity);
        const line = `${it.quantity} x ${it.product_name}  (${formatEUR(
          Number(it.unit_price)
        )})  =  ${formatEUR(lineTotal)}`;
        doc.text(line, left, y);
        y += 5;

        if (y > 275) {
          doc.addPage();
          y = 16;
        }
      });
      y += 4;
    }

    doc.setFontSize(12);
    doc.text(`Envío: ${formatEUR(Number(o.shipping_amount ?? 0))}`, left, y);
    y += 7;
    doc.text(`Total: ${formatEUR(Number(o.total_amount))}`, left, y);

    doc.save(`pedido-${o.id}.pdf`);
  };

  if (loading) return <div className="p-6 text-gray-600">Cargando pedidos…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mis pedidos</h2>
          <p className="text-sm text-gray-500 mt-1">Historial de pedidos de tu cuenta.</p>
        </div>

        <button
          onClick={load}
          className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900"
        >
          Recargar
        </button>
      </div>

      {/* ✅ Panel con altura fija y divisor que llega hasta abajo */}
      <div className="mt-6 border rounded-lg overflow-hidden lg:flex lg:items-stretch h-[70vh]">
        {/* LISTA (scroll) */}
        <section className="lg:w-5/12 p-4 bg-white overflow-y-auto h-full">
          {orders.length === 0 ? (
            <div className="text-gray-600">Aún no tienes pedidos.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOpenId(o.id)}
                  className={`w-full text-left rounded-lg border p-4 hover:bg-gray-50 ${
                    openId === o.id ? "border-black" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">Pedido</div>
                      <div className="font-semibold text-gray-900 break-all">{o.id}</div>
                      <div className="text-sm text-gray-600 mt-1">{formatDate(o.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatEUR(Number(o.total_amount))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{statusLabel(o.status)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ✅ Divisor que llega hasta abajo (solo desktop) */}
        <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

        {/* ✅ Separador en móvil */}
        <div className="lg:hidden h-px bg-gray-200" />

        {/* DETALLE (scroll si hace falta, pero prioridad a que se vea completo dentro del panel) */}
        <section className="lg:w-7/12 p-4 bg-white h-full overflow-y-auto">
          {!openOrder ? (
            <div className="text-gray-600">Selecciona un pedido para ver el detalle.</div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Detalle</h3>
                  <div className="text-sm text-gray-500 mt-1 break-all">{openOrder.id}</div>
                  <div className="text-sm text-gray-600 mt-2">
                    Estado: <span className="font-medium">{statusLabel(openOrder.status)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Creado: <span className="font-medium">{formatDate(openOrder.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Pagado: <span className="font-medium">{formatDate(openOrder.paid_at)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {invoice0?.pdf_url ? (
                    <a
                      href={invoice0.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Ver factura (PDF)
                    </a>
                  ) : null}

                  <button
                    onClick={() => downloadOrderPdf(openOrder)}
                    className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900"
                  >
                    Descargar PDF (pedido)
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-900">Envío</div>
                <div className="text-sm text-gray-700 mt-2">
                  Método: {openOrder.shipping_method ?? "—"} (
                  {formatEUR(Number(openOrder.shipping_amount ?? 0))})
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  Dirección: {buildShippingText(openOrder.shipping_address)}
                </div>
              </div>

              <div className="mt-6">
                <div className="font-semibold text-gray-900">Artículos</div>

                <div className="mt-3 divide-y border rounded-lg overflow-hidden">
                  {(openOrder.order_items ?? []).map((it) => {
                    const lineTotal = Number(it.unit_price) * Number(it.quantity);
                    return (
                      <div key={it.id} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{it.product_name}</div>
                          <div className="text-sm text-gray-500">
                            {it.quantity} x {formatEUR(Number(it.unit_price))}
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900">{formatEUR(lineTotal)}</div>
                      </div>
                    );
                  })}
                  {(openOrder.order_items ?? []).length === 0 && (
                    <div className="p-4 text-gray-600">—</div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-full max-w-sm rounded-lg border p-4">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Envío</span>
                      <span>{formatEUR(Number(openOrder.shipping_amount ?? 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700 mt-2">
                      <span>Total</span>
                      <span className="font-semibold text-gray-900">
                        {formatEUR(Number(openOrder.total_amount))}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Nota: “Descargar PDF (pedido)” es un resumen. La factura legal debería salir de tu sistema de
                  facturación (tabla <code>invoices</code>) y guardarse en <code>pdf_url</code>.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
