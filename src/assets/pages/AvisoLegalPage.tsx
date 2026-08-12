import LegalLayout from "../containers/LegalLayout";

const sections = [
  {
    id: "titular",
    label: "1. Datos del titular",
  },
  {
    id: "objeto",
    label: "2. Objeto del sitio web",
  },
  {
    id: "uso",
    label: "3. Condiciones de acceso y uso",
  },
  {
    id: "propiedad",
    label: "4. Propiedad intelectual",
  },
  {
    id: "responsabilidad",
    label: "5. Responsabilidad",
  },
  {
    id: "enlaces",
    label: "6. Enlaces externos",
  },
  {
    id: "proteccion-datos",
    label: "7. Protección de datos",
  },
  {
    id: "cookies",
    label: "8. Cookies",
  },
  {
    id: "legislacion",
    label: "9. Legislación aplicable",
  },
];

export default function AvisoLegalPage() {
  return (
    <LegalLayout
      title="Aviso legal"
      subtitle="Información relativa al titular y a las condiciones generales de acceso y utilización del sitio web de Saminatura."
      sidebar={
        <>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
            Contenido
          </p>

          <nav aria-label="Contenido del aviso legal">
            <ul className="space-y-1 text-[13px]">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="
                      block
                      rounded-lg
                      px-3
                      py-2
                      leading-5
                      text-black/60
                      no-underline
                      transition-all
                      duration-200
                      hover:bg-white
                      hover:text-black
                    "
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      }
    >
      {/* INTRODUCCIÓN */}
      <section>
        <p>
          En cumplimiento de la normativa aplicable a los servicios
          de la sociedad de la información y del comercio electrónico,
          se facilita a continuación la información identificativa del
          titular de este sitio web.
        </p>
      </section>

      {/* 1 */}
      <section
        id="titular"
        className="scroll-mt-32"
      >
        <h2>1. Datos identificativos del titular</h2>

        <p>
          El presente sitio web es titularidad de:
        </p>

        <ul>
          <li>
            <strong>Titular:</strong> Samira Adil Arif Billah
          </li>

          <li>
            <strong>Nombre comercial:</strong> SAMINATURA
          </li>

          <li>
            <strong>NIF:</strong> 49758296G
          </li>

          <li>
            <strong>Domicilio:</strong> C/ Teruel 16 Bajo
          </li>

          <li>
            <strong>Localidad:</strong> 22500 Binéfar, Huesca, España
          </li>

          <li>
            <strong>Correo electrónico:</strong>{" "}
            <a href="mailto:saminatura202369@gmail.com">
              saminatura202369@gmail.com
            </a>
          </li>

          <li>
            <strong>Teléfono:</strong>{" "}
            <a href="tel:+34631415075">
              +34 631 415 075
            </a>
          </li>
        </ul>
      </section>

      {/* 2 */}
      <section
        id="objeto"
        className="scroll-mt-32"
      >
        <h2>2. Objeto del sitio web</h2>

        <p>
          Saminatura pone a disposición de los usuarios este sitio web
          con la finalidad de proporcionar información sobre sus
          productos y servicios, así como permitir la adquisición
          online de los productos disponibles en el catálogo.
        </p>

        <p>
          Entre otros, el catálogo puede incluir productos de
          alimentación, complementos alimenticios, cosmética,
          higiene, bienestar y otros productos comercializados por
          Saminatura.
        </p>
      </section>

      {/* 3 */}
      <section
        id="uso"
        className="scroll-mt-32"
      >
        <h2>3. Condiciones de acceso y uso</h2>

        <p>
          El acceso al sitio web implica la aceptación de las
          condiciones de utilización recogidas en el presente Aviso
          Legal, sin perjuicio de las condiciones específicas que
          puedan resultar aplicables a determinados servicios o a la
          contratación de productos.
        </p>

        <p>
          El usuario se compromete a utilizar el sitio web de manera
          lícita, diligente y conforme a la buena fe, absteniéndose de
          realizar actuaciones que puedan causar daños al sitio web,
          a Saminatura o a terceros.
        </p>
      </section>

      {/* 4 */}
      <section
        id="propiedad"
        className="scroll-mt-32"
      >
        <h2>4. Propiedad intelectual e industrial</h2>

        <p>
          Los contenidos propios de este sitio web, incluyendo a
          título enunciativo textos, diseños, estructura, elementos
          gráficos, logotipos y código desarrollado específicamente
          para el sitio, se encuentran protegidos por la normativa
          aplicable en materia de propiedad intelectual e industrial.
        </p>

        <p>
          Las marcas, imágenes, logotipos y demás materiales
          pertenecientes a fabricantes, distribuidores u otros
          terceros son propiedad de sus respectivos titulares.
        </p>

        <p>
          No está permitida la reproducción, distribución o
          utilización de contenidos protegidos más allá de los
          supuestos legalmente permitidos sin la correspondiente
          autorización.
        </p>
      </section>

      {/* 5 */}
      <section
        id="responsabilidad"
        className="scroll-mt-32"
      >
        <h2>5. Responsabilidad</h2>

        <p>
          Saminatura procura que la información publicada sea correcta
          y se encuentre actualizada. No obstante, pueden producirse
          errores tipográficos, técnicos, variaciones de disponibilidad
          o modificaciones de información proporcionada por fabricantes
          y proveedores.
        </p>

        <p>
          La información sobre productos de alimentación,
          complementos o bienestar publicada en el sitio web tiene
          carácter informativo y no sustituye el asesoramiento de
          profesionales sanitarios cuando éste resulte necesario.
        </p>
      </section>

      {/* 6 */}
      <section
        id="enlaces"
        className="scroll-mt-32"
      >
        <h2>6. Enlaces externos</h2>

        <p>
          El sitio web puede contener enlaces hacia servicios o sitios
          gestionados por terceros. Saminatura no controla dichos
          sitios y no es responsable de sus respectivos contenidos,
          políticas o condiciones.
        </p>
      </section>

      {/* 7 */}
      <section
        id="proteccion-datos"
        className="scroll-mt-32"
      >
        <h2>7. Protección de datos</h2>

        <p>
          El tratamiento de los datos personales realizado a través
          del sitio web se encuentra descrito en nuestra{" "}
          <a href="/legal/privacidad">
            Política de privacidad
          </a>.
        </p>
      </section>

      {/* 8 */}
      <section
        id="cookies"
        className="scroll-mt-32"
      >
        <h2>8. Cookies</h2>

        <p>
          La información sobre cookies y tecnologías similares
          utilizadas por el sitio web se encuentra disponible en
          nuestra{" "}
          <a href="/legal/cookies">
            Política de cookies
          </a>.
        </p>
      </section>

      {/* 9 */}
      <section
        id="legislacion"
        className="scroll-mt-32"
      >
        <h2>9. Legislación aplicable</h2>

        <p>
          El funcionamiento de este sitio web se regirá por la
          legislación española y europea que resulte aplicable, sin
          perjuicio de los derechos que correspondan a consumidores y
          usuarios conforme a la normativa vigente.
        </p>
      </section>
    </LegalLayout>
  );
}