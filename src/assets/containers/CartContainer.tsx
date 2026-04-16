import { useEffect, useMemo, useState, useContext, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useCart } from "../containers/CartContext";
import { UserContext } from "../containers/UserContext";

type Product = {
  id: number;
  slug: string | null; // ✅ NUEVO
  name: string;
  brand: string;
  price: number; // PVP final (IVA incluido)
  vat_rate: number | null;
  img: string | null;
  stock: number;
  size: string | null;   // ✅ null-safe
  flavor: string | null; // ✅ null-safe
};

type CheckoutStep = "cart" | "info" | "shipping" | "review";

type ShippingOption = {
  id: "ctt" | "pickup";
  label: string;
  eta: string;
  amount: number; // EUR
};

type ShippingAddress = {
  country: string;
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  region: string;
};

type ContactInfo = {
  email: string;
  phone: string;
  marketingOptIn: boolean;
};

const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "ctt", label: "CTT Express", eta: "24-48h", amount: 3.95 },
  { id: "pickup", label: "Recogida en tienda", eta: "Gratis", amount: 0 },
];

const formatEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function vatFromGross(gross: number, vatRate: number) {
  return gross * (vatRate / (100 + vatRate));
}

function buildAddressText(a: ShippingAddress) {
  const parts = [
    `${a.firstName} ${a.lastName}`.trim(),
    a.company?.trim(),
    a.line1.trim(),
    a.line2?.trim(),
    `${a.postalCode.trim()} ${a.city.trim()}`.trim(),
    a.region.trim(),
    a.country.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

function isAddressFilled(a: ShippingAddress) {
  return !!(
    a.firstName?.trim() &&
    a.lastName?.trim() &&
    a.line1?.trim() &&
    a.postalCode?.trim() &&
    a.city?.trim() &&
    a.region?.trim() &&
    a.country?.trim()
  );
}

const EMPTY_ADDRESS: ShippingAddress = {
  country: "España",
  firstName: "",
  lastName: "",
  company: "",
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  region: "",
};

function getOrCreateGuestToken() {
  const k = "guest_token_v1";
  const existing = localStorage.getItem(k);
  if (existing) return existing;

  const t =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? (crypto as any).randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(k, t);
  return t;
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// ✅ NUEVO: nombre completo = name + flavor + size
function fullProductName(p: Pick<Product, "name" | "flavor" | "size">) {
  const base = (p.name ?? "").trim();
  const f = (p.flavor ?? "").trim();
  const s = (p.size ?? "").trim();
  return [base, f, s].filter(Boolean).join(" ");
}

export default function CartPage() {
  const navigate = useNavigate();
  const { user, initializing } = useContext(UserContext) as any;
  const { cart, setQty, removeFromCart, loading: cartLoading } = useCart();

  // ✅ Cache por ID para NO “recargar todo” al borrar / cambiar qty
  const [productById, setProductById] = useState<Record<number, Product>>({});
  const [initialLoading, setInitialLoading] = useState(true);

  const [coupon, setCoupon] = useState("");
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [guestToken] = useState<string>(() => getOrCreateGuestToken());

  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");

  const [contact, setContact] = useState<ContactInfo>({
    email: "",
    phone: "",
    marketingOptIn: false,
  });

  const [addr, setAddr] = useState<ShippingAddress>({
    country: "España",
    firstName: "",
    lastName: "",
    company: "",
    line1: "",
    line2: "",
    postalCode: "",
    city: "",
    region: "",
  });

  const [shippingOpt, setShippingOpt] = useState<ShippingOption>(SHIPPING_OPTIONS[0]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // ✅ mensaje "no quedan más" por producto
  const [stockMsgById, setStockMsgById] = useState<Record<number, string>>({});
  const stockTimersRef = useRef<Record<number, number>>({});

  // ids + qty helper
  const ids = useMemo(() => cart.items.map((i) => i.product_id), [cart.items]);

  const qtyOf = useCallback(
    (productId: number) => cart.items.find((i) => i.product_id === productId)?.qty ?? 0,
    [cart.items]
  );

  // ✅ lista de productos en el mismo orden del carrito (sin “flicker”)
  const products = useMemo(() => {
    const list: Product[] = [];
    for (const id of ids) {
      const p = productById[id];
      if (p) list.push(p);
    }
    return list;
  }, [ids, productById]);

  // ✅ Drafts para input de qty (permite teclado)
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({});

  // ✅ evita que el sync pise mientras el usuario escribe
  const editingRef = useRef<Set<number>>(new Set());

  // ✅ Mantén qtyDraft sincronizado con carrito
  useEffect(() => {
    setQtyDraft((prev) => {
      const next = { ...prev };

      for (const item of cart.items) {
        const id = item.product_id;

        // si NO está editando, forzamos el valor del carrito (para que el input cambie al dar + / -)
        if (!editingRef.current.has(id)) {
          next[id] = String(item.qty);
        } else {
          // si está editando pero ya coincide, dejamos de considerar que edita
          if (Number(next[id]) === item.qty) editingRef.current.delete(id);
        }
      }

      // limpia drafts de productos que ya no están
      for (const k of Object.keys(next)) {
        const id = Number(k);
        if (!cart.items.some((it) => it.product_id === id)) {
          delete next[id];
          editingRef.current.delete(id);
        }
      }

      return next;
    });
  }, [cart.items]);

  // ✅ Cargar productos SOLO si faltan (no ponemos loading en cada cambio)
  useEffect(() => {
    let alive = true;

    const loadMissing = async () => {
      if (ids.length === 0) {
        if (!alive) return;
        setInitialLoading(false);
        return;
      }

      const missing = ids.filter((id) => !productById[id]);
      if (missing.length === 0) {
        if (!alive) return;
        setInitialLoading(false);
        return;
      }

      const { data, error } = await supabase
.from("public_products")
.select("id,slug,name,brand,price,img,stock,flavor,size")
        .in("id", missing);

      if (!alive) return;

      if (!error && data) {
        setProductById((prev) => {
          const next = { ...prev };
          for (const row of data as any[]) next[Number(row.id)] = row as Product;
          return next;
        });
      }

      setInitialLoading(false);
    };

    loadMissing();
    return () => {
      alive = false;
    };
  }, [ids, productById]);

  // ✅ Google Places Autocomplete
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Cargar Google Maps JS SOLO cuando estamos en "info"
  useEffect(() => {
    if (step !== "info") return;

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    const w = window as any;
    if (w.google?.maps?.places) return;

    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
    if (existing) return;

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places&language=es&region=ES`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-google-maps", "1");
    document.head.appendChild(s);
  }, [step]);

  // ✅ Inicializa Autocomplete cuando el script esté listo
  useEffect(() => {
    if (step !== "info") return;

    let ac: any = null;
    let listener: any = null;
    let timer: any = null;

    const setup = () => {
      const w = window as any;
      if (!w.google?.maps?.places) return false;

      const input = addressInputRef.current;
      if (!input) return false;

      ac = new w.google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: ["es"] },
        fields: ["address_components", "formatted_address"],
      });

      const getComp = (comps: any[], type: string) =>
        comps.find((c: any) => (c.types || []).includes(type))?.long_name || "";

      const onPlaceChanged = () => {
        const place = ac.getPlace();
        const comps = place?.address_components ?? [];

        const streetNumber = getComp(comps, "street_number");
        const route = getComp(comps, "route");
        const postalCode = getComp(comps, "postal_code");
        const city =
          getComp(comps, "locality") ||
          getComp(comps, "postal_town") ||
          getComp(comps, "administrative_area_level_3");
        const region =
          getComp(comps, "administrative_area_level_2") ||
          getComp(comps, "administrative_area_level_1");
        const country = getComp(comps, "country") || "España";

        const line1 = [route, streetNumber].filter(Boolean).join(" ").trim();

        setAddr((p) => ({
          ...p,
          line1: line1 || p.line1,
          postalCode: postalCode || p.postalCode,
          city: city || p.city,
          region: region || p.region,
          country: country || p.country,
        }));
      };

      listener = ac.addListener("place_changed", onPlaceChanged);
      return true;
    };

    if (!setup()) {
      const started = Date.now();
      timer = setInterval(() => {
        if (setup()) {
          clearInterval(timer);
          timer = null;
        } else if (Date.now() - started > 6000) {
          clearInterval(timer);
          timer = null;
        }
      }, 200);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (listener?.remove) listener.remove();
    };
  }, [step]);

  // ✅ si sales de sesión, limpia orderId
  useEffect(() => {
    if (initializing) return;
    if (!user) setOrderId(null);
  }, [initializing, user]);

  // ✅ Cargar perfil
  const [savedAddr, setSavedAddr] = useState<ShippingAddress | null>(null);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);

  const [addressChoice, setAddressChoice] = useState<"saved" | "new">("new");
  const [addressChoiceLocked, setAddressChoiceLocked] = useState(false);

  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [saveNewAsDefault, setSaveNewAsDefault] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setContact((p) => ({ ...p, email: p.email || user.email || "" }));

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,phone,country,company,address_line1,address_line2,postal_code,city,region,marketing_opt_in"
        )
        .eq("id", user.id)
        .single();

      if (error || !data) {
        setSavedAddr(null);
        setHasSavedAddress(false);
        return;
      }

      setContact((p) => ({
        ...p,
        phone: data.phone ?? "",
        marketingOptIn: data.marketing_opt_in ?? false,
        email: p.email || user.email || "",
      }));

      const sa: ShippingAddress = {
        country: data.country ?? "España",
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        company: data.company ?? "",
        line1: data.address_line1 ?? "",
        line2: data.address_line2 ?? "",
        postalCode: data.postal_code ?? "",
        city: data.city ?? "",
        region: data.region ?? "",
      };

      setSavedAddr(sa);

      const ok = isAddressFilled(sa);
      setHasSavedAddress(ok);

      if (ok && !addressChoiceLocked) {
        setAddressChoice("saved");
        setAddressChoiceLocked(true);
        setAddr((p) => ({ ...p, ...sa }));
        setSaveNewAsDefault(true);
      }

      if (!ok) setSaveAsDefault(true);
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ totales (se recalculan sin recargar productos)
  const subtotal = useMemo(() => products.reduce((acc, p) => acc + p.price * qtyOf(p.id), 0), [products, qtyOf]);

  const totalVat = useMemo(() => {
    return products.reduce((acc, p) => {
      const qty = qtyOf(p.id);
      const lineGross = p.price * qty;
      const rate = Number(p.vat_rate ?? 0);
      if (!rate || rate <= 0) return acc;
      return acc + vatFromGross(lineGross, rate);
    }, 0);
  }, [products, qtyOf]);

  const totalBase = useMemo(() => subtotal - totalVat, [subtotal, totalVat]);

  const shipping = step === "cart" ? 0 : shippingOpt.amount;
  const total = subtotal + shipping;

  // ✅ helper mensajito stock
  const showStockMsg = (productId: number, msg: string) => {
    setStockMsgById((prev) => ({ ...prev, [productId]: msg }));

    const prevTimer = stockTimersRef.current[productId];
    if (prevTimer) window.clearTimeout(prevTimer);

    stockTimersRef.current[productId] = window.setTimeout(() => {
      setStockMsgById((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      delete stockTimersRef.current[productId];
    }, 1600);
  };

  // ✅ handlers sin parpadeo (y el número del medio cambia SIEMPRE)
  const handleMinus = (p: Product) => {
    const current = qtyOf(p.id);
    const next = Math.max(1, current - 1);

    // UI inmediata
    editingRef.current.delete(p.id);
    setQtyDraft((prev) => ({ ...prev, [p.id]: String(next) }));

    setQty(p.id, next);
  };

  const handlePlus = (p: Product) => {
    const current = qtyOf(p.id);
    const max = p.stock != null ? Number(p.stock) : Number.POSITIVE_INFINITY;

    if (current >= max) {
      showStockMsg(p.id, "No quedan más unidades disponibles");
      return;
    }

    const next = current + 1;

    // UI inmediata
    editingRef.current.delete(p.id);
    setQtyDraft((prev) => ({ ...prev, [p.id]: String(next) }));

    setQty(p.id, next);
  };

  // ✅ input qty por teclado
  const commitQty = async (p: Product) => {
    const raw = (qtyDraft[p.id] ?? "").trim();
    const parsed = raw === "" ? NaN : Number(raw);
    const max = p.stock != null ? Number(p.stock) : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(parsed)) {
      editingRef.current.delete(p.id);
      setQtyDraft((prev) => ({ ...prev, [p.id]: String(qtyOf(p.id)) }));
      return;
    }

    const rounded = Math.round(parsed);
    const next = clampInt(rounded, 1, max);

    if (rounded > max && Number.isFinite(max)) {
      showStockMsg(p.id, "No quedan más unidades disponibles");
    }

    editingRef.current.delete(p.id);
    setQtyDraft((prev) => ({ ...prev, [p.id]: String(next) }));
    setQty(p.id, next);
  };

  const openProduct = (p: Product) => {
    const s = (p.slug ?? "").trim();
    navigate(`/shopping/${s ? `${s}-${p.id}` : p.id}`);
  };

  const saveDraftOrder = async () => {
    if (products.length === 0) throw new Error("Tu cesta está vacía.");

    if (!contact.email.trim()) throw new Error("Falta el email.");
    if (!addr.firstName.trim() || !addr.lastName.trim()) throw new Error("Falta nombre/apellidos.");
    if (!addr.line1.trim() || !addr.postalCode.trim() || !addr.city.trim() || !addr.region.trim()) {
      throw new Error("Faltan datos de dirección (calle, CP, ciudad, provincia).");
    }

    if (!user) return true;

    setSavingDraft(true);

    try {
      const shippingAddressJson = {
        country: addr.country.trim(),
        first_name: addr.firstName.trim(),
        last_name: addr.lastName.trim(),
        company: addr.company?.trim() || null,
        line1: addr.line1.trim(),
        line2: addr.line2?.trim() || null,
        postal_code: addr.postalCode.trim(),
        city: addr.city.trim(),
        region: addr.region.trim(),
      };

      if (!orderId) {
        const { data: inserted, error: insErr } = await supabase
          .from("orders")
          .insert([
            {
              user_id: user.id,
              status: "pending",
              total_amount: Number(total.toFixed(2)),
              currency: "eur",

              customer_email: contact.email.trim(),
              customer_name: `${addr.firstName} ${addr.lastName}`.trim(),
              customer_phone: contact.phone.trim() || null,
              shipping_address: shippingAddressJson,
              shipping_method: shippingOpt.label,
              shipping_amount: Number(shippingOpt.amount.toFixed(2)),
            },
          ])
          .select("id")
          .single();

        if (insErr) throw insErr;

        setOrderId(inserted.id);

        const itemsPayload = products
          .map((p) => ({
            order_id: inserted.id,
            product_id: p.id,
            // ✅ AQUÍ: guardamos el nombre completo en el pedido
            product_name: fullProductName(p),
            unit_price: Number(p.price),
            quantity: qtyOf(p.id),
          }))
          .filter((x) => x.quantity > 0);

        if (itemsPayload.length) {
          const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
          if (itemsErr) throw itemsErr;
        }
      } else {
        const { error: upErr } = await supabase
          .from("orders")
          .update({
            total_amount: Number(total.toFixed(2)),
            customer_email: contact.email.trim(),
            customer_name: `${addr.firstName} ${addr.lastName}`.trim(),
            customer_phone: contact.phone.trim() || null,
            shipping_address: shippingAddressJson,
            shipping_method: shippingOpt.label,
            shipping_amount: Number(shippingOpt.amount.toFixed(2)),
          })
          .eq("id", orderId);

        if (upErr) throw upErr;

        const { error: delErr } = await supabase.from("order_items").delete().eq("order_id", orderId);
        if (delErr) throw delErr;

        const itemsPayload = products
          .map((p) => ({
            order_id: orderId,
            product_id: p.id,
            // ✅ AQUÍ: guardamos el nombre completo en el pedido
            product_name: fullProductName(p),
            unit_price: Number(p.price),
            quantity: qtyOf(p.id),
          }))
          .filter((x) => x.quantity > 0);

        if (itemsPayload.length) {
  console.log("ORDER ITEMS PAYLOAD:", itemsPayload);

  const { data: insertedItems, error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsPayload)
    .select("*");

  console.log("ORDER ITEMS RESULT:", insertedItems);
  console.log("ORDER ITEMS ERROR:", itemsErr);

  if (itemsErr) throw itemsErr;
}
      }

      const shouldSaveProfile =
        (!hasSavedAddress && saveAsDefault) || (hasSavedAddress && addressChoice === "new" && saveNewAsDefault);

      if (shouldSaveProfile) {
        const payload = {
          id: user.id,
          first_name: addr.firstName.trim() || null,
          last_name: addr.lastName.trim() || null,
          phone: contact.phone.trim() || null,
          country: addr.country.trim() || "España",
          company: addr.company?.trim() || null,
          address_line1: addr.line1.trim() || null,
          address_line2: addr.line2?.trim() || null,
          postal_code: addr.postalCode.trim() || null,
          city: addr.city.trim() || null,
          region: addr.region.trim() || null,
          marketing_opt_in: !!contact.marketingOptIn,
          updated_at: new Date().toISOString(),
        };

        const { error: pErr } = await supabase.from("profiles").upsert([payload], { onConflict: "id" });
        if (pErr) throw pErr;
      }

      return true;
    } finally {
      setSavingDraft(false);
    }
  };

  const goToStripePayment = async () => {
    try {
      setCheckoutError(null);
      setCheckingOut(true);

      if (products.length === 0) throw new Error("Tu cesta está vacía.");
      if (!contact.email.trim()) throw new Error("Falta el email.");
      if (!addr.firstName.trim() || !addr.lastName.trim()) throw new Error("Falta nombre/apellidos.");
      if (!addr.line1.trim() || !addr.postalCode.trim() || !addr.city.trim() || !addr.region.trim()) {
        throw new Error("Faltan datos de dirección (calle, CP, ciudad, provincia).");
      }

      if (user && !orderId) throw new Error("Primero completa tus datos (pedido no creado).");

      const {
        data: { session },
        error: sErr,
      } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const token = session?.access_token;

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      };

      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(fnUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cart,
          orderId: user ? orderId : null,
          guestToken: user ? null : guestToken,
          shipping: {
            method: shippingOpt.label,
            amount: shippingOpt.amount,
          },
          customer: {
            email: contact.email.trim(),
            name: `${addr.firstName} ${addr.lastName}`.trim(),
            phone: contact.phone.trim() || null,
          },
          shipping_address: {
            country: addr.country.trim(),
            first_name: addr.firstName.trim(),
            last_name: addr.lastName.trim(),
            company: addr.company?.trim() || null,
            line1: addr.line1.trim(),
            line2: addr.line2?.trim() || null,
            postal_code: addr.postalCode.trim(),
            city: addr.city.trim(),
            region: addr.region.trim(),
          },
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Error creando sesión de checkout");

      const data = JSON.parse(text);
      if (!data?.url) throw new Error("Stripe no devolvió URL de checkout");

      window.location.href = data.url;
    } catch (e: any) {
      console.error(e);
      setCheckoutError(e?.message ?? "Error al iniciar el checkout");
      setCheckingOut(false);
    }
  };

  const StepBar = () => {
    const steps: { key: CheckoutStep; label: string }[] = [
      { key: "info", label: "Información" },
      { key: "cart", label: "Carrito" },
      { key: "shipping", label: "Envío" },
      { key: "review", label: "Pago" },
    ];

    const idx = steps.findIndex((s) => s.key === step);

    return (
      <div className="text-sm text-gray-500 mb-4 flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <span key={s.key} className={i === idx ? "text-gray-900 font-semibold" : ""}>
            {s.label}
            {i < steps.length - 1 ? " > " : ""}
          </span>
        ))}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <section className="w-full bg-white dark:bg-[#0A2025] py-9 px-8">
        <h1 className="text-center text-[#191919] dark:text-white text-[32px] font-semibold leading-[38px]">
          My Shopping Cart
        </h1>
        <p className="text-center mt-10 text-gray-600 dark:text-gray-200">Cargando cesta…</p>
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="w-full bg-white dark:bg-[#0A2025] py-9 px-8">
        <h1 className="text-center text-[#191919] dark:text-white text-[32px] font-semibold leading-[38px]">
          My Shopping Cart
        </h1>
        <p className="text-center mt-10 text-gray-600 dark:text-gray-200">Tu cesta está vacía.</p>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate("/shopping")}
            className="px-8 cursor-pointer py-3.5 bg-[#f2f2f2] rounded-[43px] text-[#4c4c4c] text-sm font-semibold leading-[16px]"
          >
            Return to shop
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white dark:bg-[#0A2025] py-9 px-8">
      <h1 className="text-center text-[#191919] dark:text-white text-[32px] font-semibold leading-[38px]">
        My Shopping Cart
      </h1>

      <div className="max-w-6xl mx-auto mt-6">
        <StepBar />
      </div>

      <div className="flex items-start mt-4 gap-6 flex-col lg:flex-row max-w-6xl mx-auto">
        {/* LEFT */}
        <div className="w-full lg:w-[800px]">
          {step === "cart" ? (
            <>
              {/* TABLA CARRITO */}
              <div className="bg-white p-4 w-full rounded-xl border">
                <table className="w-full bg-white rounded-xl">
                  <thead>
                    <tr className="text-center border-b border-gray-200 w-full text-[#7f7f7f] text-sm font-medium uppercase leading-[14px] tracking-wide">
                      <th className="text-left px-2 py-2">Product</th>
                      <th className="px-2 py-2">price</th>
                      <th className="px-2 py-2">Quantity</th>
                      <th className="px-2 py-2">Subtotal</th>
                      <th className="w-7 px-2 py-2"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((p) => {
                      const qty = qtyOf(p.id);
                      const rowSubtotal = p.price * qty;

                      const rate = Number(p.vat_rate ?? 0);
                      const rowVat = rate > 0 ? vatFromGross(rowSubtotal, rate) : 0;

                      const max = p.stock != null ? Number(p.stock) : undefined;
                      const draft = qtyDraft[p.id] ?? String(qty);

                      const nameFull = fullProductName(p);

                      return (
                        <tr key={p.id} className="text-center">
                          <td className="px-2 py-4 text-left align-top">
                            <button
                              type="button"
                              onClick={() => openProduct(p)}
                              className="text-left"
                              aria-label={`Ver ${nameFull}`}
                            >
                              <img
                                src={p.img ?? "https://via.placeholder.com/100"}
                                alt={nameFull}
                                className="w-[100px] mr-2 inline-block h-[100px] object-cover rounded"
                              />

                              {/* ✅ AQUÍ: nombre completo */}
                              <span className="align-top inline-block mt-2">{nameFull}</span>
                            </button>

                            <div className="text-xs text-gray-500 mt-1">{p.brand}</div>

                            <div className="text-xs text-gray-500 mt-1">
                              IVA ({rate || 0}%): <span className="font-medium">{formatEUR(rowVat)}</span>
                            </div>
                          </td>

                          <td className="px-2 py-2">{formatEUR(p.price)}</td>

                          <td className="px-2 py-2">
                            <div className="inline-flex flex-col items-center">
                              <div className="p-2 bg-white rounded-[170px] border border-[#a0a0a0] justify-around items-center inline-flex w-[160px] gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMinus(p)}
                                  className="cursor-pointer"
                                  disabled={cartLoading || qty <= 1}
                                  aria-label="Decrease quantity"
                                >
                                  <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      d="M2.33398 7.5H11.6673"
                                      stroke="#666666"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>

                                {/* ✅ input editable por teclado */}
                                <input
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={draft}
                                  onFocus={() => editingRef.current.add(p.id)}
                                  onChange={(e) => {
                                    editingRef.current.add(p.id);
                                    const v = e.target.value.replace(/[^\d]/g, "");
                                    setQtyDraft((prev) => ({ ...prev, [p.id]: v }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                  }}
                                  onBlur={() => commitQty(p)}
                                  disabled={cartLoading}
                                  className="w-12 text-center text-[#191919] text-base font-normal leading-normal outline-none bg-transparent"
                                  aria-label="Quantity"
                                />

                                <button
                                  type="button"
                                  onClick={() => handlePlus(p)}
                                  className="cursor-pointer"
                                  disabled={cartLoading || (max != null && qty >= max)}
                                  aria-label="Increase quantity"
                                >
                                  <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      d="M2.33398 7.49998H11.6673M7.00065 2.83331V12.1666V2.83331Z"
                                      stroke="#1A1A1A"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>

                              {/* ✅ mensajito cuando ya no hay más stock */}
                              {!!stockMsgById[p.id] && <div className="mt-2 text-xs text-red-600">{stockMsgById[p.id]}</div>}
                            </div>
                          </td>

                          <td className="px-2 py-2">{formatEUR(rowSubtotal)}</td>

                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeFromCart(p.id)}
                              disabled={cartLoading}
                              className="cursor-pointer"
                              aria-label="Remove product"
                            >
                              <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M12 23.5C18.0748 23.5 23 18.5748 23 12.5C23 6.42525 18.0748 1.5 12 1.5C5.92525 1.5 1 6.42525 1 12.5C1 18.5748 5.92525 23.5 12 23.5Z"
                                  stroke="#CCCCCC"
                                  strokeMiterlimit="10"
                                />
                                <path
                                  d="M16 8.5L8 16.5"
                                  stroke="#666666"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M16 16.5L8 8.5"
                                  stroke="#666666"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td className="px-2 py-4" colSpan={3}>
                        <button
                          onClick={() => navigate("/shopping")}
                          className="px-8 cursor-pointer py-3.5 bg-[#f2f2f2] rounded-[43px] text-[#4c4c4c] text-sm font-semibold leading-[16px]"
                        >
                          Return to shop
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* ✅ INFO */}
              {step === "info" && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-gray-900">Información</h3>
                  <p className="text-sm text-gray-500 mt-1">Contacto y dirección de envío (se guardará en tu pedido).</p>

                  {/* ✅ bloque de decisión (solo si hay user) */}
                  <div className="mt-4">
                    {user && hasSavedAddress && savedAddr ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-gray-900">Hemos encontrado una dirección guardada</div>
                        <div className="text-sm text-gray-700 mt-1">{buildAddressText(savedAddr)}</div>

                        <div className="mt-3 flex flex-col md:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddressChoice("saved");
                              setSaveNewAsDefault(false);
                              setAddr((p) => ({ ...p, ...(savedAddr as ShippingAddress) }));
                            }}
                            className={`px-4 py-2 rounded-md border ${
                              addressChoice === "saved"
                                ? "border-black bg-black text-white"
                                : "border-gray-300 bg-white text-gray-800"
                            }`}
                          >
                            Usar dirección guardada
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAddressChoice("new");
                              setSaveNewAsDefault(true);
                              setAddr({
                                ...EMPTY_ADDRESS,
                                country: savedAddr?.country || "España",
                              });
                            }}
                            className={`px-4 py-2 rounded-md border ${
                              addressChoice === "new"
                                ? "border-black bg-black text-white"
                                : "border-gray-300 bg-white text-gray-800"
                            }`}
                          >
                            Usar una dirección nueva
                          </button>
                        </div>

                        {addressChoice === "new" ? (
                          <>
                            <div className="mt-2 text-xs text-gray-500">
                              Si marcas la casilla, esta dirección se guardará como predeterminada para la próxima compra.
                            </div>

                            <label className="mt-3 flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={saveNewAsDefault}
                                onChange={(e) => setSaveNewAsDefault(e.target.checked)}
                              />
                              <span className="text-gray-700">Guardar esta dirección como predeterminada</span>
                            </label>
                          </>
                        ) : (
                          <div className="mt-2 text-xs text-gray-500">Usaremos la dirección guardada. No se actualizará tu perfil.</div>
                        )}
                      </div>
                    ) : user ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-gray-900">Primera compra: ¿guardar dirección?</div>
                        <div className="text-sm text-gray-700 mt-1">
                          Puedes guardar esta dirección para que se rellene automáticamente la próxima vez.
                        </div>

                        <label className="mt-3 flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} />
                          <span className="text-gray-700">Guardar como dirección predeterminada</span>
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm">
                      <span className="text-gray-700">Email</span>
                      <input
                        value={contact.email}
                        onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))}
                        type="email"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="tu@email.com"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-gray-700">Teléfono</span>
                      <input
                        value={contact.phone}
                        onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="600 000 000"
                      />
                    </label>

                    {!user && (
                      <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} />
                          <span className="text-gray-700">Quiero crear una cuenta para guardar mis datos</span>
                        </label>

                        {createAccount && (
                          <label className="block text-sm mt-3">
                            <span className="text-gray-700">Contraseña</span>
                            <input
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              type="password"
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                              placeholder="Mín. 8 caracteres"
                            />
                          </label>
                        )}
                      </div>
                    )}

                    <label className="text-sm">
                      <span className="text-gray-700">País / Región</span>
                      <select
                        value={addr.country}
                        onChange={(e) => setAddr((p) => ({ ...p, country: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option>España</option>
                      </select>
                    </label>

                    <div className="hidden md:block" />

                    <label className="text-sm">
                      <span className="text-gray-700">Nombre</span>
                      <input
                        value={addr.firstName}
                        onChange={(e) => setAddr((p) => ({ ...p, firstName: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Nombre"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-gray-700">Apellidos</span>
                      <input
                        value={addr.lastName}
                        onChange={(e) => setAddr((p) => ({ ...p, lastName: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Apellidos"
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="text-gray-700">Empresa (opcional)</span>
                      <input
                        value={addr.company ?? ""}
                        onChange={(e) => setAddr((p) => ({ ...p, company: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Empresa"
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="text-gray-700">Dirección</span>
                      <input
                        ref={addressInputRef}
                        value={addr.line1}
                        onChange={(e) => setAddr((p) => ({ ...p, line1: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Calle y número"
                        autoComplete="off"
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="text-gray-700">Casa, apartamento, etc. (opcional)</span>
                      <input
                        value={addr.line2 ?? ""}
                        onChange={(e) => setAddr((p) => ({ ...p, line2: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Piso, puerta, escalera..."
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-gray-700">Código postal</span>
                      <input
                        value={addr.postalCode}
                        onChange={(e) => setAddr((p) => ({ ...p, postalCode: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="00000"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-gray-700">Ciudad</span>
                      <input
                        value={addr.city}
                        onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Ciudad"
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="text-gray-700">Provincia / Estado</span>
                      <input
                        value={addr.region}
                        onChange={(e) => setAddr((p) => ({ ...p, region: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Huesca, Madrid..."
                      />
                    </label>

                    <label className="text-sm md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={contact.marketingOptIn}
                        onChange={(e) => setContact((p) => ({ ...p, marketingOptIn: e.target.checked }))}
                      />
                      <span className="text-gray-600">Enviarme novedades y ofertas por email</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ✅ SHIPPING */}
              {step === "shipping" && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-gray-900">Métodos de envío</h3>
                  <p className="text-sm text-gray-500 mt-1">Elige un método (se guardará en el pedido).</p>

                  <div className="mt-4 space-y-3">
                    {SHIPPING_OPTIONS.map((opt) => {
                      const selected = opt.id === shippingOpt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setShippingOpt(opt)}
                          className={`w-full text-left rounded-lg border p-4 flex items-center justify-between hover:bg-gray-50 ${
                            selected ? "border-black" : "border-gray-200"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-gray-900">{opt.label}</div>
                            <div className="text-sm text-gray-500">{opt.eta}</div>
                          </div>
                          <div className="font-semibold">{formatEUR(opt.amount)}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ✅ REVIEW/PAY */}
              {step === "review" && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-lg font-semibold text-gray-900">Pago</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Al continuar serás redirigido a Stripe para pagar con tarjeta/Apple Pay/Google Pay.
                  </p>

                  <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">Resumen</div>
                    <div className="mt-2">Contacto: {contact.email || "—"}</div>
                    <div className="mt-1">Enviar a: {buildAddressText(addr) || "—"}</div>
                    <div className="mt-1">
                      Envío: {shippingOpt.label} ({formatEUR(shippingOpt.amount)})
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    Nota: El botón de la derecha “Seguir con el pago” es el que te redirige a Stripe.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: TOTALS + CUPON */}
        <div className="w-full lg:w-[424px] bg-white rounded-lg p-6 border">
          <h2 className="text-[#191919] mb-2 text-xl font-medium leading-[30px]">Resumen</h2>

          <div className="w-full py-3 justify-between items-center flex">
            <span className="text-[#4c4c4c] text-base font-normal leading-normal">Total:</span>
            <span className="text-[#191919] text-base font-semibold leading-tight">{formatEUR(total)}</span>
          </div>

          <div className="w-full py-3 shadow-[0px_1px_0px_0px_rgba(229,229,229,1.00)] justify-between items-center flex">
            <span className="text-[#4c4c4c] text-sm font-normal leading-[21px]">Envío:</span>
            <span className="text-[#191919] text-sm font-medium leading-[21px]">{formatEUR(shipping)}</span>
          </div>

          <div className="w-full py-3 shadow-[0px_1px_0px_0px_rgba(229,229,229,1.00)] justify-between items-center flex">
            <span className="text-[#4c4c4c] text-sm font-normal leading-[21px]">Subtotal:</span>
            <span className="text-[#191919] text-sm font-medium leading-[21px]">{formatEUR(subtotal)}</span>
          </div>

          <div className="w-full py-3 shadow-[0px_1px_0px_0px_rgba(229,229,229,1.00)] justify-between items-center flex">
            <span className="text-[#4c4c4c] text-sm font-normal leading-[21px]">Base imponible:</span>
            <span className="text-[#191919] text-sm font-medium leading-[21px]">{formatEUR(totalBase)}</span>
          </div>

          <div className="w-full py-3 shadow-[0px_1px_0px_0px_rgba(229,229,229,1.00)] justify-between items-center flex">
            <span className="text-[#4c4c4c] text-sm font-normal leading-[21px]">IVA incluido:</span>
            <span className="text-[#191919] text-sm font-medium leading-[21px]">{formatEUR(totalVat)}</span>
          </div>

          {checkoutError && <p className="mt-3 text-sm text-red-600">{checkoutError}</p>}

          <button
            className="w-full text-white mt-5 px-10 py-4 bg-[#00b206] rounded-[44px] gap-4 text-base font-semibold leading-tight disabled:opacity-50"
            disabled={cartLoading || savingDraft || checkingOut}
            onClick={async () => {
              try {
                setCheckoutError(null);

                if (step === "cart") {
                  setStep("info");
                  return;
                }

                if (step === "info") {
                  if (!user && createAccount) {
                    if ((password ?? "").trim().length < 8) {
                      throw new Error("La contraseña debe tener al menos 8 caracteres.");
                    }

                    const { error: signErr } = await supabase.auth.signUp({
                      email: contact.email.trim(),
                      password: password.trim(),
                    });

                    if (signErr) throw signErr;
                  }

                  await saveDraftOrder();
                  setStep("shipping");
                  return;
                }

                if (step === "shipping") {
                  await saveDraftOrder();
                  setStep("review");
                  return;
                }

                await saveDraftOrder();
                await goToStripePayment();
              } catch (e: any) {
                setCheckoutError(e?.message ?? "Error");
              }
            }}
          >
            {step === "cart"
              ? "Comprar ya"
              : step === "review"
              ? checkingOut
                ? "Redirigiendo..."
                : "Seguir con el pago"
              : savingDraft
              ? "Guardando..."
              : "Seguir con el pago"}
          </button>

          {step !== "cart" && (
            <button
              type="button"
              onClick={() => setStep("cart")}
              className="w-full mt-3 px-10 py-3 rounded-[44px] border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Volver al carrito
            </button>
          )}

          {step !== "cart" && user && (
            <p className="mt-3 text-xs text-gray-500">
              Pedido draft: <span className="font-mono">{orderId ?? "—"}</span>
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-[#191919] text-lg font-medium leading-[24px] mb-3">Código de descuento</h3>

            <div className="w-full border border-[#e6e6e6] rounded-[46px] overflow-hidden flex">
              <input
                placeholder="Enter code"
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="w-full px-6 py-3.5 outline-none bg-white text-[#999999] text-base font-normal leading-normal"
              />
              <button
                onClick={() => alert(`Cupón "${coupon}" (pendiente de implementar)`)}
                className="px-10 py-4 bg-[#333333] text-white text-base font-semibold leading-tight whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            *El “IVA incluido” se calcula por producto según su tipo de IVA guardado.
          </p>
        </div>
      </div>
    </section>
  );
}