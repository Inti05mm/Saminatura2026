import React, { useEffect, useMemo, useState } from "react";
import Header from "../containers/Header";
import AdminSidebar from "../containers/AdminSidebar";

import AdminProductsManager from "../containers/AdminProductManager";

// ✅ placeholders (te los dejo abajo)
import AdminExpiryPanel from "../containers/AdminExpiryPanel";
import AdminStockPanel from "../containers/AdminStockPanel";

const SECTIONS = [
  { id: "productos", label: "Lista productos" },
  { id: "caducidad", label: "Caducidad" },
  { id: "stock", label: "Stock / Alertas" },
] as const;

export default function EditProductsPage() {
  const [activeId, setActiveId] = useState<string>("productos");

  const items = useMemo(() => SECTIONS.map((s) => ({ id: s.id, label: s.label })), []);

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
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { threshold: [0.25, 0.55] }
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

      {/* ✅ nav sticky */}
      <AdminSidebar items={items} activeId={activeId} onGo={goTo} />

      {/* ✅ contenido */}
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-16">
        <section id="productos" className="scroll-mt-32">
          <AdminProductsManager />
        </section>

        <section id="caducidad" className="scroll-mt-32">
          <AdminExpiryPanel />
        </section>

        <section id="stock" className="scroll-mt-32">
          <AdminStockPanel />
        </section>
      </div>
    </main>
  );
}
