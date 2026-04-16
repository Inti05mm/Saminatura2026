// supabase/functions/stripe-webhook/index.ts
// ✅ Email con resumen + PDF adjunto (pdf-lib)
// ✅ SIN fuentes TTF (evita path not found en Edge Runtime)
// ✅ FIX: NO confiar en order_items.product_name (reconstruir desde products)
// ✅ FIX: Sanitizar texto para evitar "letras separadas" y caracteres raros

import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { Resend } from "npm:resend@4";

// PDF (sin TTF)
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const resendFrom = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";

// Opcional: logo para email / PDF (si es URL pública)
const logoUrl = Deno.env.get("RESEND_LOGO_URL") || "";

// Opcional: guardar PDF en Storage
const invoicesBucket = Deno.env.get("SUPABASE_STORAGE_BUCKET_INVOICES") || "";
const publicBaseUrl = Deno.env.get("INVOICE_PDF_PUBLIC_BASE_URL") || "";

if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(supabaseUrl, serviceRole);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

function formatEUR(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

/**
 * ✅ Sanitización fuerte:
 * - normaliza Unicode (NFC)
 * - quita zero-width (U+200B..U+200D), BOM (U+FEFF)
 * - normaliza guiones raros
 * - quita controles
 * - colapsa espacios
 * - (opcional) recorta a rango Latin-1 para evitar caracteres que Helvetica WinAnsi no soporta
 */
function sanitizeText(input: any) {
  let s = String(input ?? "");

  // Normaliza composición (evita letras "separadas" por diacríticos raros)
  try {
    s = s.normalize("NFC");
  } catch {
    // ignore
  }

  // Quita zero-width y BOM
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Normaliza guiones y espacios raros
  s = s
    .replaceAll("\u2010", "-")
    .replaceAll("\u2011", "-")
    .replaceAll("\u2012", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2212", "-")
    .replaceAll("\u00A0", " ");

  // Quita controles (excepto \n \r \t)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // Colapsa espacios
  s = s.replace(/\s+/g, " ").trim();

  // 🔒 Extra (muy útil si vuelve a salir “basura”):
  // deja solo Latin-1 básico + € (WinAnsi suele soportar €)
  // Si NO quieres recortar, comenta estas 2 líneas.
  s = s.replace(/[^\u0000-\u00FF\u20AC]/g, "");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

function fullProductName(p: { name?: any; flavor?: any; size?: any }) {
  const base = sanitizeText(p?.name ?? "");
  const f = sanitizeText(p?.flavor ?? "");
  const sz = sanitizeText(p?.size ?? "");
  return [base, f, sz].filter(Boolean).join(" ");
}

type EmailItem = {
  product_id?: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  img?: string | null;
};

async function fetchOrderItems(orderId: string): Promise<EmailItem[]> {
  const itemsRes = await supabaseAdmin
    .from("order_items")
    .select("product_id,unit_price,quantity,product_name")
    .eq("order_id", orderId);

  if (itemsRes.error || !Array.isArray(itemsRes.data)) return [];

  const base = itemsRes.data.map((r: any) => ({
    product_id: r.product_id ?? null,
    unit_price: Number(r.unit_price ?? 0),
    quantity: Number(r.quantity ?? 0),
    product_name_fallback: sanitizeText(r.product_name ?? "—"),
  }));

  const ids = Array.from(
    new Set(base.map((x) => Number(x.product_id)).filter((n) => Number.isFinite(n)))
  );

  if (!ids.length) {
    return base.map((it) => ({
      product_id: it.product_id ?? null,
      product_name: it.product_name_fallback,
      unit_price: it.unit_price,
      quantity: it.quantity,
      img: null,
    }));
  }

  const prodRes = await supabaseAdmin
    .from("products")
    .select("id,name,flavor,size,img")
    .in("id", ids);

  const prodMap = new Map<number, { name: string; img: string | null }>();
  if (!prodRes.error && Array.isArray(prodRes.data)) {
    for (const p of prodRes.data as any[]) {
      const id = Number(p.id);
      prodMap.set(id, {
        name: fullProductName(p),
        img: p.img ?? null,
      });
    }
  }

  return base.map((it) => {
    const pid = it.product_id != null ? Number(it.product_id) : null;
    const found = pid != null ? prodMap.get(pid) : null;

    return {
      product_id: pid,
      product_name: found?.name || it.product_name_fallback || "—",
      unit_price: it.unit_price,
      quantity: it.quantity,
      img: found?.img ?? null,
    };
  });
}

function buildItemsTableHtml(items: EmailItem[]) {
  if (!items.length) return `<p style="margin:8px 0;color:#444">—</p>`;

  const rows = items
    .map((it) => {
      const qty = Number(it.quantity ?? 0);
      const unit = Number(it.unit_price ?? 0);
      const lineTotal = qty * unit;

      const img = it.img
        ? `<img src="${escapeHtml(it.img)}" width="44" height="44" style="object-fit:cover;border-radius:8px;border:1px solid #eee" />`
        : `<div style="width:44px;height:44px;border-radius:8px;border:1px solid #eee;background:#fafafa"></div>`;

      return `
        <tr>
          <td style="padding:10px 0;vertical-align:top;">${img}</td>
          <td style="padding:10px 12px;vertical-align:top;">
            <div style="font-weight:600;color:#111;">${escapeHtml(sanitizeText(it.product_name))}</div>
            <div style="color:#666;font-size:12px;margin-top:2px;">${qty} x ${formatEUR(unit)}</div>
          </td>
          <td align="right" style="padding:10px 0;vertical-align:top;font-weight:700;color:#111;">
            ${formatEUR(lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `<table style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table>`;
}

async function generateOrderPdf(args: {
  orderId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingMethod: string | null;
  shippingAmount: number | null;
  shippingAddress: any | null;
  total: number;
  items: EmailItem[];
}) {
  const {
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    shippingMethod,
    shippingAmount,
    shippingAddress,
    total,
    items,
  } = args;

  const doc = await PDFDocument.create();

  // ✅ Fonts estándar (NO requieren archivos)
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595.28, 841.89]); // A4
  const left = 48;
  let y = 800;

  const drawText = (text: string, size = 11, bold = false) => {
    page.drawText(sanitizeText(text), {
      x: left,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 6;
  };

  drawText("Resumen de pedido", 18, true);
  y -= 2;

  drawText(`Pedido: ${orderId}`, 10);
  drawText(`Cliente: ${customerName ?? "—"}`, 10);
  drawText(`Email: ${customerEmail ?? "—"}`, 10);
  drawText(`Teléfono: ${customerPhone ?? "—"}`, 10);

  y -= 10;
  drawText("Envío", 12, true);
  drawText(`Método: ${shippingMethod ?? "—"}`, 10);
  drawText(`Dirección: ${formatShippingAddress(shippingAddress)}`, 10);
  drawText(`Coste envío: ${formatEUR(Number(shippingAmount ?? 0))}`, 10);

  y -= 10;
  drawText("Artículos", 12, true);

  if (!items.length) {
    drawText("—", 10);
  } else {
    for (const it of items) {
      const qty = Number(it.quantity ?? 0);
      const unit = Number(it.unit_price ?? 0);
      const lineTotal = qty * unit;

      const name = sanitizeText(it.product_name);
      const line = `${qty} x ${name} (${formatEUR(unit)}) = ${formatEUR(lineTotal)}`;

      const clipped = line.length > 110 ? line.slice(0, 107) + "..." : line;
      drawText(clipped, 10);

      if (y < 90) break;
    }
  }

  y -= 14;
  drawText(`Envío: ${formatEUR(Number(shippingAmount ?? 0))}`, 12);
  drawText(`Total: ${formatEUR(Number(total))}`, 14, true);

  return await doc.save();
}

function toBase64(u8: Uint8Array) {
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

async function sendOrderEmailWithPdf(args: {
  to: string;
  orderId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingMethod: string | null;
  shippingAmount: number | null;
  shippingAddress: any | null;
  total: number;
  items: EmailItem[];
  pdfBytes: Uint8Array;
  pdfFilename: string;
}) {
  const {
    to,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    shippingMethod,
    shippingAmount,
    shippingAddress,
    total,
    items,
    pdfBytes,
    pdfFilename,
  } = args;

  const shipLine = shippingMethod
    ? `${shippingMethod}${shippingAmount != null ? ` (${formatEUR(Number(shippingAmount))})` : ""}`
    : "—";

  const addressText = formatShippingAddress(shippingAddress);
  const itemsTable = buildItemsTableHtml(items);

  const logoHtml = logoUrl
    ? `<div style="text-align:center;margin-bottom:14px;">
         <img src="${escapeHtml(logoUrl)}" alt="Logo" height="52" style="max-width:220px;height:52px;object-fit:contain;" />
       </div>`
    : "";

  await resend.emails.send({
    from: resendFrom,
    to,
    subject: `Confirmación de pedido ${orderId}`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.5;color:#111;">
        <div style="max-width:640px;margin:0 auto;padding:16px;">
          ${logoHtml}

          <h2 style="margin:0 0 6px;">¡Gracias por tu compra!</h2>
          <p style="margin:0 0 14px;color:#444;">Adjuntamos el resumen de tu pedido en PDF.</p>

          <div style="border:1px solid #eee;border-radius:14px;padding:14px 14px;margin:12px 0;">
            <p style="margin:0 0 6px;"><strong>Pedido:</strong> ${escapeHtml(orderId)}</p>
            <p style="margin:0 0 6px;"><strong>Cliente:</strong> ${escapeHtml(customerName ?? "—")}</p>
            <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(customerEmail ?? "—")}</p>
            <p style="margin:0 0 6px;"><strong>Teléfono:</strong> ${escapeHtml(customerPhone ?? "—")}</p>
            <p style="margin:0 0 6px;"><strong>Envío:</strong> ${escapeHtml(shipLine)}</p>
            <p style="margin:0;"><strong>Dirección:</strong> ${escapeHtml(addressText)}</p>
          </div>

          <h3 style="margin:16px 0 6px;">Artículos</h3>
          <div style="border:1px solid #eee;border-radius:14px;padding:12px;">
            ${itemsTable}
          </div>

          <div style="margin-top:14px;border-top:1px dashed #ddd;padding-top:12px;">
            <div style="display:flex;justify-content:space-between;margin:0 0 6px;">
              <span style="color:#444;">Envío</span>
              <span style="font-weight:700;">${formatEUR(Number(shippingAmount ?? 0))}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin:0;">
              <span style="color:#111;font-weight:800;">Total</span>
              <span style="font-weight:900;">${formatEUR(Number(total))}</span>
            </div>
          </div>

          <p style="color:#666;font-size:12px;margin-top:14px;">
            Este email es una confirmación. La factura legal se puede emitir por tu sistema de facturación.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: pdfFilename,
        content: toBase64(pdfBytes),
      },
    ],
  });
}

async function uploadPdfToStorage(orderId: string, pdfBytes: Uint8Array) {
  if (!invoicesBucket) return { publicUrl: null as string | null, path: null as string | null };

  const path = `orders/${orderId}.pdf`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(invoicesBucket)
    .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (upErr) {
    console.error("Storage upload error:", upErr);
    return { publicUrl: null, path };
  }

  const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${path}` : null;
  return { publicUrl, path };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session: any = event.data.object;

      const orderId = session?.metadata?.order_id;
      const stripeSessionId = session?.id;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing metadata.order_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("orders").update({ stripe_session_id: stripeSessionId }).eq("id", orderId);

      const { error: rpcErr } = await supabaseAdmin.rpc("finalize_paid_order", { p_order_id: orderId });
      if (rpcErr) {
        console.error("finalize_paid_order error:", rpcErr);
        return new Response(JSON.stringify({ error: "Finalize order failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: oErr } = await supabaseAdmin
        .from("orders")
        .select(
          `
          id,status,total_amount,currency,
          customer_email,customer_name,customer_phone,
          shipping_method,shipping_amount,shipping_address,
          invoice_email_sent_at
        `
        )
        .eq("id", orderId)
        .single();

      if (oErr || !order) {
        console.error("Read order error:", oErr);
        return new Response(JSON.stringify({ received: true, warn: "order read failed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isPaid = String(order.status).toLowerCase() === "paid";
      const alreadySent = !!order.invoice_email_sent_at;

      if (isPaid && !alreadySent) {
        const fallbackEmail = session?.customer_details?.email || session?.customer_email || null;
        const to = (order.customer_email || fallbackEmail || "").trim();

        if (!to) {
          await supabaseAdmin.from("orders").update({ invoice_email_error: "Missing customer_email" }).eq("id", orderId);
        } else {
          try {
            const items = await fetchOrderItems(orderId);

            const pdfBytes = await generateOrderPdf({
              orderId: String(order.id),
              customerName: order.customer_name ?? null,
              customerEmail: order.customer_email ?? fallbackEmail ?? null,
              customerPhone: order.customer_phone ?? null,
              shippingMethod: order.shipping_method ?? null,
              shippingAmount: order.shipping_amount != null ? Number(order.shipping_amount) : null,
              shippingAddress: order.shipping_address ?? null,
              total: Number(order.total_amount ?? 0),
              items,
            });

            const up = await uploadPdfToStorage(orderId, pdfBytes);
            if (up.publicUrl) {
              await supabaseAdmin.from("orders").update({ invoice_pdf_url: up.publicUrl }).eq("id", orderId);
            }

            await sendOrderEmailWithPdf({
              to,
              orderId: String(order.id),
              customerName: order.customer_name ?? null,
              customerEmail: order.customer_email ?? fallbackEmail ?? null,
              customerPhone: order.customer_phone ?? null,
              shippingMethod: order.shipping_method ?? null,
              shippingAmount: order.shipping_amount != null ? Number(order.shipping_amount) : null,
              shippingAddress: order.shipping_address ?? null,
              total: Number(order.total_amount ?? 0),
              items,
              pdfBytes,
              pdfFilename: `pedido-${orderId}.pdf`,
            });

            await supabaseAdmin
              .from("orders")
              .update({ invoice_email_sent_at: new Date().toISOString(), invoice_email_error: null })
              .eq("id", orderId);

            console.log("Order email+pdf sent:", { orderId, to, items: items.length });
          } catch (e: any) {
            console.error("Send failed:", e?.message ?? e);
            await supabaseAdmin
              .from("orders")
              .update({ invoice_email_error: String(e?.message ?? e) })
              .eq("id", orderId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? "Webhook error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});