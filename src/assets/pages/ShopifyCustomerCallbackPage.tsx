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

import {
  useShopifyCustomer,
} from "../containers/ShopifyCustomerContext";

export default function ShopifyCustomerCallbackPage() {
  const navigate =
    useNavigate();

  const {
    reloadCustomerSession,
  } =
    useShopifyCustomer();

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let mounted = true;

    async function completeLogin() {
      try {
        /*
          1. Shopify devuelve el code.
          2. Lo intercambiamos por access_token.
          3. shopifyCustomerAuth lo guarda en localStorage.
        */
        await handleShopifyCustomerCallback();

        if (!mounted) {
          return;
        }

        /*
          MUY IMPORTANTE:
          actualizamos inmediatamente el contexto React.

          Sin esto, loggedIn seguiría en false hasta
          recargar la página.
        */
reloadCustomerSession();

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

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Error iniciando sesión con Shopify."
        );
      }
    }

    void completeLogin();

    return () => {
      mounted = false;
    };
  }, [
    navigate,
    reloadCustomerSession,
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] px-4">
      {error ? (
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="font-semibold text-red-700">
            No se pudo iniciar sesión
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
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
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#425530]/20 border-t-[#425530]" />

          <p className="mt-4 text-[#66715d]">
            Completando inicio de sesión…
          </p>
        </div>
      )}
    </main>
  );
}