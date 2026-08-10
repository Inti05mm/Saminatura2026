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
const logoUrl =
  Deno.env.get("RESEND_LOGO_URL") ||
  "https://uayblnybdrhhmumudbea.supabase.co/storage/v1/object/public/publicPictures/logo_2.png";

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
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const M = 48;
  const CONTENT_W = PAGE_W - M * 2;

  const C = {
    green: rgb(66 / 255, 85 / 255, 48 / 255),
    greenDark: rgb(38 / 255, 52 / 255, 31 / 255),
    greenSoft: rgb(243 / 255, 246 / 255, 239 / 255),
    cream: rgb(249 / 255, 247 / 255, 241 / 255),
    border: rgb(220 / 255, 226 / 255, 215 / 255),
    text: rgb(43 / 255, 54 / 255, 37 / 255),
    muted: rgb(111 / 255, 123 / 255, 103 / 255),
    white: rgb(1, 1, 1),
  };

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 48;

  const safe = (v: any) => sanitizeText(v ?? "—");

  const draw = (
    value: any,
    x: number,
    yy: number,
    size = 10,
    bold = false,
    color = C.text
  ) => {
    page.drawText(safe(value), {
      x,
      y: yy,
      size,
      font: bold ? fontBold : font,
      color,
    });
  };

  const drawRight = (
    value: any,
    rightX: number,
    yy: number,
    size = 10,
    bold = false,
    color = C.text
  ) => {
    const s = safe(value);
    const f = bold ? fontBold : font;
    const width = f.widthOfTextAtSize(s, size);
    page.drawText(s, {
      x: rightX - width,
      y: yy,
      size,
      font: f,
      color,
    });
  };

  const wrapText = (value: any, maxWidth: number, size = 9, bold = false) => {
    const words = safe(value).split(" ");
    const f = bold ? fontBold : font;
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
    return lines.length ? lines : ["—"];
  };

  const drawWrapped = (
    value: any,
    x: number,
    yy: number,
    maxWidth: number,
    size = 9,
    bold = false,
    color = C.text,
    lineGap = 4
  ) => {
    const lines = wrapText(value, maxWidth, size, bold);
    lines.forEach((line, i) => draw(line, x, yy - i * (size + lineGap), size, bold, color));
    return lines.length * (size + lineGap);
  };

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 48;
  };

  const ensure = (height: number) => {
    if (y - height < 62) newPage();
  };

  // =========================
  // CABECERA
  // =========================
  page.drawRectangle({
    x: M,
    y: y - 58,
    width: CONTENT_W,
    height: 58,
    color: C.cream,
    borderColor: C.border,
    borderWidth: 0.7,
  });

  let logoDrawn = false;

  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") || "";

        let embedded: any = null;

        if (contentType.includes("png") || logoUrl.toLowerCase().includes(".png")) {
          embedded = await doc.embedPng(bytes);
        } else if (
          contentType.includes("jpeg") ||
          contentType.includes("jpg") ||
          /\.(jpe?g)(\?|$)/i.test(logoUrl)
        ) {
          embedded = await doc.embedJpg(bytes);
        }

        if (embedded) {
          const maxW = 150;
          const maxH = 42;
          const scale = Math.min(maxW / embedded.width, maxH / embedded.height);

          page.drawImage(embedded, {
            x: M + 14,
            y: y - 49,
            width: embedded.width * scale,
            height: embedded.height * scale,
          });

          logoDrawn = true;
        }
      }
    } catch (logoError) {
      console.warn("PDF logo load failed:", logoError);
    }
  }

  if (!logoDrawn) {
    draw("SAMINATURA", M + 14, y - 31, 20, true, C.green);
    draw("NATURAL · BIO · BIENESTAR", M + 14, y - 44, 7.5, false, C.muted);
  }

  drawRight("RESUMEN DE PEDIDO", PAGE_W - M - 14, y - 25, 12, true, C.greenDark);
  drawRight(
    "Gracias por confiar en Saminatura",
    PAGE_W - M - 14,
    y - 40,
    8,
    false,
    C.muted
  );

  y -= 82;

  // =========================
  // IDENTIFICACIÓN DEL PEDIDO
  // =========================
  const shortId = orderId.slice(0, 8).toUpperCase();

  draw(`Pedido #${shortId}`, M, y, 16, true, C.greenDark);
  draw(`Referencia: ${orderId}`, M, y - 15, 7.5, false, C.muted);

  page.drawRectangle({
    x: PAGE_W - M - 70,
    y: y - 8,
    width: 70,
    height: 22,
    color: C.greenSoft,
  });
  drawRight("CONFIRMADO", PAGE_W - M - 12, y - 1, 8, true, C.green);

  y -= 42;

  // =========================
  // CLIENTE + ENTREGA
  // =========================
  const gap = 12;
  const cardW = (CONTENT_W - gap) / 2;
  const cardH = 108;

  page.drawRectangle({
    x: M,
    y: y - cardH,
    width: cardW,
    height: cardH,
    color: C.greenSoft,
    borderColor: C.border,
    borderWidth: 0.7,
  });

  page.drawRectangle({
    x: M + cardW + gap,
    y: y - cardH,
    width: cardW,
    height: cardH,
    color: C.greenSoft,
    borderColor: C.border,
    borderWidth: 0.7,
  });

  draw("DATOS DEL CLIENTE", M + 12, y - 20, 9.5, true, C.greenDark);
  draw(customerName ?? "—", M + 12, y - 40, 9, true, C.text);
  draw(customerEmail ?? "—", M + 12, y - 57, 8.5, false, C.text);
  draw(customerPhone ?? "—", M + 12, y - 74, 8.5, false, C.text);

  const rightX = M + cardW + gap + 12;
  draw("ENTREGA", rightX, y - 20, 9.5, true, C.greenDark);
  draw(`Método: ${shippingMethod ?? "—"}`, rightX, y - 40, 8.5, true, C.text);
  drawWrapped(
    formatShippingAddress(shippingAddress),
    rightX,
    y - 58,
    cardW - 24,
    8.2,
    false,
    C.text,
    3
  );

  y -= cardH + 28;

  // =========================
  // ARTÍCULOS
  // =========================
  draw("ARTÍCULOS", M, y, 11, true, C.greenDark);
  y -= 18;

  page.drawRectangle({
    x: M,
    y: y - 24,
    width: CONTENT_W,
    height: 24,
    color: C.green,
  });

  draw("PRODUCTO", M + 10, y - 16, 8, true, C.white);
  draw("UDS.", M + 325, y - 16, 8, true, C.white);
  drawRight("PRECIO", M + 420, y - 16, 8, true, C.white);
  drawRight("TOTAL", PAGE_W - M - 10, y - 16, 8, true, C.white);

  y -= 34;

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.unit_price ?? 0) * Number(it.quantity ?? 0),
    0
  );

  if (!items.length) {
    draw("No hay artículos registrados.", M + 10, y, 9, false, C.muted);
    y -= 22;
  } else {
    for (let index = 0; index < items.length; index++) {
      const it = items[index];
      const qty = Number(it.quantity ?? 0);
      const unit = Number(it.unit_price ?? 0);
      const lineTotal = qty * unit;

      const productLines = wrapText(it.product_name || "Producto", 285, 8.8, false);
      const rowH = Math.max(32, 12 + productLines.length * 12);

      ensure(rowH + 10);

      if (index % 2 === 0) {
        page.drawRectangle({
          x: M,
          y: y - rowH + 8,
          width: CONTENT_W,
          height: rowH,
          color: C.cream,
        });
      }

      productLines.forEach((line, i) => {
        draw(line, M + 10, y - 8 - i * 12, 8.8, false, C.text);
      });

      draw(String(qty), M + 330, y - 8, 8.8, false, C.muted);
      drawRight(formatEUR(unit), M + 420, y - 8, 8.8, false, C.text);
      drawRight(formatEUR(lineTotal), PAGE_W - M - 10, y - 8, 8.8, true, C.greenDark);

      y -= rowH;
    }
  }

  y -= 12;
  ensure(112);

  // =========================
  // TOTALES
  // =========================
  const totalsW = 220;
  const totalsX = PAGE_W - M - totalsW;
  const shipping = Number(shippingAmount ?? 0);

  page.drawRectangle({
    x: totalsX,
    y: y - 92,
    width: totalsW,
    height: 92,
    color: C.greenSoft,
    borderColor: C.border,
    borderWidth: 0.7,
  });

  draw("Subtotal", totalsX + 14, y - 22, 9, false, C.muted);
  drawRight(formatEUR(subtotal), PAGE_W - M - 14, y - 22, 9, true, C.text);

  draw("Envío", totalsX + 14, y - 43, 9, false, C.muted);
  drawRight(formatEUR(shipping), PAGE_W - M - 14, y - 43, 9, true, C.text);

  page.drawLine({
    start: { x: totalsX + 14, y: y - 56 },
    end: { x: PAGE_W - M - 14, y: y - 56 },
    thickness: 0.7,
    color: C.border,
  });

  draw("TOTAL", totalsX + 14, y - 78, 11, true, C.greenDark);
  drawRight(formatEUR(Number(total)), PAGE_W - M - 14, y - 78, 12, true, C.greenDark);

  y -= 116;
  ensure(92);

  // =========================
  // INFORMACIÓN POSTVENTA
  // =========================
  page.drawRectangle({
    x: M,
    y: y - 72,
    width: CONTENT_W,
    height: 72,
    color: C.cream,
    borderColor: C.border,
    borderWidth: 0.7,
  });

  draw("¿NECESITAS AYUDA CON TU PEDIDO?", M + 12, y - 20, 9.5, true, C.greenDark);
  draw(
    "Email: saminatura369@gmail.com  ·  Teléfono: +34 631 415 075",
    M + 12,
    y - 39,
    8.2,
    false,
    C.text
  );
  drawWrapped(
    "Consulta en nuestra web las condiciones de compra, envío, desistimiento, devoluciones y privacidad.",
    M + 12,
    y - 56,
    CONTENT_W - 24,
    7.8,
    false,
    C.muted,
    3
  );

  // =========================
  // PIE EN TODAS LAS PÁGINAS
  // =========================
  const pages = doc.getPages();

  pages.forEach((p, index) => {
    p.drawLine({
      start: { x: M, y: 38 },
      end: { x: PAGE_W - M, y: 38 },
      thickness: 0.6,
      color: C.border,
    });

    p.drawText("SAMINATURA · Natural · Bio · Bienestar", {
      x: M,
      y: 23,
      size: 7.2,
      font,
      color: C.muted,
    });

    const pageText = `Página ${index + 1} de ${pages.length}`;
    const pageTextW = font.widthOfTextAtSize(pageText, 7.2);

    p.drawText(pageText, {
      x: PAGE_W - M - pageTextW,
      y: 23,
      size: 7.2,
      font,
      color: C.muted,
    });
  });

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

  const shipping = Number(shippingAmount ?? 0);
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.unit_price ?? 0) * Number(it.quantity ?? 0),
    0
  );

  const shipLine = shippingMethod
    ? `${shippingMethod}${shippingAmount != null ? ` · ${formatEUR(shipping)}` : ""}`
    : "—";

  const addressText = formatShippingAddress(shippingAddress);
  const shortId = orderId.slice(0, 8).toUpperCase();

  const itemRows = items.length
    ? items
        .map((it) => {
          const qty = Number(it.quantity ?? 0);
          const unit = Number(it.unit_price ?? 0);
          const lineTotal = qty * unit;

          const img = it.img
            ? `
              <img
                src="${escapeHtml(it.img)}"
                width="58"
                height="58"
                alt=""
                style="display:block;width:58px;height:58px;object-fit:contain;border:1px solid #e4e8df;border-radius:10px;background:#ffffff;"
              />
            `
            : `
              <div style="width:58px;height:58px;border:1px solid #e4e8df;border-radius:10px;background:#f9f7f1;"></div>
            `;

          return `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #e8ebe4;width:70px;vertical-align:middle;">
                ${img}
              </td>

              <td style="padding:14px 12px;border-bottom:1px solid #e8ebe4;vertical-align:middle;">
                <div style="font-size:14px;line-height:1.4;font-weight:700;color:#26341f;">
                  ${escapeHtml(sanitizeText(it.product_name))}
                </div>

                <div style="font-size:12px;line-height:1.5;color:#6f7b67;margin-top:4px;">
                  ${qty} × ${formatEUR(unit)}
                </div>
              </td>

              <td
                align="right"
                style="padding:14px 0;border-bottom:1px solid #e8ebe4;vertical-align:middle;white-space:nowrap;font-size:14px;font-weight:800;color:#26341f;"
              >
                ${formatEUR(lineTotal)}
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td style="padding:18px 0;color:#6f7b67;font-size:13px;">
          No hay artículos registrados.
        </td>
      </tr>
    `;

  const logoHtml = logoUrl
    ? `
      <img
        src="${escapeHtml(logoUrl)}"
        alt="Saminatura"
        style="display:block;max-width:210px;max-height:70px;width:auto;height:auto;margin:0;"
      />
    `
    : `
      <div style="font-size:28px;line-height:1;font-weight:800;color:#425530;letter-spacing:.5px;">
        SAMINATURA
      </div>
    `;

  await resend.emails.send({
    from: resendFrom,
    to,
    subject: `Saminatura · Pedido #${shortId} confirmado`,
    html: `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
          <title>Confirmación de pedido</title>
        </head>

        <body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,Helvetica,sans-serif;color:#2b3625;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f2ec;margin:0;padding:0;">
            <tr>
              <td align="center" style="padding:30px 12px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="width:100%;max-width:650px;background:#ffffff;border:1px solid #dce2d7;border-radius:18px;overflow:hidden;"
                >
                  <!-- CABECERA -->
                  <tr>
                    <td style="padding:26px 30px;background:#f9f7f1;border-bottom:1px solid #dce2d7;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td valign="middle">
                            ${logoHtml}
                            <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#6f7b67;margin-top:8px;">
                              Natural · Bio · Bienestar
                            </div>
                          </td>

                          <td align="right" valign="middle" style="padding-left:15px;">
                            <div style="font-size:12px;font-weight:800;color:#425530;letter-spacing:.8px;">
                              PEDIDO CONFIRMADO
                            </div>
                            <div style="font-size:12px;color:#6f7b67;margin-top:5px;">
                              #${escapeHtml(shortId)}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- GRACIAS -->
                  <tr>
                    <td style="padding:34px 30px 18px 30px;">
                      <div style="font-size:25px;line-height:1.25;font-weight:800;color:#26341f;">
                        ¡Gracias por tu compra!
                      </div>

                      <div style="font-size:14px;line-height:1.7;color:#6f7b67;margin-top:10px;">
                        ${
                          customerName
                            ? `Hola <strong style="color:#425530;">${escapeHtml(customerName)}</strong>, hemos recibido correctamente tu pedido.`
                            : "Hemos recibido correctamente tu pedido."
                        }
                        Te adjuntamos también el resumen en PDF para que puedas conservarlo.
                      </div>
                    </td>
                  </tr>

                  <!-- DATOS -->
                  <tr>
                    <td style="padding:8px 30px 22px 30px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td
                            valign="top"
                            style="width:50%;padding:18px;background:#f3f6ef;border:1px solid #dce2d7;border-radius:12px;"
                          >
                            <div style="font-size:11px;font-weight:800;color:#425530;letter-spacing:.7px;margin-bottom:10px;">
                              DATOS DEL CLIENTE
                            </div>

                            <div style="font-size:13px;line-height:1.7;color:#2b3625;">
                              <strong>${escapeHtml(customerName ?? "—")}</strong><br />
                              ${escapeHtml(customerEmail ?? "—")}<br />
                              ${escapeHtml(customerPhone ?? "—")}
                            </div>
                          </td>

                          <td style="width:10px;"></td>

                          <td
                            valign="top"
                            style="width:50%;padding:18px;background:#f3f6ef;border:1px solid #dce2d7;border-radius:12px;"
                          >
                            <div style="font-size:11px;font-weight:800;color:#425530;letter-spacing:.7px;margin-bottom:10px;">
                              ENTREGA
                            </div>

                            <div style="font-size:13px;line-height:1.7;color:#2b3625;">
                              <strong>${escapeHtml(shipLine)}</strong><br />
                              ${escapeHtml(addressText)}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- ARTÍCULOS -->
                  <tr>
                    <td style="padding:6px 30px 0 30px;">
                      <div style="font-size:16px;font-weight:800;color:#26341f;margin-bottom:8px;">
                        Tu pedido
                      </div>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        ${itemRows}
                      </table>
                    </td>
                  </tr>

                  <!-- TOTALES -->
                  <tr>
                    <td style="padding:24px 30px;">
                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="background:#f3f6ef;border:1px solid #dce2d7;border-radius:12px;"
                      >
                        <tr>
                          <td style="padding:18px 20px 8px 20px;font-size:13px;color:#6f7b67;">
                            Subtotal
                          </td>
                          <td align="right" style="padding:18px 20px 8px 20px;font-size:13px;font-weight:700;color:#2b3625;">
                            ${formatEUR(subtotal)}
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:8px 20px 16px 20px;font-size:13px;color:#6f7b67;">
                            Envío
                          </td>
                          <td align="right" style="padding:8px 20px 16px 20px;font-size:13px;font-weight:700;color:#2b3625;">
                            ${formatEUR(shipping)}
                          </td>
                        </tr>

                        <tr>
                          <td colspan="2" style="padding:0 20px;">
                            <div style="height:1px;background:#dce2d7;"></div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:17px 20px 19px 20px;font-size:16px;font-weight:900;color:#26341f;">
                            TOTAL
                          </td>
                          <td align="right" style="padding:17px 20px 19px 20px;font-size:18px;font-weight:900;color:#425530;">
                            ${formatEUR(Number(total))}
                          </td>
                        </tr>
                      </table>

                      <div style="font-size:11px;line-height:1.5;color:#7a8473;margin-top:8px;text-align:right;">
                        Los impuestos aplicables están incluidos en los precios mostrados.
                      </div>
                    </td>
                  </tr>

                  <!-- AYUDA / POSTVENTA -->
                  <tr>
                    <td style="padding:0 30px 30px 30px;">
                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="background:#f9f7f1;border:1px solid #dce2d7;border-radius:12px;"
                      >
                        <tr>
                          <td style="padding:20px;">
                            <div style="font-size:14px;font-weight:800;color:#26341f;">
                              ¿Necesitas ayuda con tu pedido?
                            </div>

                            <div style="font-size:12px;line-height:1.8;color:#6f7b67;margin-top:8px;">
                              Email:
                              <a href="mailto:saminatura369@gmail.com" style="color:#425530;text-decoration:none;font-weight:700;">
                                saminatura369@gmail.com
                              </a>
                              <br />
                              Teléfono:
                              <a href="tel:+34631415075" style="color:#425530;text-decoration:none;font-weight:700;">
                                +34 631 415 075
                              </a>
                            </div>

                            <div style="font-size:11px;line-height:1.6;color:#7a8473;margin-top:12px;">
                              Conserva este correo como confirmación de tu compra.
                              Consulta en la web de Saminatura las condiciones de compra,
                              envío, desistimiento, devoluciones y privacidad.
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td align="center" style="padding:22px 30px;background:#425530;">
                      <div style="font-size:12px;font-weight:800;color:#ffffff;letter-spacing:.5px;">
                        SAMINATURA
                      </div>

                      <div style="font-size:10px;color:#e7ecdf;letter-spacing:1.4px;margin-top:6px;">
                        NATURAL · BIO · BIENESTAR
                      </div>

                      <div style="font-size:10px;line-height:1.6;color:#d8dfd0;margin-top:12px;">
                        Este mensaje se ha enviado automáticamente tras la confirmación del pago.
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="max-width:650px;font-size:10px;line-height:1.5;color:#8a9284;text-align:center;margin-top:14px;">
                  Referencia completa del pedido: ${escapeHtml(orderId)}
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>
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

    if (event.type === "checkout.session.expired") {
      const session: any = event.data.object;
      const orderId = session?.metadata?.order_id;

      if (!orderId) {
        console.warn("checkout.session.expired without metadata.order_id", { sessionId: session?.id });
        return new Response(JSON.stringify({ received: true, warn: "missing order_id" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Si el cliente abandona Stripe o la sesión caduca, liberamos la reserva online.
      const { error: releaseErr } = await supabaseAdmin.rpc("release_online_stock_for_order", {
        p_order_id: orderId,
      });

      if (releaseErr) {
        console.error("release_online_stock_for_order error:", releaseErr);
        return new Response(JSON.stringify({ error: "Release stock reservation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending");

      console.log("Expired checkout released stock reservation:", { orderId, sessionId: session?.id });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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