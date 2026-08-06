import {
  useEffect,
  useMemo,
  useState,
} from "react";
import jsPDF from "jspdf";
import { supabase } from "../supabaseClient";
import { useUser } from "./useUser";

type OrderItemRow = {
  id: string;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;

  product_img?: string | null;
  product_brand?: string | null;
  product_slug?: string | null;
};
type PublicProductRow = {
  id: number;
  img: string | null;
  brand: string | null;
  slug: string | null;
};

type InvoiceRow = {
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
  paid_at: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_method: string | null;
  shipping_amount: number;
  shipping_address: Record<string, unknown> | null;
  order_items?: OrderItemRow[];
  invoices?: InvoiceRow[] | null;
};

const formatEUR = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: OrderRow["status"]) {
  if (status === "paid") return "Pagado";
  if (status === "pending") return "Pendiente";
  return "Cancelado";
}

function buildShippingText(
  address: Record<string, unknown> | null
) {
  if (!address) return "—";

  const firstName = String(address.first_name ?? "");
  const lastName = String(address.last_name ?? "");

  const parts = [
    [firstName, lastName].filter(Boolean).join(" ").trim(),
    address.company,
    address.line1,
    address.line2,
    [address.postal_code, address.city]
      .filter(Boolean)
      .join(" ")
      .trim(),
    address.region,
    address.country,
  ]
    .filter(Boolean)
    .map(String);

  return parts.join(", ");
}

function getSubtotal(order: OrderRow) {
  return (order.order_items ?? []).reduce(
    (total, item) =>
      total +
      safeNumber(item.unit_price) *
        safeNumber(item.quantity),
    0
  );
}

export default function UserPedidosPanel() {
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(
    null
  );

  const openOrder = useMemo(
    () =>
      orders.find((order) => order.id === openId) ??
      null,
    [orders, openId]
  );

  const loadOrders = async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
          id,
          user_id,
          status,
          total_amount,
          currency,
          created_at,
          paid_at,
          customer_email,
          customer_name,
          customer_phone,
          shipping_method,
          shipping_amount,
          shipping_address,
          order_items (
            id,
            product_id,
            product_name,
            unit_price,
            quantity
          ),
          invoices!invoices_order_id_fkey (
            invoice_code,
            invoice_date,
            pdf_url
          )
        `
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setErrorMessage(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

const rows = (data ?? []) as unknown as OrderRow[];

const productIds = Array.from(
  new Set(
    rows.flatMap((order) =>
      (order.order_items ?? [])
        .map((item) => Number(item.product_id))
        .filter((id) => Number.isFinite(id))
    )
  )
);

let productsMap = new Map<number, PublicProductRow>();

if (productIds.length > 0) {
  const { data: productsData, error: productsError } =
    await supabase
      .from("public_products")
      .select("id, img, brand, slug")
      .in("id", productIds);

  if (productsError) {
    console.error(
      "No se pudieron cargar las imágenes de los productos:",
      productsError
    );
  } else {
    productsMap = new Map(
      ((productsData ?? []) as PublicProductRow[]).map(
        (product) => [Number(product.id), product]
      )
    );
  }
}

const enrichedRows: OrderRow[] = rows.map((order) => ({
  ...order,

  order_items: (order.order_items ?? []).map((item) => {
    const product = productsMap.get(
      Number(item.product_id)
    );

    return {
      ...item,
      product_img: product?.img ?? null,
      product_brand: product?.brand ?? null,
      product_slug: product?.slug ?? null,
    };
  }),
}));

setOrders(enrichedRows);
    setOpenId((current) => {
      if (
        current &&
        rows.some((order) => order.id === current)
      ) {
        return current;
      }

      return rows[0]?.id ?? null;
    });

    setLoading(false);
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const downloadOrderPdf = (order: OrderRow) => {
    const doc = new jsPDF();
    const left = 16;
    let y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SAMINATURA", left, y);

    y += 10;

    doc.setFontSize(15);
    doc.text("Resumen de pedido", left, y);

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const basicLines = [
      `Pedido: ${order.id}`,
      `Estado: ${statusLabel(order.status)}`,
      `Fecha: ${formatDate(order.created_at)}`,
      `Cliente: ${order.customer_name ?? "—"}`,
      `Correo: ${order.customer_email ?? "—"}`,
      `Teléfono: ${order.customer_phone ?? "—"}`,
      `Envío: ${order.shipping_method ?? "—"}`,
      `Dirección: ${buildShippingText(
        order.shipping_address
      )}`,
    ];

    basicLines.forEach((line) => {
      const lines = doc.splitTextToSize(line, 178);
      doc.text(lines, left, y);
      y += lines.length * 5;
    });

    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Artículos", left, y);

    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const items = order.order_items ?? [];

    if (items.length === 0) {
      doc.text("No hay artículos registrados.", left, y);
      y += 7;
    } else {
      items.forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 18;
        }

        const total =
          safeNumber(item.unit_price) *
          safeNumber(item.quantity);

        const line = `${item.quantity} x ${
          item.product_name
        } · ${formatEUR(total)}`;

        const lines = doc.splitTextToSize(line, 178);
        doc.text(lines, left, y);
        y += lines.length * 5;
      });
    }

    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(
      `Subtotal: ${formatEUR(getSubtotal(order))}`,
      left,
      y
    );

    y += 6;

    doc.text(
      `Envío: ${formatEUR(
        safeNumber(order.shipping_amount)
      )}`,
      left,
      y
    );

    y += 7;

    doc.setFontSize(12);
    doc.text(
      `Total: ${formatEUR(
        safeNumber(order.total_amount)
      )}`,
      left,
      y
    );

    doc.save(`pedido-saminatura-${order.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#6e7867]">
          Cargando pedidos…
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error al cargar los pedidos: {errorMessage}
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
            Historial
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
            Mis pedidos
          </h2>

          <p className="mt-2 text-sm text-[#727c6b]">
            Consulta tus pedidos, revisa sus detalles y
            descarga un resumen en PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          className="rounded-xl border border-[#ccd5c3] bg-white px-4 py-2.5 text-sm font-semibold text-[#425530] transition hover:bg-[#f3f6ef]"
        >
          Recargar
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#ccd5c3] bg-[#fafbf8] p-10 text-center">
          <p className="font-semibold text-[#394631]">
            Aún no tienes pedidos
          </p>

          <p className="mt-2 text-sm text-[#788170]">
            Cuando realices una compra, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#dbe1d4] bg-white lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-h-[620px] overflow-y-auto border-b border-[#e1e5dc] p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setOpenId(order.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    openId === order.id
                      ? "border-[#718360] bg-[#f3f6ef]"
                      : "border-[#e1e5dc] bg-white hover:bg-[#fafbf8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9383]">
                        Pedido
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold text-[#283421]">
                        {order.id}
                      </p>

                      <p className="mt-2 text-xs text-[#747e6d]">
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-[#2f431f]">
                        {formatEUR(
                          safeNumber(order.total_amount)
                        )}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          order.status === "paid"
                            ? "bg-[#e8f2e2] text-[#46663a]"
                            : order.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto p-5 sm:p-6">
            {!openOrder ? (
              <div className="flex min-h-64 items-center justify-center text-center text-sm text-[#747e6d]">
                Selecciona un pedido para ver el detalle.
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#26341f]">
                      Detalle del pedido
                    </h3>

                    <p className="mt-1 break-all text-xs text-[#80897a]">
                      {openOrder.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {openOrder.invoices?.[0]?.pdf_url ? (
                      <a
                        href={
                          openOrder.invoices[0].pdf_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-[#ccd5c3] bg-white px-4 py-2 text-sm font-semibold text-[#425530] transition hover:bg-[#f3f6ef]"
                      >
                        Ver factura
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        downloadOrderPdf(openOrder)
                      }
                      className="rounded-xl bg-[#425530] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344526]"
                    >
                      Descargar resumen
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#dde3d7] bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Estado
                    </p>
                    <p className="mt-2 text-sm text-[#6e7867]">
                      {statusLabel(openOrder.status)}
                    </p>
                    <p className="mt-1 text-sm text-[#6e7867]">
                      Creado:{" "}
                      {formatDate(openOrder.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-[#6e7867]">
                      Pagado:{" "}
                      {formatDate(openOrder.paid_at)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#dde3d7] bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Envío
                    </p>
                    <p className="mt-2 text-sm text-[#6e7867]">
                      {openOrder.shipping_method ?? "—"}
                    </p>
                    <p className="mt-1 text-sm text-[#6e7867]">
                      {buildShippingText(
                        openOrder.shipping_address
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-[#2d3a26]">
                    Artículos
                  </h4>

                  <div className="mt-3 overflow-hidden rounded-xl border border-[#dde3d7]">
                    {(openOrder.order_items ?? []).map(
                      (item) => {
                        const total =
                          safeNumber(item.unit_price) *
                          safeNumber(item.quantity);

                        return (
                          <div
  key={item.id}
  className="
    flex items-center gap-4
    border-b border-[#edf0e9]
    p-4 last:border-b-0
  "
>
  <div
    className="
      flex h-20 w-20 shrink-0
      items-center justify-center
      overflow-hidden rounded-xl
      border border-[#dde3d7]
      bg-white p-2
    "
  >
    {item.product_img ? (
      <img
        src={item.product_img}
        alt={item.product_name}
        className="
          h-full w-full
          object-contain
        "
        loading="lazy"
      />
    ) : (
      <div className="text-center text-[10px] text-[#9aa293]">
        Sin imagen
      </div>
    )}
  </div>

  <div className="min-w-0 flex-1">
    <p className="font-medium text-[#2b3625]">
      {item.product_name}
    </p>

    {item.product_brand && (
      <p className="mt-1 truncate text-xs text-[#8a9383]">
        {item.product_brand}
      </p>
    )}

    <p className="mt-2 text-sm text-[#788170]">
      {item.quantity} ×{" "}
      {formatEUR(
        safeNumber(item.unit_price)
      )}
    </p>
  </div>

  <p className="shrink-0 font-semibold text-[#2f431f]">
    {formatEUR(total)}
  </p>
</div>
                        );
                      }
                    )}

                    {(openOrder.order_items ?? []).length ===
                      0 && (
                      <div className="p-4 text-sm text-[#788170]">
                        No hay artículos registrados.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <div className="w-full max-w-sm rounded-xl border border-[#dbe1d4] bg-[#fafbf8] p-4">
                    <div className="flex justify-between text-sm text-[#687261]">
                      <span>Subtotal</span>
                      <span>
                        {formatEUR(
                          getSubtotal(openOrder)
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between text-sm text-[#687261]">
                      <span>Envío</span>
                      <span>
                        {formatEUR(
                          safeNumber(
                            openOrder.shipping_amount
                          )
                        )}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-[#dde3d7] pt-3">
                      <div className="flex justify-between font-semibold text-[#26341f]">
                        <span>Total</span>
                        <span>
                          {formatEUR(
                            safeNumber(
                              openOrder.total_amount
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}