import {
  FormEvent,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

const API ="/api";

export default function ShopifyAdminLoginPage() {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Introduce email y contraseña."
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          `${API}/admin/auth/login`,
          {
            method: "POST",

            /*
             * MUY IMPORTANTE:
             * permite que el navegador
             * guarde la cookie HttpOnly
             * creada por FastAPI.
             */
            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              email:
                email
                  .trim()
                  .toLowerCase(),

              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ??
            "No se pudo iniciar sesión."
        );
      }

      if (
        data?.ok !== true
      ) {
        throw new Error(
          "La API no confirmó el acceso."
        );
      }

      /*
       * Login correcto.
       */
      navigate(
        "/admin/shopify",
        {
          replace: true,
        }
      );
    } catch (
      error: any
    ) {
      console.error(
        "Admin login error:",
        error
      );

      setError(
        error?.message ??
          "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] px-4">
      <div className="w-full max-w-md">
        {/* LOGO / CABECERA */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#75815d]">
            Saminatura
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-[#243219]">
            Administración
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Acceso exclusivo al panel
            administrativo.
          </p>
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={
            handleSubmit
          }
          className="
            rounded-[28px]
            border
            border-[#dde3d3]
            bg-white
            p-7
            shadow-[0_18px_50px_rgba(54,72,39,0.10)]
          "
        >
          {/* EMAIL */}
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-800">
              Correo electrónico
            </span>

            <input
              type="email"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
              autoComplete="username"
              placeholder="correo de cuenta admin"
              required
              disabled={loading}
              className="
                w-full
                rounded-xl
                border
                border-gray-300
                bg-white
                px-4
                py-3
                text-sm
                outline-none
                transition
                focus:border-[#75815d]
                focus:ring-2
                focus:ring-[#75815d]/15
                disabled:opacity-60
              "
            />
          </label>

          {/* PASSWORD */}
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-gray-800">
              Contraseña
            </span>

            <input
              type="password"
              value={password}
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              autoComplete="current-password"
              placeholder="••••••••••••"
              required
              disabled={loading}
              className="
                w-full
                rounded-xl
                border
                border-gray-300
                bg-white
                px-4
                py-3
                text-sm
                outline-none
                transition
                focus:border-[#75815d]
                focus:ring-2
                focus:ring-[#75815d]/15
                disabled:opacity-60
              "
            />
          </label>

          {/* ERROR */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={loading}
            className="
              mt-6
              w-full
              rounded-xl
              bg-[#425530]
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-[#354626]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading
              ? "Comprobando acceso…"
              : "Entrar al panel"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Panel privado de
          Saminatura
        </p>
      </div>
    </main>
  );
}