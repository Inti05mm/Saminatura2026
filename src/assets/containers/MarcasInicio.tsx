import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

type Brand = {
  id: number;
  name: string;
  image: string;
};

const AUTOPLAY_DELAY = 1800;
const TRANSITION_DURATION = 850;

const MarcasInicio: React.FC = () => {
  const navigate = useNavigate();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(
    null
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] =
    useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined"
      ? window.innerWidth
      : 1200
  );

  const resetTimerRef = useRef<number | null>(null);

  // ============================================================
  // DETECTAR TAMAÑO DE PANTALLA
  // ============================================================

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ============================================================
  // CARGAR MARCAS DESDE SUPABASE
  // ============================================================

  useEffect(() => {
    let alive = true;

    const mapRows = (rows: any[] | null): Brand[] =>
      (rows ?? [])
        .filter(
          (row) =>
            row &&
            row.id != null &&
            row.name &&
            row.image_url
        )
        .map((row) => ({
          id: Number(row.id),
          name: String(row.name),
          image: String(row.image_url),
        }));

    const loadBrands = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const { data, error } = await supabase
          .from("brands")
          .select(
            "id, name, image_url, is_active, sort_order, created_at"
          )
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          });

        if (!alive) return;

        if (error) {
          console.error("Error cargando marcas:", error);

          setBrands([]);
          setLoadError(
            `No se pudieron cargar las marcas. ${error.message}`
          );

          return;
        }

        const mappedBrands = mapRows(
          data as any[] | null
        );

        setBrands(mappedBrands);

        /*
          Empieza en la copia central para disponer
          de suficientes marcas a ambos lados.
        */
        setCurrentIndex(
          mappedBrands.length > 1
            ? mappedBrands.length * 2
            : 0
        );

        setIsTransitioning(false);

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (alive) {
              setIsTransitioning(true);
            }
          });
        });

        if (mappedBrands.length === 0) {
          setLoadError(
            "No hay marcas activas para mostrar."
          );
        }
      } catch (error: any) {
        if (!alive) return;

        console.error(
          "Error inesperado cargando marcas:",
          error
        );

        setBrands([]);

        setLoadError(
          error?.message ??
            "Se produjo un error cargando las marcas."
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadBrands();

    return () => {
      alive = false;

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  // ============================================================
  // CONFIGURACIÓN RESPONSIVE
  // ============================================================

  const carouselConfig = useMemo(() => {
    if (screenWidth < 480) {
      return {
        itemSize: 100,

        // Distancia centro → primera lateral
        centerGap: 94,

        // Distancia entre las demás pequeñas
        outerGap: 68,

        carouselHeight: 150,
        sectionPadding: "py-10",
      };
    }

    if (screenWidth < 640) {
      return {
        itemSize: 108,
        centerGap: 102,
        outerGap: 74,
        carouselHeight: 160,
        sectionPadding: "py-10",
      };
    }

    if (screenWidth < 1024) {
      return {
        itemSize: 124,
        centerGap: 124,
        outerGap: 88,
        carouselHeight: 180
      };
    }

    return {
      itemSize: 148,

      /*
        Espacio entre la marca central y
        las dos marcas laterales inmediatas.
      */
      centerGap: 152,

      /*
        Espacio más reducido entre
        el resto de marcas pequeñas.
      */
      outerGap: 104,

      carouselHeight: 205,
      sectionPadding: "py-12",
    };
  }, [screenWidth]);

  // ============================================================
  // CINCO COPIAS PARA EL BUCLE INFINITO
  // ============================================================

  const loopBrands = useMemo(() => {
    if (brands.length === 0) {
      return [];
    }

    if (brands.length === 1) {
      return brands;
    }

    return [
      ...brands,
      ...brands,
      ...brands,
      ...brands,
      ...brands,
    ];
  }, [brands]);

  // ============================================================
  // MARCA ACTIVA REAL
  // ============================================================

  const activeBrandIndex = useMemo(() => {
    if (brands.length === 0) {
      return 0;
    }

    return (
      ((currentIndex % brands.length) +
        brands.length) %
      brands.length
    );
  }, [brands.length, currentIndex]);

  const activeBrand =
    brands[activeBrandIndex] ?? null;

  // ============================================================
  // REINICIO INVISIBLE DEL BUCLE
  // ============================================================

  const resetWithoutAnimation = (
    newIndex: number
  ) => {
    setIsTransitioning(false);
    setCurrentIndex(newIndex);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
    });
  };

  useEffect(() => {
    if (
      brands.length <= 1 ||
      !isTransitioning
    ) {
      return;
    }

    const shouldResetRight =
      currentIndex >= brands.length * 3;

    const shouldResetLeft =
      currentIndex < brands.length * 2;

    if (!shouldResetRight && !shouldResetLeft) {
      return;
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      if (shouldResetRight) {
        resetWithoutAnimation(
          currentIndex - brands.length
        );
      } else {
        resetWithoutAnimation(
          currentIndex + brands.length
        );
      }
    }, TRANSITION_DURATION + 30);

    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [
    brands.length,
    currentIndex,
    isTransitioning,
  ]);

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const nextBrand = () => {
    if (brands.length <= 1) return;

    setIsTransitioning(true);
    setCurrentIndex((previous) => previous + 1);
  };

  const previousBrand = () => {
    if (brands.length <= 1) return;

    setIsTransitioning(true);
    setCurrentIndex((previous) => previous - 1);
  };

  // ============================================================
  // AUTOPLAY
  // ============================================================

  useEffect(() => {
    if (
      brands.length <= 1 ||
      isPaused
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      nextBrand();
    }, AUTOPLAY_DELAY);

    return () => {
      window.clearInterval(interval);
    };
  }, [brands.length, isPaused]);

  // ============================================================
  // ABRIR PRODUCTOS DE UNA MARCA
  // ============================================================

  const openBrand = (brandName: string) => {
    const params = new URLSearchParams({
      brand: brandName,
    });

    navigate(
      `/shopping?${params.toString()}#products`
    );
  };

  // ============================================================
  // BUSCAR COPIA MÁS CERCANA DE UNA MARCA
  // ============================================================

  const getNearestCopyIndex = (
    brandIndex: number
  ) => {
    const middleBase = brands.length * 2;

    const candidates = [
      middleBase + brandIndex - brands.length,
      middleBase + brandIndex,
      middleBase + brandIndex + brands.length,
    ];

    return candidates.reduce(
      (nearest, candidate) =>
        Math.abs(candidate - currentIndex) <
        Math.abs(nearest - currentIndex)
          ? candidate
          : nearest,
      candidates[0]
    );
  };

  // ============================================================
  // CENTRAR MARCA PULSADA
  // ============================================================

  const handleBrandClick = (
    brand: Brand,
    index: number
  ) => {
    if (index === currentIndex) {
      openBrand(brand.name);
      return;
    }

    const realIndex =
      ((index % brands.length) +
        brands.length) %
      brands.length;

    setIsTransitioning(true);
    setCurrentIndex(
      getNearestCopyIndex(realIndex)
    );
  };

  // ============================================================
  // IR A MARCA DESDE INDICADOR
  // ============================================================

  const goToBrand = (
    brandIndex: number
  ) => {
    if (brands.length <= 1) return;

    setIsTransitioning(true);
    setCurrentIndex(
      getNearestCopyIndex(brandIndex)
    );
  };

  // ============================================================
  // POSICIÓN HORIZONTAL
  // ============================================================

  const getHorizontalPosition = (
    index: number
  ) => {
    const difference = index - currentIndex;
    const distance = Math.abs(difference);

    if (distance === 0) {
      return 0;
    }

    /*
      Primera marca lateral:
      usa centerGap para dejar aire junto al círculo grande.

      Resto de marcas:
      añade outerGap, que es más pequeño,
      para mantenerlas más juntas.
    */
    const absolutePosition =
      carouselConfig.centerGap +
      Math.max(0, distance - 1) *
        carouselConfig.outerGap;

    return difference < 0
      ? -absolutePosition
      : absolutePosition;
  };

  // ============================================================
  // ESCALA SEGÚN DISTANCIA AL CENTRO
  // ============================================================

  const getScale = (
    index: number
  ) => {
    const distance = Math.abs(
      index - currentIndex
    );

    if (distance === 0) return 1;
    if (distance === 1) return 0.7;
    if (distance === 2) return 0.57;
    if (distance === 3) return 0.48;
    if (distance === 4) return 0.41;

    return 0.35;
  };

  // ============================================================
  // OPACIDAD SEGÚN DISTANCIA
  // ============================================================

  const getOpacity = (
    index: number
  ) => {
    const distance = Math.abs(
      index - currentIndex
    );

    if (distance === 0) return 1;
    if (distance === 1) return 0.92;
    if (distance === 2) return 0.8;
    if (distance === 3) return 0.68;
    if (distance === 4) return 0.56;
    if (distance === 5) return 0.44;

    return 0.3;
  };

  // ============================================================
  // OCULTAR COPIAS MUY LEJANAS
  // ============================================================

  const maximumVisibleDistance = useMemo(() => {
    if (screenWidth < 480) return 3;
    if (screenWidth < 640) return 4;
    if (screenWidth < 1024) return 6;

    return 10;
  }, [screenWidth]);

  return (
    <section
      className={`
        relative w-full overflow-hidden
        bg-[#f7f5ef]
        ${carouselConfig.sectionPadding}
      `}
    >
      {/* Decoración izquierda */}
      <div
        className="
          pointer-events-none
          absolute -left-20 top-0
          h-56 w-56
          rounded-full
          bg-[#9caf88]/15
          blur-3xl
        "
      />

      {/* Decoración derecha */}
      <div
        className="
          pointer-events-none
          absolute -right-20 bottom-0
          h-56 w-56
          rounded-full
          bg-[#425530]/10
          blur-3xl
        "
      />

      {/* Cabecera */}
      <div
        className="
          relative z-10
          mb-3 text-center
          sm:mb-4
        "
      >
        <span
          className="
            text-[9px]
            font-semibold uppercase
            tracking-[0.3em]
            text-[#7f9270]
            sm:text-[10px]
          "
        >
          Calidad y bienestar
        </span>

        <h2
          className="
            roboto-title
            mt-2
            text-2xl
            text-[#2f3d24]
            sm:text-3xl
            md:text-4xl
          "
        >
          Tus marcas favoritas
        </h2>

        <div
          className="
            mx-auto mt-3
            h-[2px] w-14
            rounded-full
            bg-[#8fa17f]
          "
        />
      </div>

      {loading ? (
        <div
          className="
            flex h-40
            items-center justify-center
            text-[#6f7869]
          "
        >
          Cargando marcas...
        </div>
      ) : brands.length === 0 ? (
        <div
          className="
            flex h-40 flex-col
            items-center justify-center
            px-4 text-center
            text-[#6f7869]
          "
        >
          <p>
            Aún no hay marcas para mostrar.
          </p>

          {loadError && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-red-600">
              {loadError}
            </p>
          )}
        </div>
      ) : (
        <>
          {loadError && (
            <div className="mb-3 px-4 text-center">
              <p className="whitespace-pre-wrap text-xs text-amber-700">
                {loadError}
              </p>
            </div>
          )}

          {/* Carrusel */}
          <div
            className="
              relative w-full overflow-hidden
            "
            style={{
              height: `${carouselConfig.carouselHeight}px`,
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Degradado izquierdo */}
            <div
              className="
                pointer-events-none
                absolute inset-y-0 left-0
                z-30 w-8
                bg-gradient-to-r
                from-[#f7f5ef]
                to-transparent
                sm:w-14
              "
            />

            {/* Degradado derecho */}
            <div
              className="
                pointer-events-none
                absolute inset-y-0 right-0
                z-30 w-8
                bg-gradient-to-l
                from-[#f7f5ef]
                to-transparent
                sm:w-14
              "
            />

            {/* Marcas posicionadas respecto al centro */}
            {loopBrands.map((brand, index) => {
              const distance = Math.abs(
                index - currentIndex
              );

              if (
                distance >
                maximumVisibleDistance
              ) {
                return null;
              }

              const isActive =
                index === currentIndex;

              const horizontalPosition =
                getHorizontalPosition(index);

              const scale = getScale(index);
              const opacity = getOpacity(index);

              return (
                <button
                  key={`${brand.id}-${index}`}
                  type="button"
                  onClick={() =>
                    handleBrandClick(
                      brand,
                      index
                    )
                  }
                  className="
                    group absolute
                    left-1/2 top-1/2
                    rounded-full
                    focus:outline-none
                    will-change-transform
                  "
                  style={{
                    width: `${carouselConfig.itemSize}px`,
                    height: `${carouselConfig.itemSize}px`,

                    transform: `
                      translate3d(
                        calc(
                          -50% + ${horizontalPosition}px
                        ),
                        -50%,
                        0
                      )
                      scale(${scale})
                    `,

                    opacity,

                    zIndex: isActive
                      ? 20
                      : Math.max(
                          1,
                          15 - distance
                        ),

                    transition: isTransitioning
                      ? `
                        transform ${TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1),
                        opacity ${TRANSITION_DURATION}ms ease
                      `
                      : "none",
                  }}
                  title={
                    isActive
                      ? `Ver productos de ${brand.name}`
                      : `Centrar ${brand.name}`
                  }
                  aria-label={
                    isActive
                      ? `Ver productos de la marca ${brand.name}`
                      : `Centrar la marca ${brand.name}`
                  }
                >
                  {/* Halo de la marca central */}
                  <div
                    className={`
                      pointer-events-none
                      absolute -inset-3
                      rounded-full
                      ${
                        isActive
                          ? "scale-100 border border-[#829773]/25 bg-[#9caf88]/10 opacity-100 shadow-[0_15px_38px_rgba(58,78,40,0.18)]"
                          : "scale-90 border border-transparent opacity-0"
                      }
                    `}
                    style={{
                      transition: `
                        transform ${TRANSITION_DURATION}ms ease,
                        opacity ${TRANSITION_DURATION}ms ease,
                        box-shadow ${TRANSITION_DURATION}ms ease
                      `,
                    }}
                  />

                  {/* Círculo */}
                  <div
                    className={`
                      relative
                      flex h-full w-full
                      items-center justify-center
                      overflow-hidden
                      rounded-full
                      border bg-white
                      ${
                        isActive
                          ? "border-[#829773]/40 shadow-[0_14px_35px_rgba(54,73,38,0.2)]"
                          : "border-[#425530]/10 shadow-[0_6px_18px_rgba(54,73,38,0.1)]"
                      }
                    `}
                    style={{
                      transition: `
                        border-color ${TRANSITION_DURATION}ms ease,
                        box-shadow ${TRANSITION_DURATION}ms ease
                      `,
                    }}
                  >
                    <div
                      className="
                        pointer-events-none
                        absolute inset-2
                        rounded-full
                        bg-[#c7d2bf]
                      "
                    />

                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="
                        relative z-10
                        h-full w-full
                        object-contain
                        p-5
                        transition-transform
                        duration-500
                        group-hover:scale-105
                      "
                      loading="lazy"
                      onError={(event) => {
                        console.error(
                          "Error cargando imagen de marca:",
                          brand.name,
                          brand.image
                        );

                        event.currentTarget.src =
                          "https://via.placeholder.com/200?text=Marca";
                      }}
                    />
                  </div>
                </button>
              );
            })}

            {/* Flecha anterior */}
            {brands.length > 1 && (
              <button
                type="button"
                onClick={previousBrand}
                className="
                  absolute left-3 top-1/2 z-40
                  flex h-9 w-9
                  -translate-y-1/2
                  items-center justify-center
                  rounded-full
                  border border-[#425530]/10
                  bg-white/90
                  text-[#425530]
                  shadow-md
                  backdrop-blur-sm
                  transition-all duration-300
                  hover:scale-110
                  hover:bg-[#425530]
                  hover:text-white
                  sm:left-7
                  sm:h-10 sm:w-10
                "
                aria-label="Marca anterior"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Flecha siguiente */}
            {brands.length > 1 && (
              <button
                type="button"
                onClick={nextBrand}
                className="
                  absolute right-3 top-1/2 z-40
                  flex h-9 w-9
                  -translate-y-1/2
                  items-center justify-center
                  rounded-full
                  border border-[#425530]/10
                  bg-white/90
                  text-[#425530]
                  shadow-md
                  backdrop-blur-sm
                  transition-all duration-300
                  hover:scale-110
                  hover:bg-[#425530]
                  hover:text-white
                  sm:right-7
                  sm:h-10 sm:w-10
                "
                aria-label="Marca siguiente"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Información de la marca central */}
          {activeBrand && (
            <div className="-mt-1 text-center">
              <p
                key={activeBrand.id}
                className="
                  text-base font-semibold
                  text-[#314122]
                  sm:text-lg
                "
              >
                {activeBrand.name}
              </p>

              <button
                type="button"
                onClick={() =>
                  openBrand(activeBrand.name)
                }
                className="
                  mt-1
                  inline-flex items-center
                  gap-1.5
                  text-[10px]
                  font-semibold uppercase
                  tracking-[0.15em]
                  text-[#7b8e6c]
                  transition-colors
                  hover:text-[#425530]
                "
              >
                Ver productos

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Indicadores */}
          {brands.length > 1 && (
            <div className="mt-4 flex justify-center gap-1.5">
              {brands.map((brand, index) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() =>
                    goToBrand(index)
                  }
                  className={`
                    rounded-full
                    transition-all duration-300
                    ${
                      activeBrandIndex === index
                        ? "h-1.5 w-5 bg-[#425530]"
                        : "h-1.5 w-1.5 bg-[#425530]/25 hover:bg-[#425530]/50"
                    }
                  `}
                  aria-label={`Mostrar ${brand.name}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default MarcasInicio;