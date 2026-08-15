import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Heart,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useShopifyFavorites,
} from "../containers/ShopifyFavoritesContext";

import {
  useShopifyCustomer,
} from "../containers/ShopifyCustomerContext";

import ShopifyGuestFavoriteModal
  from "./ShopifyGuestFavoriteModal";

type ShopifyFavoriteButtonProps = {
  variantId: string;
  productName?: string;
  className?: string;
};

const PENDING_FAVORITE_KEY =
  "saminatura_pending_favorite_variant_v2";

export default function ShopifyFavoriteButton({
  variantId,
  productName,
  className = "",
}: ShopifyFavoriteButtonProps) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    loggedIn,
  } =
    useShopifyCustomer();

  const {
    isFavorite,
    toggleFavorite,
  } =
    useShopifyFavorites();

  const [
    guestModalOpen,
    setGuestModalOpen,
  ] =
    useState(false);

  const [
    removeModalOpen,
    setRemoveModalOpen,
  ] =
    useState(false);

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const active =
    isFavorite(
      variantId
    );

  useEffect(() => {
    if (
      !removeModalOpen
    ) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event:
        KeyboardEvent
    ) => {
      if (
        event.key ===
          "Escape" &&
        !processing
      ) {
        setRemoveModalOpen(
          false
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    removeModalOpen,
    processing,
  ]);

  const changeFavorite =
    async () => {
      if (
        processing
      ) {
        return;
      }

      setProcessing(
        true
      );

      try {
        await toggleFavorite(
          variantId
        );

        setGuestModalOpen(
          false
        );

        setRemoveModalOpen(
          false
        );
      } catch (
        error
      ) {
        console.error(
          "Error modificando favorito Shopify:",
          error
        );
      } finally {
        setProcessing(
          false
        );
      }
    };

  const handleClick =
    async (
      event:
        React.MouseEvent<
          HTMLButtonElement
        >
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        processing
      ) {
        return;
      }

      if (
        active
      ) {
        setRemoveModalOpen(
          true
        );

        return;
      }

      if (
        loggedIn
      ) {
        await changeFavorite();

        return;
      }

      setGuestModalOpen(
        true
      );
    };

  const confirmRemove =
    async () => {
      if (
        processing ||
        !active
      ) {
        return;
      }

      await changeFavorite();
    };

  return (
    <>
      <button
        type="button"
        onClick={(
          event
        ) => {
          void handleClick(
            event
          );
        }}
        disabled={
          processing
        }
        className={`
          shopify-favorite-button
          flex h-10 w-10
          items-center justify-center
          rounded-full
          border
          shadow-sm
          transition-all duration-200

          ${
            active
              ? "border-[#8c3342]/25 bg-[#fff1f3]"
              : "border-[#8c3342]/20 bg-white/95"
          }

          hover:scale-110
          hover:border-[#8c3342]/40
          hover:bg-[#fff1f3]

          disabled:cursor-wait
          disabled:opacity-70

          ${className}
        `}
        aria-label={
          active
            ? "Eliminar de favoritos"
            : "Añadir a favoritos"
        }
        title={
          active
            ? "Eliminar de favoritos"
            : "Añadir a favoritos"
        }
      >
        <Heart
          className={`
            h-5 w-5
            transition-all duration-200

            ${
              active
                ? "fill-[#8c3342] text-[#8c3342]"
                : "text-[#8c3342]"
            }
          `}
        />
      </button>

      <ShopifyGuestFavoriteModal
        open={
          guestModalOpen
        }
        productName={
          productName
        }
        processing={
          processing
        }
        onClose={() => {
          if (
            !processing
          ) {
            setGuestModalOpen(
              false
            );
          }
        }}
        onContinueAsGuest={
          changeFavorite
        }
        onLogin={() => {
          try {
            localStorage.setItem(
              PENDING_FAVORITE_KEY,
              variantId
            );
          } catch {
            // Sin acción.
          }

          setGuestModalOpen(
            false
          );

          navigate(
            "/usuario",
            {
              state: {
                message:
                  "Inicia sesión para conservar tus favoritos en tu cuenta.",

                returnTo:
                  location.pathname +
                  location.search,
              },
            }
          );
        }}
      />

      {removeModalOpen &&
        typeof document !==
          "undefined" &&
        createPortal(
          <div
            className="
              fixed inset-0
              z-[100000]
              flex items-center justify-center
              bg-black/35
              px-4
              backdrop-blur-[2px]
            "
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                  event.currentTarget &&
                !processing
              ) {
                setRemoveModalOpen(
                  false
                );
              }
            }}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shopify-remove-favorite-title"
              aria-describedby="shopify-remove-favorite-description"
              className="
                w-full max-w-sm
                rounded-3xl
                border border-[#ead6d9]
                bg-white
                p-6
                shadow-2xl
              "
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f3] text-[#8c3342]">
                <Heart className="h-6 w-6 fill-current" />
              </div>

              <h2
                id="shopify-remove-favorite-title"
                className="mt-4 text-center text-xl font-semibold text-gray-950"
              >
                ¿Quitar de favoritos?
              </h2>

              <p
                id="shopify-remove-favorite-description"
                className="mt-2 text-center text-sm leading-6 text-gray-600"
              >
                ¿Seguro que quieres eliminar
                {productName ? (
                  <>
                    {" "}
                    <span className="font-semibold text-gray-900">
                      {productName}
                    </span>
                  </>
                ) : (
                  " este producto"
                )}{" "}
                de tus favoritos?
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setRemoveModalOpen(
                      false
                    )
                  }
                  disabled={
                    processing
                  }
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void confirmRemove();
                  }}
                  disabled={
                    processing
                  }
                  className="flex-1 rounded-full bg-[#8c3342] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#762a37] disabled:cursor-wait disabled:opacity-70"
                >
                  {processing
                    ? "Quitando…"
                    : "Sí, quitar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}