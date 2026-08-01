import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import FiltersContainer from "../containers/FilterContainer";
import type { Filters } from "../containers/FilterContainer";

import AllProductsGrid from "../containers/AllProductsGrid";
import Header from "../containers/Header";
import HeroMarcas from "../containers/HeroMarcas";
import { supabase } from "../supabaseClient";
import type { Product, PromoType } from "../containers/Products";
import Footer from "../containers/Footer.tsx";
import ProductBanners from "../containers/ProductBanner.tsx";

const DEBUG = true;

function normalizePromoType(v: any): PromoType {
  const s = String(v ?? "none");
  if (
    s === "none" ||
    s === "percent" ||
    s === "2x1" ||
    s === "3x2" ||
    s === "second_half"
  ) {
    return s as PromoType;
  }
  return "none";
}

function hasPromo(p: Product) {
  const price = Number(p.price ?? 0);
  const old = p.old_price == null ? null : Number(p.old_price);

  const hasOldPriceDiscount = old !== null && old > price && old > 0;
  const hasActivePromo = !!p.promo_active && p.promo_type !== "none";

  return hasOldPriceDiscount || hasActivePromo;
}

function mapRowToProduct(p: any): Product {
  return {
    id: Number(p.id),
    slug: p.slug ?? null,
    category: p.category ?? "",
    name: p.name ?? "",
    brand: p.brand ?? "",

    price: Number(p.price ?? 0),
    old_price: p.old_price == null ? null : Number(p.old_price),

    //  purchase_price: p.purchase_price == null ? null : Number(p.purchase_price),
    // vat_rate: Number(p.vat_rate ?? 0),
    // recargo_rate: Number(p.recargo_rate ?? 0),

    purchase_price: null,
    vat_rate: 0,
    recargo_rate: 0,
    supplier_name: null,

    promo_type: normalizePromoType(p.promo_type),
    promo_active: !!p.promo_active,

    img: p.img ?? null,
    description: p.description ?? null,

    stock: p.stock == null ? null : Number(p.stock),

    bio: !!p.bio,
    vegan: !!p.vegan,

    gluten_free: !!p.gluten_free,
    lactose_free: !!p.lactose_free,
    //  supplier_name: p.supplier_name ?? null,

    expiration_date: p.expiration_date ?? null,
    flavor: p.flavor ?? null,
    size: p.size ?? null,
  };
}

export default function ShopPage() {
  const location = useLocation();
  const productsRef = useRef<HTMLDivElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ params URL
  const urlParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const urlSearch = (urlParams.get("search") ?? "").trim();
  const urlCategory = (urlParams.get("category") ?? "").trim();
  const urlBrand = (urlParams.get("brand") ?? "").trim();

  // ✅ NUEVO: banner
  const urlBanner = (urlParams.get("banner") ?? "").trim(); // banner id (product_banners.id)

  const hasAnyUrlFilter = !!(urlSearch || urlCategory || urlBrand || urlBanner);

  // ✅ Scroll suave
  useEffect(() => {
    if (loading) return;

    const shouldScroll = location.hash === "#products" || hasAnyUrlFilter;
    if (!shouldScroll) return;

    const t = window.setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(t);
  }, [loading, location.hash, location.search, hasAnyUrlFilter]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Si viene banner=..., primero obtenemos los slugs del banner
        let bannerSlugs: string[] | null = null;

        if (urlBanner) {
          const bannerId = Number(urlBanner);
          if (!Number.isFinite(bannerId) || bannerId <= 0) {
            throw new Error("Parámetro banner inválido.");
          }

          const { data: banner, error: bannerErr } = await supabase
            .from("product_banners")
            .select("id, product_slugs, is_active")
            .eq("id", bannerId)
            .maybeSingle();

          if (bannerErr) throw bannerErr;
          if (!banner) throw new Error("No existe ese banner.");
          if (!banner.is_active) throw new Error("Este banner no está activo.");

          bannerSlugs = Array.isArray(banner.product_slugs)
            ? banner.product_slugs.filter(Boolean)
            : [];
        }

        // 2) Carga productos según caso
        let data: any[] | null = null;
        let error: any = null;

        if (bannerSlugs) {
          // ✅ caso banner: solo esos productos (por slug)
          if (bannerSlugs.length === 0) {
            data = [];
          } else {
            // public_products ya filtra internamente:
            // isgood = true, is_active = true e is_discontinued = false.
            const res = await supabase
              .from("public_products")
              .select(
                `
    id, slug, category, name, brand,
    price, old_price,
    promo_type, promo_active,
    img, description, stock,
    bio, vegan, gluten_free, lactose_free,
    expiration_date,
    flavor, size
  `,
                { count: "exact" },
              )
              .in("slug", bannerSlugs);

            data = res.data as any[] | null;
            error = res.error;

            // mantener el orden del array del banner
            if (!error && data) {
              const order = new Map(bannerSlugs.map((s, i) => [s, i]));
              data = data
                .slice()
                .sort(
                  (a: any, b: any) =>
                    (order.get(a.slug) ?? 9999) - (order.get(b.slug) ?? 9999),
                );
            }
          }
        } else if (urlSearch) {
          // ✅ tu caso search (RPC)
          const res = await supabase.rpc("search_products", {
            q: urlSearch,
            cat: urlCategory || null,
            // @ts-ignore por si tu RPC no tiene este arg en BD
            brand: urlBrand || null,
          });

          data = res.data as any[] | null;
          error = res.error;
        } else {
          // ✅ caso normal: traemos todo y filtramos por brand/category
          // public_products ya devuelve únicamente productos públicos.
          const res = await supabase
            .from("public_products")
            .select(
              `
    id, slug, category, name, brand,
    price, old_price,
    promo_type, promo_active,
    img, description, stock,
    bio, vegan, gluten_free, lactose_free,
    expiration_date,
    flavor, size
  `,
              { count: "exact" },
            )
            .order("id", { ascending: false });

          data = res.data as any[] | null;
          error = res.error;

          if (!error && urlCategory)
            data = (data ?? []).filter(
              (p: any) => String(p.category ?? "") === urlCategory,
            );
          if (!error && urlBrand)
            data = (data ?? []).filter(
              (p: any) => String(p.brand ?? "") === urlBrand,
            );
        }

        if (!isMounted) return;

        if (error) {
          console.error("Supabase products error:", error);
          setErrorMsg(error.message ?? String(error));
          setProducts([]);
          setFilteredProducts([]);
          setLoading(false);
          return;
        }

        let list: Product[] = (data ?? []).map(mapRowToProduct);

        // ✅ refuerzo por si el RPC no filtra brand/cat
        if (!bannerSlugs) {
          if (urlCategory)
            list = list.filter((p) => p.category === urlCategory);
          if (urlBrand) list = list.filter((p) => p.brand === urlBrand);
        }

        if (DEBUG) {
          console.log("📦 products recibidos:", list.length);
          console.log(
            "🔎 urlSearch:",
            urlSearch,
            " | urlCategory:",
            urlCategory,
            " | urlBrand:",
            urlBrand,
            " | urlBanner:",
            urlBanner,
          );
          const withPromo = list.filter((x) => hasPromo(x));
          console.log(
            "🏷️ products con promo:",
            withPromo.length,
            withPromo.slice(0, 8),
          );
        }

        setProducts(list);
        setFilteredProducts(list);
        setLoading(false);
      } catch (e: any) {
        if (!isMounted) return;
        console.error(e);
        setErrorMsg(e?.message ?? String(e));
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [urlSearch, urlCategory, urlBrand, urlBanner]);

  const applyFilters = (filters: Filters, shouldScroll = false) => {
    let result = [...products];

    if (filters.category)
      result = result.filter((p) => p.category === filters.category);
    if (filters.brand) result = result.filter((p) => p.brand === filters.brand);

    if (filters.priceFrom !== undefined)
      result = result.filter((p) => p.price >= filters.priceFrom!);
    if (filters.priceTo !== undefined)
      result = result.filter((p) => p.price <= filters.priceTo!);

    if (filters.promotionsOnly) result = result.filter((p) => hasPromo(p));

    if (filters.glutenFree) result = result.filter((p) => p.gluten_free);
    if (filters.lactoseFree) result = result.filter((p) => p.lactose_free);
    if (filters.vegan) result = result.filter((p) => p.vegan);
    if (filters.bio) result = result.filter((p) => p.bio);

    if (filters.sort === "price-asc") result.sort((a, b) => a.price - b.price);
    if (filters.sort === "price-desc") result.sort((a, b) => b.price - a.price);

    setFilteredProducts(result);

    if (shouldScroll) {
      requestAnimationFrame(() => {
        productsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

  return (
    <main>
      <Header />
      <ProductBanners />
      <HeroMarcas />

      <div className="max-w-8xl mx-auto px-4 py-8">
        {loading && <p className="text-gray-600">Cargando productos...</p>}

        {!loading && errorMsg && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
            <p className="font-semibold">No se pudieron cargar los productos</p>
            <p className="text-sm mt-1">{errorMsg}</p>
            <p className="text-xs mt-2 text-red-600">
              Si esto pasa con RLS, revisa que exista la policy:{" "}
              <b>products_public_read</b> (y para banners, añade una policy de
              lectura pública para <b>product_banners</b>).
            </p>
          </div>
        )}

        {!loading && !errorMsg && (
          <div className="space-y-6 mx-10">
            <FiltersContainer brands={brands} onApply={applyFilters} />

            {(urlSearch || urlCategory || urlBrand || urlBanner) && (
              <div className="text-sm text-gray-600">
                {urlSearch && (
                  <span>
                    Resultados para: <b>{urlSearch}</b>{" "}
                  </span>
                )}
                {urlCategory && (
                  <span>
                    en categoría: <b>{urlCategory}</b>{" "}
                  </span>
                )}
                {urlBrand && (
                  <span>
                    en marca: <b>{urlBrand}</b>
                  </span>
                )}
              </div>
            )}

            <div id="products" ref={productsRef} className="scroll-mt-40">
              {filteredProducts.length === 0 ? (
                <p className="text-gray-600">
                  No hay productos con esos filtros
                  {urlSearch ? " (prueba otra palabra)" : ""}.
                </p>
              ) : (
                <AllProductsGrid products={filteredProducts} />
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}