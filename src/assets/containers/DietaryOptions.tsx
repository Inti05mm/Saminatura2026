import { Leaf, WheatOff, MilkOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

const dietaryOptions = [
  {
    id: 1,
    title: "Vegano",
    description:
      "Productos elaborados sin ingredientes de origen animal.",
    icon: Leaf,
    query: "vegan=true",
    number: "01",
  },
  {
    id: 2,
    title: "Sin gluten",
    description:
      "Opciones especialmente seleccionadas sin gluten.",
    icon: WheatOff,
    query: "gluten_free=true",
    number: "02",
  },
  {
    id: 3,
    title: "Sin lactosa",
    description:
      "Productos adecuados para dietas sin lactosa.",
    icon: MilkOff,
    query: "lactose_free=true",
    number: "03",
  },
]

export default function DietaryOptions() {
  const navigate = useNavigate()

  const openOption = (query: string) => {
    navigate(`/shopping?${query}`)
  }

  return (
    <section className="relative overflow-hidden bg-[#f7f5ef] px-4 py-14 sm:px-8 md:py-16">
      {/* Decoración suave del fondo */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#9caf88]/15 blur-3xl" />

      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#425530]/10 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Cabecera */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#75815d]">
            Elige según tus necesidades
          </p>

          <h2 className="text-2xl font-semibold text-[#1f2b16] md:text-3xl">
            Productos para cada estilo de alimentación
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6d7467] sm:text-base">
            Encuentra opciones adaptadas a tu forma de cuidarte,
            seleccionadas para que comprar sea más sencillo.
          </p>

          <div className="mx-auto mt-5 h-[2px] w-16 rounded-full bg-[#8fa17f]" />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 md:gap-7">
          {dietaryOptions.map((option) => {
            const Icon = option.icon

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => openOption(option.query)}
                className="
                  group relative
                  flex min-h-56 flex-col items-start
                  overflow-hidden
                  rounded-[1.75rem]
                  border border-[#dfe3d5]
                  bg-white/90
                  p-6 text-left
                  shadow-[0_10px_30px_rgba(55,73,40,0.08)]
                  backdrop-blur-sm
                  transition-all duration-300
                  hover:-translate-y-2
                  hover:border-[#9aaa7e]
                  hover:shadow-[0_22px_45px_rgba(55,73,40,0.16)]
                "
              >
                {/* Franja superior */}
                <div
                  className="
                    absolute inset-x-0 top-0
                    h-1.5
                    bg-gradient-to-r
                    from-[#a6b797]
                    via-[#6f835a]
                    to-[#425530]
                    opacity-75
                  "
                />

                {/* Número decorativo */}
                <span
                  className="
                    absolute right-5 top-5
                    text-4xl font-semibold
                    leading-none
                    text-[#425530]/8
                    transition duration-300
                    group-hover:text-[#425530]/14
                  "
                >
                  {option.number}
                </span>

                {/* Icono */}
                <div
                  className="
                    relative mb-5
                    flex h-16 w-16
                    items-center justify-center
                    rounded-2xl
                    border border-[#425530]/10
                    bg-[#edf1e7]
                    text-[#425530]
                    shadow-sm
                    transition-all duration-300
                    group-hover:rotate-[-3deg]
                    group-hover:scale-105
                    group-hover:bg-[#425530]
                    group-hover:text-white
                  "
                >
                  <div className="pointer-events-none absolute inset-2 rounded-xl border border-white/40" />

                  <Icon
                    size={30}
                    strokeWidth={1.6}
                    className="relative z-10"
                  />
                </div>

                {/* Texto */}
                <h3 className="text-xl font-semibold text-[#1f2b16] transition-colors duration-300 group-hover:text-[#425530]">
                  {option.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6d7467]">
                  {option.description}
                </p>

                {/* Enlace inferior */}
                <div className="mt-auto flex w-full items-center justify-between pt-6">
                  <span className="text-sm font-semibold text-[#617244]">
                    Ver productos
                  </span>

                  <span
                    className="
                      flex h-9 w-9
                      items-center justify-center
                      rounded-full
                      bg-[#edf1e7]
                      text-[#425530]
                      transition-all duration-300
                      group-hover:translate-x-1
                      group-hover:bg-[#425530]
                      group-hover:text-white
                    "
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </span>
                </div>

                {/* Brillo al hacer hover */}
                <div
                  className="
                    pointer-events-none
                    absolute -right-16 -top-16
                    h-36 w-36
                    rounded-full
                    bg-[#a8b99a]/0
                    blur-2xl
                    transition-all duration-500
                    group-hover:bg-[#a8b99a]/20
                  "
                />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}