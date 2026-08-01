import { Leaf, WheatOff, MilkOff } from "lucide-react"
import { useNavigate } from "react-router-dom"

const dietaryOptions = [
  {
    id: 1,
    title: "Vegano",
    description: "Productos elaborados sin ingredientes de origen animal.",
    icon: Leaf,
    query: "vegan=true",
  },
  {
    id: 2,
    title: "Sin gluten",
    description: "Opciones especialmente seleccionadas sin gluten.",
    icon: WheatOff,
    query: "gluten_free=true",
  },
  {
    id: 3,
    title: "Sin lactosa",
    description: "Productos adecuados para dietas sin lactosa.",
    icon: MilkOff,
    query: "lactose_free=true",
  },
]

export default function DietaryOptions() {
  const navigate = useNavigate()

  const openOption = (query: string) => {
    navigate(`/shopping?${query}`)
  }

  return (
    <section className="bg-[#f7f5ef] px-4 py-14 sm:px-8 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-[#75815d]">
            Elige según tus necesidades
          </p>

          <h2 className="text-2xl font-semibold text-[#1f2b16] md:text-3xl">
            Productos para cada estilo de alimentación
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 md:gap-7">
          {dietaryOptions.map((option) => {
            const Icon = option.icon

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => openOption(option.query)}
                className="
                  group flex min-h-52 flex-col items-start
                  rounded-3xl border border-[#dfe3d5]
                  bg-white p-6 text-left
                  transition duration-300
                  hover:-translate-y-1
                  hover:border-[#9aaa7e]
                  hover:shadow-lg
                "
              >
                <div
                  className="
                    mb-5 flex h-14 w-14 items-center justify-center
                    rounded-2xl bg-[#edf1e7] text-[#425530]
                    transition duration-300
                    group-hover:bg-[#425530]
                    group-hover:text-white
                  "
                >
                  <Icon size={28} strokeWidth={1.6} />
                </div>

                <h3 className="text-xl font-semibold text-[#1f2b16]">
                  {option.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {option.description}
                </p>

                <span className="mt-auto pt-5 text-sm font-semibold text-[#617244]">
                  Ver productos →
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}