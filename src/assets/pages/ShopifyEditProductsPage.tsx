// src/assets/pages/ShopifyEditProductsPage.tsx

import { useEffect, useMemo, useState } from "react";

import Header from "../containers/Header";
import AdminSidebar from "../containers/AdminSidebar";

import ShopifyAdminProductsManager from "../containers/ShopifyAdminProductsManager";
import ShopifyAdminExpiryPanel from "../containers/ShopifyAdminExpiryPanel";
import ShopifyAdminStockPanel from "../containers/ShopifyAdminStockPanel";

const SECTIONS = [
  { id: "productos", label: "Lista productos" },
  { id: "caducidad", label: "Caducidad" },
  { id: "stock", label: "Stock / Alertas" },
] as const;

export default function ShopifyEditProductsPage() {
  const [activeId, setActiveId] =
    useState<string>("productos");

  const items = useMemo(
    () =>
      SECTIONS.map((section) => ({
        id: section.id,
        label: section.label,
      })),
    []
  );

  const goTo = (id: string) => {
    const element =
      document.getElementById(id);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter(
              (entry) =>
                entry.isIntersecting
            )
            .sort(
              (a, b) =>
                (b.intersectionRatio ?? 0) -
                (a.intersectionRatio ?? 0)
            )[0];

          if (visible?.target?.id) {
            setActiveId(
              visible.target.id
            );
          }
        },
        {
          threshold: [0.25, 0.55],
        }
      );

    SECTIONS.forEach((section) => {
      const element =
        document.getElementById(
          section.id
        );

      if (element) {
        observer.observe(element);
      }
    });

    return () =>
      observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen gris">
      <Header />

      <AdminSidebar
        items={items}
        activeId={activeId}
        onGo={goTo}
      />

      <div className="mx-auto space-y-16 px-4 py-8">
        <section
          id="productos"
          className="scroll-mt-32"
        >
          <ShopifyAdminProductsManager />
        </section>

        <section
          id="caducidad"
          className="scroll-mt-32"
        >
          <ShopifyAdminExpiryPanel />
        </section>

        <section
          id="stock"
          className="scroll-mt-32"
        >
         <section
  id="stock"
  className="scroll-mt-32"
>
  <ShopifyAdminStockPanel />
</section>
        </section>
      </div>
    </main>
  );
}