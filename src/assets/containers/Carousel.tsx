import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type ProductSlide = {
  id: number;
  slug: string | null;
  name: string;
  brand: string;
  price: number;
  img: string | null;
  sold_count: number;
  stock: number | null;
};

const formatEUR = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const Carousel: React.FC = () => {
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleSlides, setVisibleSlides] = useState(1);
  const [slidePercentage, setSlidePercentage] = useState(100);

  const [slidesData, setSlidesData] = useState<ProductSlide[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // RESPONSIVE
  // ============================================================

  useEffect(() => {
    const updateVisibleSlides = () => {
      if (window.innerWidth < 640) {
        // Móvil: 1 producto
        setVisibleSlides(1);
        setSlidePercentage(100);
      } else if (window.innerWidth < 1024) {
        // Tablet: 2 productos
        setVisibleSlides(2);
        setSlidePercentage(50);
      } else {
        // Ordenador: 4 productos
        setVisibleSlides(4);
        setSlidePercentage(25);
      }
    };

    updateVisibleSlides();

    window.addEventListener("resize", updateVisibleSlides);

    return () => {
      window.removeEventListener("resize", updateVisibleSlides);
    };
  }, []);

  // ============================================================
  // CARGAR PRODUCTOS MÁS VENDIDOS
  // ============================================================

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("public_products")
          .select(
            "id, slug, name, brand, price, img, sold_count, stock"
          )
          .gt("stock", 0)
          .order("sold_count", { ascending: false })
          .limit(12);

        if (!alive) return;

        if (error) {
          throw error;
        }

        const products: ProductSlide[] = (data ?? []).map(
          (product: any) => ({
            id: Number(product.id),

            slug:
              product.slug === null || product.slug === undefined
                ? null
                : String(product.slug),

            name: String(product.name ?? ""),

            brand: String(product.brand ?? ""),

            price: Number(product.price ?? 0),

            img:
              product.img === null || product.img === undefined
                ? null
                : String(product.img),

            sold_count: Number(product.sold_count ?? 0),

            stock:
              product.stock === null || product.stock === undefined
                ? null
                : Number(product.stock),
          })
        );

        setSlidesData(products);
      } catch (error) {
        if (!alive) return;

        console.error("Error cargando más vendidos:", error);
        setSlidesData([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, []);

  // ============================================================
  // ÍNDICE MÁXIMO
  // ============================================================

  const maxIndex = useMemo(() => {
    return Math.max(0, slidesData.length - visibleSlides);
  }, [slidesData.length, visibleSlides]);

  useEffect(() => {
    setCurrentSlide((current) =>
      Math.min(current, maxIndex)
    );
  }, [maxIndex]);

  // ============================================================
  // AUTOPLAY
  // ============================================================

  useEffect(() => {
    if (slidesData.length <= visibleSlides) return;

    const interval = window.setInterval(() => {
      setCurrentSlide((previous) =>
        previous >= maxIndex ? 0 : previous + 1
      );
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [visibleSlides, slidesData.length, maxIndex]);

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const next = () => {
    setCurrentSlide((current) =>
      Math.min(current + 1, maxIndex)
    );
  };

  const prev = () => {
    setCurrentSlide((current) =>
      Math.max(current - 1, 0)
    );
  };

  const goTo = (index: number) => {
    setCurrentSlide(
      Math.min(Math.max(index, 0), maxIndex)
    );
  };

  // ============================================================
  // ABRIR PRODUCTO
  // ============================================================

  const openProduct = (product: ProductSlide) => {
    const slug = (product.slug ?? "").trim();

    if (slug) {
      navigate(`/shopping/${slug}-${product.id}`);
      return;
    }

    navigate(`/shopping/${product.id}`);
  };

  return (
<section className="w-full overflow-hidden bg-[#425530]">
        {/* Separador entre opciones alimentarias y carrusel */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 490"
        preserveAspectRatio="none"
        className="-mb-[1px] block h-28 w-full bg-[#f7f5ef] sm:h-36 md:h-44 lg:h-52"
        aria-hidden="true"
      >
        {/* Onda clara */}
        <path
          d="
            M0,500
            L0,125
            C64.974,158.023 129.949,191.046 209,180
            C288.051,168.954 381.179,113.838 470,108
            C558.821,102.162 643.333,145.6 731,141
            C818.667,136.4 909.487,83.762 976,70
            C1042.513,56.238 1084.718,81.354 1158,97
            C1231.282,112.646 1335.641,118.823 1440,125
            L1440,500
            L0,500
            Z
          "
fill="#425530"
fillOpacity="0.53"
        />

        {/* Onda principal */}
        <path
          d="
            M0,500
            L0,291
            C85.567,323.479 171.133,355.959 255,348
            C338.867,340.041 421.033,291.644 485,264
            C548.967,236.356 594.733,229.467 684,233
            C773.267,236.533 906.033,250.49 1004,251
            C1101.967,251.51 1165.133,238.574 1232,243
            C1298.867,247.426 1369.433,269.213 1440,291
            L1440,500
            L0,500
            Z
          "
fill="#425530"
        />
      </svg>

      {/* Contenido del carrusel */}
      <div className="container mx-auto px-4 pb-14 pt-8 sm:px-6 md:pb-16 md:pt-10">
        <h2 className="roboto-title mb-8 text-center text-2xl text-white md:text-3xl">
          Nuestros productos más vendidos
        </h2>

        {loading ? (
          <p className="text-center text-white/80">
            Cargando…
          </p>
        ) : slidesData.length === 0 ? (
          <p className="text-center text-white/80">
            Aún no hay productos para mostrar.
          </p>
        ) : (
          <div className="relative">
            {/* Marco verde oscuro alrededor del carrusel */}
            <div
              className="
rounded-3xl bg-[#8a9d76]
                px-4 py-5 shadow-xl
                sm:px-5
                md:px-6 md:py-6
              "
            >
              {/* Ventana visible */}
              <div className="relative overflow-hidden rounded-2xl">
                {/* Fila desplazable */}
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${
                      currentSlide * slidePercentage
                    }%)`,
                  }}
                >
                  {slidesData.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => openProduct(product)}
                      className="
                        w-full shrink-0 px-2 py-2 text-left
                        sm:w-1/2
                        lg:w-1/4
                      "
                      aria-label={`Ver ${product.name}`}
                    >
                      <div
                        className="
                          flex h-full flex-col overflow-hidden
                          rounded-xl bg-white shadow-sm
                          transition duration-300
                          hover:-translate-y-1
                          hover:shadow-xl
                        "
                      >
                        {/* Imagen */}
<div className="flex h-48 items-center justify-center bg-white p-3 sm:h-52 lg:h-56">
  <div
    className="
      flex h-full w-full items-center justify-center
      rounded-lg
      border border-[#8a9d76]/35
      bg-white
      p-2
    "
  >
    <img
      src={
        product.img?.trim()
          ? product.img
          : "https://via.placeholder.com/600x600?text=Producto"
      }
      alt={product.name}
      className="h-full w-full object-contain"
      loading="lazy"
    />
  </div>
</div>

                        {/* Información */}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-5 text-gray-900">
                            {product.name}
                          </h3>

                          <div className="mt-1 truncate text-xs text-gray-500">
                            {product.brand || "Sin marca"}
                          </div>

                          <div className="mt-auto pt-3 text-base font-semibold text-gray-900">
                            {formatEUR(product.price)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botón anterior */}
            <button
              type="button"
              onClick={prev}
              disabled={currentSlide === 0}
              className={`
                absolute left-1 top-1/2 z-20
                flex h-10 w-10 -translate-y-1/2
                items-center justify-center rounded-full
                bg-white text-2xl text-[#425530]
                shadow-md transition
                hover:scale-105 hover:bg-[#f7f5ef]
                md:-left-12
                ${
                  currentSlide === 0
                    ? "cursor-not-allowed opacity-40"
                    : ""
                }
              `}
              aria-label="Anterior"
            >
              ‹
            </button>

            {/* Botón siguiente */}
            <button
              type="button"
              onClick={next}
              disabled={currentSlide >= maxIndex}
              className={`
                absolute right-1 top-1/2 z-20
                flex h-10 w-10 -translate-y-1/2
                items-center justify-center rounded-full
                bg-white text-2xl text-[#425530]
                shadow-md transition
                hover:scale-105 hover:bg-[#f7f5ef]
                md:-right-12
                ${
                  currentSlide >= maxIndex
                    ? "cursor-not-allowed opacity-40"
                    : ""
                }
              `}
              aria-label="Siguiente"
            >
              ›
            </button>

            {/* Indicadores */}
            {maxIndex > 0 && (
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({
                  length: maxIndex + 1,
                }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`
                      rounded-full transition-all duration-300
                      ${
                        currentSlide === index
                          ? "h-2.5 w-6 bg-white"
                          : "h-2.5 w-2.5 bg-white/40 hover:bg-white/70"
                      }
                    `}
                    aria-label={`Ir a la posición ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Carousel;