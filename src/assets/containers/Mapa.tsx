import React from "react";

const Mapa: React.FC = () => {
  return (
    <section className="verde-1">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:py-20 lg:px-8">
        <div className="max-w-2xl lg:max-w-4xl mx-auto text-center">
          <h2 className="text-4xl roboto-title text-white" id="contactUs">
            Visita nuestra tienda
          </h2>
        </div>

        <div className="mt-8 lg:mt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Info de contacto */}
            <div>
              <div className="max-w-full mx-auto rounded-lg overflow-hidden">
                <div className="border-t border-gray-200 px-6 py-4">
                  <h3 className="text-lg roboto text-white">Contacto</h3>
                  <p className="mt-1 roboto text-white">
                    <a href="tel:+123">Teléfono: +34 631 41 50 75</a>
                  </p>
                  <a className="flex m-1" href="tel:+34 631 41 50 75">
                    <div className="shrink-0">
                      <p><a className="roboto">Email: saminatura369@gmail.com</a></p>
                      
                    </div>
                  </a>
                </div>

                <div className="px-6 py-4">
                  <h3 className="text-lg font-medium text-white">Nuestra dirección</h3>
                  <p className="mt-1 text-white">C. Teruel, 16, local, 22500 Binéfar, Huesca</p>
                </div>

                <div className="border-t border-gray-200 px-6 py-4">
                  <h3 className="text-lg font-medium text-white">Horario</h3>
                  <p className="mt-1 text-white">Lunes - Viernes : 10h - 14h & 17h - 20.30h</p>
                  <p className="mt-1 text-white">Sábado : 10h - 14h</p>
                </div>
              </div>  
            </div>

            {/* Mapa embebido */}
            <div className="rounded-lg overflow-hidden order-0 sm:order-first">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d5943.967089009238!2d0.294913!3d41.850181!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a7756c1b80e0cf%3A0xab471559457a999e!2sSAMINATURA!5e0!3m2!1sen!2ses!4v1769769880185!5m2!1sen!2ses"
                className="w-full"
                width={600}
                height={450}
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Mapa;
