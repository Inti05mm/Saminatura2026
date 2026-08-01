import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import logoUrl from "../pictures/logo_2.png";

type OrderItemRow = {
  id: string;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
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
  invoices?: InvoiceRow[] | null;
};

const COMPANY = {
  name: "SAMINATURA",
  subtitle: "Tienda ecológica, nutrición y bienestar",
  email: "info@saminatura.com",
  phone: "631 415 075",
  address: "Calle Teruel 16, Binéfar, Huesca, España",
  website: "www.saminatura.com",
};

const BRAND_COLOR = {
  dark: [47, 65, 45] as [number, number, number],
  green: [112, 171, 55] as [number, number, number],
  soft: [245, 248, 242] as [number, number, number],
  border: [220, 226, 215] as [number, number, number],
  text: [35, 35, 35] as [number, number, number],
  muted: [105, 105, 105] as [number, number, number],
};

const formatEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(n) ? n : 0);

function formatDate(dt?: string | null) {
  if (!dt) return "—";

  const d = new Date(dt);

  if (Number.isNaN(d.getTime())) return dt;

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
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

function statusLabel(status: OrderRow["status"]) {
  if (status === "paid") return "Pagado";
  if (status === "pending") return "Pendiente";
  return "Cancelado";
}

async function imageToDataUrl(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo cargar el logo"));
      img.src = src;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function safeNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getSubtotal(order: OrderRow) {
  return (order.order_items ?? []).reduce((acc, item) => {
    return acc + safeNumber(item.unit_price) * safeNumber(item.quantity);
  }, 0);
}

export default function UserPedidos() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const openOrder = useMemo(
    () => orders.find((order) => order.id === openId) ?? null,
    [orders, openId]
  );

  const load = async () => {
    setLoading(true);
    setErr(null);

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth?.user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,user_id,status,total_amount,currency,created_at,updated_at,paid_at,
        customer_email,customer_name,customer_phone,
        shipping_method,shipping_amount,shipping_address,
        order_items (
          id,
          product_id,
          product_name,
          unit_price,
          quantity,
          created_at
        ),
        invoices!invoices_order_id_fkey (
          invoice_code,
          invoice_date,
          pdf_url
        )
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

    const rows = (data ?? []) as OrderRow[];

    setOrders(rows);

    if (!openId && rows.length > 0) {
      setOpenId(rows[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadOrderPdf = async (order: OrderRow) => {
    setPdfLoadingId(order.id);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const marginX = 16;
      const rightX = pageWidth - marginX;
      let y = 16;

      const logoDataUrl = await imageToDataUrl(logoUrl);

      const drawFooter = () => {
        const footerY = pageHeight - 14;

        doc.setDrawColor(...BRAND_COLOR.border);
        doc.line(marginX, footerY - 6, rightX, footerY - 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...BRAND_COLOR.muted);

        doc.text(
          "Gracias por confiar en SAMINATURA. Este documento es un resumen/recibo del pedido.",
          marginX,
          footerY
        );

        doc.text(`Página ${doc.getNumberOfPages()}`, rightX, footerY, {
          align: "right",
        });
      };

      const checkPageBreak = (neededSpace = 20) => {
        if (y + neededSpace > pageHeight - 25) {
          drawFooter();
          doc.addPage();
          y = 18;
        }
      };

      const sectionTitle = (title: string) => {
        checkPageBreak(14);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BRAND_COLOR.dark);
        doc.text(title, marginX, y);

        y += 3;

        doc.setDrawColor(...BRAND_COLOR.green);
        doc.setLineWidth(0.5);
        doc.line(marginX, y, marginX + 32, y);

        y += 8;
      };

      // HEADER
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", marginX, 12, 62, 24);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...BRAND_COLOR.dark);
        doc.text(COMPANY.name, marginX, 24);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...BRAND_COLOR.dark);
      doc.text("Resumen de pedido", rightX, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR.muted);
      doc.text(`Pedido: ${order.id}`, rightX, 27, { align: "right" });
      doc.text(`Fecha: ${formatDate(order.created_at)}`, rightX, 32, {
        align: "right",
      });

      y = 44;

      // BLOQUE SUPERIOR
      const topBoxY = y;
      const topBoxH = 40;
      const topBoxW = pageWidth - marginX * 2;

      doc.setFillColor(...BRAND_COLOR.soft);
      doc.setDrawColor(...BRAND_COLOR.border);
      doc.roundedRect(marginX, topBoxY, topBoxW, topBoxH, 3, 3, "FD");

      const leftX = marginX + 5;
      const rightColX = rightX - 42;
      const leftMaxWidth = 112;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...BRAND_COLOR.dark);
      doc.text(COMPANY.name, leftX, topBoxY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND_COLOR.muted);

      let companyInfoY = topBoxY + 14;

      const companyInfoLines = [
        COMPANY.subtitle,
        COMPANY.address,
        `Tel. ${COMPANY.phone}`,
      ];

      companyInfoLines.forEach((line) => {
        const lines = doc.splitTextToSize(line, leftMaxWidth);
        doc.text(lines, leftX, companyInfoY);
        companyInfoY += lines.length * 4.2;
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...BRAND_COLOR.dark);
      doc.text("Estado", rightColX, topBoxY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR.text);
      doc.text(statusLabel(order.status), rightColX, topBoxY + 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...BRAND_COLOR.dark);
      doc.text("Pago", rightColX, topBoxY + 23);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR.text);
      doc.text(
        order.paid_at ? formatDate(order.paid_at) : "—",
        rightColX,
        topBoxY + 29
      );

      y += topBoxH + 12;

      // CLIENTE Y ENVÍO
      const boxGap = 8;
      const boxWidth = (pageWidth - marginX * 2 - boxGap) / 2;
      const boxY = y;
      const boxH = 58;

      doc.setDrawColor(...BRAND_COLOR.border);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, boxY, boxWidth, boxH, 3, 3, "S");
      doc.roundedRect(
        marginX + boxWidth + boxGap,
        boxY,
        boxWidth,
        boxH,
        3,
        3,
        "S"
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BRAND_COLOR.dark);
      doc.text("Cliente", marginX + 5, boxY + 8);
      doc.text("Envío", marginX + boxWidth + boxGap + 5, boxY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR.text);

      const clientLines = [
        order.customer_name ?? "—",
        order.customer_email ?? "—",
        order.customer_phone ? `Tel. ${order.customer_phone}` : "Tel. —",
      ];

      let clientY = boxY + 17;

      clientLines.forEach((line) => {
        const lines = doc.splitTextToSize(line, boxWidth - 10);
        doc.text(lines, marginX + 5, clientY);
        clientY += lines.length * 4.5;
      });

      const shippingAddress = buildShippingText(order.shipping_address);

      const shippingLines = [
        `Método: ${order.shipping_method ?? "—"}`,
        `Coste: ${formatEUR(safeNumber(order.shipping_amount))}`,
        shippingAddress,
      ];

      let shipY = boxY + 17;

      shippingLines.forEach((line) => {
        const lines = doc.splitTextToSize(line, boxWidth - 10);
        doc.text(lines, marginX + boxWidth + boxGap + 5, shipY);
        shipY += lines.length * 4.5;
      });

      y = boxY + boxH + 14;

      // ARTÍCULOS
      sectionTitle("Artículos del pedido");

      const tableX = marginX;
      const tableW = pageWidth - marginX * 2;
      const colProduct = tableX + 4;
      const colQty = tableX + tableW - 64;
      const colUnit = tableX + tableW - 43;
      const colTotal = tableX + tableW - 8;

      const drawTableHeader = () => {
        doc.setFillColor(...BRAND_COLOR.dark);
        doc.rect(tableX, y, tableW, 9, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        doc.text("Producto", colProduct, y + 6);
        doc.text("Cant.", colQty, y + 6, { align: "right" });
        doc.text("Precio", colUnit, y + 6, { align: "right" });
        doc.text("Total", colTotal, y + 6, { align: "right" });

        y += 9;
      };

      drawTableHeader();

      const items = order.order_items ?? [];

      if (items.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLOR.muted);
        doc.text(
          "No hay artículos registrados en este pedido.",
          colProduct,
          y + 8
        );
        y += 16;
      } else {
        items.forEach((item, index) => {
          const quantity = safeNumber(item.quantity);
          const unitPrice = safeNumber(item.unit_price);
          const lineTotal = unitPrice * quantity;

          const productLines = doc.splitTextToSize(
            item.product_name || "Producto sin nombre",
            tableW - 74
          );

          const rowH = Math.max(10, productLines.length * 4.5 + 6);

          checkPageBreak(rowH + 12);

          if (y < 25) {
            drawTableHeader();
          }

          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(tableX, y, tableW, rowH, "F");
          }

          doc.setDrawColor(235, 235, 235);
          doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.8);
          doc.setTextColor(...BRAND_COLOR.text);
          doc.text(productLines, colProduct, y + 6);

          doc.text(String(quantity), colQty, y + 6, { align: "right" });
          doc.text(formatEUR(unitPrice), colUnit, y + 6, { align: "right" });

          doc.setFont("helvetica", "bold");
          doc.text(formatEUR(lineTotal), colTotal, y + 6, {
            align: "right",
          });

          y += rowH;
        });
      }

      y += 8;

      // TOTALES
      checkPageBreak(42);

      const subtotal = getSubtotal(order);
      const shipping = safeNumber(order.shipping_amount);
      const total = safeNumber(order.total_amount);

      const totalBoxW = 72;
      const totalBoxX = rightX - totalBoxW;

      doc.setDrawColor(...BRAND_COLOR.border);
      doc.setFillColor(...BRAND_COLOR.soft);
      doc.roundedRect(totalBoxX, y, totalBoxW, 34, 3, 3, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR.text);

      doc.text("Subtotal", totalBoxX + 6, y + 8);
      doc.text(formatEUR(subtotal), totalBoxX + totalBoxW - 6, y + 8, {
        align: "right",
      });

      doc.text("Envío", totalBoxX + 6, y + 16);
      doc.text(formatEUR(shipping), totalBoxX + totalBoxW - 6, y + 16, {
        align: "right",
      });

      doc.setDrawColor(...BRAND_COLOR.border);
      doc.line(totalBoxX + 6, y + 21, totalBoxX + totalBoxW - 6, y + 21);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BRAND_COLOR.dark);
      doc.text("Total", totalBoxX + 6, y + 29);
      doc.text(formatEUR(total), totalBoxX + totalBoxW - 6, y + 29, {
        align: "right",
      });

      y += 48;

      // NOTA LEGAL
      checkPageBreak(25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND_COLOR.muted);

      const note =
        "Este documento es un resumen del pedido realizado en SAMINATURA. No sustituye una factura legal si esta debe emitirse con numeración fiscal, NIF/CIF, desglose de impuestos y datos fiscales completos.";

      const noteLines = doc.splitTextToSize(note, pageWidth - marginX * 2);
      doc.text(noteLines, marginX, y);

      drawFooter();

      doc.save(`pedido-saminatura-${order.id}.pdf`);
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Cargando pedidos…</div>;
  }

  if (err) {
    return <div className="p-8 text-red-600">Error: {err}</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Mis pedidos
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Consulta tu historial, revisa los detalles y descarga el
                  resumen de cada pedido.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Volver al perfil
                </button>

                <button
                  type="button"
                  onClick={load}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900"
                >
                  Recargar
                </button>
              </div>
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:divide-x">
            <section className="p-6 lg:col-span-5">
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
                  Aún no tienes pedidos.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setOpenId(order.id)}
                      className={`w-full rounded-xl border p-4 text-left transition hover:bg-gray-50 ${
                        openId === order.id
                          ? "border-black bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Pedido
                          </div>

                          <div className="mt-1 break-all text-sm font-semibold text-gray-900">
                            {order.id}
                          </div>

                          <div className="mt-2 text-sm text-gray-600">
                            {formatDate(order.created_at)}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatEUR(safeNumber(order.total_amount))}
                          </div>

                          <div
                            className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              order.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : order.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {statusLabel(order.status)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="p-6 lg:col-span-7">
              {!openOrder ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
                  Selecciona un pedido para ver el detalle.
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Detalle del pedido
                      </h2>

                      <div className="mt-1 break-all text-sm text-gray-500">
                        {openOrder.id}
                      </div>

                      <div className="mt-3 grid gap-1 text-sm text-gray-700">
                        <div>
                          Estado:{" "}
                          <span className="font-medium">
                            {statusLabel(openOrder.status)}
                          </span>
                        </div>

                        <div>
                          Creado:{" "}
                          <span className="font-medium">
                            {formatDate(openOrder.created_at)}
                          </span>
                        </div>

                        <div>
                          Pagado:{" "}
                          <span className="font-medium">
                            {formatDate(openOrder.paid_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {openOrder.invoices?.[0]?.pdf_url ? (
                        <a
                          href={openOrder.invoices[0].pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Ver factura PDF
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => downloadOrderPdf(openOrder)}
                        disabled={pdfLoadingId === openOrder.id}
                        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pdfLoadingId === openOrder.id
                          ? "Generando PDF…"
                          : "Descargar resumen PDF"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="font-semibold text-gray-900">
                        Cliente
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-gray-700">
                        <div>{openOrder.customer_name ?? "—"}</div>
                        <div>{openOrder.customer_email ?? "—"}</div>
                        <div>{openOrder.customer_phone ?? "—"}</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="font-semibold text-gray-900">Envío</div>

                      <div className="mt-2 space-y-1 text-sm text-gray-700">
                        <div>
                          Método: {openOrder.shipping_method ?? "—"}{" "}
                          ({formatEUR(safeNumber(openOrder.shipping_amount))})
                        </div>

                        <div>
                          Dirección:{" "}
                          {buildShippingText(openOrder.shipping_address)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="font-semibold text-gray-900">
                      Artículos
                    </div>

                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                      {(openOrder.order_items ?? []).map((item) => {
                        const lineTotal =
                          safeNumber(item.unit_price) *
                          safeNumber(item.quantity);

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 border-b border-gray-100 p-4 last:border-b-0"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">
                                {item.product_name}
                              </div>

                              <div className="mt-1 text-sm text-gray-500">
                                {safeNumber(item.quantity)} x{" "}
                                {formatEUR(safeNumber(item.unit_price))}
                              </div>
                            </div>

                            <div className="shrink-0 font-semibold text-gray-900">
                              {formatEUR(lineTotal)}
                            </div>
                          </div>
                        );
                      })}

                      {(openOrder.order_items ?? []).length === 0 && (
                        <div className="p-4 text-gray-600">—</div>
                      )}
                    </div>

                    <div className="mt-5 flex justify-end">
                      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>Subtotal</span>
                          <span>{formatEUR(getSubtotal(openOrder))}</span>
                        </div>

                        <div className="mt-2 flex justify-between text-sm text-gray-700">
                          <span>Envío</span>
                          <span>
                            {formatEUR(safeNumber(openOrder.shipping_amount))}
                          </span>
                        </div>

                        <div className="mt-3 border-t pt-3">
                          <div className="flex justify-between text-base font-bold text-gray-900">
                            <span>Total</span>
                            <span>
                              {formatEUR(safeNumber(openOrder.total_amount))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-gray-500">
                      Nota: “Descargar resumen PDF” genera un recibo/resumen del
                      pedido. Para una factura legal completa deberías usar la
                      factura emitida en tu sistema de facturación y guardarla en{" "}
                      <code>invoices.pdf_url</code>.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}