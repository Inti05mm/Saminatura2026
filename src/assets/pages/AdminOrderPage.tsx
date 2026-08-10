import React, { useEffect, useMemo, useState } from "react";
import Header from "../containers/Header";
import AdminOrdersManager from "../containers/AdminOrdersManager";
import AdminAnalytics from "../containers/AdminAnalytics";
import AdminTopNav from "../containers/AdminSidebar";
import AdminReturnsManager from "../containers/AdminReturnsManager";

const SECTIONS = [
  { id: "pedidos", label: "Pedidos" },
  {
    id: "devoluciones",
    label: "Devoluciones",
  },
  { id: "graficos", label: "Gráficos" },
] as const;

export default function AdminOrdersPage() {
  const [activeId, setActiveId] = useState<string>("pedidos");

  const items = useMemo(
    () => SECTIONS.map((s) => ({ id: s.id, label: s.label })),
    []
  );

  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Detectar sección visible (para resaltar botón)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          )[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { threshold: [0.3, 0.6] }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });

    return () => obs.disconnect();
  }, []);

  return (
    <main className="min-h-screen gris">
      <Header />

      {/* 🔒 Header fijo de administración */}
      <AdminTopNav items={items} activeId={activeId} onGo={goTo} />

      {/* Contenido */}
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-16">
        <section id="pedidos" className="scroll-mt-32">
          <AdminOrdersManager />
        </section>
        <section
  id="devoluciones"
  className="scroll-mt-32"
>
  <AdminReturnsManager />
</section>

        <section id="graficos" className="scroll-mt-32">
          <AdminAnalytics />
        </section>
      </div>
    </main>
  );
}
