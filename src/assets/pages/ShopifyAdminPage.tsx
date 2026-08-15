// src/assets/pages/ShopifyAdminPage.tsx

import React, { useEffect, useMemo, useState } from "react";

import Header from "../containers/Header";
import AdminTopNav from "../containers/AdminSidebar";

import ShopifyAdminOrdersManager from "../containers/ShopifyAdminOrdersManager";
import ShopifyAdminAnalytics from "../containers/ShopifyAdminAnalytics";
import ShopifyAdminReturnsManager from "../containers/ShopifyAdminReturnsManagers.tsx";

const SECTIONS = [
  {
    id: "pedidos-shopify",
    label: "Pedidos",
  },
  {
    id: "devoluciones",
    label: "Devoluciones",
  },
  {
    id: "graficos",
    label: "Gráficos",
  },
] as const;

export default function ShopifyAdminPage() {
  const [activeId, setActiveId] =
    useState<string>("pedidos-shopify");

  const items = useMemo(
    () =>
      SECTIONS.map((section) => ({
        id: section.id,
        label: section.label,
      })),
    []
  );

  const goTo = (id: string) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) -
              (a.intersectionRatio ?? 0)
          )[0];

        if (visible?.target?.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        threshold: [0.3, 0.6],
      }
    );

    SECTIONS.forEach((section) => {
      const element = document.getElementById(
        section.id
      );

      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen gris">
      <Header />

      <AdminTopNav
        items={items}
        activeId={activeId}
        onGo={goTo}
      />

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-8">

        {/* PEDIDOS SHOPIFY */}
        <section
          id="pedidos-shopify"
          className="scroll-mt-32"
        >
          <ShopifyAdminOrdersManager />
        </section>

        {/* DEVOLUCIONES SHOPIFY */}
        <section
          id="devoluciones"
          className="scroll-mt-32"
        >
          <ShopifyAdminReturnsManager />
        </section>

        {/* GRÁFICOS SHOPIFY */}
        <section
          id="graficos"
          className="scroll-mt-32"
        >
          <ShopifyAdminAnalytics />
        </section>

      </div>
    </main>
  );
}