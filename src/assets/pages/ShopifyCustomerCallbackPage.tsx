import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  handleShopifyCustomerCallback,
} from "../../shopifyCustomerAuth";

export default function ShopifyCustomerCallbackPage() {
  const navigate =
    useNavigate();

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let alive = true;

    async function completeLogin() {
      try {
        await handleShopifyCustomerCallback();

        if (!alive) return;

        navigate(
          "/perfil-shopify-test",
          {
            replace: true,
          }
        );
      } catch (err) {
        console.error(
          "Error callback Shopify:",
          err
        );

        if (!alive) return;

        setError(
          err instanceof Error
            ? err.message
            : "Error iniciando sesión con Shopify."
        );
      }
    }

    void completeLogin();

    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] px-4">
      {error ? (
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="font-semibold text-red-700">
            No se pudo iniciar sesión
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/usuario-shopify-test"
              )
            }
            className="mt-5 rounded-full bg-[#425530] px-5 py-2.5 font-semibold text-white"
          >
            Volver
          </button>
        </div>
      ) : (
        <p className="text-[#66715d]">
          Completando inicio de sesión…
        </p>
      )}
    </main>
  );
}