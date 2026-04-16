import visitUsSvg from "../pictures/Eating healthy food-amico.svg";
import { Link } from "react-router-dom";

export default function VisitUs() {
  return (
    <section className="bg-[#f5f5f0] py-8 md:py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative rounded-[32px] overflow-hidden min-h-[340px] md:min-h-[380px] shadow-[0_20px_70px_rgba(0,0,0,0.08)] border border-white/30">
          
          {/* Fondo general */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#6f8a63] via-[#7f9a72] to-[#a6b89b]" />

          {/* Manchas/blur decorativas */}
          <div className="absolute -top-20 -left-20 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#5d7a53]/30 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-52 h-52 bg-[#dfe8d8]/10 rounded-full blur-3xl" />

          {/* División visual */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 min-h-[340px] md:min-h-[380px]">
            
            {/* LADO IZQUIERDO */}
            <div className="relative z-10 flex items-center">
              <div className="absolute inset-0 bg-black/16 backdrop-blur-[8px]" />

              <div className="relative px-8 sm:px-10 md:px-14 py-10 md:py-12 max-w-xl">
                <span className="inline-block text-white/70 text-xs sm:text-sm tracking-[0.25em] uppercase roboto mb-3">
                  About us
                </span>

                <h2 className="text-white text-3xl sm:text-4xl md:text-5xl leading-[1.02] roboto-title font-semibold">
                  Conoce la esencia
                  <br />
                  de lo natural
                  <span className="text-[#f0d24d]">.</span>
                </h2>

                <p className="mt-5 text-white/80 text-sm sm:text-base md:text-lg leading-relaxed roboto max-w-md">
                  En Saminatura seleccionamos cada producto con una idea clara:
                  acercarte ingredientes y opciones que transmitan bienestar,
                  calidad y una forma más consciente de cuidarte.
                </p>

                <p className="mt-3 text-white/65 text-sm md:text-base leading-relaxed roboto max-w-md">
                  Inspirados en la pureza de la naturaleza, queremos que cada
                  rincón de nuestra tienda refleje cercanía, calma y confianza.
                </p>

                <Link
                  to="/tienda"
                  onClick={() => window.scrollTo(0, 0)}
                  className="inline-block"
                >
                  <button className="mt-6 px-6 py-3 rounded-full bg-[#f0c419] text-[#2d3a27] font-semibold roboto hover:scale-[1.03] hover:bg-[#f4cb2e] transition duration-300 shadow-lg">
                    Descúbrenos
                  </button>
                </Link>
              </div>
            </div>

            {/* LADO DERECHO */}
            <div className="relative z-10 flex items-center justify-center p-6 md:p-8">
              <div className="absolute inset-0 bg-gradient-to-l from-[#dfe8d8]/12 to-transparent" />

              <div className="hidden md:block absolute left-0 top-0 h-full w-32 bg-white/8 rounded-r-[100px]" />

              <div className="relative flex items-center justify-center w-full h-full">
                <div className="absolute w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] md:w-[300px] md:h-[300px] rounded-full bg-white/10 blur-2xl" />

                <div className="relative w-full max-w-[320px] md:max-w-[360px] aspect-[4/4] flex items-center justify-center">
                  <img
                    src={visitUsSvg}
                    alt="Conócenos"
                    className="relative z-10 w-full h-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.20)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* línea/borde interior sutil */}
          <div className="pointer-events-none absolute inset-3 rounded-[26px] border border-white/10" />
        </div>
      </div>
    </section>
  );
}


