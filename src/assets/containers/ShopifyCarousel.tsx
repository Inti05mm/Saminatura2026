import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAllShopifyProducts,
} from "../../shopifyCatalog";

type ProductSlide = {
  id: string;
  numeric_id: string | null;
  handle: string | null;
  name: string;
  brand: string;
  price: number;
  img: string | null;
  created_at: string | null;
  stock: number;
};

type NewProductsResponse = {
  ok: boolean;
  products: ProductSlide[];
  total: number;
  error?: string;
};

const SHOPIFY_API_BASE = "/api";

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
        setVisibleSlides(1);
        setSlidePercentage(100);
      } else if (window.innerWidth < 1024) {
        setVisibleSlides(2);
        setSlidePercentage(50);
      } else {
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
  // CARGAR NOVEDADES DESDE SHOPIFY
  // ============================================================

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `${SHOPIFY_API_BASE}/shopify/storefront/new-products?limit=12`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data =
          (await response.json()) as NewProductsResponse;

        if (!alive) return;

        if (!response.ok || data.ok === false) {
          throw new Error(
            data.error ||
              `Error cargando novedades (${response.status})`
          );
        }

        const newProducts =
          Array.isArray(data.products)
            ? data.products
            : [];

        const catalogProducts =
          await getAllShopifyProducts();

        if (!alive) return;

        const handleById =
          new Map<string, string>();

        catalogProducts.forEach(
          (product) => {
            const id =
              String(product.id);

            const numericId =
              id.split("/").pop() ??
              "";

            handleById.set(
              id,
              product.handle
            );

            if (numericId) {
              handleById.set(
                numericId,
                product.handle
              );
            }
          }
        );

        const normalizedProducts =
          newProducts
            .map((product) => {
              const productId =
                String(
                  product.id ?? ""
                );

              const numericId =
                String(
                  product.numeric_id ??
                    productId
                      .split("/")
                      .pop() ??
                    ""
                );

              const handle =
                product.handle?.trim() ||
                handleById.get(
                  productId
                ) ||
                handleById.get(
                  numericId
                ) ||
                null;

              return {
                ...product,
                handle,
              };
            })
            .filter(
              (product) =>
                Boolean(
                  product.handle
                )
            );

        setSlidesData(
          normalizedProducts
        );
      } catch (error) {
        if (!alive) return;

        console.error(
          "Error cargando novedades de Shopify:",
          error
        );

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
    setCurrentSlide((current) => Math.min(current, maxIndex));
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
    }, 4200);

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
    if (!product.handle) {
      console.warn(
        "No se encontró el handle Shopify del producto:",
        product
      );

      return;
    }

    navigate(
      `/tienda/${product.handle}`
    );
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#425530]">
      {/* Decoración orgánica del fondo */}
      <div
        className="
          pointer-events-none
          absolute -left-24 top-1/3
          h-72 w-72
          rounded-full
          bg-[#81976b]/20
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute -right-20 bottom-10
          h-80 w-80
          rounded-full
          bg-[#b8c8a5]/15
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute left-1/2 top-1/2
          h-96 w-96
          -translate-x-1/2 -translate-y-1/2
          rounded-full
          bg-white/[0.025]
          blur-3xl
        "
      />

      {/* Separador superior */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 490"
        preserveAspectRatio="none"
        className="
          relative z-10
          -mb-[1px]
          block h-28 w-full
          bg-[#f7f5ef]
          sm:h-36
          md:h-44
          lg:h-52
        "
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
      <div
        className="
          container relative z-10
          mx-auto
          px-4 pb-14 pt-6
          sm:px-6
          md:pb-16 md:pt-8
        "
      >
        {/* Título */}
        <div className="mb-9 text-center">
          <span
            className="
              text-[10px]
              font-semibold uppercase
              tracking-[0.28em]
              text-[#c9d6bc]
              sm:text-xs
            "
          >
            Recién llegados
          </span>

          <h2
            className="
              roboto-title
              mt-3
              text-2xl text-white
              sm:text-3xl
              md:text-4xl
            "
          >
            Descubre nuestras novedades
          </h2>

          <div
            className="
              mx-auto mt-4
              h-[2px] w-16
              rounded-full
              bg-[#a9bb95]
            "
          />
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <p className="text-center text-white/80">
              Cargando novedades…
            </p>
          </div>
        ) : slidesData.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center">
            <p className="text-center text-white/80">
              Próximamente encontrarás aquí nuestros productos más recientes.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Contenedor exterior translúcido */}
            <div
              className="
                rounded-[2rem]
                border border-white/15
                bg-white/10
                px-3 py-4
                shadow-[0_25px_70px_rgba(20,35,12,0.28)]
                backdrop-blur-sm
                sm:px-5 sm:py-5
                md:px-7 md:py-7
              "
            >
              {/* Ventana visible */}
              <div className="relative overflow-hidden rounded-2xl">
                {/* Fila desplazable */}
                <div
                  className="
                    flex
                    transition-transform
                    duration-700
                    ease-in-out
                  "
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
                        group
                        w-full shrink-0
                        px-2 py-2
                        text-left
                        sm:w-1/2
                        lg:w-1/4
                      "
                      aria-label={`Ver ${product.name}`}
                    >
                      <div
                        className="
                          flex h-full flex-col
                          overflow-hidden
                          rounded-2xl
                          border border-white/70
                          bg-[#fffefa]
                          shadow-[0_10px_30px_rgba(34,51,24,0.12)]
                          transition-all duration-300
                          hover:-translate-y-2
                          hover:shadow-[0_20px_45px_rgba(34,51,24,0.22)]
                        "
                      >
                        {/* Imagen */}
                        <div
                          className="
                            relative
                            flex h-48
                            items-center justify-center
                            overflow-hidden
                            bg-gradient-to-b
                            from-[#faf9f4]
                            to-white
                            p-5
                            sm:h-52
                            lg:h-56
                          "
                        >
                          {/* Círculo decorativo */}
                          <div
                            className="
                              absolute
                              h-36 w-36
                              rounded-full
                              bg-[#e8ede2]/70
                              transition duration-500
                              group-hover:scale-110
                              sm:h-40 sm:w-40
                            "
                          />

                          <img
                            src={
                              product.img?.trim()
                                ? product.img
                                : "https://via.placeholder.com/600x600?text=Producto"
                            }
                            alt={product.name}
                            className="
                              relative z-10
                              h-full w-full
                              object-contain
                              transition-transform
                              duration-500
                              group-hover:scale-105
                            "
                            loading="lazy"
                          />
                        </div>

                        {/* Información */}
                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          {/* Nombre del producto */}
                          <h3
                            className="
                              line-clamp-2
                              min-h-11
                              text-base
                              font-semibold
                              leading-[1.35]
                              text-[#1f2819]
                              transition-colors
                              group-hover:text-[#425530]
                              sm:text-[17px]
                            "
                          >
                            {product.name}
                          </h3>

                          {/* Marca */}
                          <p
                            className="
                              mt-2
                              truncate
                              text-sm
                              font-normal
                              text-[#7c8773]
                            "
                          >
                            {product.brand || "Sin marca"}
                          </p>

                          {/* Precio */}
                          <div className="mt-auto pt-4">
                            <span
                              className="
                                block
                                text-xl
                                font-bold
                                leading-none
                                text-[#354526]
                                lg:text-2xl
                              "
                            >
                              {formatEUR(product.price)}
                            </span>
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
                flex h-11 w-11
                -translate-y-1/2
                items-center justify-center
                rounded-full
                border border-white/30
                bg-[#314122]/90
                text-white
                shadow-lg
                backdrop-blur-sm
                transition-all duration-300
                hover:scale-110
                hover:bg-white
                hover:text-[#425530]
                md:-left-5
                lg:-left-6
                ${
                  currentSlide === 0
                    ? "cursor-not-allowed opacity-35 hover:scale-100 hover:bg-[#314122]/90 hover:text-white"
                    : ""
                }
              `}
              aria-label="Anterior"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="block h-5 w-5"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* Botón siguiente */}
            <button
              type="button"
              onClick={next}
              disabled={currentSlide >= maxIndex}
              className={`
                absolute right-1 top-1/2 z-20
                flex h-11 w-11
                -translate-y-1/2
                items-center justify-center
                rounded-full
                border border-white/30
                bg-[#314122]/90
                text-white
                shadow-lg
                backdrop-blur-sm
                transition-all duration-300
                hover:scale-110
                hover:bg-white
                hover:text-[#425530]
                md:-right-5
                lg:-right-6
                ${
                  currentSlide >= maxIndex
                    ? "cursor-not-allowed opacity-35 hover:scale-100 hover:bg-[#314122]/90 hover:text-white"
                    : ""
                }
              `}
              aria-label="Siguiente"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="block h-5 w-5"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Indicadores */}
            {maxIndex > 0 && (
              <div className="mt-7 flex justify-center gap-2">
                {Array.from({
                  length: maxIndex + 1,
                }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`
                      rounded-full
                      transition-all
                      duration-300
                      ${
                        currentSlide === index
                          ? "h-2.5 w-7 bg-white"
                          : "h-2.5 w-2.5 bg-white/35 hover:bg-white/70"
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