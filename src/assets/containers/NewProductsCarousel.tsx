import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type NewProduct = {
  id: number;
  slug: string | null;
  name: string;
  brand: string;
  price: number;
  img: string | null;
  stock: number | null;
  published_at: string;
};

const formatEUR = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const formatPublishedDate = (dateValue: string) => {
  const publishedDate = new Date(dateValue);
  const now = new Date();

  const differenceMilliseconds =
    now.getTime() - publishedDate.getTime();

  const differenceDays = Math.max(
    0,
    Math.floor(differenceMilliseconds / 86_400_000)
  );

  if (differenceDays === 0) {
    return "Nuevo hoy";
  }

  if (differenceDays === 1) {
    return "Añadido ayer";
  }

  if (differenceDays < 7) {
    return `Hace ${differenceDays} días`;
  }

  if (differenceDays < 30) {
    const weeks = Math.floor(differenceDays / 7);

    return weeks === 1
      ? "Hace 1 semana"
      : `Hace ${weeks} semanas`;
  }

  return "Novedad";
};

const NewProductsCarousel: React.FC = () => {
  const navigate = useNavigate();

  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [products, setProducts] = useState<NewProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleProducts, setVisibleProducts] = useState(1);
  const [productWidth, setProductWidth] = useState(0);

  // ============================================================
  // RESPONSIVE Y MEDIDA EXACTA DE CADA CARD
  // ============================================================

  useEffect(() => {
    const updateDimensions = () => {
      let nextVisibleProducts = 1;

      if (window.innerWidth >= 1024) {
        nextVisibleProducts = 4;
      } else if (window.innerWidth >= 640) {
        nextVisibleProducts = 2;
      }

      setVisibleProducts(nextVisibleProducts);

      if (viewportRef.current) {
        const viewportWidth =
          viewportRef.current.getBoundingClientRect().width;

        setProductWidth(
          viewportWidth / nextVisibleProducts
        );
      }
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions);

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener(
        "resize",
        updateDimensions
      );

      resizeObserver.disconnect();
    };
  }, []);

  // ============================================================
  // CARGAR NOVEDADES
  // ============================================================

  useEffect(() => {
    let alive = true;

    const loadNewProducts = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("public_products")
          .select(
            `
              id,
              slug,
              name,
              brand,
              price,
              img,
              stock,
              published_at
            `
          )
          .not("published_at", "is", null)
          .gt("stock", 0)
          .order("published_at", {
            ascending: false,
          })
          .limit(12);

        if (!alive) return;

        if (error) {
          throw error;
        }

        const normalizedProducts: NewProduct[] = (
          data ?? []
        ).map((product: any) => ({
          id: Number(product.id),

          slug:
            product.slug === null ||
            product.slug === undefined
              ? null
              : String(product.slug),

          name: String(product.name ?? ""),

          brand: String(product.brand ?? ""),

          price: Number(product.price ?? 0),

          img:
            product.img === null ||
            product.img === undefined
              ? null
              : String(product.img),

          stock:
            product.stock === null ||
            product.stock === undefined
              ? null
              : Number(product.stock),

          published_at: String(product.published_at),
        }));

        setProducts(normalizedProducts);
      } catch (error) {
        if (!alive) return;

        console.error(
          "Error cargando las novedades:",
          error
        );

        setProducts([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadNewProducts();

    return () => {
      alive = false;
    };
  }, []);

  // ============================================================
  // ÍNDICE MÁXIMO
  // ============================================================

  const maxIndex = useMemo(() => {
    return Math.max(
      0,
      products.length - visibleProducts
    );
  }, [products.length, visibleProducts]);

  useEffect(() => {
    setCurrentIndex((current) =>
      Math.min(current, maxIndex)
    );
  }, [maxIndex]);

  // ============================================================
  // AUTOPLAY
  // ============================================================

  useEffect(() => {
    if (products.length <= visibleProducts) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((previous) =>
        previous >= maxIndex ? 0 : previous + 1
      );
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    products.length,
    visibleProducts,
    maxIndex,
  ]);

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const previous = () => {
    setCurrentIndex((current) =>
      Math.max(current - 1, 0)
    );
  };

  const next = () => {
    setCurrentIndex((current) =>
      Math.min(current + 1, maxIndex)
    );
  };

  const goTo = (index: number) => {
    setCurrentIndex(
      Math.min(Math.max(index, 0), maxIndex)
    );
  };

  const openProduct = (product: NewProduct) => {
    const slug = (product.slug ?? "").trim();

    if (slug) {
      navigate(`/shopping/${slug}-${product.id}`);
      return;
    }

    navigate(`/shopping/${product.id}`);
  };

  return (
    <section className="w-full overflow-hidden bg-[#f7f5ef]">
      {/* =======================================================
          ONDA SUPERIOR
          Conecta el verde de Más vendidos con el beige
      ======================================================= */}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
        className="-mb-[1px] block h-20 w-full bg-[#425530] sm:h-24 md:h-32"
        aria-hidden="true"
      >
        <path
          d="
            M0,80
            C120,120 220,130 340,100
            C460,70 540,55 650,85
            C760,115 840,125 950,90
            C1060,55 1160,45 1260,70
            C1340,90 1395,105 1440,110
            L1440,260
            L0,260
            Z
          "
          fill="#dedfd4"
        />

        <path
          d="
            M0,125
            C115,155 215,165 325,140
            C435,115 530,90 645,115
            C760,140 850,155 965,125
            C1080,95 1175,85 1280,110
            C1350,127 1400,140 1440,145
            L1440,260
            L0,260
            Z
          "
          fill="#f7f5ef"
        />
      </svg>

      {/* =======================================================
          CONTENIDO DE NOVEDADES
      ======================================================= */}

      <div className="container mx-auto px-4 pb-16 pt-8 sm:px-6 md:pt-10">
        <div className="mb-9 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#75815d]">
            Recién llegados
          </p>

          <h2 className="roboto-title text-2xl text-[#25331c] md:text-3xl">
            Descubre nuestras novedades
          </h2>
        </div>

        {loading ? (
          <p className="text-center text-[#5f694f]">
            Cargando novedades…
          </p>
        ) : products.length === 0 ? (
          <p className="text-center text-[#5f694f]">
            Próximamente encontrarás aquí nuestros
            productos más recientes.
          </p>
        ) : (
          <div className="relative">
            {/* Marco beige alrededor de las cards */}
            <div
              className="
                rounded-3xl border border-[#d5d9ca]
                bg-[#e8e5da]
                px-4 py-5 shadow-lg
                sm:px-5
                md:px-6 md:py-6
              "
            >
              {/* Ventana visible */}
              <div
                ref={viewportRef}
                className="relative w-full overflow-hidden rounded-2xl"
              >
                {/* Fila desplazable */}
                <div
                  className="
                    flex will-change-transform
                    transition-transform duration-500
                    ease-in-out
                  "
                  style={{
                    transform: `translate3d(-${
                      currentIndex * productWidth
                    }px, 0, 0)`,
                  }}
                >
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        openProduct(product)
                      }
                      aria-label={`Ver ${product.name}`}
                      className="shrink-0 px-2 py-2 text-left"
                      style={{
                        width:
                          productWidth > 0
                            ? `${productWidth}px`
                            : `${
                                100 / visibleProducts
                              }%`,

                        minWidth:
                          productWidth > 0
                            ? `${productWidth}px`
                            : `${
                                100 / visibleProducts
                              }%`,
                      }}
                    >
                      <article
                        className="
                          group relative flex h-full flex-col
                          overflow-hidden rounded-xl
                          border border-[#dfe3d5]
                          bg-white shadow-sm
                          transition duration-300
                          hover:-translate-y-1
                          hover:border-[#8a9d76]
                          hover:shadow-xl
                        "
                      >
                        {/* Etiqueta de novedad */}
                        <span
                          className="
                            absolute left-3 top-3 z-10
                            rounded-full bg-[#425530]
                            px-3 py-1
                            text-[10px] font-semibold
                            uppercase tracking-[0.12em]
                            text-white shadow-sm
                            transition duration-300
                            group-hover:scale-105
                          "
                        >
                          {formatPublishedDate(
                            product.published_at
                          )}
                        </span>

                        {/* Imagen */}
                        <div className="flex h-48 items-center justify-center bg-white p-4 pt-10 sm:h-52 lg:h-56">
                          <img
                            src={
                              product.img?.trim()
                                ? product.img
                                : "https://via.placeholder.com/600x600?text=Producto"
                            }
                            alt={product.name}
                            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        </div>

                        {/* Información */}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-5 text-gray-900">
                            {product.name}
                          </h3>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {product.brand || "Sin marca"}
                          </p>

                          <p className="mt-auto pt-3 text-base font-semibold text-[#25331c]">
                            {formatEUR(product.price)}
                          </p>
                        </div>
                      </article>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botón anterior */}
            <button
              type="button"
              onClick={previous}
              disabled={currentIndex === 0}
              className={`
                absolute left-1 top-1/2 z-20
                flex h-10 w-10 -translate-y-1/2
                items-center justify-center
                rounded-full bg-[#425530]
                text-2xl text-white shadow-md
                transition
                hover:scale-105 hover:bg-[#354626]
                md:-left-12
                ${
                  currentIndex === 0
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
              disabled={currentIndex >= maxIndex}
              className={`
                absolute right-1 top-1/2 z-20
                flex h-10 w-10 -translate-y-1/2
                items-center justify-center
                rounded-full bg-[#425530]
                text-2xl text-white shadow-md
                transition
                hover:scale-105 hover:bg-[#354626]
                md:-right-12
                ${
                  currentIndex >= maxIndex
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
                      rounded-full transition-all
                      duration-300
                      ${
                        currentIndex === index
                          ? "h-2.5 w-6 bg-[#425530]"
                          : "h-2.5 w-2.5 bg-[#c8cdbd] hover:bg-[#8a9d76]"
                      }
                    `}
                    aria-label={`Ir a la posición ${
                      index + 1
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =======================================================
          ONDA INFERIOR
          Conecta el beige con Visita nuestra tienda
      ======================================================= */}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        className="-mb-[1px] block h-20 w-full bg-[#f7f5ef] md:h-28"
        aria-hidden="true"
      >
        <path
          d="
            M0,115
            C120,80 210,145 330,120
            C450,95 520,55 650,90
            C780,125 845,150 970,110
            C1095,70 1180,95 1280,80
            C1350,70 1400,55 1440,45
            L1440,220
            L0,220
            Z
          "
          fill="#2f431f"
        />
      </svg>
    </section>
  );
};

export default NewProductsCarousel;