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
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-900" : "",
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
      setToast({ type: "error", msg: "Escribe tu email arriba y luego pulsa 'Forgot password?'." });
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

    saveToastForNextPage({ type: "success", msg: "Login exitoso, bienvenido/a de nuevo." });
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
      setToast({ type: "success", msg: "Registro exitoso. Revisa tu correo para confirmar la cuenta." });
      setIsLogin(true);
      return;
    }

    saveToastForNextPage({ type: "success", msg: "Registro exitoso, bienvenido/a." });
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
    <div className="bg-gray-100 min-h-screen flex items-center justify-center px-4">
      {ToastView}

      <div className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex justify-center mb-8">
          <button
            className={`px-6 py-2 font-medium rounded-l-lg focus:outline-none transition-colors ${
              isLogin ? "bg-blue-500 text-white" : "bg-white border border-blue-500 text-blue-500"
            }`}
            onClick={() => setIsLogin(true)}
            type="button"
          >
            Login
          </button>
          <button
            className={`px-6 py-2 font-medium rounded-r-lg focus:outline-none transition-colors ${
              !isLogin ? "bg-blue-500 text-white" : "bg-white border border-blue-500 text-blue-500"
            }`}
            onClick={() => setIsLogin(false)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {isLogin ? (
          <form className="space-y-6" onSubmit={handleLoginSubmit}>
            <h2 className="text-2xl font-bold text-center text-gray-800">Welcome Back</h2>

            <div>
              <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="loginEmail"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="loginPassword"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="font-medium text-blue-500 hover:text-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleSignupSubmit}>
            <h2 className="text-2xl font-bold text-center text-gray-800">Create Account</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signupFirstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <input
                  type="text"
                  name="signupFirstName"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="signupLastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <input
                  type="text"
                  name="signupLastName"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="signupEmail"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="signupPassword"
                required
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                onBlur={() => setPwTouched(true)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />

              {showPasswordRules && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Tu contraseña debe tener:</div>
                  <ul className="text-sm space-y-1">
                    <Rule ok={passwordRules.min8}>Al menos 8 caracteres</Rule>
                    <Rule ok={passwordRules.hasUpper}>Al menos 1 mayúscula</Rule>
                    <Rule ok={passwordRules.hasNumber}>Al menos 1 número</Rule>
                    <Rule ok={passwordRules.hasSpecial}>Al menos 1 caracter especial (!@#...)</Rule>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />

              {(signupConfirm.length > 0 || pwTouched) && (
                <p className={["mt-2 text-sm", passwordsMatch ? "text-green-700" : "text-red-600"].join(" ")}>
                  {passwordsMatch ? "✓ Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the{" "}
                <a href="#" className="text-blue-500 hover:text-blue-700">
                  Terms and Conditions
                </a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>

              {!loading && showPasswordRules && !allPasswordOk && (
                <p className="mt-2 text-xs text-gray-500">Completa los requisitos para poder registrarte.</p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default User;
