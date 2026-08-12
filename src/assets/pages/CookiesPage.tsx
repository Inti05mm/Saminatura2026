import LegalLayout from "../containers/LegalLayout";

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Política de cookies"
      subtitle="Información sobre cookies, almacenamiento local y tecnologías similares utilizadas en Saminatura."
    >
      <section>
        <p>
          Esta Política de cookies explica qué son las cookies y otras
          tecnologías similares, para qué pueden utilizarse y cómo
          puedes gestionar tus preferencias.
        </p>
      </section>

      <section>
        <h2>1. ¿Qué son las cookies?</h2>

        <p>
          Las cookies son pequeños archivos o identificadores que
          pueden almacenarse en el dispositivo del usuario cuando
          visita una página web.
        </p>

        <p>
          Además de cookies, una aplicación web puede utilizar otras
          tecnologías de almacenamiento, como el almacenamiento local
          del navegador, para conservar determinada información
          necesaria para el funcionamiento del servicio.
        </p>
      </section>

      <section>
        <h2>2. Tipos de tecnologías utilizadas</h2>

        <h3>Cookies o almacenamiento necesario</h3>

        <p>
          Son aquellas tecnologías necesarias para permitir el
          funcionamiento básico de la tienda, la seguridad, la
          autenticación de usuarios o la prestación de funcionalidades
          expresamente solicitadas.
        </p>

        <p>
          Por ejemplo, determinadas funcionalidades de Saminatura
          pueden necesitar conservar información relacionada con:
        </p>

        <ul>
          <li>La sesión del usuario.</li>
          <li>La autenticación.</li>
          <li>La cesta de compra.</li>
          <li>Preferencias estrictamente necesarias.</li>
          <li>Seguridad de la aplicación.</li>
        </ul>

        <h3>Cookies de análisis</h3>

        <p>
          Si en el futuro Saminatura incorpora herramientas de
          medición o analítica que requieran consentimiento, dichas
          tecnologías no deberán activarse hasta que el usuario haya
          prestado el consentimiento correspondiente.
        </p>

        <h3>Cookies publicitarias</h3>

        <p>
          Si en el futuro se incorporan tecnologías publicitarias,
          seguimiento entre sitios o herramientas similares que
          requieran consentimiento, su utilización estará condicionada
          a las preferencias manifestadas por el usuario.
        </p>
      </section>

      <section>
        <h2>3. Servicios de terceros</h2>

        <p>
          Algunas funcionalidades de Saminatura utilizan servicios
          proporcionados por terceros, entre los que pueden
          encontrarse servicios de autenticación, pagos,
          infraestructura o procesamiento de direcciones.
        </p>

        <p>
          La utilización efectiva de cookies u otras tecnologías por
          estos proveedores deberá revisarse de acuerdo con la
          configuración finalmente desplegada en producción.
        </p>
      </section>

      <section>
        <h2>4. Gestión del consentimiento</h2>

        <p>
          Cuando se utilicen cookies o tecnologías no necesarias que
          requieran consentimiento, Saminatura facilitará un mecanismo
          para que el usuario pueda aceptar, rechazar o configurar sus
          preferencias.
        </p>

        <p>
          El usuario podrá modificar posteriormente las preferencias
          que hubiera establecido mediante el sistema de configuración
          de cookies disponible en el sitio web.
        </p>
      </section>

      <section>
        <h2>5. Configuración del navegador</h2>

        <p>
          También puedes configurar tu navegador para permitir,
          bloquear o eliminar las cookies instaladas en tu
          dispositivo.
        </p>

        <p>
          Ten en cuenta que bloquear determinadas tecnologías
          estrictamente necesarias puede impedir el correcto
          funcionamiento de ciertas funcionalidades.
        </p>
      </section>

      <section>
        <h2>6. Actualizaciones</h2>

        <p>
          Esta Política de cookies podrá ser modificada cuando cambien
          las tecnologías utilizadas por Saminatura o cuando resulte
          necesario adaptarla a cambios normativos.
        </p>
      </section>
    </LegalLayout>
  );
}