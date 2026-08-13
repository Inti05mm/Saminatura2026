import Header from "../containers/Header";
import Footer from "../containers/Footer";

import {
  useNavigate,
} from "react-router-dom";

import {
  useShopifyCustomer,
} from "../containers/ShopifyCustomerContext";

export default function ShopifyUserPage() {
  const navigate =
    useNavigate();

  const {
    loggedIn,
    loading,
    login,
    logout,
  } =
    useShopifyCustomer();

  return (
    <main className="min-h-screen bg-[#f5f1e8]">
      <Header />

      <section className="flex min-h-[650px] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-[#d5ddca] bg-white p-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#788767]">
            Área personal
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-[#26341f]">
            Mi cuenta
          </h1>

          {loading ? (
            <div className="mt-8">
              <p className="text-sm text-[#737d6c]">
                Comprobando sesión…
              </p>
            </div>
          ) : loggedIn ? (
            <>
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-800">
                  Sesión iniciada
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Ya has iniciado sesión con tu cuenta de Shopify.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/perfil-shopify-test"
                  )
                }
                className="mt-6 w-full rounded-xl bg-[#425530] px-5 py-3.5 font-semibold text-white transition hover:bg-[#344526]"
              >
                Ir a mi perfil
              </button>

              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="mt-3 w-full rounded-xl border border-[#cbd5c0] bg-white px-5 py-3.5 font-semibold text-[#425530] transition hover:bg-[#f5f7f0]"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-[#737d6c]">
                Accede de forma segura mediante tu cuenta de cliente de Shopify.
              </p>

              <button
                type="button"
                onClick={() => {
                  void login();
                }}
                className="mt-8 w-full rounded-xl bg-[#425530] px-5 py-3.5 font-semibold text-white transition hover:bg-[#344526]"
              >
                Iniciar sesión / Crear cuenta
              </button>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}