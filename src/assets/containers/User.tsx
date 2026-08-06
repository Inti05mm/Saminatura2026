import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

type Toast = { type: "success" | "error"; msg: string } | null;

function saveToastForNextPage(toast: Exclude<Toast, null>) {
  try {
    sessionStorage.setItem("toast", JSON.stringify(toast));
  } catch {}
}

const User: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [toast, setToast] = useState<Toast>(null);

  // ✅ NUEVO: login email en estado (para "Forgot password")
  const [loginEmail, setLoginEmail] = useState("");

  // ✅ Password rules signup
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [pwTouched, setPwTouched] = useState(false);

  const passwordRules = useMemo(() => {
    const p = signupPassword;
    return {
      min8: p.length >= 8,
      hasUpper: /[A-Z]/.test(p),
      hasNumber: /\d/.test(p),
      hasSpecial: /[^A-Za-z0-9]/.test(p),
    };
  }, [signupPassword]);

  const allPasswordOk =
    passwordRules.min8 && passwordRules.hasUpper && passwordRules.hasNumber && passwordRules.hasSpecial;

  const passwordsMatch = signupPassword.length > 0 && signupPassword === signupConfirm;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (isLogin) {
      setSignupPassword("");
      setSignupConfirm("");
      setPwTouched(false);
    }
  }, [isLogin]);

  const ToastView = toast ? (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={[
          "rounded-xl px-4 py-3 shadow-lg border text-sm max-w-sm",
          toast.type === "success" ? "bg-[#f2f7ee] border-[#cbdabd] text-[#2f431f]" : "",
          toast.type === "error" ? "bg-red-50 border-red-200 text-red-900" : "",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div className="font-semibold">{toast.type === "success" ? "Listo" : "Error"}</div>
          <div className="flex-1">{toast.msg}</div>
          <button
            onClick={() => setToast(null)}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Cerrar"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ✅ Forgot password (manda email)
  const handleForgotPassword = async () => {
    const email = loginEmail.trim();

    if (!email) {
      setToast({ type: "error", msg: "Escribe tu correo electrónico y después pulsa «¿Has olvidado tu contraseña?»." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setToast({ type: "error", msg: "Error: " + error.message });
      return;
    }

    setToast({ type: "success", msg: "Te hemos enviado un correo con el enlace para restablecer la contraseña." });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    const email = (form.elements.namedItem("loginEmail") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("loginPassword") as HTMLInputElement).value;

    setLoading(true);

    const attempt = async () => {
      return await supabase.auth.signInWithPassword({ email, password });
    };

    let { error } = await attempt();

    if (error) {
      await supabase.auth.signOut().catch(() => {});
      clearSupabaseStorage();
      ({ error } = await attempt());
    }

    setLoading(false);

    if (error) {
      setToast({ type: "error", msg: "Error: " + error.message });
      return;
    }

    saveToastForNextPage({ type: "success", msg: "Inicio de sesión correcto. Te damos la bienvenida de nuevo." });
    navigate("/");
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    const firstName = (form.elements.namedItem("signupFirstName") as HTMLInputElement).value.trim();
    const lastName = (form.elements.namedItem("signupLastName") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("signupEmail") as HTMLInputElement).value.trim();

    const password = signupPassword;
    const confirmPassword = signupConfirm;

    setPwTouched(true);

    if (!allPasswordOk) {
      setToast({ type: "error", msg: "La contraseña no cumple los requisitos." });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ type: "error", msg: "Las contraseñas no coinciden." });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });

    setLoading(false);

    if (error) {
      setToast({ type: "error", msg: "Error: " + error.message });
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: pErr } = await supabase.from("profiles").upsert(
        [
          {
            id: userId,
            first_name: firstName || null,
            last_name: lastName || null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      );

      if (pErr) console.warn("No se pudo crear/actualizar profiles:", pErr.message);
    }

    if (!data.session) {
      setToast({ type: "success", msg: "Registro completado. Revisa tu correo para confirmar la cuenta." });
      setIsLogin(true);
      return;
    }

    saveToastForNextPage({ type: "success", msg: "Registro completado. Te damos la bienvenida a Saminatura." });
    navigate("/");
  };

  const Rule = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={["flex items-center gap-2", ok ? "text-green-700" : "text-red-600"].join(" ")}>
      <span className="inline-flex w-5 justify-center">{ok ? "✓" : "•"}</span>
      <span>{children}</span>
    </li>
  );

  const showPasswordRules = !isLogin && (pwTouched || signupPassword.length > 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f1e8] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {ToastView}

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#dce5d3]/80 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#cbd8bd]/70 blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#d5ddca] bg-white/90 shadow-[0_28px_80px_rgba(52,71,39,0.16)] backdrop-blur-sm lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden overflow-hidden bg-[#425530] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-[#8fa17d]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-14 h-72 w-72 rounded-full bg-[#b6c6a6]/20 blur-3xl" />

            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#d7e1ce]">
                Saminatura
              </p>
              <h1 className="mt-6 max-w-sm text-4xl font-semibold leading-tight text-white">
                Tu espacio de bienestar natural
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/75">
                Accede a tu cuenta para guardar favoritos, consultar tus pedidos y disfrutar de una experiencia más personalizada.
              </p>
            </div>

            <div className="relative z-10 mt-12 space-y-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">Compra de forma sencilla</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Guarda tus productos favoritos y recupera tu cesta cuando vuelvas.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">Bienestar a tu medida</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Encuentra productos naturales, ecológicos y seleccionados con cuidado.
                </p>
              </div>
            </div>
          </aside>

          <div className="p-6 sm:p-9 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#788767]">
                  Área personal
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-[#26341f] sm:text-4xl">
                  {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#737d6c]">
                  {isLogin
                    ? "Inicia sesión para continuar en Saminatura."
                    : "Regístrate para guardar tus favoritos y gestionar tus pedidos."}
                </p>
              </div>

              <div className="mb-8 grid grid-cols-2 rounded-2xl border border-[#dce2d4] bg-[#f3f5ef] p-1.5">
                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    isLogin
                      ? "bg-[#425530] text-white shadow-sm"
                      : "text-[#66715d] hover:bg-white"
                  }`}
                  onClick={() => setIsLogin(true)}
                  type="button"
                >
                  Iniciar sesión
                </button>

                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    !isLogin
                      ? "bg-[#425530] text-white shadow-sm"
                      : "text-[#66715d] hover:bg-white"
                  }`}
                  onClick={() => setIsLogin(false)}
                  type="button"
                >
                  Crear cuenta
                </button>
              </div>

              {isLogin ? (
                <form className="space-y-5" onSubmit={handleLoginSubmit}>
                  <div>
                    <label htmlFor="loginEmail" className="block text-sm font-semibold text-[#34412d]">
                      Correo electrónico
                    </label>
                    <input
                      id="loginEmail"
                      type="email"
                      name="loginEmail"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition placeholder:text-[#a2aa9b] focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="loginPassword" className="block text-sm font-semibold text-[#34412d]">
                      Contraseña
                    </label>
                    <input
                      id="loginPassword"
                      type="password"
                      name="loginPassword"
                      required
                      placeholder="Introduce tu contraseña"
                      autoComplete="current-password"
                      className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition placeholder:text-[#a2aa9b] focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-sm text-[#66715d]">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#cbd3c2] text-[#425530] focus:ring-[#718360]"
                      />
                      Recordarme
                    </label>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-left text-sm font-semibold text-[#526742] transition hover:text-[#2f431f] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                    >
                      ¿Has olvidado tu contraseña?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-xl bg-[#425530] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(66,85,48,0.22)] transition hover:-translate-y-0.5 hover:bg-[#344526] focus:outline-none focus:ring-4 focus:ring-[#718360]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Iniciando sesión…" : "Iniciar sesión"}
                  </button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleSignupSubmit}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="signupFirstName" className="block text-sm font-semibold text-[#34412d]">
                        Nombre
                      </label>
                      <input
                        id="signupFirstName"
                        type="text"
                        name="signupFirstName"
                        required
                        autoComplete="given-name"
                        className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                      />
                    </div>

                    <div>
                      <label htmlFor="signupLastName" className="block text-sm font-semibold text-[#34412d]">
                        Apellidos
                      </label>
                      <input
                        id="signupLastName"
                        type="text"
                        name="signupLastName"
                        required
                        autoComplete="family-name"
                        className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signupEmail" className="block text-sm font-semibold text-[#34412d]">
                      Correo electrónico
                    </label>
                    <input
                      id="signupEmail"
                      type="email"
                      name="signupEmail"
                      required
                      placeholder="tu@email.com"
                      autoComplete="email"
                      className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition placeholder:text-[#a2aa9b] focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="signupPassword" className="block text-sm font-semibold text-[#34412d]">
                      Contraseña
                    </label>
                    <input
                      id="signupPassword"
                      type="password"
                      name="signupPassword"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      onBlur={() => setPwTouched(true)}
                      autoComplete="new-password"
                      className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                    />

                    {showPasswordRules && (
                      <div className="mt-3 rounded-xl border border-[#dce3d5] bg-[#f6f8f3] p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#66715d]">
                          La contraseña debe incluir
                        </p>
                        <ul className="space-y-1.5 text-sm">
                          <Rule ok={passwordRules.min8}>Al menos 8 caracteres</Rule>
                          <Rule ok={passwordRules.hasUpper}>Al menos una letra mayúscula</Rule>
                          <Rule ok={passwordRules.hasNumber}>Al menos un número</Rule>
                          <Rule ok={passwordRules.hasSpecial}>Al menos un carácter especial</Rule>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#34412d]">
                      Confirmar contraseña
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      required
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="mt-2 block w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10"
                    />

                    {(signupConfirm.length > 0 || pwTouched) && (
                      <p className={["mt-2 text-sm", passwordsMatch ? "text-[#4d6b3d]" : "text-red-600"].join(" ")}>
                        {passwordsMatch
                          ? "✓ Las contraseñas coinciden"
                          : "Las contraseñas no coinciden"}
                      </p>
                    )}
                  </div>

                  <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#66715d]">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 rounded border-[#cbd3c2] text-[#425530] focus:ring-[#718360]"
                    />
                    <span>
                      Acepto los{" "}
                      <a href="#" className="font-semibold text-[#526742] hover:text-[#2f431f] hover:underline">
                        términos y condiciones
                      </a>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-xl bg-[#425530] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(66,85,48,0.22)] transition hover:-translate-y-0.5 hover:bg-[#344526] focus:outline-none focus:ring-4 focus:ring-[#718360]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creando cuenta…" : "Crear cuenta"}
                  </button>

                  {!loading && showPasswordRules && !allPasswordOk && (
                    <p className="text-center text-xs text-[#7b8475]">
                      Completa todos los requisitos de la contraseña para poder registrarte.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default User;