import LegalLayout from "../containers/LegalLayout";

const sections = [
  {
    id: "responsable",
    label: "1. Responsable del tratamiento",
  },
  {
    id: "datos",
    label: "2. Qué datos tratamos",
  },
  {
    id: "finalidades",
    label: "3. Para qué usamos tus datos",
  },
  {
    id: "base-juridica",
    label: "4. Base jurídica",
  },
  {
    id: "proveedores",
    label: "5. Proveedores tecnológicos",
  },
  {
    id: "conservacion",
    label: "6. Conservación de los datos",
  },
  {
    id: "derechos",
    label: "7. Derechos de los usuarios",
  },
  {
    id: "seguridad",
    label: "8. Seguridad",
  },
  {
    id: "modificaciones",
    label: "9. Modificaciones",
  },
];

export default function PrivacidadPage() {
  return (
    <LegalLayout
      title="Política de privacidad"
      subtitle="Información sobre cómo Saminatura recoge y utiliza los datos personales de sus clientes y usuarios."
      sidebar={
        <>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
            Contenido
          </p>

          <nav aria-label="Contenido de la política de privacidad">
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
          En Saminatura nos comprometemos a tratar los datos
          personales de nuestros usuarios y clientes de manera
          transparente, segura y conforme a la normativa aplicable en
          materia de protección de datos.
        </p>
      </section>

      {/* 1 */}
<section
  id="responsable"
  className="scroll-mt-32"
>
 
  <p>
    Puedes consultar la información identificativa completa del
    titular en nuestro{" "}
    <a href="/legal/aviso-legal">
      Aviso legal
    </a>.
  </p>
</section>

      {/* 2 */}
      <section
        id="datos"
        className="scroll-mt-32"
      >
        <h2>2. Qué datos podemos tratar</h2>

        <p> 
          Dependiendo del uso que realices de Saminatura, podremos
          tratar las siguientes categorías de datos:
        </p>

        <ul>
          <li>Nombre y apellidos.</li>
          <li>Dirección de correo electrónico.</li>
          <li>Número de teléfono.</li>
          <li>Direcciones de envío y facturación.</li>
          <li>Información necesaria para gestionar pedidos.</li>
          <li>Historial de pedidos y devoluciones.</li>
          <li>Información asociada a tu cuenta de usuario.</li>
          <li>
            Productos añadidos a cesta o favoritos cuando corresponda.
          </li>
          <li>Comunicaciones mantenidas con Saminatura.</li>
          <li>
            Datos técnicos necesarios para el funcionamiento y
            seguridad del servicio.
          </li>
        </ul>

        <p>
          Saminatura no almacena directamente los datos completos de
          las tarjetas utilizadas para realizar pagos mediante
          Stripe. La información de pago es gestionada por el
          proveedor de pagos correspondiente.
        </p>
      </section>

      {/* 3 */}
      <section
        id="finalidades"
        className="scroll-mt-32"
      >
        <h2>3. Para qué utilizamos tus datos</h2>

        <p>
          Podemos utilizar los datos personales para las siguientes
          finalidades:
        </p>

        <ul>
          <li>Crear y gestionar tu cuenta de usuario.</li>
          <li>Gestionar tus datos de perfil y direcciones.</li>
          <li>Procesar y gestionar tus pedidos.</li>
          <li>Gestionar pagos, devoluciones y reembolsos.</li>
          <li>Preparar y realizar los envíos.</li>

          <li>
            Enviarte comunicaciones relacionadas con un pedido o con
            tu cuenta.
          </li>

          <li>
            Atender consultas, incidencias o solicitudes.
          </li>

          <li>Prevenir usos fraudulentos del servicio.</li>

          <li>
            Cumplir obligaciones fiscales, contables y legales.
          </li>

          <li>
            Enviarte comunicaciones comerciales cuando exista una
            base jurídica válida para ello.
          </li>
        </ul>
      </section>

      {/* 4 */}
      <section
        id="base-juridica"
        className="scroll-mt-32"
      >
        <h2>4. Base jurídica</h2>

        <p>
          Según la finalidad concreta, el tratamiento podrá
          fundamentarse en:
        </p>

        <ul>
          <li>
            <strong>Ejecución de un contrato:</strong> cuando sea
            necesario tratar tus datos para gestionar una compra,
            una cuenta o una solicitud relacionada con el servicio.
          </li>

          <li>
            <strong>Cumplimiento de obligaciones legales:</strong>{" "}
            por ejemplo, determinadas obligaciones contables,
            fiscales, de consumo o relacionadas con la gestión de
            pedidos.
          </li>

          <li>
            <strong>Consentimiento:</strong> cuando expresamente se
            solicite para una finalidad que lo requiera.
          </li>

          <li>
            <strong>Interés legítimo:</strong> cuando proceda y tras
            valorar los derechos e intereses de las personas
            afectadas, por ejemplo para determinadas medidas de
            seguridad y prevención del fraude.
          </li>
        </ul>
      </section>

      {/* 5 */}
      <section
        id="proveedores"
        className="scroll-mt-32"
      >
        <h2>5. Proveedores tecnológicos y destinatarios</h2>

        <p>
          Para prestar los servicios de la tienda, Saminatura utiliza
          determinados proveedores que pueden tratar datos personales
          en la medida necesaria para prestar sus respectivos
          servicios.
        </p>

        <p>
          Entre los proveedores y categorías de destinatarios
          utilizados por la tienda se encuentran:
        </p>

        <ul>
          <li>
            <strong>Supabase:</strong> infraestructura de base de
            datos, autenticación y servicios backend.
          </li>

          <li>
            <strong>Stripe:</strong> procesamiento y gestión de
            pagos.
          </li>

          <li>
            <strong>Resend:</strong> envío de determinados correos
            electrónicos relacionados con el servicio.
          </li>

          <li>
            <strong>Google:</strong> servicios relacionados con el
            autocompletado y procesamiento de direcciones cuando
            estén habilitados.
          </li>

          <li>
            <strong>Proveedor de alojamiento:</strong> infraestructura
            utilizada para publicar y servir la aplicación web.
          </li>

          <li>
            <strong>Empresas de transporte:</strong> cuando sea
            necesario comunicar los datos imprescindibles para
            realizar la entrega de un pedido.
          </li>
        </ul>
      </section>

      {/* 6 */}
      <section
        id="conservacion"
        className="scroll-mt-32"
      >
        <h2>6. Conservación de los datos</h2>

        <p>
          Los datos serán conservados durante el tiempo necesario para
          cumplir la finalidad para la que fueron recogidos y,
          posteriormente, durante los plazos que puedan resultar
          necesarios para atender obligaciones legales o posibles
          responsabilidades.
        </p>

        <p>
          La eliminación de una cuenta de usuario no implica
          necesariamente la eliminación inmediata de toda la
          información asociada a operaciones comerciales cuando exista
          una obligación legal de conservar determinados registros.
        </p>
      </section>

      {/* 7 */}
      <section
        id="derechos"
        className="scroll-mt-32"
      >
        <h2>7. Derechos de los usuarios</h2>

        <p>
          Puedes ejercer, cuando proceda, tus derechos de:
        </p>

        <ul>
          <li>Acceso.</li>
          <li>Rectificación.</li>
          <li>Supresión.</li>
          <li>Oposición.</li>
          <li>Limitación del tratamiento.</li>
          <li>Portabilidad.</li>

          <li>
            Retirada del consentimiento cuando el tratamiento se
            encuentre basado en él.
          </li>
        </ul>

        <p>
          Para ejercerlos puedes contactar con nosotros en:
        </p>

        <p>
          <a href="mailto:saminatura202369@gmail.com">
            saminatura202369@gmail.com
          </a>
        </p>

        <p>
          Asimismo, si consideras que el tratamiento de tus datos no
          se ajusta a la normativa aplicable, puedes presentar una
          reclamación ante la Agencia Española de Protección de Datos.
        </p>
      </section>

      {/* 8 */}
      <section
        id="seguridad"
        className="scroll-mt-32"
      >
        <h2>8. Seguridad</h2>

        <p>
          Saminatura adopta medidas técnicas y organizativas orientadas
          a proteger los datos personales frente al acceso,
          modificación, pérdida, destrucción o divulgación no
          autorizados.
        </p>
      </section>

      {/* 9 */}
      <section
        id="modificaciones"
        className="scroll-mt-32"
      >
        <h2>9. Modificaciones de esta política</h2>

        <p>
          Esta Política de privacidad podrá actualizarse cuando
          cambien las funcionalidades de la tienda, los proveedores
          utilizados o las obligaciones legales aplicables.
        </p>

        <p>
          La versión vigente estará siempre disponible en esta página.
        </p>
      </section>
    </LegalLayout>
  );
}