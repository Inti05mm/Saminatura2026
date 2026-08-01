import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../containers/Products";
import { useCart } from "../containers/CartContext";

interface Props {
  products: Product[];
}

const PRODUCTS_PER_PAGE = 32;

type PromoType =
  | "none"
  | "percent"
  | "2x1"
  | "3x2"
  | "second_half";

function fullProductName(p: any) {
  const base = String(p?.name ?? "").trim();
  const flavor = String(p?.flavor ?? "").trim();
  const size = String(p?.size ?? "").trim();

  return [base, flavor, size].filter(Boolean).join(" ");
}

function getPromoBadge(
  p: any
): { text: string; style: "unit" | "percent" } | null {
  const promoActive = !!p?.promo_active;

  const promoType: PromoType =
    (p?.promo_type as PromoType) ?? "none";

  if (promoActive && promoType !== "none") {
    if (promoType === "2x1") {
      return {
        text: "2x1",
        style: "unit",
      };
    }

    if (promoType === "3x2") {
      return {
        text: "3x2",
        style: "unit",
      };
    }

    if (promoType === "second_half") {
      return {
        text: "2ª al 50%",
        style: "unit",
      };
    }

    if (promoType === "percent") {
      const price = Number(p?.price ?? 0);

      const oldPrice =
        p?.old_price === null ||
        p?.old_price === undefined
          ? null
          : Number(p.old_price);

      if (
        oldPrice !== null &&
        oldPrice > price &&
        oldPrice > 0
      ) {
        const percentage = Math.round(
          ((oldPrice - price) / oldPrice) * 100
        );

        return percentage > 0
          ? {
              text: `-${percentage}%`,
              style: "percent",
            }
          : {
              text: "Oferta",
              style: "percent",
            };
      }

      return {
        text: "Oferta",
        style: "percent",
      };
    }
  }

  const price = Number(p?.price ?? 0);

  const oldPrice =
    p?.old_price === null ||
    p?.old_price === undefined
      ? null
      : Number(p.old_price);

  if (
    oldPrice !== null &&
    oldPrice > price &&
    oldPrice > 0
  ) {
    const percentage = Math.round(
      ((oldPrice - price) / oldPrice) * 100
    );

    return percentage > 0
      ? {
          text: `-${percentage}%`,
          style: "percent",
        }
      : null;
  }

  return null;
}

function getProductPath(p: any) {
  const id = Number(p?.id);
  const slug = String(p?.slug ?? "").trim();

  if (slug && Number.isFinite(id)) {
    const suffix = `-${id}`;

    const finalSlug = slug.endsWith(suffix)
      ? slug
      : `${slug}${suffix}`;

    return `/shopping/${finalSlug}`;
  }

  return "/shopping";
}

type PaginationItem =
  | number
  | "ellipsis-left"
  | "ellipsis-right";

function getVisiblePages(
  currentPage: number,
  totalPages: number
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis-right",
      totalPages,
    ];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

const AllProductsGrid: React.FC<Props> = ({
  products,
}) => {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] =
    useState(1);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const { addToCart, loading } = useCart();

  const [addedMap, setAddedMap] = useState<
    Record<number, boolean>
  >({});

  const totalPages = Math.ceil(
    products.length / PRODUCTS_PER_PAGE
  );

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [products.length, totalPages, currentPage]);

  const startIndex =
    (currentPage - 1) * PRODUCTS_PER_PAGE;

  const currentProducts = useMemo(() => {
    return products.slice(
      startIndex,
      startIndex + PRODUCTS_PER_PAGE
    );
  }, [products, startIndex]);

  const visiblePages = useMemo(() => {
    return getVisiblePages(
      currentPage,
      totalPages
    );
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);

    window.requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleAdd = async (
    productId: number
  ) => {
    await addToCart(productId, 1);

    setAddedMap((prev) => ({
      ...prev,
      [productId]: true,
    }));

    window.setTimeout(() => {
      setAddedMap((prev) => ({
        ...prev,
        [productId]: false,
      }));
    }, 1200);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="grid grid-cols-1 gap-6 scroll-mt-28 sm:grid-cols-2 lg:grid-cols-4"
      >
        {currentProducts.map(
          (product: any) => {
            const outOfStock =
              product.stock !== undefined &&
              product.stock !== null &&
              product.stock <= 0;

            const isAdded =
              !!addedMap[product.id];

            const badge =
              getPromoBadge(product);

            const productPath =
              getProductPath(product);

            const displayName =
              fullProductName(product);

            return (
              <div
                key={product.id}
                onClick={() =>
                  navigate(productPath)
                }
                className="gris relative cursor-pointer overflow-hidden rounded-xl shadow-md transition-transform hover:scale-105"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === " "
                  ) {
                    navigate(productPath);
                  }
                }}
              >
                {badge && (
                  <div className="absolute left-3 top-3 z-10">
                    <div
                      className={[
                        "rounded-full px-3 py-1 text-base font-extrabold shadow-lg",
                        "backdrop-blur-sm",
                        badge.style === "unit"
                          ? "border border-white/30 bg-[#8c0327] text-white"
                          : "border border-black/10 bg-amber-300 text-black",
                      ].join(" ")}
                    >
                      {badge.text}
                    </div>
                  </div>
                )}

                {outOfStock && (
                  <div className="absolute right-3 top-3 z-10">
                    <div className="rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-white">
                      Sin stock
                    </div>
                  </div>
                )}

                <img
                  src={
                    product.img ??
                    "https://placehold.co/600x600?text=IMG"
                  }
                  alt={
                    displayName ||
                    product.name
                  }
                  className="h-64 w-full rounded-t-xl object-cover"
                  loading="lazy"
                />

                <div className="px-4 py-3">
                  <span className="text-xs uppercase text-gray-400">
                    {product.brand}
                  </span>

                  <p className="truncate text-lg font-bold text-black">
                    {displayName}
                  </p>

                  <div className="mt-2 flex items-center">
                    <p className="text-md font-semibold">
                      €
                      {Number(
                        product.price ?? 0
                      ).toFixed(2)}
                    </p>

                    {product.old_price !==
                      null &&
                      product.old_price !==
                        undefined &&
                      Number(
                        product.old_price
                      ) >
                        Number(
                          product.price ?? 0
                        ) && (
                        <del className="ml-2 text-sm text-gray-500">
                          €
                          {Number(
                            product.old_price
                          ).toFixed(2)}
                        </del>
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (
                        !outOfStock &&
                        !loading
                      ) {
                        handleAdd(
                          product.id
                        );
                      }
                    }}
                    disabled={
                      loading || outOfStock
                    }
                    className={[
                      "mt-3 w-full",
                      "flex items-center justify-center gap-[15px]",
                      "px-[15px] py-[10px]",
                      "rounded-[5px] border-none",
                      "transition-all duration-[400ms]",
                      outOfStock
                        ? "cursor-not-allowed bg-gray-300 outline outline-3 outline-offset-[-3px] outline-gray-300"
                        : "verde-3 cursor-pointer outline outline-3 outline-offset-[-3px] outline-[#c1ce9c]",
                      !outOfStock &&
                      !loading
                        ? "hover:bg-transparent"
                        : "",
                      loading
                        ? "opacity-60"
                        : "",
                    ].join(" ")}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      height="24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                      className={[
                        "transition-colors duration-[400ms]",
                        outOfStock
                          ? "fill-[#666666]"
                          : "fill-black",
                      ].join(" ")}
                    >
                      <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z" />

                      <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                    </svg>

                    <span
                      className={[
                        "text-[0.85em] font-bold transition-colors duration-[400ms]",
                        outOfStock
                          ? "text-[#666666]"
                          : "text-black",
                      ].join(" ")}
                    >
                      {outOfStock
                        ? "Sin stock"
                        : isAdded
                        ? "¡Añadido!"
                        : "Añadir a la cesta"}
                    </span>
                  </button>
                </div>
              </div>
            );
          }
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-10 flex justify-center px-2">
          <nav
            className="max-w-full overflow-x-auto rounded-full bg-gray-200 px-3 py-2 sm:px-4"
            aria-label="Paginación de productos"
          >
            <ul className="flex min-w-max items-center gap-1 py-1 font-medium text-gray-600 sm:gap-2">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      currentPage - 1
                    )
                  }
                  disabled={
                    currentPage === 1
                  }
                  aria-label="Página anterior"
                  className={[
                    "flex h-10 min-w-10 items-center justify-center rounded-full px-3",
                    "transition duration-300 ease-in-out",
                    currentPage === 1
                      ? "cursor-not-allowed text-gray-400 opacity-50"
                      : "hover:bg-white hover:text-gray-800",
                  ].join(" ")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m15 18-6-6 6-6"
                    />
                  </svg>
                </button>
              </li>

              {visiblePages.map((page) => {
                if (
                  page ===
                    "ellipsis-left" ||
                  page ===
                    "ellipsis-right"
                ) {
                  return (
                    <li key={page}>
                      <span className="flex h-10 min-w-8 items-center justify-center px-1 text-gray-500">
                        …
                      </span>
                    </li>
                  );
                }

                const isActive =
                  page === currentPage;

                return (
                  <li key={page}>
                    <button
                      type="button"
                      onClick={() =>
                        goToPage(page)
                      }
                      aria-label={`Ir a la página ${page}`}
                      aria-current={
                        isActive
                          ? "page"
                          : undefined
                      }
                      className={[
                        "flex h-10 min-w-10 items-center justify-center rounded-full px-4",
                        "transition duration-300 ease-in-out",
                        isActive
                          ? "bg-white font-bold text-gray-800 shadow-sm"
                          : "text-gray-600 hover:bg-white hover:text-gray-800",
                      ].join(" ")}
                    >
                      {page}
                    </button>
                  </li>
                );
              })}

              <li>
                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      currentPage + 1
                    )
                  }
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  aria-label="Página siguiente"
                  className={[
                    "flex h-10 min-w-10 items-center justify-center rounded-full px-3",
                    "transition duration-300 ease-in-out",
                    currentPage ===
                    totalPages
                      ? "cursor-not-allowed text-gray-400 opacity-50"
                      : "hover:bg-white hover:text-gray-800",
                  ].join(" ")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9 18 6-6-6-6"
                    />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
};

export default AllProductsGrid;