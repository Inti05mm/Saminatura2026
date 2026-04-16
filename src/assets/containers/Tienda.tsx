import sami1 from "../pictures/sami 1.jpeg";
import sami2 from "../pictures/sami 2.jpeg";
import greenBg from "../pictures/flower.jpg";

export default function TiendaPage() {
  return (
    <div className="w-full text-gray-800 font-sans bg-white overflow-hidden">
      {/* HERO CON FONDO + OVERLAY NEGRO */}
      <section
        className="relative w-full min-h-[70vh] flex items-center justify-center text-center"
        style={{
          backgroundImage: `url(${greenBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 max-w-4xl px-6 text-white">
          <h1 className="text-7xl md:text-7xl lavishly-yours-regular mb-6">
            Nuestra tienda, nuestra historia
          </h1>
          <p className="text-lg md:text-xl text-green-50">
            Saminatura nace del deseo de vivir de forma más consciente, saludable y en armonía con la naturaleza.
          </p>
        </div>

        <svg
          className="absolute left-0 bottom-[-2px] w-full block"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ transform: "scaleY(-1)" }}
        >
          <path
            fill="#ffffff"
            d="M0,80 C240,120 480,40 720,50 960,60 1200,120 1440,80 L1440,0 L0,0 Z"
          />
        </svg>
      </section>

      {/* BLOQUE 1 (EN COLUMNA: titulo -> texto -> foto) */}
      <section className="max-w-4xl mx-auto px-6 py-20 bg-white text-center">
        <h2 className="text-3xl font-bold mb-6">Nuestra historia</h2>

        <div className="text-gray-600 leading-relaxed space-y-4 mb-10">
          <p>
            Todo comenzó con una necesidad personal: cuidarnos mejor, saber qué consumimos y apostar por productos que
            respeten nuestro cuerpo y el entorno.
          </p>
          <p>
            Tras años de aprendizaje, pruebas y mucha dedicación, decidimos crear un espacio donde reunir productos
            honestos, naturales y de calidad.
          </p>
        </div>

        <div className="w-full h-80 rounded-3xl overflow-hidden shadow-lg">
          <img src={sami1} alt="Nuestros inicios" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* BLOQUE 2 (EN COLUMNA: titulo -> texto -> foto) */}
      <section className="relative bg-white py-24">
        <svg
          className="absolute top-[-2px] left-0 w-full block pointer-events-none"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ transform: "scaleY(-1)" }}
        >
          <path
            fill="#ffffff"
            d="M0,80 C240,120 480,40 720,50 960,60 1200,120 1440,80 L1440,0 L0,0 Z"
          />
        </svg>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Nuestra filosofía</h2>

          <div className="text-gray-600 leading-relaxed space-y-4 mb-10">
            <p>
              Creemos en una vida más simple, más natural y más consciente. Seleccionamos cada producto con cuidado y
              responsabilidad.
            </p>
            <p>Apostamos por la transparencia, la cercanía y el respeto por el medio ambiente.</p>
          </div>

          <div className="w-full h-80 rounded-3xl overflow-hidden shadow-lg">
            <img src={sami2} alt="Nuestra filosofía" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* BLOQUE 3 (SE QUEDA IGUAL) */}
      <section className="max-w-7xl mx-auto px-6 py-24 bg-white">
        <h2 className="text-3xl font-bold text-center mb-12">Lo que nos define</h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
          {[
            {
              title: "🌱 Natural",
              text: "Productos seleccionados por su origen y beneficios reales.",
            },
            {
              title: "🤍 Cercano",
              text: "Acompañamos cada elección con información clara y honesta.",
            },
            {
              title: "♻️ Responsable",
              text: "Marcas y procesos respetuosos con el planeta.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white p-8 rounded-3xl shadow-md hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOQUE FINAL */}
      <section className="relative verde-1 text-white py-24">
        <svg
          className="absolute top-[-2px] left-0 w-full block"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            fill="#ffffff"
            d="M0,40 C240,80 480,0 720,20 960,40 1200,80 1440,40 L1440,0 L0,0 Z"
          />
        </svg>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Gracias por formar parte de este camino
          </h2>
          <p className="text-lg text-white">
            Seguimos creciendo, aprendiendo y mejorando cada día para ofrecerte lo mejor.
          </p>
        </div>
      </section>
    </div>
  );
}
