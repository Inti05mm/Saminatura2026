import Header from "../containers/Header";
import Footer from "../containers/Footer";
import { useShopifyCart } from "../containers/ShopifyCartContext";

export default function ShopifyCartPage() {
  const {
    cart,
    loading,
    totalItems,
    setQty,
    removeFromCart,
    clearCart,
    goToCheckout,
  } = useShopifyCart();

  const lines = cart?.lines.nodes ?? [];

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">
              Mi cesta
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {totalItems} producto
              {totalItems === 1 ? "" : "s"}
            </p>
          </div>

          {lines.length > 0 && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                void clearCart();
              }}
              className="
                rounded-full
                border border-gray-300
                px-4 py-2
                text-sm font-semibold
                text-gray-700
                transition
                hover:bg-gray-100
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Vaciar cesta
            </button>
          )}
        </div>

        {loading && !cart && (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-gray-600">
              Cargando cesta...
            </p>
          </div>
        )}

        {!loading && lines.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Tu cesta está vacía
            </h2>

            <p className="mt-2 text-gray-500">
              Añade productos desde la tienda.
            </p>

            <a
              href="/shopping-shopify-test"
              className="
                verde-3
                mt-6 inline-flex
                rounded-full
                px-6 py-3
                font-semibold
                text-black
              "
            >
              Ir a comprar
            </a>
          </div>
        )}

        {lines.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              {lines.map((line) => {
                const variant = line.merchandise;
                const product = variant.product;

                const price = Number(
                  variant.price.amount ?? 0
                );

                const lineTotal =
                  price * line.quantity;

                return (
                  <article
                    key={line.id}
                    className="
                      flex gap-4
                      rounded-2xl
                      bg-white
                      p-4
                      shadow-sm
                    "
                  >
                    <div
                      className="
                        flex h-28 w-28
                        shrink-0
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-xl
                        bg-white
                        border
                      "
                    >
                      <img
                        src={
                          variant.image?.url ??
                          "https://placehold.co/400x400?text=IMG"
                        }
                        alt={
                          variant.image?.altText ??
                          product.title
                        }
                        className="
                          max-h-full
                          max-w-full
                          object-contain
                        "
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs uppercase text-gray-400">
                        {product.vendor}
                      </span>

                      <h2 className="truncate text-lg font-bold text-gray-950">
                        {product.title}
                      </h2>

                      {variant.title &&
                        variant.title !==
                          "Default Title" && (
                          <p className="mt-1 text-sm text-gray-500">
                            {variant.title}
                          </p>
                        )}

                      {variant.sku && (
                        <p className="mt-1 text-xs text-gray-400">
                          SKU: {variant.sku}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-4">
                        <div
                          className="
                            flex items-center
                            rounded-full
                            border border-gray-200
                            bg-gray-50
                          "
                        >
                          <button
                            type="button"
                            disabled={
                              loading ||
                              line.quantity <= 1
                            }
                            onClick={() => {
                              void setQty(
                                line.id,
                                line.quantity - 1
                              );
                            }}
                            className="
                              flex h-9 w-9
                              items-center
                              justify-center
                              rounded-full
                              text-lg
                              font-bold
                              hover:bg-white
                              disabled:opacity-40
                            "
                          >
                            −
                          </button>

                          <span className="min-w-10 text-center font-semibold">
                            {line.quantity}
                          </span>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              void setQty(
                                line.id,
                                line.quantity + 1
                              );
                            }}
                            className="
                              flex h-9 w-9
                              items-center
                              justify-center
                              rounded-full
                              text-lg
                              font-bold
                              hover:bg-white
                              disabled:opacity-40
                            "
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {price.toFixed(2)} €
                            / ud.
                          </p>

                          <p className="font-bold text-gray-950">
                            {lineTotal.toFixed(2)} €
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          void removeFromCart(
                            line.id
                          );
                        }}
                        className="
                          mt-3 w-fit
                          text-sm font-semibold
                          text-red-600
                          hover:underline
                          disabled:opacity-50
                        "
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside
              className="
                h-fit
                rounded-2xl
                bg-white
                p-6
                shadow-sm
                lg:sticky
                lg:top-28
              "
            >
              <h2 className="text-xl font-bold text-gray-950">
                Resumen
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Productos
                  </span>

                  <span className="font-semibold">
                    {totalItems}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {Number(
                      cart?.cost.subtotalAmount
                        .amount ?? 0
                    ).toFixed(2)}{" "}
                    €
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-gray-950">
                      Total
                    </span>

                    <span className="text-xl font-bold text-gray-950">
                      {Number(
                        cart?.cost.totalAmount
                          .amount ?? 0
                      ).toFixed(2)}{" "}
                      €
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  loading ||
                  !cart?.checkoutUrl ||
                  lines.length === 0
                }
                onClick={goToCheckout}
                className="
                  verde-3
                  mt-6 w-full
                  rounded-full
                  px-5 py-3
                  font-bold
                  text-black
                  transition
                  hover:opacity-85
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Finalizar compra
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                El pago se completará en el checkout seguro de Shopify.
              </p>
            </aside>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}