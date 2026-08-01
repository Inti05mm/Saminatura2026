import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useUser } from "../containers/useUser";
import { useCart } from "../containers/CartContext";

type Toast = { type: "success" | "error"; msg: string } | null;

function saveToastForNextPage(toast: Exclude<Toast, null>) {
  try {
    sessionStorage.setItem("toast", JSON.stringify(toast));
  } catch {}
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
  | { kind: "category"; value: string }
  | { kind: "brand"; value: string }
  | { kind: "product"; id: number; name: string; slug: string | null; flavor: string | null; size: string | null };

const Header: React.FC<{ title?: string }> = ({ title = "Saminatura" }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [toast, setToast] = useState<Toast>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, initializing } = useUser();
  const { cart, loading: cartLoading } = useCart();

  const cartItemCount = cart.items.reduce((total, item) => total + item.qty, 0);
  const [cartBouncing, setCartBouncing] = useState(false);
  const previousCartCountRef = useRef(0);
  const cartCountInitializedRef = useRef(false);
  const cartBounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (cartLoading) return;

    if (!cartCountInitializedRef.current) {
      previousCartCountRef.current = cartItemCount;
      cartCountInitializedRef.current = true;
      return;
    }

    if (cartItemCount > previousCartCountRef.current) {
      setCartBouncing(false);

      window.requestAnimationFrame(() => {
        setCartBouncing(true);
      });

      if (cartBounceTimerRef.current) {
        window.clearTimeout(cartBounceTimerRef.current);
      }

      cartBounceTimerRef.current = window.setTimeout(() => {
        setCartBouncing(false);
        cartBounceTimerRef.current = null;
      }, 650);
    }

    previousCartCountRef.current = cartItemCount;
  }, [cartItemCount, cartLoading]);

  useEffect(() => {
    return () => {
      if (cartBounceTimerRef.current) {
        window.clearTimeout(cartBounceTimerRef.current);
      }
    };
  }, []);

  const userBtnRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchWrapRef = useRef<HTMLFormElement | null>(null);
  const searchCatalogRef = useRef<SearchCatalogRow[] | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (initializing) return;

      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      if (!cancelled) {
        if (error) {
          console.error("Error profile:", error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, initializing]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut failed:", e);
      setToast({ type: "error", msg: "No se pudo cerrar sesión. Inténtalo otra vez." });
      return;
    }

    setUserMenuOpen(false);

    const msg: Exclude<Toast, null> = { type: "success", msg: "Se ha cerrado sesión con éxito." };
    setToast(msg);
    saveToastForNextPage(msg);

    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();

  function fullProductName(p: { name: string; flavor: string | null; size: string | null }) {
    const base = (p.name ?? "").trim();
    const f = (p.flavor ?? "").trim();
    const s = (p.size ?? "").trim();
    return [base, f, s].filter(Boolean).join(" ");
  }

  // ✅ CORREGIDO: ahora navega a /shopping/slug-id
  const goToProduct = (p: ProductSuggestion) => {
    setSuggestOpen(false);
    setUserMenuOpen(false);

    setSearchQuery(fullProductName({ name: p.name, flavor: p.flavor, size: p.size }));

    const slug = (p.slug ?? "").trim();
    const target = slug ? `/shopping/${slug}-${p.id}` : `/shopping/${p.id}`;

    navigate(target);
  };

  const goToFilteredShopping = (kind: "category" | "brand", value: string) => {
    setSuggestOpen(false);
    setUserMenuOpen(false);

    const params = new URLSearchParams();
    params.set(kind, value);

    navigate(`/shopping?${params.toString()}#products`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const q = searchQuery.trim();
    if (!q) return;

    const qLower = normalizeText(q);

    const exactCategory = items.find(
      (it) => it.kind === "category" && normalizeText(it.value) === qLower
    ) as { kind: "category"; value: string } | undefined;

    const exactBrand = items.find((it) => it.kind === "brand" && normalizeText(it.value) === qLower) as
      | { kind: "brand"; value: string }
      | undefined;

    if (exactCategory) {
      goToFilteredShopping("category", exactCategory.value);
      return;
    }
    if (exactBrand) {
      goToFilteredShopping("brand", exactBrand.value);
      return;
    }

    const softCategory = items.find(
      (it) => it.kind === "category" && normalizeText(it.value).includes(qLower)
    ) as { kind: "category"; value: string } | undefined;

    const softBrand = items.find(
      (it) => it.kind === "brand" && normalizeText(it.value).includes(qLower)
    ) as { kind: "brand"; value: string } | undefined;

    if (softCategory) {
      goToFilteredShopping("category", softCategory.value);
      return;
    }
    if (softBrand) {
      goToFilteredShopping("brand", softBrand.value);
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set("search", q);

    navigate(`/shopping?${params.toString()}#products`);
    setUserMenuOpen(false);
    setSuggestOpen(false);
  };

  useEffect(() => {
    let alive = true;
    const q = searchQuery.trim();

    if (q.length < 2) {
      setItems([]);
      setSuggestLoading(false);
      return;
    }

    setSuggestLoading(true);

    const t = setTimeout(async () => {
      try {
        // Se carga el catálogo una sola vez y después se filtra en el navegador.
        // Así la búsqueda ignora tildes: "cafe" encuentra "café".
        if (!searchCatalogRef.current) {
          const { data, error } = await supabase
            .from("public_products")
            .select("id,name,slug,flavor,size,category,brand")
            .order("name", { ascending: true })
            .range(0, 4999);

          if (error) {
            console.error("Search catalog error:", error.message);
            if (alive) setItems([]);
            return;
          }

          searchCatalogRef.current = (data ?? [])
            .filter((r: any) => r?.id != null && r?.name)
            .map((r: any) => ({
              id: Number(r.id),
              name: String(r.name),
              slug: r.slug != null ? String(r.slug) : null,
              flavor: r.flavor != null ? String(r.flavor) : null,
              size: r.size != null ? String(r.size) : null,
              category: r.category != null ? String(r.category) : null,
              brand: r.brand != null ? String(r.brand) : null,
            }));
        }

        if (!alive) return;

        const normalizedQuery = normalizeText(q);
        const catalog = searchCatalogRef.current ?? [];

        const matchingRows = catalog.filter((row) => {
          const searchableProductName = fullProductName({
            name: row.name,
            flavor: row.flavor,
            size: row.size,
          });

          return (
            normalizeText(searchableProductName).includes(normalizedQuery) ||
            normalizeText(row.category ?? "").includes(normalizedQuery) ||
            normalizeText(row.brand ?? "").includes(normalizedQuery)
          );
        });

        const categories = uniq(
          matchingRows
            .map((row) => row.category ?? "")
            .filter((value) => normalizeText(value).includes(normalizedQuery))
        ).slice(0, 6);

        const brands = uniq(
          matchingRows
            .map((row) => row.brand ?? "")
            .filter((value) => normalizeText(value).includes(normalizedQuery))
        ).slice(0, 6);

        const products: SuggestItem[] = matchingRows
          .filter((row) =>
            normalizeText(
              fullProductName({
                name: row.name,
                flavor: row.flavor,
                size: row.size,
              })
            ).includes(normalizedQuery)
          )
          .slice(0, 8)
          .map((row) => ({
            kind: "product",
            id: row.id,
            name: row.name,
            slug: row.slug,
            flavor: row.flavor,
            size: row.size,
          }));

        const catItems: SuggestItem[] = categories.map((value) => ({
          kind: "category",
          value,
        }));

        const brandItems: SuggestItem[] = brands.map((value) => ({
          kind: "brand",
          value,
        }));

        setItems([...catItems, ...brandItems, ...products]);
      } finally {
        if (alive) setSuggestLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchQuery]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      const inside = searchWrapRef.current?.contains(t) ?? false;
      if (!inside) setSuggestOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSuggestOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const inMenu = userMenuRef.current?.contains(t) ?? false;
      const inBtn = userBtnRef.current?.contains(t) ?? false;

      if (!inMenu && !inBtn) setUserMenuOpen(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [userMenuOpen]);

  const categoryItems = items.filter((i) => i.kind === "category") as Array<{ kind: "category"; value: string }>;
  const brandItems = items.filter((i) => i.kind === "brand") as Array<{ kind: "brand"; value: string }>;
  const productItems = items.filter((i) => i.kind === "product") as Array<{
    kind: "product";
    id: number;
    name: string;
    slug: string | null;
    flavor: string | null;
    size: string | null;
  }>;

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
        <div className="fixed top-4 right-4 z-[9999]">
          <div
            className={[
              "rounded-xl px-4 py-3 shadow-lg border text-sm max-w-sm",
              toast.type === "success" ? "bg-green-50 border-green-200 text-green-900" : "",
              toast.type === "error" ? "bg-red-50 border-red-200 text-red-900" : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="font-semibold">{toast.type === "success" ? "Listo" : "Error"}</div>
              <div className="flex-1">{toast.msg}</div>
              <button
                onClick={() => setToast(null)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Cerrar"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="w-full bg-transparent py-4 px-6 flex flex-col md:flex-row items-center justify-between text-gray-800 font-sans space-y-4 md:space-y-0 gris">
        <Link to="/" className="inline-flex items-center">
          <img
            src="https://uayblnybdrhhmumudbea.supabase.co/storage/v1/object/public/publicPictures/logo_2.png"
            alt="Saminatura"
            className="h-12 md:h-16 w-auto object-contain"
          />
        </Link>

        <form ref={searchWrapRef} onSubmit={handleSearchSubmit} className="mx-auto md:mx-0 max-w-xl w-full">
          <div className="relative">
            <div className="py-2 px-6 rounded-full bg-gray-50 border flex focus-within:border-gray-300">
              <input
                type="text"
                placeholder="Buscar productos..."
                name="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const next = e.target.value.trim();
                  setSuggestOpen(next.length >= 2);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setSuggestOpen(true);
                }}
                className="bg-transparent w-full focus:outline-none pr-4 font-semibold border-0 focus:ring-0 px-0 py-0"
                autoComplete="off"
              />
              <button
                type="submit"
                className="flex flex-row items-center justify-center min-w-32.5 px-4 rounded-full font-medium tracking-wide transition ease-in-out duration-150 text-base bg-black text-white py-1.5 -mr-3"
              >
                Buscar
              </button>
            </div>

            {suggestOpen && (suggestLoading || items.length > 0 || searchQuery.trim().length >= 2) && (
              <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                {suggestLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Buscando…</div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No hay resultados.</div>
                ) : (
                  <div className="max-h-72 overflow-auto">
                    {categoryItems.length > 0 && (
                      <div className="py-2">
                        <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Categorías
                        </div>
                        <ul>
                          {categoryItems.map((c) => (
                            <li key={`cat-${c.value}`}>
                              <button
                                type="button"
                                onClick={() => goToFilteredShopping("category", c.value)}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center justify-between"
                              >
                                <span className="font-medium text-gray-800">
                                  Ver productos de <span className="font-extrabold">{c.value}</span>
                                </span>
                                <span className="text-xs text-gray-400">ir</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {brandItems.length > 0 && (
                      <div className="py-2 border-t border-gray-100">
                        <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Marcas
                        </div>
                        <ul>
                          {brandItems.map((b) => (
                            <li key={`brand-${b.value}`}>
                              <button
                                type="button"
                                onClick={() => goToFilteredShopping("brand", b.value)}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center justify-between"
                              >
                                <span className="font-medium text-gray-800">
                                  Ver productos de <span className="font-extrabold">{b.value}</span>
                                </span>
                                <span className="text-xs text-gray-400">ir</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {productItems.length > 0 && (
                      <div className="py-2 border-t border-gray-100">
                        <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          Productos
                        </div>
                        <ul>
                          {productItems.map((p) => {
                            const label = fullProductName({ name: p.name, flavor: p.flavor, size: p.size });

                            return (
                              <li key={`p-${p.id}`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    goToProduct({
                                      id: p.id,
                                      name: p.name,
                                      slug: p.slug,
                                      flavor: p.flavor,
                                      size: p.size,
                                    })
                                  }
                                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition flex items-center justify-between"
                                >
                                  <span className="font-medium text-gray-800">{label}</span>
                                  <span className="text-xs text-gray-400">ver</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        <nav className="space-x-6 text-sm md:text-base font-medium relative flex items-center">
          <Link to="/" className="hover:text-green-600 transition-colors">
            Inicio
          </Link>
          <Link to="/shopping" className="hover:text-green-600 transition-colors">
            Comprar
          </Link>
          <Link to="/tienda" className="hover:text-green-600 transition-colors">
            Nosotros
          </Link>

          <Link
            to="/micesta"
            className={`relative inline-flex items-center ${cartBouncing ? "cart-bump" : ""}`}
            aria-label={`Mi cesta${cartItemCount > 0 ? `, ${cartItemCount} productos` : ""}`}
          >
            <button
              type="button"
              aria-label="Mi cesta"
              className="
                group
                w-[44px] h-[44px] rounded-full
                bg-transparent
                flex items-center justify-center
                text-black
                transition-all duration-300 ease-in-out
                hover:-translate-y-[3px]
                active:translate-y-0
                cursor-pointer
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" className="w-6 h-6">
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
            </button>

            {cartItemCount > 0 && (
              <span
                className="
                  absolute -right-1 -top-1
                  min-w-[20px] h-5 px-1.5
                  rounded-full
                  bg-[#00bf63] text-white
                  text-[11px] font-bold leading-none
                  flex items-center justify-center
                  shadow-md
                  pointer-events-none
                "
              >
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>

          <div className="relative inline-flex">
            <button
              ref={userBtnRef}
              type="button"
              aria-label="Usuario"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="
                inline-flex items-center justify-center
                w-[50px] h-[50px] rounded-full
                text-black
                transition-transform duration-150
                hover:scale-110 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-[#00bf63]/60 focus:ring-offset-2
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm-4,21.164v-.164c0-2.206,1.794-4,4-4s4,1.794,4,4v.164c-1.226.537-2.578.836-4,.836s-2.774-.299-4-.836Zm9.925-1.113c-.456-2.859-2.939-5.051-5.925-5.051s-5.468,2.192-5.925,5.051c-2.47-1.823-4.075-4.753-4.075-8.051C2,6.486,6.486,2,12,2s10,4.486,10,10c0,3.298-1.605,6.228-4.075,8.051Zm-5.925-15.051c-2.206,0-4,1.794-4,4s1.794,4,4,4,4-1.794,4-4-1.794-4-4-4Zm0,6c-1.103,0-2-.897-2-2s.897-2,2-2,2,.897,2,2-.897,2-2,2Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <div
              ref={userMenuRef}
              className={`
                absolute right-0 mt-3 z-50
                min-w-[220px]
                rounded-md border border-gray-300
                bg-gray-100 shadow-lg
                origin-top-right
                transition-all duration-150
                ${userMenuOpen ? "visible opacity-100 scale-100" : "invisible opacity-0 scale-95"}
              `}
            >
              <div className="px-4 pt-3 pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Usuario</p>
              </div>

              <div className="px-1 pb-2">
                {user ? (
                  <>
                    <Link
                      to="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="
                        flex w-full items-center rounded-md
                        px-3 py-2 text-sm text-gray-700
                        hover:bg-[#00bf63] hover:text-white
                        transition-colors
                      "
                    >
                      Mi Perfil
                    </Link>

                    {profile?.is_admin && (
                      <Link
                        to="/admin/pedidos"
                        onClick={() => setUserMenuOpen(false)}
                        className="
                          flex w-full items-center rounded-md
                          px-3 py-2 text-sm font-semibold text-red-600
                          hover:bg-[#00bf63] hover:text-white
                          transition-colors
                        "
                      >
                        Pedidos
                      </Link>
                    )}

                    {profile?.is_admin && (
                      <Link
                        to="/modificarproductos"
                        onClick={() => setUserMenuOpen(false)}
                        className="
                          flex w-full items-center rounded-md
                          px-3 py-2 text-sm font-semibold text-red-600
                          hover:bg-[#00bf63] hover:text-white
                          transition-colors
                        "
                      >
                        Modificar Productos
                      </Link>
                    )}

                    <div className="my-2 border-t border-gray-300" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="
                        flex w-full items-center rounded-md
                        px-3 py-2 text-sm text-gray-700
                        hover:bg-[#00bf63] hover:text-white
                        transition-colors
                      "
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    to="/usuario"
                    onClick={() => setUserMenuOpen(false)}
                    className="
                      flex w-full items-center rounded-md
                      px-3 py-2 text-sm text-gray-700
                      hover:bg-[#00bf63] hover:text-white
                      transition-colors
                    "
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;