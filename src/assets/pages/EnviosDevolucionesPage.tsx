import LegalLayout from "../containers/LegalLayout";

/* =========================================================
   ENLACES
========================================================= */

const whatsappReturnUrl =
  "https://wa.me/34631415075?text=" +
  encodeURIComponent(
    `Hola Saminatura.

Quiero gestionar una DEVOLUCIÓN / DESISTIMIENTO.

Nombre y apellidos:
Número de pedido:
Producto o productos:
Tipo de solicitud: Devolución / Desistimiento

Gracias.`
  );

const whatsappIssueUrl =
  "https://wa.me/34631415075?text=" +
  encodeURIComponent(
    `Hola Saminatura.

Quiero comunicar una INCIDENCIA con mi pedido.

Nombre y apellidos:
Número de pedido:
Producto:
Problema:

Adjuntaré fotografías del producto o embalaje si son necesarias.

Gracias.`
  );

const emailReturnUrl =
  "mailto:saminatura202369@gmail.com" +
  "?subject=" +
  encodeURIComponent("DEVOLUCIÓN - Pedido Saminatura") +
  "&body=" +
  encodeURIComponent(
    `Hola Saminatura,

Quiero gestionar una DEVOLUCIÓN / DESISTIMIENTO.

Nombre y apellidos:
Número de pedido:
Producto o productos:
Tipo de solicitud: Devolución / Desistimiento

Gracias.`
  );

const emailIssueUrl =
  "mailto:saminatura202369@gmail.com" +
  "?subject=" +
  encodeURIComponent("INCIDENCIA - Pedido Saminatura") +
  "&body=" +
  encodeURIComponent(
    `Hola Saminatura,

Quiero comunicar una INCIDENCIA con mi pedido.

Nombre y apellidos:
Número de pedido:
Producto:
Problema:

Adjunto fotografías del producto o embalaje cuando sean necesarias.

Gracias.`
  );

/* =========================================================
   ÍNDICE LATERAL
========================================================= */

const sections = [
  {
    id: "desistimiento",
    label: "1. Derecho de desistimiento",
  },
  {
    id: "solicitud",
    label: "2. Cómo solicitarlo",
  },
  {
    id: "exclusiones",
    label: "3. Productos excluidos",
  },
  {
    id: "precintos",
    label: "4. Productos abiertos",
  },
  {
    id: "manipulacion",
    label: "5. Manipulación y conservación",
  },
  {
    id: "plazo",
    label: "6. Plazo de devolución",
  },
  {
    id: "gastos",
    label: "7. Gastos de devolución",
  },
  {
    id: "incidencias",
    label: "8. Productos dañados",
  },
  {
    id: "caducidad",
    label: "9. Consumo próximo",
  },
  {
    id: "reembolso",
    label: "10. Reembolso",
  },
  {
    id: "envio-original",
    label: "11. Gastos de envío",
  },
  {
    id: "direccion",
    label: "12. Dirección de devolución",
  },
  {
    id: "modelo",
    label: "13. Modelo de desistimiento",
  },
  {
    id: "contacto",
    label: "14. Contacto",
  },
  {
    id: "normativa",
    label: "15. Normativa aplicable",
  },
];

export default function EnviosDevolucionesPage() {
  return (
    <LegalLayout
      title="Devoluciones y reembolsos"
      subtitle="Información sobre el derecho de desistimiento, devoluciones, incidencias y reembolsos aplicables a las compras realizadas en Saminatura."
      sidebar={
        <>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
            Contenido
          </p>

          <nav aria-label="Contenido de devoluciones y reembolsos">
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
          En esta página encontrarás la información relativa al derecho
          de desistimiento, las condiciones aplicables a las
          devoluciones, los productos que pueden encontrarse excluidos,
          la gestión de productos dañados o incorrectos y el
          procedimiento de reembolso.
        </p>

        <p>
          Te recomendamos consultar esta información antes de realizar
          una compra.
        </p>
      </section>

      {/* 1 */}
      <section
        id="desistimiento"
        className="scroll-mt-32"
      >
        <h2>1. Derecho de desistimiento</h2>

        <p>
          Cuando resulte legalmente aplicable, el consumidor dispone
          de un plazo de <strong>14 días naturales</strong> desde la
          recepción del producto para comunicar a Saminatura su
          decisión de desistir de la compra, sin necesidad de indicar
          el motivo.
        </p>

        <p>
          El ejercicio de este derecho no estará sujeto a penalización,
          sin perjuicio de los costes y responsabilidades que la
          normativa atribuya al consumidor en relación con la
          devolución de los productos.
        </p>
      </section>

      {/* 2 */}
      <section
        id="solicitud"
        className="scroll-mt-32"
      >
        <h2>2. Cómo solicitar una devolución o desistimiento</h2>

        <p>
          Para solicitar una devolución o comunicar tu decisión de
          desistir de una compra, puedes contactar directamente con
          Saminatura por WhatsApp o correo electrónico.
        </p>

        <p>
          Para que podamos localizar correctamente tu pedido, incluye:
        </p>

        <ul>
          <li>Nombre y apellidos.</li>
          <li>Número o referencia del pedido.</li>
          <li>Producto o productos afectados.</li>
          <li>
            Indica claramente que se trata de una{" "}
            <strong>DEVOLUCIÓN</strong> o un{" "}
            <strong>DESISTIMIENTO</strong>.
          </li>
        </ul>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <a
            href={whatsappReturnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              rounded-2xl
              border border-[#d8e2d2]
              bg-[#f5f8f2]
              p-5
              no-underline
              transition
              hover:border-[#718360]
              hover:bg-[#eef4e9]
            "
          >
            <p className="font-semibold text-black">
              Solicitar por WhatsApp
            </p>

            <p className="mt-2 text-sm text-black/60">
              +34 631 415 075
            </p>

            <p className="mt-3 text-sm leading-6 text-black/60">
              Se abrirá WhatsApp con un mensaje preparado para que solo
              tengas que completar los datos de tu pedido y enviarlo.
            </p>
          </a>

          <a
            href={emailReturnUrl}
            className="
              rounded-2xl
              border border-[#d8e2d2]
              bg-[#f5f8f2]
              p-5
              no-underline
              transition
              hover:border-[#718360]
              hover:bg-[#eef4e9]
            "
          >
            <p className="font-semibold text-black">
              Solicitar por correo electrónico
            </p>

            <p className="mt-2 text-sm text-black/60">
              saminatura202369@gmail.com
            </p>

            <p className="mt-3 text-sm leading-6 text-black/60">
              Se abrirá tu aplicación de correo con el asunto
              “DEVOLUCIÓN - Pedido Saminatura” y un mensaje preparado.
            </p>
          </a>
        </div>

        <p className="mt-6">
          Cuando se trate del ejercicio válido del derecho de
          desistimiento, no es necesario indicar el motivo de la
          devolución.
        </p>
      </section>

      {/* 3 */}
      <section
        id="exclusiones"
        className="scroll-mt-32"
      >
        <h2>3. Productos excluidos del derecho de desistimiento</h2>

        <p>
          El derecho de desistimiento no resulta aplicable en los
          supuestos establecidos legalmente.
        </p>

        <p>
          Debido a la naturaleza de algunos productos comercializados
          por Saminatura, pueden resultar especialmente relevantes,
          entre otras, las siguientes excepciones:
        </p>

        <h3>Productos que puedan deteriorarse o caducar con rapidez</h3>

        <p>
          El derecho de desistimiento no será aplicable cuando se trate
          de bienes que, por su propia naturaleza, puedan deteriorarse
          o caducar con rapidez y concurran los requisitos previstos
          legalmente.
        </p>

        <h3>
          Productos precintados por razones de salud o higiene
        </h3>

        <p>
          No podrá ejercerse el derecho de desistimiento respecto de
          bienes precintados que no sean aptos para ser devueltos por
          razones de protección de la salud o de higiene cuando hayan
          sido desprecintados después de la entrega.
        </p>

        <p>
          Esta excepción se aplicará únicamente cuando concurran los
          requisitos establecidos legalmente. El hecho de pertenecer a
          una determinada categoría de producto no implica
          automáticamente la exclusión del derecho de desistimiento.
        </p>

        <p>
          Por ello, determinados productos de alimentación,
          complementos alimenticios, cosmética o higiene podrán estar
          sujetos a condiciones específicas en función de su
          naturaleza, estado, precinto y características.
        </p>
      </section>

      {/* 4 */}
      <section
        id="precintos"
        className="scroll-mt-32"
      >
        <h2>4. Productos abiertos o desprecintados</h2>

        <p>
          Cuando resulte aplicable la excepción legal relativa a la
          protección de la salud o la higiene, la apertura o retirada
          del precinto después de la entrega supondrá la pérdida del
          derecho de desistimiento respecto de ese producto.
        </p>

        <p>
          Cuando un producto disponga de sello, membrana, banda de
          seguridad u otro sistema que permita comprobar que no ha sido
          abierto, deberá mantenerse intacto cuando resulte necesario
          para conservar el derecho de desistimiento conforme a la
          normativa aplicable.
        </p>
      </section>

      {/* 5 */}
      <section
        id="manipulacion"
        className="scroll-mt-32"
      >
        <h2>5. Estado, manipulación y conservación del producto</h2>

        <p>
          Durante el periodo de desistimiento, el consumidor deberá
          manipular el producto únicamente en la medida necesaria para
          comprobar su naturaleza, características y funcionamiento.
        </p>

        <p>
          El consumidor será responsable de la disminución de valor de
          los bienes cuando ésta sea consecuencia de una manipulación
          distinta de la necesaria para realizar dicha comprobación.
        </p>

        <p>
          Cuando corresponda, podrán tenerse en cuenta daños,
          alteraciones o pérdidas de valor derivados de un uso,
          manipulación o conservación inadecuados del producto.
        </p>

        <p>
          Saminatura podrá comprobar el estado del producto recibido,
          su embalaje y su precinto cuando corresponda, a efectos de
          determinar si existe una disminución de valor o si resulta
          aplicable alguna de las excepciones previstas legalmente.
        </p>
      </section>

      {/* 6 */}
      <section
        id="plazo"
        className="scroll-mt-32"
      >
        <h2>6. Plazo para enviar el producto devuelto</h2>

        <p>
          Una vez comunicada válidamente la decisión de desistir, el
          consumidor deberá devolver o entregar los productos sin
          demora indebida y, en todo caso, dentro de los{" "}
          <strong>14 días naturales siguientes</strong> a la fecha en
          que haya comunicado su decisión.
        </p>
      </section>

      {/* 7 */}
      <section
        id="gastos"
        className="scroll-mt-32"
      >
        <h2>7. Gastos de devolución</h2>

        <p>
          Cuando la devolución se produzca como consecuencia del
          ejercicio del derecho de desistimiento, el consumidor
          asumirá los costes directos de devolución de los productos,
          cuando así corresponda conforme a la normativa aplicable.
        </p>

        <p>
          Esta regla no será aplicable de la misma manera cuando la
          devolución tenga su origen en un producto defectuoso,
          dañado, incorrecto o en otra incidencia imputable a
          Saminatura.
        </p>
      </section>

      {/* 8 */}
      <section
        id="incidencias"
        className="scroll-mt-32"
      >
        <h2>8. Productos dañados, incorrectos o en mal estado</h2>

        <p>
          Las incidencias relacionadas con productos dañados,
          incorrectos, incompletos o no conformes se gestionan de forma
          independiente al derecho de desistimiento.
        </p>

        <p>
          Si detectas alguno de estos problemas, comunícanoslo lo antes
          posible.
        </p>

        <p>
          Para poder revisar correctamente la incidencia, incluye:
        </p>

        <ul>
          <li>Nombre y apellidos.</li>
          <li>Número de pedido.</li>
          <li>Producto afectado.</li>
          <li>Una breve descripción del problema.</li>
          <li>
            Fotografías claras del producto, su embalaje o los daños
            cuando sean necesarias para comprobar la incidencia.
          </li>
        </ul>

        <p>
          Las fotografías deberán limitarse al producto, embalaje o
          incidencia y no deberán incluir datos personales
          innecesarios.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <a
            href={whatsappIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              rounded-2xl
              border border-[#d8e2d2]
              bg-[#f5f8f2]
              p-5
              no-underline
              transition
              hover:border-[#718360]
              hover:bg-[#eef4e9]
            "
          >
            <p className="font-semibold text-black">
              Comunicar incidencia por WhatsApp
            </p>

            <p className="mt-2 text-sm text-black/60">
              +34 631 415 075
            </p>

            <p className="mt-3 text-sm leading-6 text-black/60">
              Se abrirá WhatsApp con un mensaje preparado. Podrás
              adjuntar las fotografías necesarias desde la conversación.
            </p>
          </a>

          <a
            href={emailIssueUrl}
            className="
              rounded-2xl
              border border-[#d8e2d2]
              bg-[#f5f8f2]
              p-5
              no-underline
              transition
              hover:border-[#718360]
              hover:bg-[#eef4e9]
            "
          >
            <p className="font-semibold text-black">
              Comunicar incidencia por email
            </p>

            <p className="mt-2 text-sm text-black/60">
              saminatura202369@gmail.com
            </p>

            <p className="mt-3 text-sm leading-6 text-black/60">
              Se abrirá tu aplicación de correo con el asunto
              “INCIDENCIA - Pedido Saminatura”. Adjunta manualmente las
              fotografías cuando sean necesarias.
            </p>
          </a>
        </div>

        <p className="mt-6">
          Saminatura revisará la información y el producto cuando
          corresponda y aplicará la solución que resulte procedente
          conforme a los derechos del consumidor.
        </p>
      </section>

      {/* 9 */}
      <section
        id="caducidad"
        className="scroll-mt-32"
      >
        <h2>9. Productos con fecha de consumo próxima</h2>

        <p>
          Cuando un producto se comercialice con una fecha de
          caducidad o de consumo preferente especialmente próxima,
          Saminatura procurará informar de esta circunstancia de forma
          clara antes de finalizar la compra.
        </p>

        <p>
          La existencia de una fecha próxima no implica por sí sola la
          pérdida automática del derecho de desistimiento. Se
          aplicarán las excepciones legalmente previstas atendiendo a
          la naturaleza y características del producto.
        </p>
      </section>

      {/* 10 */}
      <section
        id="reembolso"
        className="scroll-mt-32"
      >
        <h2>10. Reembolso</h2>

        <p>
          Cuando proceda legalmente un reembolso, éste se realizará
          utilizando{" "}
          <strong>
            el mismo medio de pago empleado para realizar la compra
          </strong>.
        </p>

        <p>
          Saminatura no sustituirá el reembolso por vales, saldo de
          tienda u otros medios diferentes al utilizado para efectuar
          el pago, salvo que el consumidor lo solicite o acepte
          expresamente y ello no le genere ningún coste.
        </p>

        <h3>Reembolso en caso de desistimiento</h3>

        <p>
          Cuando el consumidor ejerza válidamente el derecho de
          desistimiento, Saminatura realizará el reembolso que
          corresponda sin demoras indebidas y dentro de los plazos
          establecidos legalmente.
        </p>

        <p>
          Saminatura podrá retener el reembolso hasta haber recibido
          los productos devueltos o hasta que el consumidor presente
          una prueba de su devolución, según qué circunstancia se
          produzca primero, cuando resulte legalmente aplicable.
        </p>

        <p>
          Una vez recibido el producto, Saminatura podrá comprobar su
          estado, precinto, embalaje y condiciones de conservación
          cuando resulte pertinente.
        </p>

        <h3>Reembolso por incidencia</h3>

        <p>
          Cuando se comunique que un producto ha llegado dañado,
          incorrecto, incompleto o presenta otra falta de conformidad,
          Saminatura podrá solicitar la información razonablemente
          necesaria para comprobar y gestionar la incidencia.
        </p>

        <p>
          Tras comprobar la incidencia se aplicará la solución que
          corresponda conforme a la normativa aplicable.
        </p>
      </section>

      {/* 11 */}
      <section
        id="envio-original"
        className="scroll-mt-32"
      >
        <h2>11. Gastos de envío originales</h2>

        <p>
          En un desistimiento válido se reembolsarán, cuando
          corresponda, los costes de entrega ordinarios asociados a la
          compra.
        </p>

        <p>
          Si el consumidor hubiese elegido voluntariamente una
          modalidad de entrega más costosa que la modalidad ordinaria
          ofrecida por Saminatura, no será necesario reembolsar el
          coste adicional derivado de dicha elección.
        </p>
      </section>

      {/* 12 */}
      <section
        id="direccion"
        className="scroll-mt-32"
      >
        <h2>12. Dirección para las devoluciones</h2>

        <p>
          Antes de enviar físicamente un producto, contacta con
          Saminatura para que podamos identificar correctamente el
          pedido y facilitar las instrucciones necesarias para la
          devolución.
        </p>

        <p>
          <strong>Dirección de devolución:</strong>
          <br />
          [COMPLETAR DIRECCIÓN DE SAMINATURA]
          <br />
          Binéfar, Huesca, España
        </p>

        <p>
          No deberán enviarse productos contra reembolso salvo acuerdo
          previo con Saminatura.
        </p>
      </section>

      {/* 13 */}
      <section
        id="modelo"
        className="scroll-mt-32"
      >
        <h2>13. Modelo de desistimiento</h2>

        <p>
          Si lo deseas, puedes ejercer tu derecho enviándonos una
          comunicación que incluya la siguiente información:
        </p>

        <div className="rounded-2xl border border-black/10 bg-[#f8f7f2] p-5">
          <p>
            <strong>A la atención de Saminatura:</strong>
          </p>

          <p>
            Por la presente comunico que desisto del contrato de venta
            correspondiente al siguiente pedido:
          </p>

          <ul>
            <li>Producto o productos: __________________</li>
            <li>Número de pedido: __________________</li>
            <li>Fecha de recepción: __________________</li>
            <li>Nombre del consumidor: __________________</li>
            <li>Dirección del consumidor: __________________</li>
            <li>Fecha de solicitud: __________________</li>
          </ul>
        </div>

        <p>
          La utilización de este modelo no es obligatoria. También
          puede utilizarse cualquier otra declaración inequívoca.
        </p>
      </section>

      {/* 14 */}
      <section
        id="contacto"
        className="scroll-mt-32"
      >
        <h2>14. Contacto para devoluciones e incidencias</h2>

        <p>
          Puedes contactar con Saminatura mediante:
        </p>

        <ul>
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a
              href="https://wa.me/34631415075"
              target="_blank"
              rel="noopener noreferrer"
            >
              +34 631 415 075
            </a>
          </li>

          <li>
            <strong>Email:</strong>{" "}
            <a href={emailReturnUrl}>
              saminatura202369@gmail.com
            </a>
          </li>
        </ul>

        <p>
          Para proteger tu privacidad, no incluyas información médica
          ni otros datos personales que no sean necesarios para
          gestionar la devolución o incidencia.
        </p>
      </section>

      {/* 15 */}
      <section
        id="normativa"
        className="scroll-mt-32"
      >
        <h2>15. Normativa aplicable</h2>

        <p>
          Las presentes condiciones se interpretarán de acuerdo con la
          normativa española y europea aplicable en materia de
          protección de consumidores y usuarios.
        </p>

        <p>
          Ninguna disposición de esta página pretende limitar los
          derechos reconocidos legalmente a los consumidores.
        </p>
      </section>
    </LegalLayout>
  );
}