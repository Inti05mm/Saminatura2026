import { useEffect, useMemo, useState } from "react";

type FloatingItem = {
  id: string;
  image: string;
  alt: string;
  size: number;
  top: string;
  left: string;
  rotate?: number;
  blur?: number;
  opacity?: number;
  zIndex?: number;
  driftX?: number;
  driftY?: number;
};

type HeroSlide = {
  id: string;
  category: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  floatingItems: FloatingItem[];
};

const slides: HeroSlide[] = [
  {
    id: "comida",
    category: "Comida",
    bgColor: "#f7f2e9",
    textColor: "#8c6b3f",
    accentColor: "#c28a45",
    floatingItems: [
      {
        id: "food-1",
        image: "/oat1.png",
        alt: "Elemento comida 1",
        size: 165,
        top: "16%",
        left: "12%",
        rotate: -18,
        blur: 2.4,
        opacity: 0.72,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "food-2",
        image: "/oat2.png",
        alt: "Elemento comida 2",
        size: 92,
        top: "18%",
        left: "84%",
        rotate: 14,
        blur: 0,
        opacity: 0.94,
        zIndex: 2,
        driftX: -10,
        driftY: -15,
      },
      {
        id: "food-3",
        image: "/oat2.png",
        alt: "Elemento comida 3",
        size: 145,
        top: "76%",
        left: "18%",
        rotate: -12,
        blur: 1.6,
        opacity: 0.76,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "food-4",
        image: "/oat1.png",
        alt: "Elemento comida 4",
        size: 86,
        top: "70%",
        left: "82%",
        rotate: 18,
        blur: 0,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
  {
    id: "deporte",
    category: "Deporte",
    bgColor: "#f1f3f0",
    textColor: "#5f6d4f",
    accentColor: "#798c61",
    floatingItems: [
      {
        id: "sport-1",
        image: "/gym.png",
        alt: "Elemento deporte 1",
        size: 150,
        top: "15%",
        left: "12%",
        rotate: -18,
        blur: 2.4,
        opacity: 0.72,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "sport-2",
        image: "/gym.png",
        alt: "Elemento deporte 2",
        size: 88,
        top: "17%",
        left: "84%",
        rotate: 12,
        blur: 0,
        opacity: 0.94,
        zIndex: 2,
        driftX: -9,
        driftY: -15,
      },
      {
        id: "sport-3",
        image: "/gym.png",
        alt: "Elemento deporte 3",
        size: 122,
        top: "76%",
        left: "18%",
        rotate: -12,
        blur: 0,
        opacity: 0.76,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "sport-4",
        image: "/gym.png",
        alt: "Elemento deporte 4",
        size: 172,
        top: "70%",
        left: "82%",
        rotate: 18,
        blur: 1.2,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
  {
    id: "suplementos",
    category: "Suplementos",
    bgColor: "#f4f6ef",
    textColor: "#6d7744",
    accentColor: "#8a9955",
    floatingItems: [
      {
        id: "supp-1",
        image: "/pill.png",
        alt: "Elemento suplementos 1",
        size: 152,
        top: "15%",
        left: "12%",
        rotate: -18,
        blur: 2.4,
        opacity: 0.72,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "supp-2",
        image: "/pill.png",
        alt: "Elemento suplementos 2",
        size: 84,
        top: "18%",
        left: "84%",
        rotate: 12,
        blur: 0,
        opacity: 0.94,
        zIndex: 2,
        driftX: -8,
        driftY: -15,
      },
      {
        id: "supp-3",
        image: "/pill.png",
        alt: "Elemento suplementos 3",
        size: 126,
        top: "76%",
        left: "18%",
        rotate: -14,
        blur: 1.6,
        opacity: 0.76,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "supp-4",
        image: "/pill.png",
        alt: "Elemento suplementos 4",
        size: 172,
        top: "70%",
        left: "82%",
        rotate: 18,
        blur: 1.5,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
  {
    id: "cosmetica-higiene",
    category: "Cosmética e higiene",
    bgColor: "#f7eee9",
    textColor: "#8d6d64",
    accentColor: "#b98a7f",
    floatingItems: [
      {
        id: "beauty-1",
        image: "/petal.png",
        alt: "Elemento cosmética 1",
        size: 165,
        top: "15%",
        left: "12%",
        rotate: -16,
        blur: 2.5,
        opacity: 0.74,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "beauty-2",
        image: "/petal.png",
        alt: "Elemento cosmética 2",
        size: 86,
        top: "18%",
        left: "84%",
        rotate: 12,
        blur: 0,
        opacity: 0.94,
        zIndex: 2,
        driftX: -8,
        driftY: -15,
      },
      {
        id: "beauty-3",
        image: "/petal.png",
        alt: "Elemento cosmética 3",
        size: 138,
        top: "76%",
        left: "18%",
        rotate: -8,
        blur: 1.8,
        opacity: 0.72,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "beauty-4",
        image: "/petal.png",
        alt: "Elemento cosmética 4",
        size: 84,
        top: "70%",
        left: "82%",
        rotate: 18,
        blur: 0,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
  {
    id: "granel",
    category: "Granel",
    bgColor: "#f8f3e8",
    textColor: "#8a7743",
    accentColor: "#b49b54",
    floatingItems: [
      {
        id: "bulk-1",
        image: "/almond.png",
        alt: "Elemento granel 1",
        size: 198,
        top: "15%",
        left: "12%",
        rotate: -18,
        blur: 2.6,
        opacity: 0.74,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "bulk-2",
        image: "/almond.png",
        alt: "Elemento granel 2",
        size: 132,
        top: "18%",
        left: "84%",
        rotate: 15,
        blur: 0,
        opacity: 0.94,
        zIndex: 2,
        driftX: -8,
        driftY: -15,
      },
      {
        id: "bulk-3",
        image: "/almond.png",
        alt: "Elemento granel 3",
        size: 125,
        top: "76%",
        left: "18%",
        rotate: -12,
        blur: 0.5,
        opacity: 0.76,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "bulk-4",
        image: "/almond2.png",
        alt: "Elemento granel 4",
        size: 158,
        top: "70%",
        left: "82%",
        rotate: 8,
        blur: 2.5,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
  {
    id: "infusiones",
    category: "Infusiones",
    bgColor: "#f4f1ea",
    textColor: "#6f7a58",
    accentColor: "#8d9970",
    floatingItems: [
      {
        id: "tea-1",
        image: "/tea.png",
        alt: "Elemento infusiones 1",
        size: 158,
        top: "15%",
        left: "12%",
        rotate: -18,
        blur: 2.5,
        opacity: 0.74,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "tea-2",
        image: "/tea2.png",
        alt: "Elemento infusiones 2",
        size: 82,
        top: "18%",
        left: "84%",
        rotate: 12,
        blur: 0,
        opacity: 0.94,
        zIndex: 2,
        driftX: -8,
        driftY: -15,
      },
      {
        id: "tea-3",
        image: "/tea2.png",
        alt: "Elemento infusiones 3",
        size: 136,
        top: "76%",
        left: "18%",
        rotate: -10,
        blur: 1.8,
        opacity: 0.76,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "tea-4",
        image: "/tea.png",
        alt: "Elemento infusiones 4",
        size: 86,
        top: "70%",
        left: "82%",
        rotate: 20,
        blur: 0,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
  {
    id: "refrigerados",
    category: "Refrigerados",
    bgColor: "#eef4f4",
    textColor: "#5d7c80",
    accentColor: "#7aa0a6",
    floatingItems: [
      {
        id: "cold-1",
        image: "/ice.png",
        alt: "Elemento refrigerados 1",
        size: 220,
        top: "15%",
        left: "12%",
        rotate: -14,
        blur: 2.4,
        opacity: 0.74,
        zIndex: 3,
        driftX: 14,
        driftY: -22,
      },
      {
        id: "cold-2",
        image: "/ice.png",
        alt: "Elemento refrigerados 2",
        size: 142,
        top: "18%",
        left: "84%",
        rotate: 14,
        blur: 0.2,
        opacity: 0.94,
        zIndex: 2,
        driftX: -8,
        driftY: -15,
      },
      {
        id: "cold-3",
        image: "/ice.png",
        alt: "Elemento refrigerados 3",
        size: 156,
        top: "76%",
        left: "18%",
        rotate: -10,
        blur: 0.5,
        opacity: 0.76,
        zIndex: 3,
        driftX: 12,
        driftY: -18,
      },
      {
        id: "cold-4",
        image: "/ice.png",
        alt: "Elemento refrigerados 4",
        size: 156,
        top: "70%",
        left: "82%",
        rotate: 18,
        blur: 1.5,
        opacity: 0.9,
        zIndex: 2,
        driftX: -10,
        driftY: -14,
      },
    ],
  },
];

const FLOAT_PHASE_MS = 3200;
const TRANSITION_MS = 1100;

type Phase = "float" | "transition";

export default function HeroSaminatura() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("float");

  const nextIndex = useMemo(
    () => (currentIndex + 1) % slides.length,
    [currentIndex]
  );

  const current = slides[currentIndex];
  const next = slides[nextIndex];

  useEffect(() => {
    if (phase === "float") {
      const timer = window.setTimeout(() => {
        setPhase("transition");
      }, FLOAT_PHASE_MS);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setCurrentIndex(nextIndex);
      setPhase("float");
    }, TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [phase, nextIndex]);

  return (
    <section
      className="relative w-full min-h-[620px] overflow-hidden rounded-[32px] md:min-h-[720px]"
      style={{
        backgroundColor:
          phase === "transition" ? next.bgColor : current.bgColor,
        transition: "background-color 900ms ease",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <h1
          className="hero-bg-word select-none text-center font-black uppercase tracking-[-0.08em]"
          style={{
            color: phase === "transition" ? next.textColor : current.textColor,
            opacity: 0.14,
            transition: "color 900ms ease",
          }}
        >
          SAMINATURA
        </h1>
      </div>

      {/* IMÁGENES ACTUALES */}
      <div className="pointer-events-none absolute inset-0">
        {current.floatingItems.map((item) => (
          <img
            key={`current-${current.id}-${item.id}`}
            src={item.image}
            alt={item.alt}
            className="absolute object-contain"
            style={{
              width: `${item.size}px`,
              top: item.top,
              left: item.left,
              filter: `blur(${item.blur ?? 0}px)`,
              opacity: item.opacity ?? 1,
              zIndex: item.zIndex ?? 1,
              ["--base-rotate" as any]: `${item.rotate ?? 0}deg`,
              ["--drift-x" as any]: `${item.driftX ?? 0}px`,
              ["--drift-y" as any]: `${item.driftY ?? -18}px`,
              animation:
                phase === "float"
                  ? "floatAround 3s ease-in-out infinite"
                  : `floatAway ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
            }}
          />
        ))}
      </div>

      {/* SIGUIENTES IMÁGENES */}
      {phase === "transition" && (
        <div className="pointer-events-none absolute inset-0">
          {next.floatingItems.map((item) => (
            <img
              key={`next-${next.id}-${item.id}`}
              src={item.image}
              alt={item.alt}
              className="absolute object-contain"
              style={{
                width: `${item.size}px`,
                top: item.top,
                left: item.left,
                filter: `blur(${item.blur ?? 0}px)`,
                opacity: item.opacity ?? 1,
                zIndex: item.zIndex ?? 1,
                ["--base-rotate" as any]: `${item.rotate ?? 0}deg`,
                animation: `floatEnter ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex min-h-[620px] flex-col items-center justify-end px-6 pb-16 pt-14 md:min-h-[720px] md:pb-24">
        <div className="text-center text-black">
          <p
            className="text-sm uppercase tracking-[0.28em] text-black/45"
            style={{
              transition: "opacity 500ms ease, transform 500ms ease",
              opacity: 1,
              transform: "translateY(0)",
            }}
          >
            Tienda natural
          </p>

          <h2
            key={phase === "transition" ? next.id : current.id}
            className="mt-4 text-4xl font-semibold md:text-6xl"
            style={{
              animation:
                phase === "transition"
                  ? `textSwap ${TRANSITION_MS}ms ease forwards`
                  : "none",
            }}
          >
            {phase === "transition" ? next.category : current.category}
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {slides.map((slide, index) => {
            const activeDot =
              phase === "transition" ? index === nextIndex : index === currentIndex;

            return (
              <span
                key={slide.id}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  activeDot ? "w-8" : "w-2.5"
                }`}
                style={{
                  backgroundColor: activeDot
                    ? phase === "transition"
                      ? next.accentColor
                      : current.accentColor
                    : "#00000022",
                }}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>

      <style>{`
        .hero-bg-word {
          font-size: clamp(4.2rem, 15vw, 12rem);
          line-height: 0.9;
        }

        @keyframes floatAround {
          0% {
            transform: translate(-50%, -50%) rotate(var(--base-rotate)) scale(0.96);
          }
          50% {
            transform: translate(
              calc(-50% + var(--drift-x)),
              calc(-50% + var(--drift-y))
            ) rotate(calc(var(--base-rotate) + 5deg)) scale(1.04);
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--base-rotate)) scale(0.96);
          }
        }

        @keyframes floatAway {
          0% {
            transform: translate(-50%, -50%) rotate(var(--base-rotate)) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -135%) rotate(var(--base-rotate)) scale(1.03);
            opacity: 0;
          }
        }

        @keyframes floatEnter {
          0% {
            transform: translate(-50%, 25%) rotate(var(--base-rotate)) scale(0.94);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--base-rotate)) scale(1);
            opacity: 1;
          }
        }

        @keyframes textSwap {
          0% {
            opacity: 0.35;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}