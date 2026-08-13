import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

export default function ShopifyWelcomeModal() {
  const navigate =
    useNavigate();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  useEffect(() => {
    const shouldShow =
      sessionStorage.getItem(
        "shopify_show_welcome"
      ) === "1";

    if (shouldShow) {
      sessionStorage.removeItem(
        "shopify_show_welcome"
      );

      setOpen(true);
    }
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed inset-0 z-[99999]
        flex items-center justify-center
        bg-black/35 px-4
        backdrop-blur-[2px]
      "
      onClick={() =>
        setOpen(false)
      }
    >
      <div
        className="
          w-full max-w-md
          rounded-[28px]
          border border-[#d5ddca]
          bg-white
          p-7
          shadow-2xl
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div
          className="
            mx-auto flex h-14 w-14
            items-center justify-center
            rounded-full
            bg-[#edf4e8]
            text-2xl
          "
        >
          ✓
        </div>

        <p
          className="
            mt-5 text-center
            text-xs font-semibold
            uppercase
            tracking-[0.24em]
            text-[#788767]
          "
        >
          Bienvenida a Saminatura
        </p>

        <h2
          className="
            mt-2 text-center
            text-2xl font-semibold
            text-[#26341f]
          "
        >
          Tu cuenta está lista
        </h2>

        <p
          className="
            mt-3 text-center
            text-sm leading-6
            text-gray-600
          "
        >
          Puedes completar tus datos
          y guardar una dirección,
          o empezar a comprar ahora.
        </p>

        <button
          type="button"
          onClick={() => {
            setOpen(false);

            navigate(
              "/perfil-shopify-test"
            );
          }}
          className="
            mt-7 w-full
            rounded-full
            bg-[#425530]
            px-5 py-3
            font-semibold text-white
            transition
            hover:bg-[#344526]
          "
        >
          Terminar de configurar mi cuenta
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);

            navigate(
              "/shopping-shopify-test"
            );
          }}
          className="
            mt-3 w-full
            rounded-full
            border border-[#b9c6aa]
            bg-white
            px-5 py-3
            font-semibold
            text-[#425530]
            transition
            hover:bg-[#f5f7f0]
          "
        >
          Empezar a comprar
        </button>

        <button
          type="button"
          onClick={() =>
            setOpen(false)
          }
          className="
            mt-4 w-full
            text-sm text-gray-400
            hover:text-gray-600
          "
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}