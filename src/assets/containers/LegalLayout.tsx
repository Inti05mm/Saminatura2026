import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LegalLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;

  // NUEVO
  sidebar?: ReactNode;
};

export default function LegalLayout({
  title,
  subtitle,
  children,
  sidebar,
}: LegalLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      {/* ================================
          CABECERA DEL DOCUMENTO
      ================================= */}
      <section className="border-b border-black/5 bg-[#f1eee4]">
        <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
            Información legal
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60 md:text-base">
              {subtitle}
            </p>
          )}

          <p className="mt-5 text-xs text-black/40">
            Última actualización: 11 de agosto de 2026
          </p>
        </div>
      </section>

      {/* ================================
          DOCUMENTO + SIDEBAR EXTERIOR
      ================================= */}

      <section className="mx-auto w-full max-w-[1500px] px-6 py-12 md:px-8 md:py-16">
        <div
          className={
            sidebar
              ? `
                  grid
                  grid-cols-1
                  gap-8
                  lg:grid-cols-[250px_minmax(0,830px)]
                  lg:justify-center
                  lg:gap-10
                `
              : "mx-auto max-w-4xl"
          }
        >
          {/* SIDEBAR FUERA DEL CUADRADO BLANCO */}
          {sidebar && (
            <aside className="hidden lg:block">
              <div
                className="
                  sticky
                  top-24
                  max-h-[calc(100vh-7rem)]
                  overflow-y-auto
                  rounded-2xl
                  border border-black/[0.08]
                  bg-[#f1eee4]
                  p-4
                  shadow-[0_8px_24px_rgba(0,0,0,0.035)]
                "
              >
                {sidebar}
              </div>
            </aside>
          )}

          {/* DOCUMENTO BLANCO */}
          <div className="min-w-0">
            <article
              className="
                rounded-[28px]
                border border-black/[0.07]
                bg-white
                px-6 py-8
                shadow-[0_14px_45px_rgba(0,0,0,0.04)]
                md:px-10 md:py-12
              "
            >
              <div
                className="
                  space-y-9
                  text-[15px]
                  leading-7
                  text-black/70

                  [&_h2]:mt-10
                  [&_h2]:text-xl
                  [&_h2]:font-semibold
                  [&_h2]:tracking-tight
                  [&_h2]:text-black

                  [&_h3]:mt-6
                  [&_h3]:font-semibold
                  [&_h3]:text-black

                  [&_a]:font-medium
                  [&_a]:text-black
                  [&_a]:underline
                  [&_a]:underline-offset-4

                  [&_ul]:list-disc
                  [&_ul]:space-y-2
                  [&_ul]:pl-6

                  [&_ol]:list-decimal
                  [&_ol]:space-y-2
                  [&_ol]:pl-6

                  [&_strong]:font-semibold
                  [&_strong]:text-black
                "
              >
                {children}
              </div>
            </article>

            {/* ================================
                NAVEGACIÓN DOCUMENTOS LEGALES
            ================================= */}

            <div className="mt-10 border-t border-black/10 pt-8">
              <p className="mb-5 text-sm font-semibold">
                Información legal
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-black/60">
                <Link
                  to="/legal/aviso-legal"
                  className="hover:text-black"
                >
                  Aviso legal
                </Link>

                <Link
                  to="/legal/privacidad"
                  className="hover:text-black"
                >
                  Privacidad
                </Link>

        

                <Link
                  to="/legal/condiciones-compra"
                  className="hover:text-black"
                >
                  Condiciones de compra
                </Link>

                <Link
                  to="/legal/envios-devoluciones"
                  className="hover:text-black"
                >
                  Devoluciones y reembolsos
                </Link>
              </div>
            </div>

            <div className="mt-12 text-center text-xs text-black/40">
              © 2026 SAMINATURA. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}