import LegalLayout from "../containers/LegalLayout";

const sections = [
  {
    id: "vendedor",
    label: "1. Identificación del vendedor",
  },
  {
    id: "productos",
    label: "2. Productos",
  },
  {
    id: "stock",
    label: "3. Disponibilidad y stock",
  },
  {
    id: "precios",
    label: "4. Precios",
  },
  {
    id: "proceso-compra",
    label: "5. Proceso de compra",
  },
  {
    id: "pago",
    label: "6. Pago",
  },
  {
    id: "confirmacion",
    label: "7. Confirmación del pedido",
  },
  {
    id: "entrega",
    label: "8. Entrega",
  },
  {
    id: "desistimiento",
    label: "9. Derecho de desistimiento",
  },
  {
    id: "defectuosos",
    label: "10. Productos defectuosos",
  },
  {
    id: "atencion",
    label: "11. Atención al cliente",
  },
  {
    id: "legislacion",
    label: "12. Legislación aplicable",
  },
];

export default function CondicionesCompraPage() {
  return (
    <LegalLayout
      title="Condiciones de compra"
      subtitle="Condiciones aplicables a las compras realizadas a través de la tienda online de Saminatura."
      sidebar={
        <>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
            Contenido
          </p>

          <nav aria-label="Contenido de las condiciones de compra">
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
          Las presentes Condiciones de compra regulan la adquisición
          de productos a través de la tienda online Saminatura.
        </p>

        <p>
          Antes de realizar una compra, el usuario debe leer estas
          condiciones junto con el Aviso legal, la Política de
          privacidad y la información sobre devoluciones y reembolsos.
        </p>
      </section>

      {/* 1 */}
      <section
        id="vendedor"
        className="scroll-mt-32"
      >
        <h2>1. Identificación del vendedor</h2>

        <ul>
          <li>
            <strong>Titular / Razón social:</strong> [COMPLETAR]
          </li>

          <li>
            <strong>Nombre comercial:</strong> SAMINATURA
          </li>

          <li>
            <strong>NIF/CIF:</strong> [COMPLETAR]
          </li>

          <li>
            <strong>Domicilio:</strong> [COMPLETAR]
          </li>

          <li>
            <strong>Email:</strong>{" "}
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
        id="productos"
        className="scroll-mt-32"
      >
        <h2>2. Productos</h2>

        <p>
          Saminatura comercializa los productos que aparecen
          disponibles en la tienda online en cada momento.
        </p>

        <p>
          Se procura mostrar fotografías, características,
          composición y demás información de la forma más precisa
          posible. El diseño del envase o determinados elementos
          visuales pueden ser modificados por el fabricante sin previo
          aviso.
        </p>

        <p>
          En caso de existir diferencias relevantes, prevalecerá la
          información obligatoria que figure en el etiquetado del
          producto suministrado.
        </p>
      </section>

      {/* 3 */}
      <section
        id="stock"
        className="scroll-mt-32"
      >
        <h2>3. Disponibilidad y stock</h2>

        <p>
          Todos los pedidos están sujetos a la disponibilidad de los
          productos.
        </p>

        <p>
          En caso de que, tras realizar un pedido, alguno de los
          productos no estuviera disponible por un error de inventario
          o por cualquier otra circunstancia, Saminatura contactará con
          el cliente para ofrecer una solución adecuada.
        </p>

        <p>
          Cuando corresponda, las cantidades abonadas por productos no
          disponibles serán reembolsadas a través del mismo medio de
          pago utilizado para realizar la compra.
        </p>
      </section>

      {/* 4 */}
      <section
        id="precios"
        className="scroll-mt-32"
      >
        <h2>4. Precios</h2>

        <p>
          Los precios mostrados en la tienda serán los aplicables en
          el momento de confirmar la compra, salvo error manifiesto.
        </p>

        <p>
          Los impuestos legalmente aplicables se incluirán o
          desglosarán conforme corresponda.
        </p>

        <p>
          Los gastos de envío, cuando existan, se mostrarán antes de
          finalizar la compra.
        </p>
      </section>

      {/* 5 */}
      <section
        id="proceso-compra"
        className="scroll-mt-32"
      >
        <h2>5. Proceso de compra</h2>

        <p>
          Para realizar una compra, el usuario seleccionará los
          productos deseados, los añadirá a la cesta y facilitará los
          datos necesarios para tramitar el pedido.
        </p>

        <p>
          Antes de efectuar el pago se mostrará un resumen del pedido
          para que el usuario pueda revisar los productos, cantidades,
          dirección y demás información relevante.
        </p>

        <p>
          La realización de la acción final de pago implica una
          obligación de pago.
        </p>
      </section>

      {/* 6 */}
      <section
        id="pago"
        className="scroll-mt-32"
      >
        <h2>6. Pago</h2>

        <p>
  Los pagos online se procesan de forma segura mediante el
  checkout de Shopify y los proveedores de pago disponibles
  en cada momento.
</p>

<p>
  Los métodos de pago disponibles, así como cualquier
  información relevante asociada al pago, se mostrarán antes
  de confirmar el pedido.
</p>

<p>
  Saminatura no almacena los datos completos de las tarjetas
  bancarias utilizadas durante el pago.
</p>
      </section>

      {/* 7 */}
      <section
        id="confirmacion"
        className="scroll-mt-32"
      >
        <h2>7. Confirmación del pedido</h2>

        <p>
          Una vez recibido y procesado correctamente el pedido,
          Saminatura enviará una confirmación al correo electrónico
          facilitado por el cliente.
        </p>

        <p>
          Es responsabilidad del cliente comprobar que los datos
          facilitados son correctos.
        </p>
      </section>

      {/* 8 */}
      <section
        id="entrega"
        className="scroll-mt-32"
      >
        <h2>8. Entrega</h2>

        <p>
          Las zonas de entrega, modalidades disponibles, costes y
          plazos estimados se detallan en nuestra página de{" "}
          <a href="/legal/envios-devoluciones">
            Devoluciones y reembolsos
          </a>.
        </p>
      </section>

      {/* 9 */}
      <section
        id="desistimiento"
        className="scroll-mt-32"
      >
        <h2>9. Derecho de desistimiento</h2>

        <p>
          Cuando resulte legalmente aplicable, el consumidor dispone
          del plazo legal para desistir de una compra realizada a
          distancia sin necesidad de justificar su decisión.
        </p>

        <p>
          Con carácter general, dicho plazo es de{" "}
          <strong>14 días naturales</strong> desde la recepción de los
          bienes, sin perjuicio de las excepciones legalmente
          establecidas.
        </p>

        <p>
          Determinados productos pueden encontrarse excluidos del
          derecho de desistimiento, por ejemplo en algunos supuestos
          relacionados con bienes que puedan deteriorarse o caducar
          con rapidez, o bienes precintados que no sean aptos para ser
          devueltos por razones de protección de la salud o higiene
          una vez desprecintados, cuando concurran los requisitos
          legales correspondientes.
        </p>

        <p>
          Consulta las condiciones completas en{" "}
          <a href="/legal/envios-devoluciones">
            Devoluciones y reembolsos
          </a>.
        </p>
      </section>

      {/* 10 */}
      <section
        id="defectuosos"
        className="scroll-mt-32"
      >
        <h2>10. Productos defectuosos o incorrectos</h2>

        <p>
          Si recibes un producto defectuoso, dañado, incompleto o
          diferente al solicitado, debes contactar con Saminatura tan
          pronto como sea razonablemente posible para que podamos
          revisar la incidencia y ofrecer la solución que corresponda.
        </p>

        <p>
          Las incidencias relacionadas con productos dañados,
          incorrectos o no conformes se gestionarán de forma
          independiente al ejercicio del derecho de desistimiento.
        </p>

        <p>
          Puedes consultar el procedimiento completo en{" "}
          <a href="/legal/envios-devoluciones">
            Devoluciones y reembolsos
          </a>.
        </p>
      </section>

      {/* 11 */}
      <section
        id="atencion"
        className="scroll-mt-32"
      >
        <h2>11. Atención al cliente</h2>

        <p>
          Puedes contactar con Saminatura mediante:
        </p>

        <ul>
          <li>
            Email:{" "}
            <a href="mailto:saminatura202369@gmail.com">
              saminatura202369@gmail.com
            </a>
          </li>

          <li>
            Teléfono:{" "}
            <a href="tel:+34631415075">
              +34 631 415 075
            </a>
          </li>

          <li>
            WhatsApp:{" "}
            <a
              href="https://wa.me/34631415075"
              target="_blank"
              rel="noopener noreferrer"
            >
              +34 631 415 075
            </a>
          </li>
        </ul>
      </section>

      {/* 12 */}
      <section
        id="legislacion"
        className="scroll-mt-32"
      >
        <h2>12. Legislación aplicable</h2>

        <p>
          Estas condiciones se interpretarán conforme a la normativa
          española y europea aplicable en materia de contratación,
          comercio electrónico y protección de consumidores y
          usuarios.
        </p>

        <p>
          Nada de lo dispuesto en estas condiciones limitará los
          derechos que la legislación reconozca al consumidor.
        </p>
      </section>
    </LegalLayout>
  );
}