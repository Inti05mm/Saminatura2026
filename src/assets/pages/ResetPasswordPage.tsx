import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function getHashParams() {
  const h = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(h);
}

export default function ResetPasswordPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // ✅ igual que en el otro container: "touched" para mostrar reglas
  const [pwTouched, setPwTouched] = useState(false);

  const rules = useMemo(
    () => ({
      min8: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasNumber: /\d/.test(pw),
      hasSpecial: /[^A-Za-z0-9]/.test(pw),
    }),
    [pw]
  );

  const allOk = rules.min8 && rules.hasUpper && rules.hasNumber && rules.hasSpecial;
  const passwordsMatch = pw.length > 0 && pw === pw2;

  const showPasswordRules = pwTouched || pw.length > 0;

  useEffect(() => {
    (async () => {
      setMsg(null);

      // 1) Si ya hay sesión, OK
      const { data: s1 } = await supabase.auth.getSession();
      if (s1.session) {
        setReady(true);
        return;
      }

      // 2) Intento formato ?code=...
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMsg("Enlace caducado o inválido. Pide otro correo de recuperación.");
          setReady(false);
          return;
        }
        setReady(true);
        // Limpia la URL
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search);
        return;
      }

      // 3) Intento formato #access_token=...&type=recovery
      const hash = getHashParams();
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const type = hash.get("type");

      if (access_token && refresh_token && type === "recovery") {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setMsg("Enlace caducado o inválido. Pide otro correo de recuperación.");
          setReady(false);
          return;
        }
        setReady(true);
        // Limpia el hash para que no quede el token en la barra
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
        return;
      }

      // 4) Si no hay code ni tokens -> entró a mano
      setMsg("Acceso no válido. Abre esta página desde el enlace del correo de recuperación (caduca).");
      setReady(false);
    })();
  }, []);

  // ✅ Mini componente igual que antes
  const Rule = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={["flex items-center gap-2", ok ? "text-green-700" : "text-red-600"].join(" ")}>
      <span className="inline-flex w-5 justify-center">{ok ? "✓" : "•"}</span>
      <span>{children}</span>
    </li>
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setPwTouched(true);

    if (!ready) return;

    if (!allOk) return setMsg("La contraseña no cumple los requisitos.");
    if (pw !== pw2) return setMsg("Las contraseñas no coinciden.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);

    if (error) return setMsg("Error: " + error.message);

    setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");
    setTimeout(() => navigate("/"), 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4">Restablecer contraseña</h1>

        {msg && <div className="mb-4 text-sm text-gray-700">{msg}</div>}

        {!ready ? (
          <div className="text-sm text-gray-600">
            Vuelve a <b>Login</b> y pulsa <b>Forgot password?</b> para recibir el enlace.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nueva contraseña</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onBlur={() => setPwTouched(true)}
                className="mt-1 w-full border rounded-md px-3 py-2"
                required
              />

              {/* ✅ Condiciones en vivo (igual que en signup) */}
              {showPasswordRules && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Tu contraseña debe tener:</div>
                  <ul className="text-sm space-y-1">
                    <Rule ok={rules.min8}>Al menos 8 caracteres</Rule>
                    <Rule ok={rules.hasUpper}>Al menos 1 mayúscula</Rule>
                    <Rule ok={rules.hasNumber}>Al menos 1 número</Rule>
                    <Rule ok={rules.hasSpecial}>Al menos 1 caracter especial (!@#...)</Rule>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Repite la contraseña</label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2"
                required
              />

              {/* ✅ “coinciden / no coinciden” */}
              {(pw2.length > 0 || pwTouched) && (
                <p className={["mt-2 text-sm", passwordsMatch ? "text-green-700" : "text-red-600"].join(" ")}>
                  {passwordsMatch ? "✓ Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </p>
              )}
            </div>

            <button disabled={loading} className="w-full bg-blue-500 text-white rounded-md py-2 disabled:opacity-50">
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>

            {!loading && showPasswordRules && !allOk && (
              <p className="text-xs text-gray-500">Completa los requisitos para poder cambiar la contraseña.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
