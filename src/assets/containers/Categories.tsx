import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import categoriesBackground from "../pictures/fondo.png"

type Category = {
  id: number
  name: string
  icon: React.ReactNode
}

const IconWrap = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center">
    {children}
  </span>
)

const categories: Category[] = [
  {
    id: 1,
    name: "Comida",
    icon: (
      <IconWrap>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path d="m4.018,5.933h0s-.005-.005,0,0Zm19.947,7.988c-.743,4.371-3.604,8.026-7.85,10.031l-.102.048-8.129-.048C3.64,21.948.778,18.292.035,13.922c-.123-.727.08-1.466.557-2.031.391-.463.928-.764,1.515-.859-.071-.337-.107-.683-.107-1.032,0-1.655.775-3.156,2.018-4.067.003.003.005.005,0,0-1.354-1.355-1.354-3.56,0-4.915C4.694.341,5.582.001,6.471.001,8.115.001,8.978,1.064,9,1.087c.022-.023.865-1.086,2.519-1.086.891,0,1.783.338,2.463,1.017.785.785,1.141,1.869.997,2.914.886-.566,2.021-1.722,2.021-3.932h1c0,1.642-.539,2.811-1.211,3.63,2.29-.512,4.529-.622,4.689-.629l.549-.025-.027.548c-.008.185-.22,4.234-1.677,7.476h1.169c.74,0,1.438.325,1.917.891.477.564.68,1.304.557,2.03ZM13.847,5.72c-.25.207-.506.4-.712.548-1.061,1.079-1.413,2.635-.918,4.069.078.168.257.484.413.663h.664l3.354-3.354.707.707-2.646,2.646h4.509c1.222-2.454,1.624-5.679,1.742-6.963-1.42.111-5.156.507-7.111,1.683Zm-9.122-.494c.072.071.152.14.242.207.622-.278,1.31-.433,2.033-.433,1.808,0,3.395.965,4.274,2.407.241-.691.637-1.33,1.178-1.871.215-.215.473-.413.761-.594.333-.278.588-.524.642-.631.341-.874.114-1.892-.58-2.586-.965-.965-2.536-.965-3.501,0-.337.337-.774,1.134-.774,1.134,0,0-.465-.825-.774-1.134-.966-.966-2.537-.965-3.501,0-.965.965-.965,2.536,0,3.5Zm-1.725,4.774c0,.34.042.677.126,1h7.748c.084-.323.126-.66.126-1,0-2.206-1.794-4-4-4s-4,1.794-4,4Zm19.645,2.537c-.288-.341-.709-.537-1.153-.537H2.509c-.444,0-.865.195-1.153.537-.286.339-.408.783-.334,1.218.682,4.009,3.3,7.373,7.19,9.246h7.576c3.891-1.873,6.509-5.237,7.19-9.246.074-.435-.048-.878-.334-1.217Z" />
        </svg>
      </IconWrap>
    ),
  },
  {
    id: 2,
    name: "Deporte",
    icon: (
      <IconWrap>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path d="m21.887,9.114c-.517-.077-1.134-.114-1.887-.114-2.571,0-4.931,2.804-5.416,3.402-.594-.254-1.283-.437-2.095-.425-1.947.044-3.683,1.01-4.847,1.868.471-1.862.423-3.823.38-5.483-.024-.952-.047-1.799.047-2.361h1.494c.763,0,1.448-.424,1.789-1.105l.447-.895h.19c.644,0,1-.51,1.01-1C13,1.549,11.778.006,9.513,0h-.018c-1.664.007-2.976,1.147-3.005,1.175C.009,6.161.002,14.132,0,16.751c0,1.21.497,2.381,1.366,3.212,1.948,1.862,5.901,4.037,10.634,4.037,4.611,0,8.009-1.195,10.047-2.199,1.205-.593,1.953-1.797,1.953-3.142v-7.074c0-1.231-.909-2.294-2.113-2.471Zm1.113,9.545c0,.961-.534,1.821-1.395,2.245-1.943.956-5.187,2.096-9.605,2.096s-8.129-2.025-9.942-3.76c-.683-.653-1.059-1.537-1.058-2.489.002-2.497.008-10.097,6.125-14.804.011-.01,1.097-.945,2.38-.947,1.817.002,2.495,1.228,2.485,2h-1.5c-.402,0-.494-.274-.5-.505-.003-.273-.226-.495-.5-.495-.276,0-.5,.224-.5,.5,0,.603.399,1.5,1.5,1.5h.191l-.223.447c-.17.341-.514.553-.895.553h-1.884c-.212,0-.4.134-.472.333-.246.697-.22,1.737-.186,3.054.055,2.122.134,4.757-.956,6.879-.039.071-.066.148-.066.235,0,.276.224,.5.5,.5.15,0,.276-.057.367-.161.026-.028,2.6-2.771,5.633-2.839,2.234,0,3.534,1.703,3.584,1.777.153,.229.464,.289.693,.138.229-.153.292-.462.14-.691-.035-.052-.534-.736-1.432-1.337.844-1.003,2.672-2.887,4.515-2.887.703,0,1.272.033,1.74.104.719.105,1.26.742,1.26,1.481v7.074Z" />
        </svg>
      </IconWrap>
    ),
  },
  {
    id: 3,
    name: "Suplementos",
    icon: (
      <IconWrap>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path d="m9.501 15.5h3.5v1h-3.5v3.5h-1v-3.5h-3.5v-1h3.5v-3.5h1zm13.54 3.096-4.444 4.444c-.639.639-1.479.958-2.318.958s-1.679-.319-2.317-.958c-1.278-1.278-1.278-3.358 0-4.636l4.444-4.444c1.276-1.276 3.357-1.278 4.636 0 1.278 1.278 1.278 3.358 0 4.636zm-3.222 1.807-3.222-3.222-1.93 1.93c-.431.43-.667 1.002-.667 1.611s.236,1.181.667,1.611c.89.888,2.334.887,3.222,0zm3.182-4.125c0-.608-.236-1.181-.667-1.611-.444-.444-1.027-.666-1.61-.666s-1.167.222-1.611.666l-1.807,1.807,3.222,3.222,1.807-1.807c.431-.43.667-1.002.667-1.611zm-11.464,6.722c.171.356.385.688.636,1h-12.173v-13.5c0-1.378,1.122-2.5,2.501-2.5h2.5v-3h-2v-2.5c0-1.378,1.122-2.5,2.5-2.5h7c1.379,0,2.5,1.122,2.5,2.5v2.5h-2.034l.029,3h2.505c1.379,0,2.5,1.122,2.5,2.5v1.274c-.354.214-.694.459-1,.764v-2.038c0-.827-.673-1.5-1.5-1.5h-3.495l-.039-4h-5.966v4h-3.5c-.827,0-1.5.673-1.5,1.5v12.5h10.537zm-7.536-19h10v-1.5c0-.827-.673-1.5-1.5-1.5h-7c-.827,0-1.5.673-1.5,1.5z" />
        </svg>
      </IconWrap>
    ),
  },
  {
    id: 4,
    name: "Cosmética e higiene",
    icon: (
      <IconWrap>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path d="M8.491,14c-.86-.016-1.707-.375-2.324-.986l.703-.71c.43,.426,1.042,.686,1.639,.697,.61-.009,1.181-.236,1.654-.713l.711,.703c-.655,.662-1.458,1.01-2.327,1.01h-.056ZM24,4.269V15.5c0,1.379-1.122,2.5-2.5,2.5-.111,0-.218-.019-.325-.033-1.586,3.672-5.151,6.033-9.175,6.033s-7.588-2.36-9.175-6.033c-.108,.014-.214,.033-.325,.033-1.378,0-2.5-1.121-2.5-2.5V4.269c0-.618,.229-1.214,.645-1.676L2.951,0h1.343L1.387,3.263c-.25,.277-.387,.635-.387,1.006V15.5c0,.827,.673,1.5,1.5,1.5s1.5-.673,1.5-1.5V7.5h.007c0-.57,.19-1.14,.577-1.601l3.098-3.206,.719,.695-3.074,3.179c-.225,.269-.335,.614-.327,.96v.005c.009,.346,.135,.694,.382,.969,.55,.614,1.499,.667,2.113,.116l4.021-3.7c.308-.283,.484-.685,.484-1.104V0h1V3.814c0,.446-.132,.874-.353,1.253l3.863,3.555c.61,.547,1.558,.495,2.108-.12,.494-.551,.507-1.394,.032-1.96l-3.051-3.153,.719-.695,3.074,3.179c.399,.474,.594,1.053,.598,1.627h.01V15.5c0,.827,.673,1.5,1.5,1.5s1.5-.673,1.5-1.5V4.269c0-.371-.137-.729-.387-1.006l-2.908-3.263h1.343l2.307,2.593c.416,.462,.645,1.058,.645,1.676Zm-3.785,13.365c-.725-.438-1.215-1.226-1.215-2.133v-6.004c-.44,.331-.967,.503-1.498,.503-.593,0-1.188-.21-1.664-.636l-3.838-3.532-3.833,3.528c-.479,.429-1.076,.64-1.671,.64-.53,0-1.056-.172-1.496-.502v6.004c0,.907-.49,1.695-1.215,2.133,1.443,3.265,4.619,5.367,8.215,5.367s6.772-2.102,8.215-5.367Zm-5.206-4.633c-.596-.011-1.208-.271-1.639-.697l-.703,.71c.617,.611,1.464,.971,2.324,.986h.056c.868,0,1.671-.349,2.327-1.01l-.711-.703c-.473,.477-1.063,.705-1.654,.713Zm-3.009,5c-2.056,0-3.781-1.511-3.798-1.525l-.666,.746c.081,.072,2.02,1.779,4.463,1.779s4.382-1.707,4.463-1.779l-.666-.746c-.017,.015-1.742,1.525-3.798,1.525Z" />
        </svg>
      </IconWrap>
    ),
  },
  {
    id: 5,
    name: "Granel",
    icon: (
      <IconWrap>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path d="M23.961,10.306h0v-.002l-3.425-8.134c-.184-.436-.501-.779-.883-1.013-.046-.049-.102-.091-.169-.119-.026-.011-.054-.01-.082-.016-.448-.201-.96-.259-1.461-.125l-5.44,1.449V.5c0-.276-.224-.5-.5-.5s-.5,.224-.5,.5V2.613l-5.723,1.524c-1.042,.277-1.912,1.036-2.328,2.029L.039,14.307c-.026,.062-.039,.986-.039,.986,0,2.43,1.8,4.49,4.099,4.689,.137,.012,.272,.018,.407,.018,1.129,0,2.194-.412,3.034-1.183,.928-.851,1.46-2.06,1.46-3.317,0,0-.015-1.139-.043-1.203L5.088,5.592c.275-.227,.597-.396,.947-.489l5.465-1.456V23H4.5c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h15c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5h-7V3.382l5.698-1.517c.137-.037,.275-.044,.409-.032l-3.568,8.474c-.026,.061-.039,.986-.039,.986,0,2.43,1.8,4.49,4.099,4.689,.137,.012,.272,.018,.407,.018,1.129,0,2.194-.412,3.034-1.183,.928-.851,1.46-2.06,1.46-3.317,0,0-.012-1.13-.039-1.194Zm-15.961,5.194c0,.979-.414,1.919-1.136,2.581-.731,.671-1.678,.992-2.679,.906-1.786-.155-3.186-1.778-3.186-3.694v-.292h7v.5Zm-.269-1.5H1.252l3.12-7.447,.024-.056,3.335,7.503ZM19.475,2.347c.048,.069,.105,.131,.138,.211l3.133,7.441h-6.494l3.222-7.653Zm3.525,9.153c0,.979-.414,1.919-1.136,2.581-.731,.67-1.679,.995-2.679,.906-1.786-.155-3.186-1.778-3.186-3.694v-.292h7v.5Z" />
        </svg>
      </IconWrap>
    ),
  },
  {
    id: 6,
    name: "Infusiones",
    icon: (
      <IconWrap>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path d="m20.5 10h-1.508v-4h-17v6.526c.318-.284.654-.527 1-.745v-4.781h15v10.5c0,1.379-1.122,2.5-2.5,2.5h-4.322c-.248,.342-.53,.675-.842,1h5.164c1.93,0,3.5-1.57,3.5-3.5v-1.5h1.508c1.897,0,3.5-1.537,3.5-3.357,0-1.654-1.308-2.643-3.5-2.643Zm0,5h-1.508v-4h1.508c.934,0,2.5,.214,2.5,1.643,0,1.256-1.168,2.357-2.5,2.357Zm-9.5-11h-1V0h1Zm4,0h-1V0h1ZM7,4H6V0h1ZM0,23h21v1H0Zm2.817-3.578c.637,.957,1.735,1.516,2.88,1.574,1.065,.05,2.096-.328,2.887-1.07,3.439-3.22,2.225-7.533,2.172-7.715l-.129-.44c-.601,.128-1.165,.222-1.825,.312-1.802,.258-4.045,.578-5.57,2.007-.499,.466-.861,1.051-1.075,1.732-.022,.066-.399,1.289,.122,2.648-.144,.011-.286,.028-.432,.028-.671,0-1.192-.124-1.511-.229l-.311,.951c.388,.126,1.019,.277,1.822,.277,.329,0,.652-.029,.971-.077Zm.292-3.295c.164-.521,.435-.96,.806-1.307,1.295-1.214,3.279-1.497,5.028-1.748,.33-.047,.649-.093,.951-.143,.197,1.094,.43,3.998-1.993,6.266-.592,.556-1.354,.834-2.155,.802-.713-.035-1.361-.336-1.854-.838,1.562-.516,3.035-1.639,4.522-3.457l-.774-.633c-1.47,1.799-2.854,2.839-4.337,3.238-.51-1.092-.21-2.124-.192-2.18Z" />
        </svg>
      </IconWrap>
    ),
  },
]

function toCategoryQuery(name: string) {
  const map: Record<string, string> = {
    Comida: "Alimentos",
    Deporte: "Deporte",
    Suplementos: "Suplementos",
    "Cosmética e higiene": "Cosmetica e higiene",
    Granel: "Granel",
    Infusiones: "Infusiones",
  }

  return map[name] ?? name
}

const topWavePath = `
  M 0 0.075

  C 0.07 0.095,
    0.13 0.115,
    0.20 0.115

  C 0.27 0.115,
    0.33 0.09,
    0.40 0.105

  C 0.47 0.12,
    0.53 0.17,
    0.60 0.18

  C 0.67 0.19,
    0.73 0.145,
    0.80 0.105

  C 0.87 0.065,
    0.94 0.025,
    1 0
`

export default function Categories() {
  const [selected, setSelected] = useState<number | null>(null)
  const navigate = useNavigate()

  return (
    <>
      {/* SVG invisible utilizado solamente para recortar la parte superior */}
      <svg
        width="0"
        height="0"
        className="absolute"
        aria-hidden="true"
      >
        <defs>
          <clipPath
            id="categoriesTopWave"
            clipPathUnits="objectBoundingBox"
          >
            <path
              d={`
                ${topWavePath}
                L 1 1
                L 0 1
                Z
              `}
            />
          </clipPath>
        </defs>
      </svg>

      <section
        className="
          relative z-30
          -mt-16 w-full overflow-hidden
          bg-cover bg-center bg-no-repeat

          sm:-mt-20
          md:-mt-24
          lg:-mt-28
        "
        style={{
          backgroundImage: `url(${categoriesBackground})`,
          clipPath: "url(#categoriesTopWave)",
          WebkitClipPath: "url(#categoriesTopWave)",
        }}
      >
        {/* Oscurecimiento general de la imagen */}
        <div
          className="
            pointer-events-none
            absolute inset-0 z-0
            bg-[#25331c]/45
          "
        />

        {/*
          Sombra interior de la onda superior.

          No tiene stroke, por lo que no aparece ninguna línea negra.
          El degradado empieza muy oscuro en el borde y se vuelve
          transparente progresivamente hacia abajo.
        */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          className="
            pointer-events-none
            absolute inset-0 z-10
            h-full w-full
          "
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="categoriesWaveShadowGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              {/* Muy oscuro justo al comenzar la onda */}
              <stop
                offset="0%"
                stopColor="#071003"
                stopOpacity="0.92"
              />

              {/* Sigue siendo visible cerca del borde */}
              <stop
                offset="14%"
                stopColor="#0a1605"
                stopOpacity="0.72"
              />

              {/* Empieza a suavizarse */}
              <stop
                offset="35%"
                stopColor="#13220c"
                stopOpacity="0.42"
              />

              {/* Difuminado ligero */}
              <stop
                offset="62%"
                stopColor="#1a2b11"
                stopOpacity="0.16"
              />

              {/* Desaparece completamente */}
              <stop
                offset="100%"
                stopColor="#25331c"
                stopOpacity="0"
              />
            </linearGradient>

            {/* Difuminado muy suave para evitar un corte duro */}
            <filter
              id="categoriesWaveShadowBlur"
              x="-5%"
              y="-15%"
              width="110%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="0.006" />
            </filter>
          </defs>

          {/*
            Esta forma comienza exactamente en la onda superior
            y termina más abajo. El relleno produce la sombra.
          */}
          <path
            d={`
              ${topWavePath}
              L 1 0.34
              L 0 0.34
              Z
            `}
            fill="url(#categoriesWaveShadowGradient)"
            filter="url(#categoriesWaveShadowBlur)"
          />

          {/*
            Segunda capa concentrada cerca del borde.
            Refuerza la oscuridad inicial sin crear una línea.
          */}
          <path
            d={`
              ${topWavePath}
              L 1 0.22
              L 0 0.22
              Z
            `}
            fill="url(#categoriesWaveShadowGradient)"
            opacity="0.52"
          />
        </svg>

        {/* Contenido */}
        <div
          className="
            relative z-20
            px-4 pb-6 pt-20

            sm:px-8 sm:pb-7 sm:pt-24
            md:pt-26
            lg:pt-28
          "
        >
          <h2
            className="
              mb-5 text-center
              text-2xl font-bold
              text-white drop-shadow-md

              sm:text-[26px]
              md:text-3xl
            "
          >
            Conoce más sobre nuestras categorías
          </h2>

          <div
            className="
              scrollbar-hide
              flex justify-start gap-6
              overflow-x-auto
              px-3 pb-2

              md:justify-center
              lg:gap-8
            "
          >
            {categories.map((category) => {
              const isActive = selected === category.id

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelected(category.id)

                    const categoryQuery = toCategoryQuery(category.name)

                    navigate(
                      `/shopping?category=${encodeURIComponent(
                        categoryQuery
                      )}`
                    )
                  }}
                  className="
                    group flex flex-none flex-col
                    items-center focus:outline-none
                  "
                >
                  <div
                    className={`
                      flex h-24 w-24
                      items-center justify-center
                      rounded-full border
                      backdrop-blur-[2px]
                      transition-all duration-300

                      ${
                        isActive
                          ? `
                            scale-105
                            border-white/40
                            bg-[#1f2b16]
                            text-white
                            shadow-xl
                          `
                          : `
                            border-white/50
                            bg-[#f6f3eb]/95
                            text-[#2f3a1f]
                            shadow-md

                            group-hover:scale-105
                            group-hover:bg-white
                            group-hover:shadow-xl
                          `
                      }
                    `}
                  >
                    {category.icon}
                  </div>

                  <span
                    className={`
                      mt-3 max-w-24
                      text-center text-[13px]
                      font-medium leading-4
                      drop-shadow-md
                      transition-colors

                      ${
                        isActive
                          ? "text-[#e1ebd3]"
                          : "text-white"
                      }
                    `}
                  >
                    {category.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Onda inferior */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="
            relative z-10
            -mb-[1px] block
            h-10 w-full
            sm:h-12
            md:h-14
          "
          aria-hidden="true"
        >
          <path
            fill="#f7f5ef"
            d="
              M0,150
              C80,135 140,135 220,165
              C300,195 390,175 470,175
              C550,175 590,130 680,145
              C760,160 790,105 865,95
              C940,85 975,150 1060,155
              C1140,160 1170,190 1260,165
              C1340,140 1390,110 1440,95
              L1440,320
              L0,320
              Z
            "
          />
        </svg>
      </section>
    </>
  )
}