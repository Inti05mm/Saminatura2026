import foto from "../pictures/inicio.jpg";
import { useNavigate } from "react-router-dom";

export default function GreenLeafHero() {

  const navigate = useNavigate(); // ✅ aquí dentro

  return (
    <div className="text-gray-800 font-sans">
      {/* Hero Section */}
      <section
        className="relative h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${foto})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 h-full flex flex-col justify-center items-center text-center text-white">
          
          <h1 className="text-9xl md:text-9xl lavishly-yours-regular mb-4 leading-tight">
            Transforma tu salud
          </h1>

          <p className="text-base md:text-xl mb-8 font-medium text-white">
            Todo lo que necesitas en un solo lugar.
          </p>

          {/* Botón */}
          <div className="p-4 flex flex-col items-center justify-center">
            <div className="cursor-pointer">
              <button
                onClick={() => navigate("/shopping")}
                className="relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium text-white transition duration-300 ease-out border-2 border-white rounded-full shadow-md bg-black/50 group"
              >
                <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full verde-1 group-hover:translate-x-0 ease">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>

                <span className="absolute flex items-center justify-center w-full h-full bg-verde-1 transition-all duration-300 transform group-hover:translate-x-full ease">
                  Explorar
                </span>

                <span className="relative invisible verde-1">Explorar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            className="relative block w-[calc(100%+1.3px)] h-24 md:h-32"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              d="M0,160L30,138.7C60,117,120,75,180,58.7C240,43,300,53,360,58.7C420,64,480,64,540,85.3C600,107,660,149,720,160C780,171,840,149,900,154.7C960,160,1020,192,1080,186.7C1140,181,1200,139,1260,122.7C1320,107,1380,117,1410,122.7L1440,128L1440,320L0,320Z"
              fill="rgb(243 244 246)"
            />
          </svg>
        </div>
      </section>
    </div>
  );
}