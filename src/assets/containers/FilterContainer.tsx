import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export interface Filters {
  category?: string;
  priceFrom?: number;
  priceTo?: number;
  brand?: string;
  sort?: string;

  glutenFree?: boolean;
  lactoseFree?: boolean;
  vegan?: boolean;
  bio?: boolean;

  promotionsOnly?: boolean;
}

interface Props {
  brands: string[];
  onApply: (filters: Filters, shouldScroll?: boolean) => void;
}

const FIXED_CATEGORIES = [
  "Alimentos",
  "Deporte",
  "Cosmetica e higiene",
  "Granel",
  "Infusiones",
  "Aromaterapia",
  "Refrigerados",
  "Hogar",
  "Suplementos",
] as const;

function parseBool(v: string | null) {
  return v === "1" || v === "true";
}

function parseNum(v: string | null) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeCategoryFromUrl(raw: string | null) {
  if (!raw) return "";
  const decoded = decodeURIComponent(raw);
  const found = FIXED_CATEGORIES.find(
    (c) => c.toLowerCase() === decoded.toLowerCase(),
  );
  return found ?? decoded;
}

export default function FiltersContainer({ brands, onApply }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const readFromUrl = () => {
    const f: Filters = {
      category: normalizeCategoryFromUrl(searchParams.get("category")) || "",
      brand: searchParams.get("brand") || "",
      sort: searchParams.get("sort") || "",
      priceFrom: parseNum(searchParams.get("priceFrom")),
      priceTo: parseNum(searchParams.get("priceTo")),
      glutenFree: parseBool(searchParams.get("glutenFree")),
      lactoseFree: parseBool(searchParams.get("lactoseFree")),
      vegan: parseBool(searchParams.get("vegan")),
      bio: parseBool(searchParams.get("bio")),
      promotionsOnly: parseBool(searchParams.get("promotionsOnly")),
    };
    return f;
  };

  const [filters, setFilters] = useState<Filters>(() => {
    const u = readFromUrl();
    return {
      category: u.category ?? "",
      brand: u.brand ?? "",
      sort: u.sort ?? "",
      priceFrom: u.priceFrom,
      priceTo: u.priceTo,
      glutenFree: u.glutenFree ?? false,
      lactoseFree: u.lactoseFree ?? false,
      vegan: u.vegan ?? false,
      bio: u.bio ?? false,
      promotionsOnly: u.promotionsOnly ?? false,
    };
  });

  const hasSearch = useMemo(() => {
    const s = (searchParams.get("search") ?? "").trim();
    return s.length > 0;
  }, [searchParams]);

  const hasBanner = useMemo(() => {
    const b = (searchParams.get("banner") ?? "").trim();
    return b.length > 0;
  }, [searchParams]);

  useEffect(() => {
    const next = readFromUrl();

    setFilters((prev) => {
      const same =
        (prev.category ?? "") === (next.category ?? "") &&
        (prev.brand ?? "") === (next.brand ?? "") &&
        (prev.sort ?? "") === (next.sort ?? "") &&
        (prev.priceFrom ?? undefined) === (next.priceFrom ?? undefined) &&
        (prev.priceTo ?? undefined) === (next.priceTo ?? undefined) &&
        !!prev.glutenFree === !!next.glutenFree &&
        !!prev.lactoseFree === !!next.lactoseFree &&
        !!prev.vegan === !!next.vegan &&
        !!prev.bio === !!next.bio &&
        !!prev.promotionsOnly === !!next.promotionsOnly;

      return same ? prev : next;
    });

    onApply(next, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const writeToUrl = (f: Filters) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);

      const setOrDel = (k: string, v: string | number | null | undefined) => {
        if (
          v === undefined ||
          v === null ||
          v === "" ||
          (typeof v === "number" && !Number.isFinite(v))
        ) {
          p.delete(k);
        } else {
          p.set(k, String(v));
        }
      };

      const setBool = (k: string, v?: boolean) => {
        if (v) p.set(k, "1");
        else p.delete(k);
      };

      setOrDel("category", f.category || "");
      setOrDel("brand", f.brand || "");
      setOrDel("sort", f.sort || "");
      setOrDel("priceFrom", f.priceFrom);
      setOrDel("priceTo", f.priceTo);

      setBool("glutenFree", !!f.glutenFree);
      setBool("lactoseFree", !!f.lactoseFree);
      setBool("vegan", !!f.vegan);
      setBool("bio", !!f.bio);
      setBool("promotionsOnly", !!f.promotionsOnly);

      return p;
    });
  };

  const applyInstant = (patch: Partial<Filters>) => {
    const next: Filters = { ...filters, ...patch };

    setFilters(next);
    writeToUrl(next);
    onApply(next, true);
  };

  const setLocalPrice = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const applyPriceNow = () => {
    writeToUrl(filters);
    onApply(filters, true);
  };

  const clearAll = () => {
    const empty: Filters = {
      category: "",
      brand: "",
      sort: "",
      priceFrom: undefined,
      priceTo: undefined,
      glutenFree: false,
      lactoseFree: false,
      vegan: false,
      bio: false,
      promotionsOnly: false,
    };

    setFilters(empty);

    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);

      p.delete("category");
      p.delete("brand");
      p.delete("sort");
      p.delete("priceFrom");
      p.delete("priceTo");
      p.delete("glutenFree");
      p.delete("lactoseFree");
      p.delete("vegan");
      p.delete("bio");
      p.delete("promotionsOnly");

      p.delete("search");

      p.delete("banner");
      p.delete("bannerName");
      p.delete("title");

      return p;
    });

    onApply(empty, true);
  };

  const [open, setOpen] = useState<
    null | "category" | "brand" | "price" | "sort"
  >(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const Chip = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2.5 rounded-full text-sm font-semibold border shadow-sm transition-all duration-300 whitespace-nowrap",
        active
          ? "border-[#425530] bg-[#425530] text-white shadow-[0_6px_16px_rgba(66,85,48,0.18)]"
          : "border-[#dce4d4] bg-white/90 text-[#354526] hover:-translate-y-0.5 hover:border-[#aabd9a] hover:bg-white hover:shadow-md",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const DropBtn = ({
    label,
    isOpen,
    active,
    onClick,
  }: {
    label: string;
    isOpen: boolean;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2.5 rounded-full text-sm font-semibold border shadow-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
        active
          ? "border-[#425530] bg-[#425530] text-white shadow-[0_6px_16px_rgba(66,85,48,0.18)]"
          : "border-[#dce4d4] bg-white/90 text-[#354526] hover:-translate-y-0.5 hover:border-[#aabd9a] hover:bg-white hover:shadow-md",
      ].join(" ")}
    >
      <span>{label}</span>
      <svg
        className={[
          "h-4 w-4 transition-transform",
          isOpen ? "rotate-180" : "rotate-0",
        ].join(" ")}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );

  const hasAnyFilter = useMemo(() => {
    return (
      !!filters.promotionsOnly ||
      !!filters.glutenFree ||
      !!filters.lactoseFree ||
      !!filters.vegan ||
      !!filters.bio ||
      !!(filters.category && filters.category !== "") ||
      !!(filters.brand && filters.brand !== "") ||
      !!(filters.sort && filters.sort !== "") ||
      filters.priceFrom !== undefined ||
      filters.priceTo !== undefined
    );
  }, [filters]);

  const canClear = hasAnyFilter || hasSearch || hasBanner;

  const categoryActive = !!filters.category;
  const brandActive = !!filters.brand;
  const sortActive = !!filters.sort;
  const priceActive =
    filters.priceFrom !== undefined || filters.priceTo !== undefined;

  const sortLabel =
    filters.sort === "price-asc"
      ? "Precio ↑"
      : filters.sort === "price-desc"
        ? "Precio ↓"
        : "Ordenar";

  return (
    <div ref={rootRef} className="sticky top-0 z-40 w-full">
      <div className="relative overflow-visible rounded-[1.4rem] border border-[#cbd8bf] bg-gradient-to-r from-[#dce7cf] via-[#e8efdf] to-[#d4e1c7] px-4 py-4 shadow-[0_10px_30px_rgba(47,67,31,0.10)]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/80" />

        <div className="relative flex flex-wrap items-center gap-2.5">
          <Chip
            label={filters.promotionsOnly ? "Promociones activas" : "Promociones"}
            active={!!filters.promotionsOnly}
            onClick={() =>
              applyInstant({ promotionsOnly: !filters.promotionsOnly })
            }
          />

          <div className="relative text-gray-900">
            <DropBtn
              label={
                filters.category
                  ? `Categoría: ${filters.category}`
                  : "Categoría"
              }
              isOpen={open === "category"}
              active={categoryActive}
              onClick={() =>
                setOpen((v) => (v === "category" ? null : "category"))
              }
            />
            {open === "category" && (
              <div className="absolute z-20 mt-3 w-64 rounded-2xl border border-[#dce4d4] bg-[#fffefa] p-2 shadow-[0_18px_45px_rgba(47,67,31,0.16)]">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 text-sm"
                  onClick={() => {
                    applyInstant({ category: "" });
                    setOpen(null);
                  }}
                >
                  Todas
                </button>
                <div className="h-px bg-gray-100 my-1" />
                {FIXED_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={[
                      "w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50",
                      filters.category === c ? "bg-gray-100 font-semibold" : "",
                    ].join(" ")}
                    onClick={() => {
                      applyInstant({ category: c });
                      setOpen(null);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative text-gray-900">
            <DropBtn
              label={filters.brand ? `Marca: ${filters.brand}` : "Marca"}
              isOpen={open === "brand"}
              active={brandActive}
              onClick={() => setOpen((v) => (v === "brand" ? null : "brand"))}
            />
            {open === "brand" && (
              <div className="absolute z-20 mt-3 max-h-72 w-64 overflow-auto rounded-2xl border border-[#dce4d4] bg-[#fffefa] p-2 shadow-[0_18px_45px_rgba(47,67,31,0.16)]">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 text-sm"
                  onClick={() => {
                    applyInstant({ brand: "" });
                    setOpen(null);
                  }}
                >
                  Todas
                </button>
                <div className="h-px bg-gray-100 my-1" />
                {brands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={[
                      "w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50",
                      filters.brand === b ? "bg-gray-100 font-semibold" : "",
                    ].join(" ")}
                    onClick={() => {
                      applyInstant({ brand: b });
                      setOpen(null);
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative text-black">
            <DropBtn
              label={
                priceActive
                  ? `Precio: ${filters.priceFrom ?? "—"} - ${filters.priceTo ?? "—"}`
                  : "Precio"
              }
              isOpen={open === "price"}
              active={priceActive}
              onClick={() => setOpen((v) => (v === "price" ? null : "price"))}
            />
            {open === "price" && (
              <div className="absolute z-20 mt-3 w-72 rounded-2xl border border-[#dce4d4] bg-[#fffefa] p-4 shadow-[0_18px_45px_rgba(47,67,31,0.16)]">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  Rango de precio
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Desde"
                    value={filters.priceFrom ?? ""}
                    className="w-1/2 border rounded-xl p-2"
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalPrice({
                        priceFrom: v === "" ? undefined : Number(v),
                      });
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Hasta"
                    value={filters.priceTo ?? ""}
                    className="w-1/2 border rounded-xl p-2"
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalPrice({
                        priceTo: v === "" ? undefined : Number(v),
                      });
                    }}
                  />
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[#425530] py-2.5 font-semibold text-white transition hover:bg-[#354526]"
                    onClick={() => {
                      applyPriceNow();
                      setOpen(null);
                    }}
                  >
                    Aplicar precio
                  </button>

                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-800 font-semibold"
                    onClick={() => {
                      const next: Filters = {
                        ...filters,
                        priceFrom: undefined,
                        priceTo: undefined,
                      };
                      setFilters(next);
                      writeToUrl(next);
                      onApply(next, true);
                      setOpen(null);
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative text-gray-900">
            <DropBtn
              label={sortLabel}
              isOpen={open === "sort"}
              active={sortActive}
              onClick={() => setOpen((v) => (v === "sort" ? null : "sort"))}
            />
            {open === "sort" && (
              <div className="absolute z-20 mt-3 w-56 rounded-2xl border border-[#dce4d4] bg-[#fffefa] p-2 shadow-[0_18px_45px_rgba(47,67,31,0.16)]">
                <button
                  type="button"
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50",
                    !filters.sort ? "bg-gray-100 font-semibold" : "",
                  ].join(" ")}
                  onClick={() => {
                    applyInstant({ sort: "" });
                    setOpen(null);
                  }}
                >
                  Por defecto
                </button>
                <button
                  type="button"
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50",
                    filters.sort === "price-asc"
                      ? "bg-gray-100 font-semibold"
                      : "",
                  ].join(" ")}
                  onClick={() => {
                    applyInstant({ sort: "price-asc" });
                    setOpen(null);
                  }}
                >
                  Precio: menor → mayor
                </button>
                <button
                  type="button"
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50",
                    filters.sort === "price-desc"
                      ? "bg-gray-100 font-semibold"
                      : "",
                  ].join(" ")}
                  onClick={() => {
                    applyInstant({ sort: "price-desc" });
                    setOpen(null);
                  }}
                >
                  Precio: mayor → menor
                </button>
              </div>
            )}
          </div>

          <Chip
            label="Sin gluten"
            active={!!filters.glutenFree}
            onClick={() => applyInstant({ glutenFree: !filters.glutenFree })}
          />
          <Chip
            label="Sin lactosa"
            active={!!filters.lactoseFree}
            onClick={() => applyInstant({ lactoseFree: !filters.lactoseFree })}
          />
          <Chip
            label="Vegan"
            active={!!filters.vegan}
            onClick={() => applyInstant({ vegan: !filters.vegan })}
          />
          <Chip
            label="Bio"
            active={!!filters.bio}
            onClick={() => applyInstant({ bio: !filters.bio })}
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              disabled={!canClear}
              className={[
                "rounded-full border px-5 py-2.5 font-semibold shadow-sm transition-all duration-300",
                canClear
                  ? "border-white/80 bg-white/85 text-[#354526] hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  : "cursor-not-allowed border-white/40 bg-white/35 text-[#8e9a85]",
              ].join(" ")}
            >
              Ver todo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}