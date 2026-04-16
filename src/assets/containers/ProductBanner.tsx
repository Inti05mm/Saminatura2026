import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

type Banner = {
  id: number;
  title: string | null;
  image_url: string;
  sort_order: number;
  product_slugs: string[];
};

export default function ProductBanners() {
  const navigate = useNavigate();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("product_banners")
        .select("id,title,image_url,sort_order,product_slugs")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Error cargando banners:", error);
        setBanners([]);
      } else {
        setBanners((data ?? []) as Banner[]);
      }

      setLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ precargar imágenes para que el cambio sea más suave
  useEffect(() => {
    if (banners.length === 0) return;

    banners.forEach((banner) => {
      const img = new Image();
      img.src = banner.image_url;
    });
  }, [banners]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [banners.length]);

  const handleBannerClick = (banner: Banner) => {
    navigate(`/shopping?banner=${banner.id}`);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Cargando novedades…</div>;
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <section className="py-8">
      <div className="w-full">
        <div className="justify-between gap-4 mb-4 px-4 sm:px-6 lg:px-8"></div>

        <div className="group relative w-full overflow-hidden bg-gray-100">
          <button
            onClick={() => handleBannerClick(currentBanner)}
            className="relative block w-full text-left"
            aria-label={currentBanner.title ?? "Ver novedades"}
            type="button"
          >
            <img
              src={currentBanner.image_url}
              alt={currentBanner.title ?? "Banner de novedades"}
              className="block w-full h-auto object-contain"
              loading="eager"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/0 pointer-events-none" />

            {currentBanner.title && (
              <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6">
                <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-900 shadow-sm">
                  <h1>Ver productos</h1>
                </span>
              </div>
            )}
          </button>

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Banner anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/0 text-white transition-all duration-200 group-hover:bg-black/50 hover:!bg-black/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={goNext}
                aria-label="Siguiente banner"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/0 text-white transition-all duration-200 group-hover:bg-black/50 hover:!bg-black/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Ir al banner ${index + 1}`}
                    className={[
                      "h-2.5 rounded-full transition-all",
                      index === currentIndex ? "w-6 bg-white" : "w-2.5 bg-white/60 hover:bg-white/90",
                    ].join(" ")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}