import Header from "../containers/Header";
import Footer from "../containers/Footer";

import {
  loginWithShopifyCustomer,
} from "../../shopifyCustomerAuth";

export default function ShopifyUserPage() {
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

          <p className="mt-3 text-sm leading-6 text-[#737d6c]">
            Accede de forma segura mediante tu cuenta de cliente de Shopify.
          </p>

          <button
            type="button"
            onClick={() => {
              void loginWithShopifyCustomer();
            }}
            className="mt-8 w-full rounded-xl bg-[#425530] px-5 py-3.5 font-semibold text-white transition hover:bg-[#344526]"
          >
            Iniciar sesión / Crear cuenta
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}