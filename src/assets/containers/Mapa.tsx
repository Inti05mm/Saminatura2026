import React from "react"
import {
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Store,
} from "lucide-react"

const Mapa: React.FC = () => {
  const phoneNumber = "+34631415075"
  const visiblePhone = "+34 631 41 50 75"
  const email = "saminatura202369@gmail.com"

  const address =
    "C. Teruel, 16, local, 22500 Binéfar, Huesca"

  const googleMapsUrl =
    "https://www.google.com/maps/search/?api=1&query=SAMINATURA%2C+Calle+Teruel+16%2C+Bin%C3%A9far"

  return (
    <section
      id="contactUs"
      className="relative overflow-hidden bg-[#2f431f] px-4 py-12 sm:px-6 md:py-14 lg:px-8 lg:py-16"
    >
      {/* Decoración de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-white/[0.03]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-white/[0.04]"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Encabezado */}
        <div className="mx-auto mb-8 max-w-3xl text-center md:mb-10">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-white/30" />

            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#cbd6bc]">
              Estamos en Binéfar
            </p>

            <span className="h-px w-10 bg-white/30" />
          </div>

          <h2 className="roboto-title text-3xl text-white sm:text-4xl">
            Visita nuestra tienda
          </h2>

        
        </div>

        {/* Contenedor principal */}
        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#425530] p-3 shadow-2xl sm:p-4">
          <div className="grid grid-cols-1 overflow-hidden rounded-[1.35rem] bg-white lg:grid-cols-[1.15fr_0.85fr]">
            {/* Mapa */}
            <div className="relative min-h-[310px] overflow-hidden bg-[#ebe9df] sm:min-h-[360px] lg:min-h-[470px]">
              <iframe
                title="Ubicación de Saminatura en Binéfar"
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d5943.967089009238!2d0.294913!3d41.850181!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a7756c1b80e0cf%3A0xab471559457a999e!2sSAMINATURA!5e0!3m2!1sen!2ses!4v1769769880185!5m2!1sen!2ses"
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              {/* Etiqueta sobre el mapa */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:left-5 sm:right-auto sm:max-w-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf1e7] text-[#425530]">
                  <Store size={20} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-[#243219]">
                    Saminatura
                  </p>

                  <p className="truncate text-xs text-gray-500 sm:text-sm">
                    Tienda natural en Binéfar
                  </p>
                </div>
              </div>
            </div>

            {/* Información */}
            <div className="flex flex-col bg-[#f8f6f0] p-5 sm:p-6 lg:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#75815d]">
                  Información
                </p>

                <h3 className="mt-2 text-2xl font-semibold text-[#243219]">
                  Ven a conocernos
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Atención cercana, asesoramiento personalizado y
                  una selección de alimentación, suplementación,
                  cosmética y bienestar.
                </p>
              </div>

              {/* Datos */}
              <div className="mt-5 divide-y divide-[#dfe3d5] border-y border-[#dfe3d5]">
                {/* Dirección */}
                <div className="flex gap-3 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7ecdf] text-[#425530]">
                    <MapPin size={19} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-[#243219]">
                      Nuestra dirección
                    </h4>

                    <p className="mt-0.5 text-sm leading-5 text-gray-600">
                      {address}
                    </p>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="flex gap-3 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7ecdf] text-[#425530]">
                    <Phone size={19} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-[#243219]">
                      Teléfono
                    </h4>

                    <a
                      href={`tel:${phoneNumber}`}
                      className="mt-0.5 inline-block text-sm text-gray-600 transition hover:text-[#425530]"
                    >
                      {visiblePhone}
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-3 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7ecdf] text-[#425530]">
                    <Mail size={19} strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-semibold text-[#243219]">
                      Correo electrónico
                    </h4>

                    <a
                      href={`mailto:${email}`}
                      className="mt-0.5 block break-all text-sm text-gray-600 transition hover:text-[#425530]"
                    >
                      {email}
                    </a>
                  </div>
                </div>

                {/* Horario */}
                <div className="flex gap-3 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7ecdf] text-[#425530]">
                    <Clock3 size={19} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-[#243219]">
                      Horario
                    </h4>

                    <div className="mt-1 space-y-0.5 text-sm leading-5 text-gray-600">
                      <p>
                        Lunes a viernes: 10:00–14:00 y
                        17:00–20:30
                      </p>

                      <p>Sábado: 10:00–14:00</p>
                      <p>Domingo: Cerrado</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    flex items-center justify-center gap-2 rounded-xl
                    bg-[#425530] px-4 py-3
                    text-sm font-semibold text-white
                    transition duration-300
                    hover:-translate-y-0.5 hover:bg-[#354626]
                    hover:shadow-lg
                  "
                >
                  <Navigation size={17} strokeWidth={1.8} />
                  Cómo llegar
                </a>

                <a
                  href={`tel:${phoneNumber}`}
                  className="
                    flex items-center justify-center gap-2 rounded-xl
                    border border-[#b9c4a8] bg-white
                    px-4 py-3 text-sm font-semibold
                    text-[#425530] transition duration-300
                    hover:-translate-y-0.5
                    hover:border-[#425530]
                    hover:shadow-md
                  "
                >
                  <Phone size={17} strokeWidth={1.8} />
                  Llamar ahora
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Mapa