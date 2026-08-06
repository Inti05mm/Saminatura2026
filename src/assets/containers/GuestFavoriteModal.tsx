import { Heart } from "lucide-react";

type GuestFavoriteModalProps = {
  open: boolean;
  productName?: string;
  processing?: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void | Promise<void>;
  onLogin: () => void;
};

export default function GuestFavoriteModal({
  open,
  productName,
  processing = false,
  onClose,
  onContinueAsGuest,
  onLogin,
}: GuestFavoriteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!processing) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-favorite-title"
        aria-describedby="guest-favorite-description"
        className="w-full max-w-md rounded-3xl border border-[#ead6d9] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f3] text-[#8c3342]">
          <Heart className="h-6 w-6" />
        </div>

        <h2
          id="guest-favorite-title"
          className="mt-4 text-center text-xl font-semibold text-gray-950"
        >
          Guarda tus favoritos
        </h2>

        <p
          id="guest-favorite-description"
          className="mt-2 text-center text-sm leading-6 text-gray-600"
        >
          Inicia sesión para conservar
          {productName ? (
            <>
              {" "}
              <span className="font-semibold text-gray-900">
                {productName}
              </span>
            </>
          ) : (
            " tus productos"
          )}{" "}
          en tu cuenta y acceder desde cualquier dispositivo. También puedes
          continuar sin iniciar sesión y se guardará únicamente en este
          navegador.
        </p>

        <p className="mt-3 text-center text-xs leading-5 text-gray-500">
          Los favoritos guardados como invitado pueden perderse al borrar los
          datos del navegador, usar navegación privada o cambiar de dispositivo.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              void onContinueAsGuest();
            }}
            disabled={processing}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
          >
            {processing ? "Guardando…" : "Seguir sin iniciar sesión"}
          </button>

          <button
            type="button"
            onClick={onLogin}
            disabled={processing}
            className="flex-1 rounded-full bg-[#425530] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#344426] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Iniciar sesión
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="mt-3 w-full rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
