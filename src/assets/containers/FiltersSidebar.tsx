import { useState } from "react";


export interface Filters {
  priceFrom?: number;
  priceTo?: number;
  sort?: "price-asc" | "price-desc" | "sales-desc" | "new";
  brands?: string[];
  stockOnly?: boolean;

  // comida
  bio?: boolean;
  glutenFree?: boolean;
  vegan?: boolean;

  // cosmetica
  natural?: boolean;
  crueltyFree?: boolean;
  skinType?: string[];
}

interface Props {
  onApply: (filters: Filters) => void;
  availableBrands: string[];
  type: "food" | "cosmetic";
}

const FiltersSidebar: React.FC<Props> = ({
  onApply,
  availableBrands,
  type,
}) => {
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sort, setSort] = useState<Filters["sort"]>();
  const [brands, setBrands] = useState<string[]>([]);
  const [stockOnly, setStockOnly] = useState(false);

  const [bio, setBio] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [vegan, setVegan] = useState(false);

  const [natural, setNatural] = useState(false);
  const [crueltyFree, setCrueltyFree] = useState(false);
  const [skinType, setSkinType] = useState<string[]>([]);

  const toggle = (value: string, list: string[], set: any) => {
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const applyFilters = () => {
    onApply({
      priceFrom: priceFrom ? Number(priceFrom) : undefined,
      priceTo: priceTo ? Number(priceTo) : undefined,
      sort,
      brands,
      stockOnly,

      bio,
      glutenFree,
      vegan,

      natural,
      crueltyFree,
      skinType,
    });
  };

  return (
    <aside className="space-y-6">

      {/* ORDEN */}
      <select onChange={e => setSort(e.target.value as any)}>
        <option value="">Ordenar</option>
        <option value="price-asc">Precio ↑</option>
        <option value="price-desc">Precio ↓</option>
        <option value="sales-desc">Más vendidos</option>
        <option value="new">Novedades</option>
      </select>

      {/* PRECIO */}
      <div>
        <input type="number" placeholder="Desde €" onChange={e => setPriceFrom(e.target.value)} />
        <input type="number" placeholder="Hasta €" onChange={e => setPriceTo(e.target.value)} />
      </div>

      {/* MARCAS */}
      <details open>
        <summary>Marca</summary>
        {availableBrands.map(brand => (
          <label key={brand} className="block">
            <input
              type="checkbox"
              checked={brands.includes(brand)}
              onChange={() => toggle(brand, brands, setBrands)}
            />
            {brand}
          </label>
        ))}
      </details>

      {/* STOCK */}
      <label>
        <input type="checkbox" onChange={e => setStockOnly(e.target.checked)} />
        Solo disponibles
      </label>

      {/* COMIDA */}
      {type === "food" && (
        <>
          <label><input type="checkbox" onChange={e => setBio(e.target.checked)} /> Bio</label>
          <label><input type="checkbox" onChange={e => setGlutenFree(e.target.checked)} /> Sin gluten</label>
          <label><input type="checkbox" onChange={e => setVegan(e.target.checked)} /> Vegano</label>
        </>
      )}

      {/* COSMÉTICA */}
      {type === "cosmetic" && (
        <>
          <label><input type="checkbox" onChange={e => setNatural(e.target.checked)} /> Natural</label>
          <label><input type="checkbox" onChange={e => setCrueltyFree(e.target.checked)} /> Cruelty free</label>

          <div>
            {["seca", "grasa", "mixta"].map(t => (
              <label key={t}>
                <input
                  type="checkbox"
                  onChange={() => toggle(t, skinType, setSkinType)}
                />
                {t}
              </label>
            ))}
          </div>
        </>
      )}

      <button onClick={applyFilters}>Aplicar filtros</button>
    </aside>
  );
};

export default FiltersSidebar;
