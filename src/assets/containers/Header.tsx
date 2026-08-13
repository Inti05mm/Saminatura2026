import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { supabase } from "../supabaseClient";

import { useUser } from "../containers/useUser";
import { useCart } from "../containers/CartContext";
import { useShopifyCart } from "../containers/ShopifyCartContext";
import { useShopifyCustomer } from "../containers/ShopifyCustomerContext";
import { useFavorites } from "../containers/FavoritesContext";

type Toast =
  | {
      type: "success" | "error";
      msg: string;
    }
  | null;

function saveToastForNextPage(
  toast: Exclude<Toast, null>
) {
  try {
    sessionStorage.setItem(
      "toast",
      JSON.stringify(toast)
    );
  } catch {
    // Sin acción.
  }
}

type ProductSuggestion = {
  id: number;
  name: string;
  slug: string | null;
  flavor: string | null;
  size: string | null;
};

type SearchCatalogRow = {
  id: number;
  name: string;
  slug: string | null;
  flavor: string | null;
  size: string | null;
  category: string | null;
  brand: string | null;
};

type SuggestItem =
  | {
      kind: "category";
      value: string;
    }
  | {
      kind: "brand";
      value: string;
    }
  | {
      kind: "product";
      id: number;
      name: string;
      slug: string | null;
      flavor: string | null;
      size: string | null;
    };

const Header: React.FC<{
  title?: string;
}> = ({
  title = "Saminatura",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  /*
    ============================================================
    RUTAS DE PRUEBA SHOPIFY
    ============================================================
  */

  const isShopifyArea =
    location.pathname.startsWith(
      "/shopping-shopify-test"
    ) ||
    location.pathname.startsWith(
      "/micesta-shopify-test"
    ) ||
    location.pathname.startsWith(
      "/usuario-shopify-test"
    ) ||
    location.pathname.startsWith(
      "/perfil-shopify-test"
    ) ||
    location.pathname.startsWith(
      "/auth/shopify"
    );

  const shoppingHref = isShopifyArea
    ? "/shopping-shopify-test"
    : "/shopping";

  const cartHref = isShopifyArea
    ? "/micesta-shopify-test"
    : "/micesta";

  const isHomePage =
    location.pathname === "/";

  // ============================================================
  // USUARIO LOCAL / SUPABASE
  // ============================================================

  const {
    user,
    initializing,
  } = useUser();

  const [
    profile,
    setProfile,
  ] = useState<any>(null);

  // ============================================================
  // USUARIO SHOPIFY
  // ============================================================

  const {
    loggedIn: shopifyLoggedIn,
    loading: shopifyCustomerLoading,
    logout: shopifyLogout,
  } = useShopifyCustomer();

  const [
    userMenuOpen,
    setUserMenuOpen,
  ] = useState(false);

  // ============================================================
  // CARRITO ANTIGUO SUPABASE
  // ============================================================

  const {
    cart: legacyCart,
    loading: legacyCartLoading,
  } = useCart();

  const legacyCartItemCount =
    legacyCart.items.reduce(
      (total, item) =>
        total + item.qty,
      0
    );

  // ============================================================
  // CARRITO SHOPIFY
  // ============================================================

  const {
    totalItems: shopifyCartItemCount,
    loading: shopifyCartLoading,
  } = useShopifyCart();

  const cartItemCount =
    isShopifyArea
      ? shopifyCartItemCount
      : legacyCartItemCount;

  const cartLoading =
    isShopifyArea
      ? shopifyCartLoading
      : legacyCartLoading;

  // ============================================================
  // FAVORITOS
  // ============================================================

  /*
    Todavía son los favoritos antiguos
    de Supabase.

    Después los migraremos.
  */
  const {
    favoriteCount,
  } = useFavorites();

  // ============================================================
  // BUSCADOR
  // ============================================================

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    items,
    setItems,
  ] = useState<SuggestItem[]>([]);

  const [
    suggestOpen,
    setSuggestOpen,
  ] = useState(false);

  const [
    suggestLoading,
    setSuggestLoading,
  ] = useState(false);

  // ============================================================
  // TOAST
  // ============================================================

  const [
    toast,
    setToast,
  ] = useState<Toast>(null);

  // ============================================================
  // ANIMACIÓN CARRITO
  // ============================================================

  const [
    cartBouncing,
    setCartBouncing,
  ] = useState(false);

  const previousCartCountRef =
    useRef(0);

  const cartCountInitializedRef =
    useRef(false);

  const cartBounceTimerRef =
    useRef<number | null>(
      null
    );

  useEffect(() => {
    cartCountInitializedRef.current =
      false;

    previousCartCountRef.current =
      cartItemCount;

    setCartBouncing(false);
  }, [isShopifyArea]);

  useEffect(() => {
    if (cartLoading) {
      return;
    }

    if (
      !cartCountInitializedRef.current
    ) {
      previousCartCountRef.current =
        cartItemCount;

      cartCountInitializedRef.current =
        true;

      return;
    }

    if (
      cartItemCount >
      previousCartCountRef.current
    ) {
      setCartBouncing(false);

      window.requestAnimationFrame(
        () => {
          setCartBouncing(true);
        }
      );

      if (
        cartBounceTimerRef.current
      ) {
        window.clearTimeout(
          cartBounceTimerRef.current
        );
      }

      cartBounceTimerRef.current =
        window.setTimeout(
          () => {
            setCartBouncing(false);

            cartBounceTimerRef.current =
              null;
          },
          650
        );
    }

    previousCartCountRef.current =
      cartItemCount;
  }, [
    cartItemCount,
    cartLoading,
  ]);

  useEffect(() => {
    return () => {
      if (
        cartBounceTimerRef.current
      ) {
        window.clearTimeout(
          cartBounceTimerRef.current
        );
      }
    };
  }, []);

  // ============================================================
  // REFS
  // ============================================================

  const userBtnRef =
    useRef<HTMLButtonElement | null>(
      null
    );

  const userMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const searchWrapRef =
    useRef<HTMLFormElement | null>(
      null
    );

  const searchCatalogRef =
    useRef<
      SearchCatalogRow[] | null
    >(null);

  // ============================================================
  // TOAST
  // ============================================================

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setToast(null);
        },
        3500
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [toast]);

  // ============================================================
  // PERFIL LOCAL SUPABASE
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadProfile =
      async () => {
        if (initializing) {
          return;
        }

        if (!user) {
          setProfile(null);
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("profiles")
            .select("*")
            .eq(
              "id",
              user.id
            )
            .single();

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Error profile:",
            error.message
          );

          setProfile(null);
        } else {
          setProfile(data);
        }
      };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    initializing,
  ]);

  // ============================================================
  // LOGOUT LOCAL / SUPABASE
  // ============================================================

  const handleLocalLogout =
    async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error(
          "signOut local failed:",
          error
        );

        setToast({
          type: "error",
          msg: "No se pudo cerrar la sesión local.",
        });

        return;
      }

      setUserMenuOpen(false);

      const message: Exclude<
        Toast,
        null
      > = {
        type: "success",
        msg: "Se ha cerrado la sesión local.",
      };

      setToast(message);

      saveToastForNextPage(
        message
      );
    };

  // ============================================================
  // LOGOUT SHOPIFY
  // ============================================================

  const handleShopifyLogout =
    async () => {
      try {
        setUserMenuOpen(false);

        await shopifyLogout();
      } catch (error) {
        console.error(
          "Shopify logout failed:",
          error
        );

        setToast({
          type: "error",
          msg: "No se pudo cerrar la sesión de Shopify.",
        });
      }
    };

  // ============================================================
  // HELPERS BUSCADOR
  // ============================================================

  const uniq = (
    values: string[]
  ) =>
    Array.from(
      new Set(
        values
          .map((value) =>
            value.trim()
          )
          .filter(Boolean)
      )
    );

  const normalizeText = (
    value: string
  ) =>
    value
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLocaleLowerCase("es")
      .trim();

  function fullProductName(
    product: {
      name: string;
      flavor: string | null;
      size: string | null;
    }
  ) {
    const base = (
      product.name ?? ""
    ).trim();

    const flavor = (
      product.flavor ?? ""
    ).trim();

    const size = (
      product.size ?? ""
    ).trim();

    return [
      base,
      flavor,
      size,
    ]
      .filter(Boolean)
      .join(" ");
  }

  // ============================================================
  // IR A PRODUCTO
  // ============================================================

  const goToProduct = (
    product: ProductSuggestion
  ) => {
    setSuggestOpen(false);
    setUserMenuOpen(false);

    const displayName =
      fullProductName({
        name: product.name,
        flavor:
          product.flavor,
        size:
          product.size,
      });

    setSearchQuery(
      displayName
    );

    const slug = (
      product.slug ?? ""
    ).trim();

    if (isShopifyArea) {
      const params =
        new URLSearchParams();

      params.set(
        "search",
        displayName
      );

      navigate(
        `${shoppingHref}?${params.toString()}#products`
      );

      return;
    }

    const target = slug
      ? `/shopping/${slug}-${product.id}`
      : `/shopping/${product.id}`;

    navigate(target);
  };

  // ============================================================
  // FILTRAR SHOPPING
  // ============================================================

  const goToFilteredShopping = (
    kind: "category" | "brand",
    value: string
  ) => {
    setSuggestOpen(false);
    setUserMenuOpen(false);

    const params =
      new URLSearchParams();

    params.set(
      kind,
      value
    );

    navigate(
      `${shoppingHref}?${params.toString()}#products`
    );
  };

  // ============================================================
  // SUBMIT BUSCADOR
  // ============================================================

  const handleSearchSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const query =
      searchQuery.trim();

    if (!query) {
      return;
    }

    const normalizedQuery =
      normalizeText(query);

    const exactCategory =
      items.find(
        (item) =>
          item.kind ===
            "category" &&
          normalizeText(
            item.value
          ) === normalizedQuery
      ) as
        | {
            kind: "category";
            value: string;
          }
        | undefined;

    const exactBrand =
      items.find(
        (item) =>
          item.kind ===
            "brand" &&
          normalizeText(
            item.value
          ) === normalizedQuery
      ) as
        | {
            kind: "brand";
            value: string;
          }
        | undefined;

    if (exactCategory) {
      goToFilteredShopping(
        "category",
        exactCategory.value
      );

      return;
    }

    if (exactBrand) {
      goToFilteredShopping(
        "brand",
        exactBrand.value
      );

      return;
    }

    const softCategory =
      items.find(
        (item) =>
          item.kind ===
            "category" &&
          normalizeText(
            item.value
          ).includes(
            normalizedQuery
          )
      ) as
        | {
            kind: "category";
            value: string;
          }
        | undefined;

    const softBrand =
      items.find(
        (item) =>
          item.kind ===
            "brand" &&
          normalizeText(
            item.value
          ).includes(
            normalizedQuery
          )
      ) as
        | {
            kind: "brand";
            value: string;
          }
        | undefined;

    if (softCategory) {
      goToFilteredShopping(
        "category",
        softCategory.value
      );

      return;
    }

    if (softBrand) {
      goToFilteredShopping(
        "brand",
        softBrand.value
      );

      return;
    }

    const params =
      new URLSearchParams();

    params.set(
      "search",
      query
    );

    navigate(
      `${shoppingHref}?${params.toString()}#products`
    );

    setUserMenuOpen(false);
    setSuggestOpen(false);
  };

  // ============================================================
  // CARGAR SUGERENCIAS
  // ============================================================

  /*
    TEMPORAL:
    sigue leyendo los productos antiguos
    de Supabase para el buscador.

    Después lo migraremos a Storefront API.
  */
  useEffect(() => {
    let alive = true;

    const query =
      searchQuery.trim();

    if (
      query.length < 2
    ) {
      setItems([]);
      setSuggestLoading(false);
      return;
    }

    setSuggestLoading(true);

    const timer =
      window.setTimeout(
        async () => {
          try {
            if (
              !searchCatalogRef.current
            ) {
              const {
                data,
                error,
              } =
                await supabase
                  .from(
                    "public_products"
                  )
                  .select(
                    "id,name,slug,flavor,size,category,brand"
                  )
                  .order(
                    "name",
                    {
                      ascending:
                        true,
                    }
                  )
                  .range(
                    0,
                    4999
                  );

              if (error) {
                console.error(
                  "Search catalog error:",
                  error.message
                );

                if (alive) {
                  setItems([]);
                }

                return;
              }

              searchCatalogRef.current =
                (
                  data ?? []
                )
                  .filter(
                    (
                      row: any
                    ) =>
                      row?.id !=
                        null &&
                      row?.name
                  )
                  .map(
                    (
                      row: any
                    ) => ({
                      id: Number(
                        row.id
                      ),

                      name:
                        String(
                          row.name
                        ),

                      slug:
                        row.slug !=
                        null
                          ? String(
                              row.slug
                            )
                          : null,

                      flavor:
                        row.flavor !=
                        null
                          ? String(
                              row.flavor
                            )
                          : null,

                      size:
                        row.size !=
                        null
                          ? String(
                              row.size
                            )
                          : null,

                      category:
                        row.category !=
                        null
                          ? String(
                              row.category
                            )
                          : null,

                      brand:
                        row.brand !=
                        null
                          ? String(
                              row.brand
                            )
                          : null,
                    })
                  );
            }

            if (!alive) {
              return;
            }

            const normalizedQuery =
              normalizeText(
                query
              );

            const catalog =
              searchCatalogRef.current ??
              [];

            const matchingRows =
              catalog.filter(
                (row) => {
                  const searchableProductName =
                    fullProductName(
                      {
                        name:
                          row.name,

                        flavor:
                          row.flavor,

                        size:
                          row.size,
                      }
                    );

                  return (
                    normalizeText(
                      searchableProductName
                    ).includes(
                      normalizedQuery
                    ) ||
                    normalizeText(
                      row.category ??
                        ""
                    ).includes(
                      normalizedQuery
                    ) ||
                    normalizeText(
                      row.brand ??
                        ""
                    ).includes(
                      normalizedQuery
                    )
                  );
                }
              );

            const categories =
              uniq(
                matchingRows
                  .map(
                    (row) =>
                      row.category ??
                      ""
                  )
                  .filter(
                    (
                      value
                    ) =>
                      normalizeText(
                        value
                      ).includes(
                        normalizedQuery
                      )
                  )
              ).slice(
                0,
                6
              );

            const brands =
              uniq(
                matchingRows
                  .map(
                    (row) =>
                      row.brand ??
                      ""
                  )
                  .filter(
                    (
                      value
                    ) =>
                      normalizeText(
                        value
                      ).includes(
                        normalizedQuery
                      )
                  )
              ).slice(
                0,
                6
              );

            const products: SuggestItem[] =
              matchingRows
                .filter(
                  (row) =>
                    normalizeText(
                      fullProductName(
                        {
                          name:
                            row.name,

                          flavor:
                            row.flavor,

                          size:
                            row.size,
                        }
                      )
                    ).includes(
                      normalizedQuery
                    )
                )
                .slice(
                  0,
                  8
                )
                .map(
                  (row) => ({
                    kind:
                      "product",

                    id:
                      row.id,

                    name:
                      row.name,

                    slug:
                      row.slug,

                    flavor:
                      row.flavor,

                    size:
                      row.size,
                  })
                );

            const categorySuggestionItems: SuggestItem[] =
              categories.map(
                (value) => ({
                  kind:
                    "category",
                  value,
                })
              );

            const brandSuggestionItems: SuggestItem[] =
              brands.map(
                (value) => ({
                  kind:
                    "brand",
                  value,
                })
              );

            setItems([
              ...categorySuggestionItems,
              ...brandSuggestionItems,
              ...products,
            ]);
          } finally {
            if (alive) {
              setSuggestLoading(
                false
              );
            }
          }
        },
        250
      );

    return () => {
      alive = false;

      window.clearTimeout(
        timer
      );
    };
  }, [searchQuery]);

  // ============================================================
  // CERRAR BUSCADOR AL HACER CLIC FUERA
  // ============================================================

  useEffect(() => {
    const handleMouseDown = (
      event: MouseEvent
    ) => {
      const target =
        event.target as
          | Node
          | null;

      if (!target) {
        return;
      }

      const isInsideSearch =
        searchWrapRef.current?.contains(
          target
        ) ?? false;

      if (!isInsideSearch) {
        setSuggestOpen(
          false
        );
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setSuggestOpen(
          false
        );
      }
    };

    window.addEventListener(
      "mousedown",
      handleMouseDown
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "mousedown",
        handleMouseDown
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // ============================================================
  // CERRAR MENÚ USUARIO
  // ============================================================

  useEffect(() => {
    if (
      !userMenuOpen
    ) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent
    ) => {
      const target =
        event.target as
          | Node
          | null;

      if (!target) {
        return;
      }

      const isInsideMenu =
        userMenuRef.current?.contains(
          target
        ) ?? false;

      const isInsideButton =
        userBtnRef.current?.contains(
          target
        ) ?? false;

      if (
        !isInsideMenu &&
        !isInsideButton
      ) {
        setUserMenuOpen(
          false
        );
      }
    };

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setUserMenuOpen(
          false
        );
      }
    };

    window.addEventListener(
      "mousedown",
      handleClickOutside
    );

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [userMenuOpen]);

  // ============================================================
  // SEPARAR SUGERENCIAS
  // ============================================================

  const categoryItems =
    items.filter(
      (item) =>
        item.kind ===
        "category"
    ) as Array<{
      kind: "category";
      value: string;
    }>;

  const brandItems =
    items.filter(
      (item) =>
        item.kind ===
        "brand"
    ) as Array<{
      kind: "brand";
      value: string;
    }>;

  const productItems =
    items.filter(
      (item) =>
        item.kind ===
        "product"
    ) as Array<{
      kind: "product";
      id: number;
      name: string;
      slug: string | null;
      flavor: string | null;
      size: string | null;
    }>;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <style>{`
        @keyframes cartBump {
          0% {
            transform: translateY(0) scale(1);
          }

          25% {
            transform: translateY(-7px) scale(1.08);
          }

          50% {
            transform: translateY(0) scale(0.97);
          }

          75% {
            transform: translateY(-3px) scale(1.04);
          }

          100% {
            transform: translateY(0) scale(1);
          }
        }

        .cart-bump {
          animation: cartBump 650ms ease-in-out;
        }
      `}</style>

      {toast && (
        <div className="fixed right-4 top-4 z-[9999]">
          <div
            className={[
              "max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg",

              toast.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "",

              toast.type ===
              "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="font-semibold">
                {toast.type ===
                "success"
                  ? "Listo"
                  : "Error"}
              </div>

              <div className="flex-1">
                {toast.msg}
              </div>

              <button
                type="button"
                onClick={() =>
                  setToast(
                    null
                  )
                }
                className="text-gray-500 hover:text-gray-800"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <header
        className={[
          "gris relative z-[1000] w-full overflow-visible bg-transparent px-5 py-2 md:px-6 md:py-3",

          "font-sans text-gray-800",

          isHomePage
            ? [
                "flex flex-col items-center gap-4",
                "md:grid",
                "md:grid-cols-[1fr_auto_1fr]",
                "md:items-center",
                "md:gap-6",
              ].join(" ")
            : [
                "flex flex-col items-center gap-4",
                "md:grid",
                "md:grid-cols-[auto_minmax(320px,1fr)_auto]",
                "md:items-center",
                "md:gap-8",
              ].join(" "),
        ].join(" ")}
      >
        {/* LOGO */}

        <Link
          to="/"
          className="
            inline-flex items-center
            md:justify-self-start
          "
          aria-label={title}
        >
          <img
            src="https://uayblnybdrhhmumudbea.supabase.co/storage/v1/object/public/publicPictures/logo_2.png"
            alt="Saminatura"
            className="h-11 w-auto object-contain md:h-14"
          />
        </Link>

        {/* CENTRO */}

        <div
          className={[
            "flex w-full items-center",

            isHomePage
              ? [
                  "justify-center",
                  "md:col-start-2",
                  "md:row-start-1",
                  "md:justify-self-center",
                ].join(" ")
              : [
                  "justify-center",
                  "md:justify-self-center",
                ].join(" "),
          ].join(" ")}
        >
          {isHomePage ? (
            <nav
              className="
                flex items-center justify-center
                gap-1 rounded-full
                border border-[#aebc8f]/70
                bg-[#f2f5ea]/90
                p-1
                text-sm font-medium
                shadow-[0_8px_24px_rgba(72,83,47,0.10)]
                backdrop-blur-sm
                md:gap-1.5 md:p-1.5 md:text-base
              "
            >
              <Link
                to="/"
                className="
                  rounded-full px-5 py-2
                  text-[#2f3a1f]
                  transition-all duration-200
                  hover:bg-white
                  hover:text-[#5f7138]
                  hover:shadow-sm
                  md:px-6
                "
              >
                Inicio
              </Link>

              <Link
                to={shoppingHref}
                className="
                  rounded-full px-5 py-2
                  text-[#2f3a1f]
                  transition-all duration-200
                  hover:bg-white
                  hover:text-[#5f7138]
                  hover:shadow-sm
                  md:px-6
                "
              >
                Comprar
              </Link>

              <Link
                to="/tienda"
                className="
                  rounded-full px-5 py-2.5
                  text-[#2f3a1f]
                  transition-all duration-200
                  hover:bg-white
                  hover:text-[#5f7138]
                  hover:shadow-sm
                  md:px-6
                "
              >
                Nosotros
              </Link>
            </nav>
          ) : (
            <form
              ref={
                searchWrapRef
              }
              onSubmit={
                handleSearchSubmit
              }
              className="w-full max-w-xl"
            >
              <div className="relative">
                <div
                  className="
                    flex items-center rounded-full
                    border border-[#aebc8f]/70
                    bg-[#f2f5ea]/90
                    p-1 pl-6
                    shadow-[0_8px_24px_rgba(72,83,47,0.10)]
                    backdrop-blur-sm
                    transition-all duration-200
                    focus-within:border-[#8fa064]
                    focus-within:bg-[#f7f9f2]
                    md:p-1.5 md:pl-7
                  "
                >
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    name="search"
                    value={
                      searchQuery
                    }
                    onChange={(
                      event
                    ) => {
                      setSearchQuery(
                        event.target.value
                      );

                      const next =
                        event.target.value.trim();

                      setSuggestOpen(
                        next.length >=
                          2
                      );
                    }}
                    onFocus={() => {
                      if (
                        searchQuery.trim()
                          .length >=
                        2
                      ) {
                        setSuggestOpen(
                          true
                        );
                      }
                    }}
                    className="
                      w-full border-0
                      bg-transparent
                      pr-4
                      font-semibold
                      text-[#2f3a1f]
                      outline-none
                      placeholder:text-[#727866]
                      focus:ring-0
                    "
                    autoComplete="off"
                  />

                  <button
                    type="submit"
                    className="
                      flex min-w-32.5
                      items-center justify-center
                      rounded-full
                      border border-[#8fa064]/30
                      bg-white
                      px-5 py-2
                      text-base font-semibold
                      tracking-wide
                      text-[#2f3a1f]
                      shadow-sm
                      transition-all duration-200
                      hover:-translate-y-0.5
                      hover:text-[#5f7138]
                      hover:shadow-md
                    "
                  >
                    Buscar
                  </button>
                </div>

                {suggestOpen &&
                  (suggestLoading ||
                    items.length >
                      0 ||
                    searchQuery.trim()
                      .length >=
                      2) && (
                    <div
                      className="
                        absolute left-0 right-0
                        z-[9999] mt-2
                        overflow-hidden
                        rounded-xl
                        border border-gray-200
                        bg-white shadow-lg
                      "
                    >
                      {suggestLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          Buscando…
                        </div>
                      ) : items.length ===
                        0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No hay resultados.
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-auto">
                          {categoryItems.length >
                            0 && (
                            <div className="py-2">
                              <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Categorías
                              </div>

                              {categoryItems.map(
                                (
                                  category
                                ) => (
                                  <button
                                    key={
                                      category.value
                                    }
                                    type="button"
                                    onClick={() =>
                                      goToFilteredShopping(
                                        "category",
                                        category.value
                                      )
                                    }
                                    className="flex w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
                                  >
                                    Ver productos de{" "}
                                    <b>
                                      {
                                        category.value
                                      }
                                    </b>
                                  </button>
                                )
                              )}
                            </div>
                          )}

                          {brandItems.length >
                            0 && (
                            <div className="border-t border-gray-100 py-2">
                              <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Marcas
                              </div>

                              {brandItems.map(
                                (
                                  brand
                                ) => (
                                  <button
                                    key={
                                      brand.value
                                    }
                                    type="button"
                                    onClick={() =>
                                      goToFilteredShopping(
                                        "brand",
                                        brand.value
                                      )
                                    }
                                    className="flex w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
                                  >
                                    Ver productos de{" "}
                                    <b>
                                      {
                                        brand.value
                                      }
                                    </b>
                                  </button>
                                )
                              )}
                            </div>
                          )}

                          {productItems.length >
                            0 && (
                            <div className="border-t border-gray-100 py-2">
                              <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Productos
                              </div>

                              {productItems.map(
                                (
                                  product
                                ) => (
                                  <button
                                    key={
                                      product.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      goToProduct(
                                        product
                                      )
                                    }
                                    className="flex w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
                                  >
                                    {fullProductName(
                                      product
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </form>
          )}
        </div>

        {/* DERECHA */}

        <div
          className="
            relative z-[1100]
            flex items-center justify-center
            gap-1 overflow-visible
            rounded-full
            border border-[#aebc8f]/70
            bg-[#f2f5ea]/90
            p-1
            shadow-[0_8px_24px_rgba(72,83,47,0.10)]
            backdrop-blur-sm
            md:justify-self-end
            md:gap-1.5
            md:p-1.5
          "
        >
          {!isHomePage && (
            <nav className="hidden items-center gap-1 text-sm font-medium lg:flex lg:text-base">
              <Link
                to="/"
                className="rounded-full px-4 py-2 text-[#2f3a1f] hover:bg-white xl:px-5"
              >
                Inicio
              </Link>

              <Link
                to={shoppingHref}
                className="rounded-full px-4 py-2 text-[#2f3a1f] hover:bg-white xl:px-5"
              >
                Comprar
              </Link>

              <Link
                to="/tienda"
                className="rounded-full px-4 py-2 text-[#2f3a1f] hover:bg-white xl:px-5"
              >
                Nosotros
              </Link>
            </nav>
          )}

          {/* CARRITO */}

          <Link
            to={cartHref}
            className={`
              relative inline-flex h-[40px] w-[40px]
              items-center justify-center
              rounded-full
              text-black
              transition-all duration-300
              hover:-translate-y-[2px]
              hover:bg-white
              hover:text-[#5f7138]
              ${
                cartBouncing
                  ? "cart-bump"
                  : ""
              }
            `}
            aria-label="Mi cesta"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
            >
              <path
                d="M20.582,15.637c.215-.055,.406-.181,.543-.356,.147-.191,.906-1.332,1.328-5.056,.33-2.908-.316-5.478-.344-5.586-.096-.375-.399-.661-.779-.734-.139-.026-3.441-.653-7.329-.653-2.881,0-5.99,.345-7.46,.531-.392-1.222-.756-1.879-.775-1.912-.104-.186-.265-.334-.459-.422-.137-.062-1.378-.597-2.973-.408-.548,.066-.939,.563-.874,1.112,.066,.548,.563,.944,1.112,.874,.668-.081,1.26,.041,1.602,.14,.159,.355,.418,1.003,.668,1.922,.002,.006,.426,2.661,.707,5.137,.349,3.08,.668,4.292,.795,4.683,.431,2.799,1.047,3.736,1.167,3.896,.137,.183,.332,.312,.554,.369,.106,.027,2.654,.667,6.58,.667s6.475-.64,6.581-.667c.535-.137,.857-.681,.722-1.215-.137-.535-.683-.864-1.215-.723-.024,.006-2.433,.604-6.088,.604-2.759,0-4.808-.342-5.656-.512-.108-.263-.264-.716-.424-1.422,1.234,.184,3.158,.398,5.437,.398,3.927,0,6.474-.64,6.581-.667ZM14.001,5.252c2.709,0,5.17,.33,6.3,.508,.152,.855,.364,2.489,.166,4.241-.252,2.214-.614,3.331-.802,3.791-.844,.169-2.896,.513-5.664,.513-2.686,0-4.882-.321-5.882-.497-.133-.581-.348-1.729-.584-3.807-.19-1.683-.417-3.27-.564-4.256,1.489-.183,4.396-.493,7.03-.493Z"
                fill="currentColor"
              />

              <path
                d="M10.47,21.002c-.552,0-.999,.447-.999,.999s.447,.999,.999,.999,.999-.447,.999-.999-.447-.999-.999-.999Z"
                fill="currentColor"
              />

              <path
                d="M17.83,21.002c-.552,0-.999,.447-.999,.999s.447,.999,.999,.999,.999-.447,.999-.999-.447-.999-.999-.999Z"
                fill="currentColor"
              />
            </svg>

            {cartItemCount >
              0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00bf63] px-1.5 text-[11px] font-bold text-white shadow-md">
                {cartItemCount >
                99
                  ? "99+"
                  : cartItemCount}
              </span>
            )}
          </Link>

          {/* FAVORITOS */}

          <Link
            to="/favoritos"
            className="
              relative inline-flex h-[40px] w-[40px]
              items-center justify-center
              rounded-full
              text-black
              transition-all duration-300
              hover:-translate-y-[2px]
              hover:bg-white
              hover:text-[#5f7138]
            "
            aria-label="Mis favoritos"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
            >
              <path
                d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z"
                fill="currentColor"
              />
            </svg>

            {favoriteCount >
              0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00bf63] px-1.5 text-[11px] font-bold text-white shadow-md">
                {favoriteCount >
                99
                  ? "99+"
                  : favoriteCount}
              </span>
            )}
          </Link>

          {/* USUARIO */}

          <div className="relative inline-flex">
            <button
              ref={
                userBtnRef
              }
              type="button"
              aria-label="Usuario"
              aria-expanded={
                userMenuOpen
              }
              aria-haspopup="menu"
              onClick={() =>
                setUserMenuOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className={[
                "inline-flex h-[42px] w-[42px]",
                "items-center justify-center",
                "rounded-full text-black",
                "transition-all duration-200",
                "hover:scale-105",
                "hover:bg-white",
                "hover:text-[#5f7138]",
                "hover:shadow-sm",
                "active:scale-95",
                "focus:outline-none",
                "focus:ring-2",
                "focus:ring-[#00bf63]/60",
                "focus:ring-offset-2",

                shopifyLoggedIn
                  ? "ring-2 ring-[#00bf63]/70"
                  : "",
              ].join(" ")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-6 w-6"
              >
                <path
                  d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm-4,21.164v-.164c0-2.206,1.794-4,4-4s4,1.794,4,4v.164c-1.226,.537-2.578,.836-4,.836s-2.774-.299-4-.836Zm9.925-1.113c-.456-2.859-2.939-5.051-5.925-5.051s-5.468,2.192-5.925,5.051c-2.47-1.823-4.075-4.753-4.075-8.051C2,6.486,6.486,2,12,2s10,4.486,10,10c0,3.298-1.605,6.228-4.075,8.051Zm-5.925-15.051c-2.206,0-4,1.794-4,4s1.794,4,4,4,4-1.794,4-4-1.794-4-4-4Zm0,6c-1.103,0-2-.897-2-2s.897-2,2-2,2,.897,2,2-.897,2-2,2Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <div
              ref={
                userMenuRef
              }
              role="menu"
              className={`
                absolute right-0 top-full z-[9999]
                mt-2 min-w-[250px]
                origin-top-right
                rounded-2xl
                border border-[#aebc8f]/70
                bg-white
                shadow-[0_18px_45px_rgba(47,58,31,0.20)]
                transition-all duration-150

                ${
                  userMenuOpen
                    ? "visible scale-100 opacity-100"
                    : "pointer-events-none invisible scale-95 opacity-0"
                }
              `}
            >
              {/* ============================= */}
              {/* CUENTA SHOPIFY */}
              {/* ============================= */}

              <div className="px-4 pb-2 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Cuenta Shopify
                </p>
              </div>

              <div className="px-1 pb-2">
                {shopifyCustomerLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Comprobando sesión…
                  </div>
                ) : shopifyLoggedIn ? (
                  <>
                    <div className="mx-2 mb-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                      Sesión iniciada
                    </div>

                    <Link
                      to="/perfil-shopify-test"
                      role="menuitem"
                      onClick={() =>
                        setUserMenuOpen(
                          false
                        )
                      }
                      className="
                        flex w-full items-center
                        rounded-md px-3 py-2
                        text-sm text-gray-700
                        transition-colors
                        hover:bg-[#00bf63]
                        hover:text-white
                      "
                    >
                      Mi perfil Shopify
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        void handleShopifyLogout();
                      }}
                      className="
                        flex w-full items-center
                        rounded-md px-3 py-2
                        text-sm text-gray-700
                        transition-colors
                        hover:bg-[#00bf63]
                        hover:text-white
                      "
                    >
                      Cerrar sesión Shopify
                    </button>
                  </>
                ) : (
                  <Link
                    to="/usuario-shopify-test"
                    role="menuitem"
                    onClick={() =>
                      setUserMenuOpen(
                        false
                      )
                    }
                    className="
                      flex w-full items-center
                      rounded-md px-3 py-2
                      text-sm font-semibold
                      text-[#425530]
                      transition-colors
                      hover:bg-[#00bf63]
                      hover:text-white
                    "
                  >
                    Iniciar sesión Shopify
                  </Link>
                )}
              </div>

              {/* ============================= */}
              {/* ACCESO LOCAL TEMPORAL */}
              {/* ============================= */}

              <div className="border-t border-gray-200" />

              <div className="px-4 pb-2 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Acceso local / administración
                </p>
              </div>

              <div className="px-1 pb-2">
                {initializing ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Comprobando acceso local…
                  </div>
                ) : user ? (
                  <>
                    <div className="mx-2 mb-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      Sesión local activa
                    </div>

                    <Link
                      to="/perfil"
                      role="menuitem"
                      onClick={() =>
                        setUserMenuOpen(
                          false
                        )
                      }
                      className="
                        flex w-full items-center
                        rounded-md px-3 py-2
                        text-sm text-gray-700
                        transition-colors
                        hover:bg-gray-100
                      "
                    >
                      Perfil local
                    </Link>

                    {profile?.is_admin && (
                      <>
                        <Link
                          to="/admin/pedidos"
                          role="menuitem"
                          onClick={() =>
                            setUserMenuOpen(
                              false
                            )
                          }
                          className="
                            flex w-full items-center
                            rounded-md px-3 py-2
                            text-sm font-semibold
                            text-red-600
                            transition-colors
                            hover:bg-[#00bf63]
                            hover:text-white
                          "
                        >
                          Pedidos
                        </Link>

                        <Link
                          to="/modificarproductos"
                          role="menuitem"
                          onClick={() =>
                            setUserMenuOpen(
                              false
                            )
                          }
                          className="
                            flex w-full items-center
                            rounded-md px-3 py-2
                            text-sm font-semibold
                            text-red-600
                            transition-colors
                            hover:bg-[#00bf63]
                            hover:text-white
                          "
                        >
                          Modificar productos
                        </Link>
                      </>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        void handleLocalLogout();
                      }}
                      className="
                        flex w-full items-center
                        rounded-md px-3 py-2
                        text-sm text-gray-500
                        transition-colors
                        hover:bg-gray-100
                        hover:text-gray-900
                      "
                    >
                      Cerrar sesión local
                    </button>
                  </>
                ) : (
                  <Link
                    to="/usuario"
                    role="menuitem"
                    onClick={() =>
                      setUserMenuOpen(
                        false
                      )
                    }
                    className="
                      flex w-full items-center
                      rounded-md px-3 py-2
                      text-sm text-gray-500
                      transition-colors
                      hover:bg-gray-100
                      hover:text-gray-900
                    "
                  >
                    Entrar con acceso local
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isHomePage && (
          <nav
            className="
              flex items-center justify-center
              gap-6 text-sm font-medium
              lg:hidden
              md:col-span-3
              md:row-start-2
            "
          >
            <Link
              to="/"
              className="transition-colors hover:text-green-600"
            >
              Inicio
            </Link>

            <Link
              to={shoppingHref}
              className="transition-colors hover:text-green-600"
            >
              Comprar
            </Link>

            <Link
              to="/tienda"
              className="transition-colors hover:text-green-600"
            >
              Nosotros
            </Link>
          </nav>
        )}
      </header>
    </>
  );
};

export default Header;