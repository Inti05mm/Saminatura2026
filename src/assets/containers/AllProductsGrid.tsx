import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../containers/Products";
import { useCart } from "../containers/CartContext";

interface Props {
  products: Product[];
}

const PRODUCTS_PER_PAGE = 32;

type PromoType = "none" | "percent" | "2x1" | "3x2" | "second_half";

// ✅ NUEVO: nombre “largo” = name + flavor + size
// Ej: "hola choco 40g"
function fullProductName(p: any) {
  const base = String(p?.name ?? "").trim();
  const f = String(p?.flavor ?? "").trim();
  const s = String(p?.size ?? "").trim();
  return [base, f, s].filter(Boolean).join(" ");
}

// ✅ helper: etiqueta promo para la card (llamativa)
function getPromoBadge(p: any): { text: string; style: "unit" | "percent" } | null {
  const promoActive = !!p?.promo_active;
  const promoType: PromoType = (p?.promo_type as PromoType) ?? "none";

  if (promoActive && promoType !== "none") {
    if (promoType === "2x1") return { text: "2x1", style: "unit" };
    if (promoType === "3x2") return { text: "3x2", style: "unit" };
    if (promoType === "second_half") return { text: "2ª al 50%", style: "unit" };
    if (promoType === "percent") {
      const price = Number(p?.price ?? 0);
      const old = p?.old_price === null || p?.old_price === undefined ? null : Number(p.old_price);
      if (old !== null && old > price && old > 0) {
        const pct = Math.round(((old - price) / old) * 100);
        return pct > 0 ? { text: `-${pct}%`, style: "percent" } : { text: "Oferta", style: "percent" };
      }
      return { text: "Oferta", style: "percent" };
    }
  }

  const price = Number(p?.price ?? 0);
  const old = p?.old_price === null || p?.old_price === undefined ? null : Number(p.old_price);
  if (old !== null && old > price && old > 0) {
    const pct = Math.round(((old - price) / old) * 100);
    return pct > 0 ? { text: `-${pct}%`, style: "percent" } : null;
  }

  return null;
}

// ✅ genera la URL FINAL: /shopping/slug-id (sin duplicar id)
function getProductPath(p: any) {
  const id = Number(p?.id);
  const slug = String(p?.slug ?? "").trim();

  // ✅ SIEMPRE /shopping/slug-id (y si ya viene con -id no lo duplica)
  if (slug && Number.isFinite(id)) {
    const suffix = `-${id}`;
    const finalSlug = slug.endsWith(suffix) ? slug : `${slug}${suffix}`;
    return `/shopping/${finalSlug}`;
  }

  // ❌ no permitimos /shopping/123
  return "/shopping";
}



const AllProductsGrid: React.FC<Props> = ({ products }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { addToCart, loading } = useCart();
  const [addedMap, setAddedMap] = useState<Record<number, boolean>>({});

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const currentProducts = useMemo(
    () => products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE),
    [products, startIndex]
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleAdd = async (productId: number) => {
    await addToCart(productId, 1);

    setAddedMap((prev) => ({ ...prev, [productId]: true }));
    window.setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [productId]: false }));
    }, 1200);
  };

  

  return (
    <>
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentProducts.map((product: any) => {
          const outOfStock = product.stock !== undefined && product.stock !== null && product.stock <= 0;
          const isAdded = !!addedMap[product.id];
          const badge = getPromoBadge(product);

          const productPath = getProductPath(product);

          // ✅ NUEVO: nombre mostrado en la card
          const displayName = fullProductName(product);

          return (
            <div
              key={product.id}
              onClick={() => navigate(productPath)}
              className="relative gris shadow-md rounded-xl hover:scale-105 transition-transform cursor-pointer overflow-hidden"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(productPath);
              }}
            >
              {/* ✅ BADGE PROMO (arriba izquierda) */}
              {badge && (
                <div className="absolute top-3 left-3 z-10">
                  <div
                    className={[
                      "px-3 py-1 rounded-full text-m font-extrabold shadow-lg",
                      "backdrop-blur-sm",
                      badge.style === "unit"
                        ? "bg-[#8c0327] text-white border border-white/30"
                        : "bg-amber-300 text-black border border-black/10",
                    ].join(" ")}
                  >
                    {badge.text}
                  </div>
                </div>
              )}

              {/* ✅ mini label sin stock */}
              {outOfStock && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="px-3 py-1 rounded-full text-xs font-bold bg-black/80 text-white">
                    Sin stock
                  </div>
                </div>
              )}

              <img
                src={product.img ?? "https://placehold.co/600x600?text=IMG"}
                alt={displayName || product.name}
                className="h-64 w-full object-cover rounded-t-xl"
                loading="lazy"
              />

              <div className="px-4 py-3">
                <span className="text-gray-400 text-xs uppercase">{product.brand}</span>

                {/* ✅ AQUÍ: name + flavor + size */}
                <p className="text-lg font-bold text-black truncate">{displayName}</p>

                <div className="flex items-center mt-2">
                  <p className="text-md font-semibold">€{Number(product.price ?? 0).toFixed(2)}</p>

                  {product.old_price !== null &&
                    product.old_price !== undefined &&
                    Number(product.old_price) > Number(product.price ?? 0) && (
                      <del className="ml-2 text-sm text-gray-500">€{Number(product.old_price).toFixed(2)}</del>
                    )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!outOfStock && !loading) handleAdd(product.id);
                  }}
                  disabled={loading || outOfStock}
                  className={[
                    "mt-3 w-full",
                    "flex items-center justify-center gap-[15px]",
                    "px-[15px] py-[10px]",
                    "rounded-[5px] border-none",
                    "transition-all duration-[400ms]",
                    outOfStock
                      ? "bg-gray-300 outline outline-3 outline-gray-300 outline-offset-[-3px] cursor-not-allowed"
                      : "verde-3 outline outline-3 outline-[#c1ce9c] outline-offset-[-3px] cursor-pointer",
                    !outOfStock && !loading ? "hover:bg-transparent" : "",
                    loading ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 16 16"
                    height="24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                    className={[
                      "transition-colors duration-[400ms]",
                      outOfStock ? "fill-[#666666]" : "fill-black",
                    ].join(" ")}
                  >
                    <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z" />
                    <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                  </svg>

                  <span
                    className={[
                      "font-bold text-[0.85em] transition-colors duration-[400ms]",
                      outOfStock ? "text-[#666666]" : "text-black",
                    ].join(" ")}
                  >
                    {outOfStock ? "Sin stock" : isAdded ? "Añadido!" : "Añadir a la cesta"}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ◀
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`px-3 py-1 border rounded-lg text-gray-600 hover:bg-gray-100 ${
                page === currentPage ? "bg-gray-200 font-bold" : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶
          </button>
        </div>
      )}
    </>
  );
};

export default AllProductsGrid;