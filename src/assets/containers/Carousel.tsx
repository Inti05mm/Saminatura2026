import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type ProductSlide = {
  id: number;
  slug: string | null; // ✅ NUEVO
  name: string;
  brand: string;
  price: number;
  img: string | null;
  sold_count: number;
  stock: number | null;
  is_active: boolean;
};

const formatEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const Carousel: React.FC = () => {
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleSlides, setVisibleSlides] = useState(1);
  const [slidePercentage, setSlidePercentage] = useState(100);

  const [slidesData, setSlidesData] = useState<ProductSlide[]>([]);
  const [loading, setLoading] = useState(true);

  /* RESPONSIVE */
  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth < 768) {
        setVisibleSlides(1);
        setSlidePercentage(100);
      } else {
        setVisibleSlides(3);
        setSlidePercentage(100 / 3);
      }
    };

    updateVisibleSlides();
    window.addEventListener("resize", updateVisibleSlides);
    return () => window.removeEventListener("resize", updateVisibleSlides);
  }, []);

  /* CARGAR MÁS VENDIDOS */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
       .from("public_products")
.select("id,slug,name,brand,price,img,sold_count,stock,is_active")
.eq("is_active", true)
.gt("stock", 0)
.order("sold_count", { ascending: false })
.limit(12);

      if (error) {
        console.error("Error cargando más vendidos:", error);
        setSlidesData([]);
      } else {
        setSlidesData((data ?? []) as ProductSlide[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  const maxIndex = useMemo(
    () => Math.max(0, slidesData.length - visibleSlides),
    [slidesData.length, visibleSlides]
  );

  // Ajusta currentSlide si cambia tamaño o lista
  useEffect(() => {
    setCurrentSlide((p) => Math.min(p, maxIndex));
  }, [maxIndex]);

  /* AUTOPLAY */
  useEffect(() => {
    if (slidesData.length <= visibleSlides) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3000);

    return () => clearInterval(interval);
  }, [visibleSlides, slidesData.length, maxIndex]);

  const next = () => setCurrentSlide((p) => Math.min(p + 1, maxIndex));
  const prev = () => setCurrentSlide((p) => Math.max(p - 1, 0));
  const goTo = (index: number) => setCurrentSlide(Math.min(Math.max(index, 0), maxIndex));


  
  // ✅ Ahora abre /shopping/slug-id
  const openProduct = (p: ProductSlide) => {
    const slug = (p.slug ?? "").trim();
    if (slug) {
      navigate(`/shopping/${slug}-${p.id}`);
    } else {
      // fallback si un producto se queda sin slug
      navigate(`/shopping/${p.id}`);
    }
  };

  return (
    <div className="w-full">
      {/* SVG SUPERIOR */}
      <div className="gris overflow-hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          className="w-full h-24 md:h-32"
          preserveAspectRatio="none"
        >
          <path
            fill="#354024"
            d="M0,192L20,186.7C40,181,80,171,120,186.7C160,203,200,245,240,256C280,267,320,245,360,240C400,235,440,245,480,229.3C520,213,560,171,600,165.3C640,160,680,192,720,176C760,160,800,96,840,96C880,96,920,160,960,186.7C1000,213,1040,203,1080,208C1120,213,1160,235,1200,229.3C1240,224,1280,192,1320,160C1360,128,1400,96,1420,80L1440,64L1440,0L0,0Z"
          />
        </svg>
      </div>

      {/* CAROUSEL */}
      <div className="container mx-auto px-4 py-12 gris">
        <h2 className="text-2xl md:text-3xl roboto-title text-center mb-8 text-gray-800">
          Nuestros productos más vendidos
        </h2>

        {loading ? (
          <p className="text-center text-gray-600">Cargando…</p>
        ) : slidesData.length === 0 ? (
          <p className="text-center text-gray-600">Aún no hay productos para mostrar.</p>
        ) : (
          <div className="relative">
            <div className="relative overflow-hidden rounded-lg shadow-xl gris">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * slidePercentage}%)` }}
              >
                {slidesData.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openProduct(p)} // ✅ pasa el objeto completo
                    className="w-full md:w-1/3 shrink-0 px-2 py-4 text-left"
                    aria-label={`Ver ${p.name}`}
                  >
                    <div className="rounded-lg overflow-hidden shadow-md h-full bg-white hover:shadow-lg transition">
                      {/* ✅ Imagen completa */}
                      <div className="h-56 md:h-72 bg-white flex items-center justify-center">
                        <img
                          src={p.img ?? "https://via.placeholder.com/600x600?text=Producto"}
                          alt={p.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-semibold">{p.name}</h3>
                        <div className="text-sm text-gray-500 mt-1">{p.brand}</div>
                        <div className="mt-2 font-semibold">{formatEUR(Number(p.price ?? 0))}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* BOTONES */}
            <button
              onClick={prev}
              disabled={currentSlide === 0}
              className={`absolute -left-10 md:-left-16 top-1/2 -translate-y-1/2 gris/80
                rounded-full w-10 h-10 flex items-center justify-center shadow-md
                ${currentSlide === 0 && "opacity-50 cursor-not-allowed"}
              `}
              aria-label="Anterior"
              type="button"
            >
              ‹
            </button>

            <button
              onClick={next}
              disabled={currentSlide >= maxIndex}
              className={`absolute -right-10 md:-right-16 top-1/2 -translate-y-1/2 gris/80
                rounded-full w-10 h-10 flex items-center justify-center shadow-md
                ${currentSlide >= maxIndex && "opacity-50 cursor-not-allowed"}
              `}
              aria-label="Siguiente"
              type="button"
            >
              ›
            </button>

            {/* INDICADORES */}
            <div className="flex justify-center mt-4 space-x-2">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goTo(index)}
                  className={`w-3 h-3 rounded-full ${currentSlide === index ? "bg-blue-600" : "bg-gray-300"}`}
                  aria-label={`Ir a ${index + 1}`}
                  type="button"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Carousel;
