import Header from "../containers/Header";
import Footer from "../containers/Footer";

import {
  useShopifyCart,
} from "../containers/ShopifyCartContext";

import {
  useNavigate,
} from "react-router-dom";

/* ============================================================
   HELPERS
   ============================================================ */

function formatMoney(
  amount:
    | string
    | number
    | null
    | undefined,
  currency = "EUR"
) {
  const value =
    Number(amount ?? 0);

  try {
    return new Intl.NumberFormat(
      "es-ES",
      {
        style: "currency",
        currency,
      }
    ).format(value);
  } catch {
    return `${value.toFixed(
      2
    )} €`;
  }
}

function cleanVariantTitle(
  title:
    | string
    | null
    | undefined
) {
  const value =
    String(
      title ?? ""
    ).trim();

  if (
    !value ||
    value.toLowerCase() ===
      "default title"
  ) {
    return "";
  }

  return value;
}

function fullProductName(
  productTitle: string,
  variantTitle:
    | string
    | null
    | undefined
) {
  const variant =
    cleanVariantTitle(
      variantTitle
    );

  if (!variant) {
    return productTitle;
  }

  return `${productTitle} ${variant}`;
}

/* ============================================================
   COMPONENTE
   ============================================================ */

export default function ShopifyCartPage() {
  const navigate =
    useNavigate();

  const {
    cart,
    loading,
    totalItems,
    setQty,
    removeFromCart,
    clearCart,
    goToCheckout,
  } =
    useShopifyCart();

  const lines =
    cart?.lines.nodes ??
    [];

  /* ============================================================
     LOADING
     ============================================================ */

  if (
    loading &&
    !cart
  ) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="w-full bg-white px-8 py-9">
          <h1 className="text-center text-[32px] font-semibold leading-[38px] text-[#191919]">
            Mi carrito
          </h1>

          <p className="mt-10 text-center text-gray-600">
            Cargando cesta…
          </p>
        </section>

        <Footer />
      </main>
    );
  }

  /* ============================================================
     CESTA VACÍA
     ============================================================ */

  if (
    lines.length ===
    0
  ) {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        <section className="w-full bg-white px-8 py-9">
          <h1 className="text-center text-[32px] font-semibold leading-[38px] text-[#191919]">
            Mi carrito
          </h1>

          <p className="mt-10 text-center text-gray-600">
            Tu cesta está vacía.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/shopping-shopify-test"
                )
              }
              className="cursor-pointer rounded-[43px] bg-[#f2f2f2] px-8 py-3.5 text-sm font-semibold leading-[16px] text-[#4c4c4c] transition hover:bg-[#e8e8e8]"
            >
              Volver a la tienda
            </button>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="w-full bg-white px-4 py-9 md:px-8">
        {/* ================================================= */}
        {/* TÍTULO */}
        {/* ================================================= */}

        <h1 className="text-center text-[32px] font-semibold leading-[38px] text-[#191919]">
          Mi carrito
        </h1>

        {/* ================================================= */}
        {/* INDICADOR */}
        {/* ================================================= */}

        <div className="mx-auto mt-6 max-w-6xl">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">
              Carrito
            </span>

            <span className="text-gray-400">
              ›
            </span>

            <span className="text-gray-400">
              Pago seguro
            </span>
          </div>
        </div>

        {/* ================================================= */}
        {/* GRID PRINCIPAL */}
        {/* ================================================= */}

        <div className="mx-auto mt-4 flex max-w-6xl flex-col items-start gap-6 lg:flex-row">
          {/* ================================================= */}
          {/* LEFT */}
          {/* ================================================= */}

          <div className="w-full lg:w-[800px]">
            {/* ============================================= */}
            {/* DESKTOP TABLE */}
            {/* ============================================= */}

            <div className="hidden w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 md:block">
              <table className="w-full bg-white">
                <thead>
                  <tr className="w-full border-b border-gray-200 text-center text-sm font-medium uppercase leading-[14px] tracking-wide text-[#7f7f7f]">
                    <th className="px-2 py-3 text-left">
                      Producto
                    </th>

                    <th className="px-2 py-3">
                      Precio
                    </th>

                    <th className="px-2 py-3">
                      Cantidad
                    </th>

                    <th className="px-2 py-3">
                      Subtotal
                    </th>

                    <th className="w-8 px-2 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {lines.map(
                    (
                      line
                    ) => {
                      const variant =
                        line.merchandise;

                      const product =
                        variant.product;

                      const price =
                        Number(
                          variant.price
                            .amount ??
                            0
                        );

                      const lineSubtotal =
                        price *
                        line.quantity;

                      const nameFull =
                        fullProductName(
                          product.title,
                          variant.title
                        );

                      const currency =
                        variant.price
                          .currencyCode ??
                        "EUR";

                      return (
                        <tr
                          key={
                            line.id
                          }
                          className="border-b border-gray-100 text-center last:border-b-0"
                        >
                          {/* ========================= */}
                          {/* PRODUCTO */}
                          {/* ========================= */}

                          <td className="px-2 py-5 text-left align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/shopping-shopify-test/${product.handle}`
                                )
                              }
                              className="group flex items-center gap-4 text-left"
                            >
                              <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                                <img
                                  src={
                                    variant
                                      .image
                                      ?.url ??
                                    "https://placehold.co/300x300?text=IMG"
                                  }
                                  alt={
                                    variant
                                      .image
                                      ?.altText ??
                                    nameFull
                                  }
                                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[240px] font-medium leading-6 text-[#191919] transition group-hover:text-[#425530]">
                                  {
                                    nameFull
                                  }
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {
                                    product.vendor
                                  }
                                </p>

                                {variant.sku && (
                                  <p className="mt-1 text-[11px] text-gray-400">
                                    SKU:{" "}
                                    {
                                      variant.sku
                                    }
                                  </p>
                                )}
                              </div>
                            </button>
                          </td>

                          {/* ========================= */}
                          {/* PRECIO */}
                          {/* ========================= */}

                          <td className="px-2 py-4 align-middle">
                            <span className="text-sm font-medium text-[#191919]">
                              {formatMoney(
                                price,
                                currency
                              )}
                            </span>
                          </td>

                          {/* ========================= */}
                          {/* CANTIDAD */}
                          {/* ========================= */}

                          <td className="px-2 py-4 align-middle">
                            <div className="inline-flex flex-col items-center">
                              <div className="inline-flex w-[160px] items-center justify-around gap-2 rounded-[170px] border border-[#a0a0a0] bg-white p-2">
                                {/* MENOS */}

                                <button
                                  type="button"
                                  disabled={
                                    loading ||
                                    line.quantity <=
                                      1
                                  }
                                  onClick={() => {
                                    void setQty(
                                      line.id,
                                      line.quantity -
                                        1
                                    );
                                  }}
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label="Reducir cantidad"
                                >
                                  <svg
                                    width="14"
                                    height="15"
                                    viewBox="0 0 14 15"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M2.33398 7.5H11.6673"
                                      stroke="#666666"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>

                                {/* NÚMERO */}

                                <span className="w-12 text-center text-base font-normal leading-normal text-[#191919]">
                                  {
                                    line.quantity
                                  }
                                </span>

                                {/* MÁS */}

                                <button
                                  type="button"
                                  disabled={
                                    loading
                                  }
                                  onClick={() => {
                                    void setQty(
                                      line.id,
                                      line.quantity +
                                        1
                                    );
                                  }}
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label="Aumentar cantidad"
                                >
                                  <svg
                                    width="14"
                                    height="15"
                                    viewBox="0 0 14 15"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M2.33398 7.49998H11.6673M7.00065 2.83331V12.1666V2.83331Z"
                                      stroke="#1A1A1A"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* ========================= */}
                          {/* SUBTOTAL */}
                          {/* ========================= */}

                          <td className="px-2 py-4 align-middle">
                            <span className="font-medium text-[#191919]">
                              {formatMoney(
                                lineSubtotal,
                                currency
                              )}
                            </span>
                          </td>

                          {/* ========================= */}
                          {/* ELIMINAR */}
                          {/* ========================= */}

                          <td className="px-2 py-4 align-middle">
                            <button
                              type="button"
                              disabled={
                                loading
                              }
                              onClick={() => {
                                void removeFromCart(
                                  line.id
                                );
                              }}
                              className="cursor-pointer transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Eliminar ${nameFull}`}
                              title="Eliminar de la cesta"
                            >
                              <svg
                                width="24"
                                height="25"
                                viewBox="0 0 24 25"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12 23.5C18.0748 23.5 23 18.5748 23 12.5C23 6.42525 18.0748 1.5 12 1.5C5.92525 1.5 1 6.42525 1 12.5C1 18.5748 5.92525 23.5 12 23.5Z"
                                  stroke="#CCCCCC"
                                  strokeMiterlimit="10"
                                />

                                <path
                                  d="M16 8.5L8 16.5"
                                  stroke="#666666"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />

                                <path
                                  d="M16 16.5L8 8.5"
                                  stroke="#666666"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>

                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td
                      className="px-2 py-4"
                      colSpan={
                        5
                      }
                    >
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              "/shopping-shopify-test"
                            )
                          }
                          className="cursor-pointer rounded-[43px] bg-[#f2f2f2] px-8 py-3.5 text-sm font-semibold leading-[16px] text-[#4c4c4c] transition hover:bg-[#e8e8e8]"
                        >
                          Volver a la tienda
                        </button>

                        <button
                          type="button"
                          disabled={
                            loading
                          }
                          onClick={() => {
                            void clearCart();
                          }}
                          className="text-sm font-medium text-gray-400 transition hover:text-red-600 disabled:opacity-40"
                        >
                          Vaciar cesta
                        </button>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ============================================= */}
            {/* MOBILE */}
            {/* ============================================= */}

            <div className="space-y-4 md:hidden">
              {lines.map(
                (
                  line
                ) => {
                  const variant =
                    line.merchandise;

                  const product =
                    variant.product;

                  const price =
                    Number(
                      variant.price
                        .amount ??
                        0
                    );

                  const lineSubtotal =
                    price *
                    line.quantity;

                  const currency =
                    variant.price
                      .currencyCode ??
                    "EUR";

                  const nameFull =
                    fullProductName(
                      product.title,
                      variant.title
                    );

                  return (
                    <article
                      key={
                        line.id
                      }
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/shopping-shopify-test/${product.handle}`
                            )
                          }
                          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white"
                        >
                          <img
                            src={
                              variant
                                .image
                                ?.url ??
                              "https://placehold.co/300x300?text=IMG"
                            }
                            alt={
                              variant
                                .image
                                ?.altText ??
                              nameFull
                            }
                            className="max-h-full max-w-full object-contain"
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <span className="text-xs uppercase text-gray-400">
                            {
                              product.vendor
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/shopping-shopify-test/${product.handle}`
                              )
                            }
                            className="mt-1 block text-left"
                          >
                            <h2 className="line-clamp-2 font-semibold leading-5 text-gray-950">
                              {
                                nameFull
                              }
                            </h2>
                          </button>

                          <p className="mt-2 text-sm font-semibold">
                            {formatMoney(
                              price,
                              currency
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            loading
                          }
                          onClick={() => {
                            void removeFromCart(
                              line.id
                            );
                          }}
                          className="h-fit"
                          aria-label={`Eliminar ${nameFull}`}
                        >
                          <svg
                            width="23"
                            height="24"
                            viewBox="0 0 24 25"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 23.5C18.0748 23.5 23 18.5748 23 12.5C23 6.42525 18.0748 1.5 12 1.5C5.92525 1.5 1 6.42525 1 12.5C1 18.5748 5.92525 23.5 12 23.5Z"
                              stroke="#CCCCCC"
                            />

                            <path
                              d="M16 8.5L8 16.5"
                              stroke="#666666"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />

                            <path
                              d="M16 16.5L8 8.5"
                              stroke="#666666"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                        {/* CANTIDAD */}

                        <div className="inline-flex w-[150px] items-center justify-around gap-2 rounded-full border border-[#a0a0a0] bg-white p-2">
                          <button
                            type="button"
                            disabled={
                              loading ||
                              line.quantity <=
                                1
                            }
                            onClick={() => {
                              void setQty(
                                line.id,
                                line.quantity -
                                  1
                              );
                            }}
                            className="h-7 w-7"
                          >
                            −
                          </button>

                          <span className="w-10 text-center">
                            {
                              line.quantity
                            }
                          </span>

                          <button
                            type="button"
                            disabled={
                              loading
                            }
                            onClick={() => {
                              void setQty(
                                line.id,
                                line.quantity +
                                  1
                              );
                            }}
                            className="h-7 w-7"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            Subtotal
                          </p>

                          <p className="font-semibold text-gray-950">
                            {formatMoney(
                              lineSubtotal,
                              currency
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/shopping-shopify-test"
                    )
                  }
                  className="rounded-full bg-[#f2f2f2] px-5 py-3 text-sm font-semibold text-[#4c4c4c]"
                >
                  Volver a la tienda
                </button>

                <button
                  type="button"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    void clearCart();
                  }}
                  className="text-sm text-gray-400 hover:text-red-600"
                >
                  Vaciar cesta
                </button>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* RIGHT: RESUMEN */}
          {/* ================================================= */}

          <aside className="w-full rounded-lg border border-gray-200 bg-white p-6 lg:sticky lg:top-28 lg:w-[424px]">
            <h2 className="mb-2 text-xl font-medium leading-[30px] text-[#191919]">
              Resumen
            </h2>

            {/* PRODUCTOS */}

            <div className="flex w-full items-center justify-between border-b border-gray-200 py-3">
              <span className="text-sm font-normal leading-[21px] text-[#4c4c4c]">
                Productos:
              </span>

              <span className="text-sm font-medium leading-[21px] text-[#191919]">
                {
                  totalItems
                }
              </span>
            </div>

            {/* SUBTOTAL */}

            <div className="flex w-full items-center justify-between border-b border-gray-200 py-3">
              <span className="text-sm font-normal leading-[21px] text-[#4c4c4c]">
                Subtotal productos:
              </span>

              <span className="text-sm font-medium leading-[21px] text-[#191919]">
                {formatMoney(
                  cart?.cost
                    .subtotalAmount
                    .amount,

                  cart?.cost
                    .subtotalAmount
                    .currencyCode ??
                    "EUR"
                )}
              </span>
            </div>

            {/* ENVÍO */}

            <div className="flex w-full items-center justify-between gap-4 border-b border-gray-200 py-3">
              <span className="text-sm font-normal leading-[21px] text-[#4c4c4c]">
                Envío:
              </span>

              <span className="text-right text-sm font-medium leading-[21px] text-[#191919]">
                Se calcula durante
                el pago
              </span>
            </div>

            {/* TOTAL */}

            <div className="mt-1 flex w-full items-center justify-between py-4">
              <span className="text-lg font-semibold text-[#191919]">
                TOTAL:
              </span>

              <span className="text-xl font-bold text-[#191919]">
                {formatMoney(
                  cart?.cost
                    .totalAmount
                    .amount,

                  cart?.cost
                    .totalAmount
                    .currencyCode ??
                    "EUR"
                )}
              </span>
            </div>

            {/* CHECKOUT */}

            <button
              type="button"
              disabled={
                loading ||
                !cart
                  ?.checkoutUrl ||
                lines.length ===
                  0
              }
              onClick={
                goToCheckout
              }
              className="
                mt-5
                w-full
                rounded-[44px]
                bg-[#00b206]
                px-10
                py-4
                text-base
                font-semibold
                leading-tight
                text-white
                transition
                hover:bg-[#009e05]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Comprar ya
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              El pago y los datos de
              envío se completarán de
              forma segura con Shopify.
            </p>

            {/* ================================================= */}
            {/* INFO SEGURA */}
            {/* ================================================= */}

            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex items-start gap-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#66715d]"
                  aria-hidden="true"
                >
                  <path
                    d="M7 10V8a5 5 0 0 1 10 0v2"
                    strokeLinecap="round"
                  />

                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                  />
                </svg>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Pago seguro
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Serás redirigido al checkout seguro de Shopify para completar el pedido.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}