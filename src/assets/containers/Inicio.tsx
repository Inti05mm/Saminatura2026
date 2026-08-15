import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Search,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImg from "../pictures/fainall.png";

import {
  getAllShopifyProducts,
} from "../../shopifyCatalog";

type ProductSuggestion = {
  id: string;
  name: string;
  handle: string;
  variantTitle: string | null;
};

type SearchCatalogRow = {
  id: string;
  name: string;
  handle: string;
  variantTitle: string | null;
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
      id: string;
      name: string;
      handle: string;
      variantTitle: string | null;
    };

export default function HeroSaminatura() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] =
    useState("");

  const [items, setItems] = useState<
    SuggestItem[]
  >([]);

  const [suggestOpen, setSuggestOpen] =
    useState(false);

  const [suggestLoading, setSuggestLoading] =
    useState(false);

  const searchWrapRef =
    useRef<HTMLFormElement | null>(null);

  const searchCatalogRef = useRef<
    SearchCatalogRow[] | null
  >(null);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();

  const uniq = (values: string[]) =>
    Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

  const fullProductName = (product: {
    name: string;
    variantTitle: string | null;
  }) => {
    const base = (product.name ?? "").trim();
    const variantTitle =
      (product.variantTitle ?? "").trim();

    const cleanVariantTitle =
      variantTitle.toLowerCase() === "default title"
        ? ""
        : variantTitle;

    return [base, cleanVariantTitle]
      .filter(Boolean)
      .join(" ");
  };

  const goToProduct = (
    product: ProductSuggestion
  ) => {
    setSuggestOpen(false);

    setSearchQuery(
      fullProductName({
        name: product.name,
        variantTitle: product.variantTitle,
      })
    );

    navigate(
      `/tienda/${product.handle}`
    );
  };

  const goToFilteredShopping = (
    kind: "category" | "brand",
    value: string
  ) => {
    setSuggestOpen(false);

    const params = new URLSearchParams();
    params.set(kind, value);

    navigate(
      `/tienda?${params.toString()}#products`
    );
  };

  const handleSearchSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      navigate("/tienda");
      return;
    }

    const normalizedQuery = normalizeText(query);

    const exactCategory = items.find(
      (item) =>
        item.kind === "category" &&
        normalizeText(item.value) ===
          normalizedQuery
    ) as
      | {
          kind: "category";
          value: string;
        }
      | undefined;

    const exactBrand = items.find(
      (item) =>
        item.kind === "brand" &&
        normalizeText(item.value) ===
          normalizedQuery
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

    const softCategory = items.find(
      (item) =>
        item.kind === "category" &&
        normalizeText(item.value).includes(
          normalizedQuery
        )
    ) as
      | {
          kind: "category";
          value: string;
        }
      | undefined;

    const softBrand = items.find(
      (item) =>
        item.kind === "brand" &&
        normalizeText(item.value).includes(
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

    const params = new URLSearchParams();
    params.set("search", query);

    navigate(
      `/tienda?${params.toString()}#products`
    );

    setSuggestOpen(false);
  };

  useEffect(() => {
    let alive = true;

    const query = searchQuery.trim();

    if (query.length < 2) {
      setItems([]);
      setSuggestLoading(false);
      return;
    }

    setSuggestLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        if (!searchCatalogRef.current) {
          const shopifyProducts =
            await getAllShopifyProducts();

          searchCatalogRef.current =
            shopifyProducts
              .flatMap((product) =>
                (product.variants.nodes ?? []).map(
                  (variant) => ({
                    id: variant.id,
                    name: product.title,
                    handle: product.handle,
                    variantTitle:
                      variant.title ?? null,
                    category:
                      product.productType || null,
                    brand:
                      product.vendor || null,
                  })
                )
              )
              .filter(
                (row) =>
                  Boolean(row.id) &&
                  Boolean(row.name) &&
                  Boolean(row.handle)
              )
              .sort((first, second) =>
                fullProductName(first).localeCompare(
                  fullProductName(second),
                  "es",
                  {
                    sensitivity: "base",
                  }
                )
              );
        }

        if (!alive) return;

        const normalizedQuery =
          normalizeText(query);

        const catalog =
          searchCatalogRef.current ?? [];

        const matchingRows = catalog.filter(
          (row) => {
            const searchableProductName =
              fullProductName({
                name: row.name,
                variantTitle: row.variantTitle,
              });

            return (
              normalizeText(
                searchableProductName
              ).includes(normalizedQuery) ||
              normalizeText(
                row.category ?? ""
              ).includes(normalizedQuery) ||
              normalizeText(
                row.brand ?? ""
              ).includes(normalizedQuery)
            );
          }
        );

        const categories = uniq(
          matchingRows
            .map((row) => row.category ?? "")
            .filter((value) =>
              normalizeText(value).includes(
                normalizedQuery
              )
            )
        ).slice(0, 5);

        const brands = uniq(
          matchingRows
            .map((row) => row.brand ?? "")
            .filter((value) =>
              normalizeText(value).includes(
                normalizedQuery
              )
            )
        ).slice(0, 5);

        const products: SuggestItem[] =
          matchingRows
            .filter((row) =>
              normalizeText(
                fullProductName({
                  name: row.name,
                  variantTitle: row.variantTitle,
                })
              ).includes(normalizedQuery)
            )
            .slice(0, 8)
            .map((row) => ({
              kind: "product",
              id: row.id,
              name: row.name,
              handle: row.handle,
              variantTitle: row.variantTitle,
            }));

        const categorySuggestionItems: SuggestItem[] =
          categories.map((value) => ({
            kind: "category",
            value,
          }));

        const brandSuggestionItems: SuggestItem[] =
          brands.map((value) => ({
            kind: "brand",
            value,
          }));

        setItems([
          ...categorySuggestionItems,
          ...brandSuggestionItems,
          ...products,
        ]);
      } catch (error) {
        console.error(
          "Error cargando el buscador Shopify:",
          error
        );

        if (alive) {
          setItems([]);
        }
      } finally {
        if (alive) {
          setSuggestLoading(false);
        }
      }
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleMouseDown = (
      event: MouseEvent
    ) => {
      const target = event.target as Node | null;

      if (!target) return;

      const isInsideSearch =
        searchWrapRef.current?.contains(target) ??
        false;

      if (!isInsideSearch) {
        setSuggestOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setSuggestOpen(false);
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

  const categoryItems = items.filter(
    (item) => item.kind === "category"
  ) as Array<{
    kind: "category";
    value: string;
  }>;

  const brandItems = items.filter(
    (item) => item.kind === "brand"
  ) as Array<{
    kind: "brand";
    value: string;
  }>;

  const productItems = items.filter(
    (item) => item.kind === "product"
  ) as Array<{
    kind: "product";
    id: string;
    name: string;
    handle: string;
    variantTitle: string | null;
  }>;

  return (
    <section className="relative z-40 w-full overflow-visible bg-[#f7f3ea]">
      <div className="relative w-full overflow-visible">
        <img
          src={heroImg}
          alt="Saminatura - Natural, Bio y Bienestar"
          className="block h-auto w-full overflow-hidden"
        />

        <div className="pointer-events-none absolute inset-0 bg-white/5" />

        <div
          className="
            absolute left-1/2 top-[54%] z-50
            flex w-full
            -translate-x-1/2 -translate-y-1/2
            flex-col items-center
            px-4 text-center
            sm:px-6
          "
        >
          <h1
            className="
              pl-[0.08em]
              font-serif
              text-3xl
              tracking-[0.08em]
              text-[#2f3a1f]
              sm:text-5xl
              md:text-6xl
              lg:text-7xl
              xl:text-8xl
            "
          >
            SAMINATURA
          </h1>

          <div className="mt-3 h-[2px] w-20 bg-[#7b8f45] sm:mt-4 sm:w-28" />

          <p
            className="
              mt-3
              pl-[0.25em]
              text-[10px]
              uppercase
              tracking-[0.25em]
              text-[#66704c]
              sm:mt-4
              sm:pl-[0.35em]
              sm:text-sm
              sm:tracking-[0.35em]
              md:text-base
            "
          >
            Natural · Bio · Bienestar
          </p>

          <form
            ref={searchWrapRef}
            onSubmit={handleSearchSubmit}
            className="relative z-[1000] mt-5 w-full max-w-[360px] overflow-visible sm:mt-6 sm:max-w-[500px] md:max-w-[560px] lg:max-w-[620px] xl:max-w-[680px]"
          >
            <div
              className="
                flex w-full items-center
                overflow-hidden rounded-full
                border border-[#768351]/45
                bg-white/95
                p-1.5
                shadow-md
                backdrop-blur-sm
                transition
                focus-within:border-[#65753e]/70
                focus-within:shadow-lg
              "
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  const value = event.target.value;

                  setSearchQuery(value);
                  setSuggestOpen(
                    value.trim().length >= 2
                  );
                }}
                onFocus={() => {
                  if (
                    searchQuery.trim().length >= 2
                  ) {
                    setSuggestOpen(true);
                  }
                }}
                placeholder="Buscar productos..."
                aria-label="Buscar productos"
                autoComplete="off"
                className="
                  min-w-0 flex-1
                  bg-transparent
                  px-4 py-2
                  text-sm font-medium
                  text-[#2f3a1f]
                  outline-none
                  placeholder:font-normal
                  placeholder:text-[#7c806f]
                  sm:px-5
                  sm:py-2.5
                  sm:text-base
                "
              />

              <button
                type="submit"
                className="
                  flex min-w-[108px]
                  shrink-0 items-center
                  justify-center gap-2
                  rounded-full
                  bg-[#354024]
                  px-5 py-2
                  text-sm font-semibold
                  tracking-wide text-white
                  transition
                  hover:bg-gray-800
                  focus:outline-none
                  focus:ring-2
                  focus:ring-black/20
                  sm:min-w-[125px]
                  sm:px-6
                  sm:py-2.5
                  sm:text-base
                "
              >
                <Search className="h-4 w-4 sm:hidden" />
                Buscar
              </button>
            </div>

            {suggestOpen &&
              (suggestLoading ||
                items.length > 0 ||
                searchQuery.trim().length >= 2) && (
                <div
                  className="
                    absolute left-0 right-0 top-full
                    z-[9999] mt-2
                    overflow-hidden rounded-2xl
                    border border-gray-200
                    bg-white text-left
                    shadow-[0_18px_55px_rgba(15,23,42,0.18)]
                  "
                >
                  {suggestLoading ? (
                    <div className="px-5 py-4 text-sm text-gray-500">
                      Buscando…
                    </div>
                  ) : items.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-500">
                      No hay resultados.
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto">
                      {categoryItems.length > 0 && (
                        <div className="py-2">
                          <div className="px-5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                            Categorías
                          </div>

                          {categoryItems.map(
                            (category) => (
                              <button
                                key={`cat-${category.value}`}
                                type="button"
                                onClick={() =>
                                  goToFilteredShopping(
                                    "category",
                                    category.value
                                  )
                                }
                                className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition hover:bg-gray-50"
                              >
                                <span className="font-medium text-gray-800">
                                  Ver productos de{" "}
                                  <span className="font-extrabold">
                                    {category.value}
                                  </span>
                                </span>

                                <span className="text-xs text-gray-400">
                                  ir
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}

                      {brandItems.length > 0 && (
                        <div className="border-t border-gray-100 py-2">
                          <div className="px-5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                            Marcas
                          </div>

                          {brandItems.map((brand) => (
                            <button
                              key={`brand-${brand.value}`}
                              type="button"
                              onClick={() =>
                                goToFilteredShopping(
                                  "brand",
                                  brand.value
                                )
                              }
                              className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition hover:bg-gray-50"
                            >
                              <span className="font-medium text-gray-800">
                                Ver productos de{" "}
                                <span className="font-extrabold">
                                  {brand.value}
                                </span>
                              </span>

                              <span className="text-xs text-gray-400">
                                ir
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {productItems.length > 0 && (
                        <div className="border-t border-gray-100 py-2">
                          <div className="px-5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                            Productos
                          </div>

                          {productItems.map(
                            (product) => {
                              const label =
                                fullProductName({
                                  name: product.name,
                                  variantTitle:
                                    product.variantTitle,
                                });

                              return (
                                <button
                                  key={`product-${product.id}`}
                                  type="button"
                                  onClick={() =>
                                    goToProduct({
                                      id: product.id,
                                      name: product.name,
                                      handle: product.handle,
                                      variantTitle:
                                        product.variantTitle,
                                    })
                                  }
                                  className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm transition hover:bg-gray-50"
                                >
                                  <span className="min-w-0 truncate font-medium text-gray-800">
                                    {label}
                                  </span>

                                  <span className="shrink-0 text-xs text-gray-400">
                                    ver
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
          </form>

          <button
            type="button"
            onClick={() => navigate("/tienda")}
            className="
              mt-5 flex
              items-center justify-center
              gap-2
              rounded-full
              border border-[#48532f]
              bg-[#354024]
              px-6 py-2.5
              text-xs font-semibold
              uppercase
              tracking-[0.12em]
              text-white
              shadow-md
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:bg-[#4c5a32]
              hover:shadow-lg
              focus:outline-none
              focus:ring-2
              focus:ring-[#48532f]/30
              sm:mt-6
              sm:px-8
              sm:py-3
              sm:text-sm
              md:mt-7
            "
          >
            <ShoppingBag className="h-4 w-4" />
            Ver tienda
          </button>
        </div>
      </div>
    </section>
  );
}
  