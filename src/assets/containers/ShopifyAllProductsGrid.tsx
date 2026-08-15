import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useShopifyCart,
} from "../containers/ShopifyCartContext";

import ShopifyFavoriteButton
  from "./ShopifyFavoriteButton";

export type ShopifyUiProduct = {
  key: string;

  productId: string;
  variantId: string;

  slug: string;
  category: string;
  name: string;
  brand: string;

  price: number;
  old_price:
    | number
    | null;

  img:
    | string
    | null;

  description:
    | string
    | null;

  stock:
    | number
    | null;

  availableForSale:
    boolean;

  bio: boolean;
  vegan: boolean;
  gluten_free: boolean;
  lactose_free: boolean;

  promo_type:
    | "none"
    | "percent"
    | "2x1"
    | "3x2"
    | "second_half";

  promo_active:
    boolean;

  variantTitle:
    | string
    | null;
};

interface Props {
  products:
    ShopifyUiProduct[];
}

const PRODUCTS_PER_PAGE =
  32;

type PaginationItem =
  | number
  | "ellipsis-left"
  | "ellipsis-right";

function cleanVariantTitle(
  value:
    | string
    | null
    | undefined
) {
  const text =
    String(
      value ?? ""
    ).trim();

  if (
    !text ||
    text.toLowerCase() ===
      "default title"
  ) {
    return "";
  }

  return text;
}

function fullProductName(
  product:
    ShopifyUiProduct
) {
  const variant =
    cleanVariantTitle(
      product.variantTitle
    );

  return [
    product.name,
    variant,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getPromoBadge(
  product:
    ShopifyUiProduct
):
  | {
      text: string;

      style:
        | "unit"
        | "percent";
    }
  | null {
  const promoActive =
    Boolean(
      product.promo_active
    );

  const promoType =
    product.promo_type;

  if (
    promoActive &&
    promoType !== "none"
  ) {
    if (
      promoType ===
      "2x1"
    ) {
      return {
        text: "2x1",
        style: "unit",
      };
    }

    if (
      promoType ===
      "3x2"
    ) {
      return {
        text: "3x2",
        style: "unit",
      };
    }

    if (
      promoType ===
      "second_half"
    ) {
      return {
        text: "2ª al 50%",
        style: "unit",
      };
    }

    if (
      promoType ===
      "percent"
    ) {
      const oldPrice =
        product.old_price;

      if (
        oldPrice !== null &&
        oldPrice >
          product.price &&
        oldPrice > 0
      ) {
        const percentage =
          Math.round(
            (
              (
                oldPrice -
                product.price
              ) /
              oldPrice
            ) *
              100
          );

        return {
          text:
            percentage > 0
              ? `-${percentage}%`
              : "Oferta",

          style:
            "percent",
        };
      }

      return {
        text:
          "Oferta",

        style:
          "percent",
      };
    }
  }

  if (
    product.old_price !==
      null &&
    product.old_price >
      product.price &&
    product.old_price >
      0
  ) {
    const percentage =
      Math.round(
        (
          (
            product.old_price -
            product.price
          ) /
          product.old_price
        ) *
          100
      );

    if (
      percentage >
      0
    ) {
      return {
        text:
          `-${percentage}%`,

        style:
          "percent",
      };
    }
  }

  return null;
}

function getVisiblePages(
  currentPage: number,
  totalPages: number
):
  PaginationItem[] {
  if (
    totalPages <=
    7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (
        _,
        index
      ) =>
        index + 1
    );
  }

  if (
    currentPage <=
    4
  ) {
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

  if (
    currentPage >=
    totalPages -
      3
  ) {
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

export default function ShopifyAllProductsGrid({
  products,
}: Props) {
  const navigate =
    useNavigate();

  const {
    addToCart,

    loading:
      cartLoading,
  } =
    useShopifyCart();

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(1);

  const [
    addedVariantId,
    setAddedVariantId,
  ] =
    useState<
      string | null
    >(null);

  const containerRef =
    useRef<
      HTMLDivElement
    >(null);

  const totalPages =
    Math.ceil(
      products.length /
        PRODUCTS_PER_PAGE
    );

  useEffect(() => {
    setCurrentPage(
      1
    );
  }, [
    products,
  ]);

  useEffect(() => {
    if (
      totalPages ===
      0
    ) {
      setCurrentPage(
        1
      );

      return;
    }

    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        1
      );
    }
  }, [
    totalPages,
    currentPage,
  ]);

  const startIndex =
    (
      currentPage -
      1
    ) *
    PRODUCTS_PER_PAGE;

  const currentProducts =
    useMemo(
      () =>
        products.slice(
          startIndex,

          startIndex +
            PRODUCTS_PER_PAGE
        ),
      [
        products,
        startIndex,
      ]
    );

  const visiblePages =
    useMemo(
      () =>
        getVisiblePages(
          currentPage,
          totalPages
        ),
      [
        currentPage,
        totalPages,
      ]
    );

  const goToPage = (
    page: number
  ) => {
    if (
      page < 1 ||
      page >
        totalPages
    ) {
      return;
    }

    setCurrentPage(
      page
    );

    window.requestAnimationFrame(
      () => {
        containerRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",

            block:
              "start",
          }
        );
      }
    );
  };

  const handleAdd =
    async (
      product:
        ShopifyUiProduct
    ) => {
      const outOfStock =
        !product.availableForSale ||
        (
          product.stock !==
            null &&
          product.stock <=
            0
        );

      if (
        outOfStock ||
        cartLoading
      ) {
        return;
      }

      try {
        await addToCart(
          product.variantId,
          1
        );

        setAddedVariantId(
          product.variantId
        );

        window.setTimeout(
          () => {
            setAddedVariantId(
              null
            );
          },
          1200
        );
      } catch (
        error
      ) {
        console.error(
          "Error añadiendo variante Shopify:",
          error
        );
      }
    };

  return (
    <>
      <style>{`
        .shopify-product-card:hover {
          transform: translateY(-6px) scale(1.015);
        }

        /*
          Cuando el ratón está sobre el corazón,
          la card vuelve a escala normal y solo
          crece el botón de favorito.
        */
        .shopify-product-card:has(.shopify-favorite-button:hover) {
          transform: scale(1);
        }
      `}</style>

      <div
        ref={
          containerRef
        }
        className="
          grid scroll-mt-28
          grid-cols-1 gap-6
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        {currentProducts.map(
          (
            product
          ) => {
            const outOfStock =
              !product.availableForSale ||
              (
                product.stock !==
                  null &&
                product.stock <=
                  0
              );

            const isAdded =
              addedVariantId ===
              product.variantId;

            const badge =
              getPromoBadge(
                product
              );

            const displayName =
              fullProductName(
                product
              );

            const productPath =
              `/tienda/${product.slug}`;

            return (
              <article
                key={
                  product.key
                }
                className="
                  shopify-product-card
                  group relative
                  flex h-full
                  flex-col
                  overflow-hidden
                  rounded-[1.6rem]
                  border border-[#dfe5d7]
                  bg-[#fffefa]
                  shadow-[0_8px_28px_rgba(47,67,31,0.08)]
                  transition-all
                  duration-500
                  hover:border-[#b8c7aa]
                  hover:shadow-[0_20px_45px_rgba(47,67,31,0.16)]
                "
              >
                {badge && (
                  <div
                    className="
                      absolute
                      left-3 top-3
                      z-20
                    "
                  >
                    <div
                      className={[
                        "rounded-full px-3 py-1 text-base font-extrabold shadow-lg",
                        "backdrop-blur-sm",
                        badge.style ===
                        "unit"
                          ? "border border-white/30 bg-[#8c0327] text-white"
                          : "border border-black/10 bg-amber-300 text-black",
                      ].join(
                        " "
                      )}
                    >
                      {
                        badge.text
                      }
                    </div>
                  </div>
                )}

                <ShopifyFavoriteButton
                  variantId={
                    product.variantId
                  }
                  productName={
                    displayName
                  }
                  className="
                    absolute
                    right-3 top-3
                    z-30
                  "
                />

                {outOfStock && (
                  <div
                    className="
                      absolute
                      right-3 top-14
                      z-20
                    "
                  >
                    <div
                      className="
                        rounded-full
                        bg-black/80
                        px-3 py-1
                        text-xs
                        font-bold
                        text-white
                      "
                    >
                      Sin stock
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      productPath
                    )
                  }
                  className="
                    block w-full
                    border-0
                    bg-transparent
                    p-0
                    text-left
                  "
                >
                  <div
                    className="
                      relative
                      flex h-64 w-full
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-t-[1.6rem]
                      bg-gradient-to-b
                      from-[#f4f6ef]
                      via-[#fafbf7]
                      to-white
                      px-5 py-5
                    "
                  >
                    <div
                      className="
                        pointer-events-none
                        absolute left-1/2 top-1/2
                        h-44 w-44
                        -translate-x-1/2 -translate-y-1/2
                        rounded-[45%_55%_58%_42%/52%_42%_58%_48%]
                        bg-[#dfe8d4]/55
                        transition-all duration-700
                        group-hover:rotate-6
                        group-hover:scale-110
                      "
                    />

                    <img
                      src={
                        product.img ??
                        "https://placehold.co/600x600?text=IMG"
                      }
                      alt={
                        displayName
                      }
                      className="
                        relative z-10 block
                        max-h-full
                        max-w-full
                        object-contain
                        transition-transform
                        duration-500
                        group-hover:scale-[1.055]
                      "
                      loading="lazy"
                    />
                  </div>

                  <div
                    className="
                      px-5 pt-4
                    "
                  >
                    <span
                      className="
                        inline-flex
                        rounded-full
                        bg-[#edf2e8]
                        px-2.5 py-1
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.12em]
                        text-[#667658]
                      "
                    >
                      {
                        product.brand
                      }
                    </span>

                    <p
                      className="
                        mt-0.5
                        line-clamp-2
                        min-h-[3.5rem]
                        pt-2
                        text-[17px]
                        font-semibold
                        leading-[1.35]
                        text-[#20291b]
                        transition-colors
                        group-hover:text-[#425530]
                      "
                      title={
                        displayName
                      }
                    >
                      {
                        displayName
                      }
                    </p>

                    <div
                      className="
                        mt-2
                        flex
                        items-center
                      "
                    >
                      <p
                        className="
                          text-xl
                          font-bold
                          tracking-tight
                          text-[#354526]
                        "
                      >
                        €
                        {product.price.toFixed(
                          2
                        )}
                      </p>

                      {product.old_price !==
                        null &&
                        product.old_price >
                          product.price && (
                          <del
                            className="
                              ml-2
                              text-sm
                              font-normal
                              text-gray-400
                            "
                          >
                            €
                            {product.old_price.toFixed(
                              2
                            )}
                          </del>
                        )}
                    </div>
                  </div>
                </button>

                <div
                  className="
                    mt-auto
                    px-5 pb-5
                  "
                >
                  <button
                    type="button"
                    onClick={() => {
                      void handleAdd(
                        product
                      );
                    }}
                    disabled={
                      outOfStock ||
                      cartLoading
                    }
                    className={[
                      "mt-3 w-full",
                      "flex items-center justify-center gap-[15px]",
                      "px-[15px] py-3",
                      "rounded-full border",
                      "shadow-sm transition-all duration-300",
                      outOfStock
                        ? "cursor-not-allowed border-gray-300 bg-gray-200"
                        : "cursor-pointer border-[#425530] bg-[#425530]",
                      !outOfStock &&
                      !cartLoading
                        ? "hover:-translate-y-0.5 hover:bg-[#354526] hover:shadow-md"
                        : "",
                      cartLoading
                        ? "opacity-60"
                        : "",
                    ].join(
                      " "
                    )}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      height="24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                      className={
                        outOfStock
                          ? "fill-[#666666]"
                          : "fill-white"
                      }
                      aria-hidden="true"
                    >
                      <path
                        d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"
                      />

                      <path
                        d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
                      />
                    </svg>

                    <span
                      className={[
                        "text-[0.85em] font-bold",
                        outOfStock
                          ? "text-[#666666]"
                          : "text-white",
                      ].join(
                        " "
                      )}
                    >
                      {outOfStock
                        ? "Sin stock"
                        : isAdded
                        ? "¡Añadido!"
                        : "Añadir a la cesta"}
                    </span>
                  </button>
                </div>
              </article>
            );
          }
        )}
      </div>

      {totalPages >
        1 && (
        <div
          className="
            mt-10
            flex justify-center
            px-2
          "
        >
          <nav
            className="
              max-w-full
              overflow-x-auto
              rounded-full
              bg-gray-200
              px-3 py-2
              sm:px-4
            "
            aria-label="Paginación de productos"
          >
            <ul
              className="
                flex min-w-max
                items-center
                gap-1 py-1
                font-medium
                text-gray-600
                sm:gap-2
              "
            >
              <li>
                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      currentPage -
                        1
                    )
                  }
                  disabled={
                    currentPage ===
                    1
                  }
                  className={[
                    "flex h-10 min-w-10 items-center justify-center rounded-full px-3 transition duration-300",
                    currentPage ===
                    1
                      ? "cursor-not-allowed text-gray-400 opacity-50"
                      : "hover:bg-white hover:text-gray-800",
                  ].join(
                    " "
                  )}
                  aria-label="Página anterior"
                >
                  ‹
                </button>
              </li>

              {visiblePages.map(
                (
                  page
                ) => {
                  if (
                    page ===
                      "ellipsis-left" ||
                    page ===
                      "ellipsis-right"
                  ) {
                    return (
                      <li
                        key={
                          page
                        }
                      >
                        <span
                          className="
                            flex h-10
                            min-w-8
                            items-center
                            justify-center
                            px-1
                            text-gray-500
                          "
                        >
                          …
                        </span>
                      </li>
                    );
                  }

                  const isActive =
                    page ===
                    currentPage;

                  return (
                    <li
                      key={
                        page
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          goToPage(
                            page
                          )
                        }
                        aria-current={
                          isActive
                            ? "page"
                            : undefined
                        }
                        className={[
                          "flex h-10 min-w-10 items-center justify-center rounded-full px-4 transition duration-300",
                          isActive
                            ? "bg-white font-bold text-gray-800 shadow-sm"
                            : "hover:bg-white hover:text-gray-800",
                        ].join(
                          " "
                        )}
                      >
                        {
                          page
                        }
                      </button>
                    </li>
                  );
                }
              )}

              <li>
                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      currentPage +
                        1
                    )
                  }
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  className={[
                    "flex h-10 min-w-10 items-center justify-center rounded-full px-3 transition duration-300",
                    currentPage ===
                    totalPages
                      ? "cursor-not-allowed text-gray-400 opacity-50"
                      : "hover:bg-white hover:text-gray-800",
                  ].join(
                    " "
                  )}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}