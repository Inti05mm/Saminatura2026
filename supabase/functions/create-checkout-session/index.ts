import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CartItem = { product_id: number; qty: number };

function toCents(v: number) {
  return Math.round(Number(v) * 100);
}

function fullProductName(p: { name?: string | null; flavor?: string | null; size?: string | null }) {
  const base = String(p?.name ?? "").trim();
  const f = String(p?.flavor ?? "").trim();
  const s = String(p?.size ?? "").trim();
  return [base, f, s].filter(Boolean).join(" ");
}

function isUuid(v: any) {
  const s = String(v ?? "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function normalizeShippingAddress(input: any) {
  if (!input) return null;

  // Si viene como string JSON -> lo convertimos a objeto (para guardar en jsonb)
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return parsed;
      return null;
    } catch {
      return null;
    }
  }

  // Si ya viene como objeto, lo dejamos
  if (typeof input === "object") return input;

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // 🧩 Id de request para detectar llamadas dobles
  const reqId = crypto.randomUUID();

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRole) {
      console.error(`[${reqId}] Missing secrets`, {
        hasStripeKey: !!stripeKey,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRole,
      });

      return new Response(JSON.stringify({ error: "Missing secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Admin (service role) para leer/escribir sin RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRole);

    // 1) Body
    const body = await req.json();

    console.log(`\n[${reqId}] === CHECKOUT REQUEST START ===`);
    console.log(`[${reqId}] RAW BODY:`, JSON.stringify(body, null, 2));

    const cart = body?.cart;
    const orderIdFromClient = (body?.orderId ?? body?.order_id ?? null) as string | null;

    const shippingFromClient = body?.shipping ?? null; // {method, amount}
    const guestTokenFromClient = (body?.guestToken ?? body?.guest_token ?? null) as string | null;

    // ✅ Estos dos son CLAVE para invitados (y también para user):
    const customer = body?.customer ?? null; // {email,name,phone}
    const shippingAddrRaw = body?.shipping_address ?? null; // puede venir object o string

    const shippingAddr = normalizeShippingAddress(shippingAddrRaw);

    console.log(`[${reqId}] BODY.customer:`, customer);
    console.log(`[${reqId}] BODY.shipping_address (raw):`, shippingAddrRaw);
    console.log(`[${reqId}] BODY.shipping_address (normalized):`, shippingAddr);
    console.log(`[${reqId}] BODY.orderIdFromClient:`, orderIdFromClient);
    console.log(`[${reqId}] BODY.guestTokenFromClient:`, guestTokenFromClient);

    if (!cart?.items?.length) {
      console.warn(`[${reqId}] Empty cart`);
      return new Response(JSON.stringify({ error: "Empty cart" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Validación mínima: si no hay email NO se crea pedido
    const customerEmail = String(customer?.email ?? "").trim();
    if (!customerEmail) {
      console.warn(`[${reqId}] Missing customer email`);
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerName = String(customer?.name ?? "").trim() || null;
    const customerPhone = String(customer?.phone ?? "").trim() || null;

    console.log(`[${reqId}] Parsed customerEmail:`, customerEmail);
    console.log(`[${reqId}] Parsed customerName:`, customerName);
    console.log(`[${reqId}] Parsed customerPhone:`, customerPhone);

    // 2) Auth opcional
    const authHeader = req.headers.get("Authorization"); // puede ser null
    let userId: string | null = null;
    let mode: "user" | "guest" = "guest";

    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, serviceRole, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: authData, error: authErr } = await supabaseUser.auth.getUser();

      // Si viene Authorization pero es inválido -> 401
      if (authErr) {
        console.error(`[${reqId}] Unauthorized authErr:`, authErr);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (authData?.user?.id) {
        userId = authData.user.id;
        mode = "user";
      }
    }

    console.log(`[${reqId}] AUTH HEADER present:`, !!authHeader);
    console.log(`[${reqId}] MODE DETECTED:`, mode);
    console.log(`[${reqId}] USER ID:`, userId);

    // 3) Guest token en modo guest
    let guestToken: string | null = null;

    if (mode === "guest") {
      if (guestTokenFromClient && isUuid(guestTokenFromClient)) {
        guestToken = guestTokenFromClient;
      } else {
        guestToken = crypto.randomUUID();
      }
    }

    console.log(`[${reqId}] guestToken resolved:`, guestToken);

    // 4) Normalizamos qty
    const cartItems: CartItem[] = (cart.items as CartItem[]).map((i) => ({
      product_id: Number(i.product_id),
      qty: Math.max(1, Number(i.qty)),
    }));

    const productIds = cartItems.map((i) => i.product_id);

    console.log(`[${reqId}] cartItems normalized:`, cartItems);

    // 5) Leer productos reales desde DB
const { data: products, error: pErr } = await supabaseAdmin
  .from("products")
  .select("id, name, flavor, size, price, stock")
  .in("id", productIds);

    if (pErr || !products) {
      console.error(`[${reqId}] Products error:`, pErr);
      return new Response(JSON.stringify({ error: "Products error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Validar stock y calcular subtotal
    let subtotal = 0;

    for (const item of cartItems) {
      const p = products.find((x: any) => Number(x.id) === item.product_id);
      if (!p) {
        console.warn(`[${reqId}] Product not found:`, item.product_id);
        return new Response(JSON.stringify({ error: `Product not found: ${item.product_id}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (p.stock !== null && p.stock !== undefined && item.qty > Number(p.stock)) {
        console.warn(`[${reqId}] Not enough stock for:`, p.name, { stock: p.stock, qty: item.qty });
        return new Response(JSON.stringify({ error: `Not enough stock for: ${p.name}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subtotal += Number(p.price) * item.qty;
    }

    console.log(`[${reqId}] subtotal computed:`, subtotal);

    // 7) Determinar envío
    let shippingAmount = Number(shippingFromClient?.amount ?? 0) || 0;
    let shippingMethod: string | null = (shippingFromClient?.method ?? null) as string | null;

    console.log(`[${reqId}] shippingFromClient:`, shippingFromClient);
    console.log(`[${reqId}] shippingAmount initial:`, shippingAmount);
    console.log(`[${reqId}] shippingMethod initial:`, shippingMethod);

    // Si viene orderId, validamos ownership + tomamos shipping guardado si existe
    if (orderIdFromClient) {
      console.log(`[${reqId}] orderIdFromClient present -> validating existing order`);

      const { data: orderRow, error: oReadErr } = await supabaseAdmin
        .from("orders")
        .select("id, user_id, guest_token, status, shipping_amount, shipping_method")
        .eq("id", orderIdFromClient)
        .single();

      if (oReadErr || !orderRow) {
        console.error(`[${reqId}] Order not found`, oReadErr);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[${reqId}] existing orderRow:`, orderRow);

      if (orderRow.status !== "pending") {
        console.warn(`[${reqId}] Order status is ${orderRow.status}`);
        return new Response(JSON.stringify({ error: `Order status is ${orderRow.status}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Seguridad: el pedido debe pertenecer al usuario o al guest_token
      if (mode === "user") {
        if (orderRow.user_id !== userId) {
          console.warn(`[${reqId}] Forbidden order for user`, { orderUserId: orderRow.user_id, userId });
          return new Response(JSON.stringify({ error: "Forbidden order" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        if (!guestToken || String(orderRow.guest_token ?? "") !== guestToken) {
          console.warn(`[${reqId}] Forbidden guest order`, {
            orderGuestToken: orderRow.guest_token,
            guestToken,
          });
          return new Response(JSON.stringify({ error: "Forbidden guest order" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Si el pedido ya tenía envío guardado, úsalo
      if (orderRow.shipping_amount != null) shippingAmount = Number(orderRow.shipping_amount) || 0;
      if (orderRow.shipping_method != null) shippingMethod = String(orderRow.shipping_method);

      console.log(`[${reqId}] shippingAmount after orderRow:`, shippingAmount);
      console.log(`[${reqId}] shippingMethod after orderRow:`, shippingMethod);
    }

    const total = Number((subtotal + shippingAmount).toFixed(2));
    console.log(`[${reqId}] total computed:`, total);

    // 8) Crear/actualizar order + items
    let orderId = orderIdFromClient;

const itemsToInsert = cartItems.map((ci) => {
  const p = products.find((x: any) => Number(x.id) === ci.product_id);
  if (!p) throw new Error(`Product not found: ${ci.product_id}`);

  return {
    product_id: Number(p.id),
    product_name: fullProductName(p),
    unit_price: Number(p.price),
    quantity: ci.qty,
  };
});

    console.log(`[${reqId}] itemsToInsert:`, itemsToInsert);

    if (!orderId) {
      // ✅ crea order nuevo (user o guest) + GUARDA DATOS
      const insertPayload: any = {
        status: "pending",
        total_amount: total,
        currency: "eur",
        shipping_amount: shippingAmount,
        shipping_method: shippingMethod,

        // ✅ IMPORTANTÍSIMO: guardar siempre datos del cliente/envío
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_address: shippingAddr ?? null, // ✅ jsonb real
      };

      if (mode === "user") insertPayload.user_id = userId;
      else insertPayload.guest_token = guestToken;

      console.log(`[${reqId}] 🆕 CREATING NEW ORDER`);
      console.log(`[${reqId}] INSERT MODE:`, mode);
      console.log(`[${reqId}] INSERT userId:`, userId);
      console.log(`[${reqId}] INSERT guestToken:`, guestToken);
      console.log(`[${reqId}] INSERT customerEmail:`, customerEmail);
      console.log(`[${reqId}] INSERT customerName:`, customerName);
      console.log(`[${reqId}] INSERT customerPhone:`, customerPhone);
      console.log(`[${reqId}] INSERT shipping_address:`, shippingAddr);
      console.log(`[${reqId}] INSERT PAYLOAD:`, JSON.stringify(insertPayload, null, 2));

      const { data: order, error: oErr } = await supabaseAdmin
        .from("orders")
        .insert(insertPayload)
        .select("id")
        .single();

      if (oErr || !order) {
        console.error(`[${reqId}] Failed to create order`, oErr);
        return new Response(JSON.stringify({ error: "Failed to create order" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      orderId = order.id;

      console.log(`[${reqId}] ✅ ORDER CREATED:`, orderId);

      const payload = itemsToInsert.map((it) => ({ ...it, order_id: orderId }));
      const { error: iErr } = await supabaseAdmin.from("order_items").insert(payload);

      if (iErr) {
        console.error(`[${reqId}] Failed to create order items`, iErr);
        await supabaseAdmin.from("orders").delete().eq("id", orderId);
        return new Response(JSON.stringify({ error: "Failed to create order items" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[${reqId}] ✅ ORDER ITEMS CREATED (${payload.length})`);
    } else {
      // ✅ Update seguro:
      // - NO tocamos user_id / guest_token (evita borrar ownership)
      // - NO pisamos shipping_address con null si no viene
      const patch: any = {
        total_amount: total,
        shipping_amount: shippingAmount,
        shipping_method: shippingMethod,
      };

      // buyer fields solo si vienen con valor
      if (customerEmail) patch.customer_email = customerEmail;
      if (customerName) patch.customer_name = customerName;
      if (customerPhone) patch.customer_phone = customerPhone;
      if (shippingAddr && typeof shippingAddr === "object" && Object.keys(shippingAddr).length > 0) {
        patch.shipping_address = shippingAddr;
      }

      console.log(`[${reqId}] ♻️ UPDATING EXISTING ORDER`);
      console.log(`[${reqId}] ORDER ID:`, orderId);
      console.log(`[${reqId}] UPDATE MODE:`, mode);
      console.log(`[${reqId}] UPDATE PATCH:`, JSON.stringify(patch, null, 2));

      const { error: upErr } = await supabaseAdmin.from("orders").update(patch).eq("id", orderId);

      if (upErr) {
        console.error(`[${reqId}] Failed to update order`, upErr);
        return new Response(JSON.stringify({ error: "Failed to update order" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[${reqId}] ✅ ORDER UPDATED`);

      const { error: delErr } = await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);

      if (delErr) {
        console.error(`[${reqId}] Failed to refresh order items (delete)`, delErr);
        return new Response(JSON.stringify({ error: "Failed to refresh order items" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = itemsToInsert.map((it) => ({ ...it, order_id: orderId }));
      const { error: insErr } = await supabaseAdmin.from("order_items").insert(payload);

      if (insErr) {
        console.error(`[${reqId}] Failed to insert order items`, insErr);
        return new Response(JSON.stringify({ error: "Failed to insert order items" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[${reqId}] ✅ ORDER ITEMS REFRESHED (${payload.length})`);
    }

    // 9) Stripe line items
    const lineItems: any[] = itemsToInsert.map((it) => ({
      price_data: {
        currency: "eur",
        product_data: { name: it.product_name },
        unit_amount: toCents(Number(it.unit_price)),
      },
      quantity: Number(it.quantity),
    }));

    if (shippingAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: `Envío${shippingMethod ? " - " + shippingMethod : ""}` },
          unit_amount: toCents(shippingAmount),
        },
        quantity: 1,
      });
    }

    const successUrl = "http://localhost:5173/checkout/success";
    const cancelUrl = "http://localhost:5173/micesta";

    // 10) Stripe session + metadata
    const metadata: Record<string, string> = {
      order_id: orderId!,
      shipping_amount: String(shippingAmount),
      shipping_method: shippingMethod ?? "",
      mode,
    };
    if (mode === "user" && userId) metadata.user_id = userId;
    if (mode === "guest" && guestToken) metadata.guest_token = guestToken;

    console.log(`[${reqId}] 💳 STRIPE SESSION CREATE`);
    console.log(`[${reqId}] FINAL ORDER ID:`, orderId);
    console.log(`[${reqId}] FINAL MODE:`, mode);
    console.log(`[${reqId}] FINAL customerEmail:`, customerEmail);
    console.log(`[${reqId}] FINAL shipping_address:`, shippingAddr);
    console.log(`[${reqId}] METADATA:`, metadata);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,

      // ✅ Para que Stripe también tenga email (y recibo):
      customer_email: customerEmail,
    });

    // 11) Guardar stripe_session_id en orders
    await supabaseAdmin.from("orders").update({ stripe_session_id: session.id }).eq("id", orderId);

    console.log(`[${reqId}] ✅ STRIPE SESSION CREATED:`, session.id);
    console.log(`[${reqId}] === CHECKOUT REQUEST END ===\n`);

    return new Response(
      JSON.stringify({
        url: session.url,
        order_id: orderId,
        mode,
        guest_token: guestToken, // para que el cliente lo guarde
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error(`[${reqId}] create-checkout-session error:`, e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
