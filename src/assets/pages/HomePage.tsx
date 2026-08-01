import { useEffect, useState } from "react";

import Inicio from "../containers/Inicio";
import Carousel from "../containers/Carousel";
import Footer from "../containers/Footer";
import Categories from "../containers/Categories";
import VIsitUs from "../containers/VisitUs";
import Mapa from "../containers/Mapa";
import Header from "../containers/Header";
import HeroSaminatura from "../containers/HeroSaminatura.tsx";
import NewProductsCarousel from "../containers/NewProductsCarousel.tsx"
import DietaryOptions from "../containers/DietaryOptions.tsx"

type Toast = { type: "success" | "error"; msg: string } | null;

export default function HomePage() {
  const [toast, setToast] = useState<Toast>(null);

  // ✅ Lee el toast guardado por User.tsx (login/registro) y lo muestra aquí
  useEffect(() => {
    const raw = sessionStorage.getItem("toast");
    if (!raw) return;

    try {
      const t = JSON.parse(raw) as Toast;
      if (t && typeof t === "object" && "msg" in t) setToast(t);
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem("toast");
    }
  }, []);

  // ✅ Auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <main className="min-h-screen gris">
      {/* ✅ TOAST TOP RIGHT */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={[
              "rounded-xl px-4 py-3 shadow-lg border text-sm max-w-sm",
              toast.type === "success" ? "bg-green-50 border-green-200 text-green-900" : "",
              toast.type === "error" ? "bg-red-50 border-red-200 text-red-900" : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="font-semibold">{toast.type === "success" ? "Listo" : "Error"}</div>
              <div className="flex-1">{toast.msg}</div>
              <button
                onClick={() => setToast(null)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Cerrar"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <Header />
      <Inicio/>
      <Categories />  
      <DietaryOptions/>
      <Carousel />
      <NewProductsCarousel/>
      <Mapa />
      <Footer />
      
    </main>
  );
}
