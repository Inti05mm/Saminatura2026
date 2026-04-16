import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../containers/CartContext";
import { supabase } from "../supabaseClient";

type Toast = { type: "success" | "warning"; msg: string } | null;

type OrderMini = {
  id: string;
  customer_name: string | null;
  invoice_email_sent_at: string | null;
  invoice_email_error: string | null;
};

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [toast, setToast] = useState<Toast>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  const guestToken = useMemo(() => {

    return localStorage.getItem("guest_token_v1");
  }, []);

  // ✅ vaciar carrito
  useEffect(() => {
    (async () => {
      try {
        await clearCart();
      } catch (e) {
        console.error("clearCart failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ buscar último pedido pagado (usuario o invitado) y comprobar email enviado
  useEffect(() => {
    let alive = true;

    const loadLastPaidOrderAndEmailStatus = async () => {
      // 1) usuario logueado?
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      // 2) query base
      let q = supabase
        .from("orders")
        .select("id,customer_name,invoice_email_sent_at,invoice_email_error")
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1);

      if (userId) {
        q = q.eq("user_id", userId);
      } else if (guestToken) {
        // ✅ invitado
        q = q.eq("guest_token", guestToken);
      } else {
        // no podemos asociar pedido
        if (!alive) return;
        setToast({
          type: "warning",
          msg: "Compra OK. En breve recibirás un correo con los detalles del pedido.",
        });
        return;
      }

      // 3) buscar pedido
      const { data: rows, error } = await q;
      if (!alive) return;

      if (error) {
        console.error("Load last paid order error:", error);
        setToast({
          type: "warning",
          msg: "Compra OK. No pudimos confirmar el envío del correo todavía.",
        });
        return;
      }

      const order = (rows?.[0] ?? null) as OrderMini | null;
      if (!order) {
        setToast({
          type: "warning",
          msg: "Compra OK. Estamos procesando tu pedido. Revisa tu correo en unos minutos.",
        });
        return;
      }

      setCustomerName(order.customer_name ?? null);

      // 4) comprobar envío email con reintentos (por si el webhook aún está terminando)
      for (let i = 0; i < 8; i++) {
        const { data, error: e2 } = await supabase
          .from("orders")
          .select("invoice_email_sent_at,invoice_email_error")
          .eq("id", order.id)
          .maybeSingle();

        if (!alive) return;

        if (e2) {
          console.error("check email status error:", e2);
          setToast({
            type: "warning",
            msg: "Compra OK. No pudimos confirmar el envío del correo todavía.",
          });
          return;
        }

        const sentAt = data?.invoice_email_sent_at;
        const errMsg = data?.invoice_email_error;

        if (sentAt) {
          setToast({
            type: "success",
            msg: "Te hemos enviado un correo con los detalles de tu pedido.",
          });
          return;
        }
        if (errMsg) {
          setToast({
            type: "warning",
            msg: "Compra OK. Hubo un problema enviando el correo. Lo revisaremos.",
          });
          return;
        }

        await new Promise((r) => setTimeout(r, 800));
      }

      setToast({
        type: "success",
        msg: "Compra OK. En breve recibirás un correo con los detalles de tu pedido.",
      });
    };

    loadLastPaidOrderAndEmailStatus();

    return () => {
      alive = false;
    };
  }, [guestToken]);

  // auto-hide del toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section className="min-h-screen flex items-center justify-center bg-white px-6">
      {/* ✅ TOAST TOP RIGHT */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={[
              "rounded-xl px-4 py-3 shadow-lg border text-sm max-w-sm",
              toast.type === "success" ? "bg-green-50 border-green-200 text-green-900" : "",
              toast.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-900" : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="font-semibold">{toast.type === "success" ? "Listo" : "Aviso"}</div>
              <div className="flex-1">{toast.msg}</div>
              <button
                onClick={() => setToast(null)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg">
        {/* ICONO */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* TEXTO */}
        <h1 className="text-2xl font-semibold text-gray-900">¡Compra realizada con éxito!</h1>

        <p className="mt-3 text-gray-600 text-sm">
          {customerName ? (
            <>
              Gracias, <span className="font-semibold">{customerName}</span>, por tu compra. Hemos recibido tu pedido correctamente.
            </>
          ) : (
            <>Gracias por tu compra. Hemos recibido tu pedido correctamente.</>
          )}
        </p>

        <p className="mt-2 text-gray-500 text-sm">
          En breve recibirás un correo con los detalles de tu pedido.
        </p>

        {/* BOTONES */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => navigate("/shopping", { replace: true })}
            className="w-full py-3 rounded-full bg-[#00b206] text-white font-semibold hover:opacity-90 transition"
          >
            Seguir comprando
          </button>

          <button
            onClick={() => navigate("/", { replace: true })}
            className="w-full py-3 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
          >
            Volver al inicio
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Si tienes cualquier duda, contacta con nuestro soporte.
        </p>
      </div>
    </section>
  );
}
