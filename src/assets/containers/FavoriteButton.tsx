import { useState } from "react";
import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFavorites } from "../containers/FavoritesContext";
import { supabase } from "../supabaseClient";
import GuestFavoriteModal from "./GuestFavoriteModal";

type FavoriteButtonProps = {
  productId: number;
  productName?: string;
  className?: string;
};

export default function FavoriteButton({
  productId,
  productName,
  className = "",
}: FavoriteButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isFavorite,
    toggleFavorite,
  } = useFavorites();

  const [guestModalOpen, setGuestModalOpen] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const active =
    isFavorite(productId);

  const changeFavorite = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      await toggleFavorite(productId);
      setGuestModalOpen(false);
    } catch (error) {
      console.error(
        "Error modificando favorito:",
        error
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleClick = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (processing) return;

    if (active) {
      await changeFavorite();
      return;
    }

    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session?.user) {
      setGuestModalOpen(true);
      return;
    }

    await changeFavorite();
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          void handleClick(event);
        }}
        disabled={processing}
        className={`
          flex h-10 w-10 items-center justify-center
          rounded-full border border-[#425530]/15
          bg-white/95 shadow-sm
          transition
          hover:scale-105 hover:bg-white
          disabled:cursor-wait disabled:opacity-70
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
            h-5 w-5 transition
            ${
              active
                ? "fill-[#425530] text-[#425530]"
                : "text-[#425530]"
            }
          `}
        />
      </button>

      <GuestFavoriteModal
        open={guestModalOpen}
        productName={productName}
        processing={processing}
        onClose={() =>
          setGuestModalOpen(false)
        }
        onContinueAsGuest={changeFavorite}
        onLogin={() => {
  try {
    localStorage.setItem(
      "saminatura_pending_favorite_v1",
      String(productId)
    );
  } catch {
    // Sin acción.
  }

  navigate("/usuario", {
    state: {
      message:
        "Inicia sesión para conservar tus favoritos en tu cuenta.",
      returnTo:
        location.pathname +
        location.search,
    },
  });
}}
      />
    </>
  );
}
