import { useEffect, useState } from "react";
import sami1 from "../pictures/sami 1.jpeg";
import sami2 from "../pictures/sami 2.jpeg";
import greenBg from "../pictures/flower.jpg";

const galleryImages = [
  {
    src: sami1,
    title: "Productos naturales y ecológicos",
    text: "Una selección cuidada para el día a día: alimentación, bienestar y cuidado personal.",
  },
  {
    src: sami2,
    title: "Un espacio pensado para cuidarte",
    text: "Cercanía, asesoramiento y productos elegidos con criterio.",
  },
];

const categories = [
  {
    title: "Alimentación bio",
    text: "Productos ecológicos, naturales y de calidad para una compra más consciente.",
    icon: "🌿",
  },
  {
    title: "Sin gluten y sin lactosa",
    text: "Opciones pensadas para diferentes necesidades alimentarias y estilos de vida.",
    icon: "🤍",
  },
  {
    title: "Nutrición deportiva",
    text: "Proteínas, snacks, complementos y productos para acompañar tu entrenamiento.",
    icon: "💪",
  },
  {
    title: "Vitaminas y suplementos",
    text: "Complementos para el bienestar diario, siempre con información clara.",
    icon: "✨",
  },
  {
    title: "Higiene y cosmética natural",
    text: "Cremas, cuidado corporal, capilar e higiene con fórmulas más respetuosas.",
    icon: "🧴",
  },
  {
    title: "Nevera y productos frescos",
    text: "Opciones refrigeradas, bebidas, productos especiales y básicos saludables.",
    icon: "❄️",
  },
];

export default function TiendaPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  return (
    <div className="w-full text-[#2f3328] font-sans bg-[#fbfaf6] overflow-hidden">
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
            Saminatura nace del deseo de vivir de forma más consciente,
            saludable y en armonía con la naturaleza.
          </p>
        </div>

        <svg
          className="absolute left-0 bottom-[-2px] w-full block"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ transform: "scaleY(-1)" }}
        >
          <path
            fill="#fbfaf6"
            d="M0,80 C240,120 480,40 720,50 960,60 1200,120 1440,80 L1440,0 L0,0 Z"
          />
        </svg>
      </section>

      {/* INTRO HISTORIA */}
      <section className="relative bg-[#fbfaf6] px-6 pt-20 pb-14">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
          

            <h2 className="text-4xl md:text-5xl font-bold leading-tight text-[#344021] mb-6">
              Un lugar cercano para cuidar tu alimentación, tu bienestar y tu
              rutina diaria.
            </h2>

            <div className="space-y-5 text-[#626657] leading-relaxed text-lg">
              <p>
                Saminatura abrió sus puertas hace dos años con una idea clara:
                crear una tienda donde encontrar productos naturales, ecológicos
                y de confianza, pero también un trato cercano y honesto.
              </p>

              <p>
                Poco a poco hemos ido creciendo, escuchando a nuestros clientes
                y ampliando nuestras secciones para ofrecer una compra completa:
                alimentación bio, productos sin gluten, opciones sin lactosa,
                suplementos, vitaminas, cosmética natural, higiene, productos de
                nevera y nutrición deportiva.
              </p>

              <p>
                Más que una tienda, queremos ser un espacio donde cada persona
                pueda encontrar lo que necesita para cuidarse mejor, con
                información clara y productos seleccionados con mimo.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -left-6 w-40 h-40 bg-[#cadee7] rounded-full blur-3xl opacity-80" />
            <div className="absolute -bottom-6 -right-6 w-44 h-44 bg-[#936f54] rounded-full blur-3xl opacity-30" />

            <div className="relative bg-white p-4 rounded-[36px] shadow-[0_25px_80px_rgba(52,64,33,0.16)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-72 rounded-[28px] overflow-hidden">
                  <img
                    src={sami1}
                    alt="Interior de Saminatura"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="h-32 rounded-[28px] bg-[#839741] flex items-center justify-center text-white text-center px-5">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] opacity-80">
                        Saminatura
                      </p>
                      <p className="text-2xl font-bold">Natural</p>
                    </div>
                  </div>

                  <div className="h-36 rounded-[28px] overflow-hidden">
                    <img
                      src={sami2}
                      alt="Productos de Saminatura"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARRUSEL */}
      <section className="bg-[#fbfaf6] px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <span className="text-sm font-bold tracking-[0.25em] uppercase text-[#839741]">
                Nuestra tienda
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#344021] mt-3">
                Un vistazo a nuestro espacio
              </h2>
            </div>

        
          </div>

          <div className="relative rounded-[38px] overflow-hidden shadow-[0_25px_90px_rgba(52,64,33,0.18)] bg-[#344021]">
            <div className="relative h-[430px] md:h-[560px]">
              {galleryImages.map((image, index) => (
                <div
                  key={image.title}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

                  <div className="absolute left-6 md:left-12 bottom-8 md:bottom-12 max-w-xl text-white">
                    <p className="text-sm uppercase tracking-[0.28em] text-[#cadee7] mb-3">
                      Saminatura
                    </p>
                    <h3 className="text-3xl md:text-5xl font-bold mb-4">
                      {image.title}
                    </h3>
                    <p className="text-base md:text-lg text-white/90 leading-relaxed">
                      {image.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={prevSlide}
              className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 text-[#344021] flex items-center justify-center text-2xl shadow-lg hover:bg-white transition"
              aria-label="Foto anterior"
            >
              ‹
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 text-[#344021] flex items-center justify-center text-2xl shadow-lg hover:bg-white transition"
              aria-label="Foto siguiente"
            >
              ›
            </button>

            <div className="absolute bottom-5 right-6 flex gap-2">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === currentSlide
                      ? "w-8 bg-white"
                      : "w-2.5 bg-white/50"
                  }`}
                  aria-label={`Ir a la foto ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIONES */}
      <section className="relative bg-[#f3eadb] px-6 py-20">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-16 left-10 w-36 h-36 bg-[#cadee7] rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-10 w-48 h-48 bg-[#936f54] rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-sm font-bold tracking-[0.25em] uppercase text-[#839741]">
              Lo que puedes encontrar
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-[#344021] mt-3 mb-5">
              Una tienda completa para una vida más natural
            </h2>
            <p className="text-[#626657] leading-relaxed text-lg">
              Hemos creado una selección variada para que puedas hacer tu compra
              habitual, descubrir productos nuevos y encontrar opciones adaptadas
              a tus necesidades.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((item) => (
              <div
                key={item.title}
                className="group bg-[#fbfaf6] rounded-[30px] p-7 border border-white/70 shadow-[0_18px_50px_rgba(52,64,33,0.08)] hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(52,64,33,0.15)] transition"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#344021] text-white flex items-center justify-center text-2xl mb-6 group-hover:bg-[#839741] transition">
                  {item.icon}
                </div>

                <h3 className="text-xl font-bold text-[#344021] mb-3">
                  {item.title}
                </h3>

                <p className="text-[#626657] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILOSOFÍA */}
      <section className="bg-[#fbfaf6] px-6 py-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(52,64,33,0.16)]">
              <img
                src={sami2}
                alt="Filosofía de Saminatura"
                className="w-full h-[420px] object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="absolute bottom-8 left-8 right-8 text-white">
               
             
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
       

            <h2 className="text-4xl md:text-5xl font-bold leading-tight text-[#344021] mb-6">
              Seleccionamos productos que encajan con una forma de vivir más
              consciente.
            </h2>

            <div className="space-y-5 text-[#626657] leading-relaxed text-lg">
              <p>
                En Saminatura creemos que cuidarse no debería ser complicado.
                Por eso buscamos productos claros, útiles y de calidad, tanto
                para quienes ya siguen un estilo de vida natural como para
                quienes están empezando.
              </p>

              <p>
                Nos gusta combinar lo ecológico con lo práctico: alimentos para
                el día a día, alternativas para intolerancias, suplementos,
                productos deportivos, higiene y cosmética natural.
              </p>

              <p>
                Nuestro objetivo es que cada visita sea fácil, agradable y
                cercana, con asesoramiento cuando lo necesites y libertad para
                descubrir a tu ritmo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className="px-6 pb-24 bg-[#fbfaf6]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Cercanía",
                text: "Escuchamos a nuestros clientes y adaptamos la tienda a lo que realmente necesitan.",
                color: "bg-[#344021]",
              },
              {
                title: "Calidad",
                text: "Priorizamos productos naturales, ecológicos y marcas que transmiten confianza.",
                color: "bg-[#839741]",
              },
              {
                title: "Bienestar",
                text: "Queremos ayudarte a encontrar opciones que encajen con tu alimentación, tu piel, tu rutina y tu salud diaria.",
                color: "bg-[#936f54]",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`${item.color} text-white rounded-[34px] p-8 min-h-[260px] flex flex-col justify-between shadow-[0_20px_60px_rgba(52,64,33,0.14)]`}
              >
                <h3 className="text-3xl font-bold">{item.title}</h3>
                <p className="text-white/90 leading-relaxed text-lg">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOQUE FINAL */}
      <section className="relative bg-[#344021] text-white py-24">
        <svg
          className="absolute top-[-2px] left-0 w-full block"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            fill="#fbfaf6"
            d="M0,40 C240,80 480,0 720,20 960,40 1200,80 1440,40 L1440,0 L0,0 Z"
          />
        </svg>

        <div className="relative max-w-4xl mx-auto px-6 text-center pt-8">
          <span className="text-sm font-bold tracking-[0.25em] uppercase text-[#cadee7]">
            Gracias por acompañarnos
          </span>

          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Seguimos creciendo contigo
          </h2>

        </div>
      </section>
    </div>
  );
}