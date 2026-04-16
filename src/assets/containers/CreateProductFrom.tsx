import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type PromoType = "none" | "percent" | "2x1" | "3x2" | "second_half";

type ExtraVariant = {
  img: string;
  flavor: string;
  size: string;
  stock: number | null;
};

interface ProductForm {
  category: string;
  name: string;
  brand: string;

  flavor: string;
  size: string;

  basePrice: number | null;
  discountPercent: number | null;

  promoType: PromoType;
  promoActive: boolean;

  purchasePrice: number | null;

  vatRate: number | null;
  recargoRate: number | null;
  taxCombo: string;

  img: string; // ✅ 1ª URL (principal)
  extraImages: string[]; // ✅ NUEVO: URLs extra
  stock: number | null;

  bio: boolean;
  vegan: boolean;

  glutenFree: boolean;
  lactoseFree: boolean;
  supplierName: string;

  expirationDate: string | null;
  description: string;

  extraVariants: ExtraVariant[];
}

type ProductRow = {
  id: number;
  category: string;
  name: string;
  brand: string;

  price: number;
  old_price: number | null;

  purchase_price: number | null;

  vat_rate: number | null;
  recargo_rate: number | null;

  promo_type: PromoType | null;
  promo_active: boolean | null;

  img: string | null;
  stock: number | null;

  bio: boolean | null;
  vegan: boolean | null;

  gluten_free: boolean | null;
  lactose_free: boolean | null;

  supplier_name: string | null;
  expiration_date: string | null;
  description: string | null;

  flavor: string | null;
  size: string | null;

  is_active: boolean | null;
};

const CATEGORIES = [
  "deporte",
  "cosmetica",
  "alimentos",
  "suplementos",
  "granel",
  "higiene",
  "infusiones",
  "aromaterapia",
  "refrigerados",
  "limpieza hogar",
] as const;

const TAX_COMBOS = [
  { label: "0% + 0%", value: "0+0", iva: 0, recargo: 0 },
  { label: "4% + 0.5%", value: "4+0.5", iva: 4, recargo: 0.5 },
  { label: "5% + 0%", value: "5+0", iva: 5, recargo: 0 },
  { label: "10% + 1.4%", value: "10+1.4", iva: 10, recargo: 1.4 },
  { label: "7.5% + 1%", value: "7.5+1", iva: 7.5, recargo: 1 },
  { label: "21% + 5.2%", value: "21+5.2", iva: 21, recargo: 5.2 },
  { label: "2% + 0.26%", value: "2+0.26", iva: 2, recargo: 0.26 },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function keyFamily(category: string, brand: string, name: string) {
  return `${(category ?? "").trim().toLowerCase()}__${(brand ?? "").trim().toLowerCase()}__${(name ?? "")
    .trim()
    .toLowerCase()}`;
}
function keyVariant(flavor: string | null | undefined, size: string | null | undefined) {
  const f = (flavor ?? "").trim().toLowerCase();
  const s = (size ?? "").trim().toLowerCase();
  return `${f}__${s}`;
}

// ✅ NUEVO: normaliza URLs (quita espacios)
function normalizeUrls(urls: string[]) {
  const out: string[] = [];
  for (const u of urls) {
    const t = (u ?? "").trim();
    if (!t) continue;
    // sin duplicados exactos
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

type CreateProductFormProps = {
  onCreated?: () => void;
};

export default function CreateProductForm({ onCreated }: CreateProductFormProps) {
  const [product, setProduct] = useState<ProductForm>({
    category: "",
    name: "",
    brand: "",

    flavor: "",
    size: "",

    basePrice: null,
    discountPercent: null,

    promoType: "none",
    promoActive: false,

    purchasePrice: null,

    vatRate: null,
    recargoRate: null,
    taxCombo: "",

    img: "",
    extraImages: [], // ✅ NUEVO
    stock: null,

    bio: false,
    vegan: false,

    glutenFree: false,
    lactoseFree: false,
    supplierName: "",

    expirationDate: null,
    description: "",

    extraVariants: [],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ NUEVO: desplegable de imágenes extra
  const [showExtraImages, setShowExtraImages] = useState(false);

  const addExtraImage = () => {
    setProduct((prev) => ({ ...prev, extraImages: [...prev.extraImages, ""] }));
    setShowExtraImages(true);
  };

  const updateExtraImage = (idx: number, value: string) => {
    setProduct((prev) => {
      const next = [...prev.extraImages];
      next[idx] = value;
      return { ...prev, extraImages: next };
    });
  };

  const removeExtraImage = (idx: number) => {
    setProduct((prev) => ({ ...prev, extraImages: prev.extraImages.filter((_, i) => i !== idx) }));
  };

  // ✅ NUEVO: modo plantilla / añadir variaciones
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string>("");
  const [familyOptions, setFamilyOptions] = useState<{ familyKey: string; label: string; sampleRow: ProductRow }[]>([]);
  const [selectedFamilyKey, setSelectedFamilyKey] = useState<string>("");
  const [existingVariantKeys, setExistingVariantKeys] = useState<Set<string>>(new Set());

  const isTemplateMode = !!selectedFamilyKey;

  // ✅ SOLO bloquear name en modo plantilla (mantiene tu lógica de “Elegir plantilla”)
  const isFieldLocked = (field: keyof ProductForm) => isTemplateMode && field === "name";

  const discountPct = useMemo(() => {
    const raw = product.discountPercent ?? 0;
    if (Number.isNaN(raw)) return 0;
    return clamp(raw, 0, 100);
  }, [product.discountPercent]);

  const finalPrice = useMemo(() => {
    if (product.basePrice === null) return null;
    const base = product.basePrice;
    const factor = 1 - discountPct / 100;
    return round2(base * factor);
  }, [product.basePrice, discountPct]);

  const taxFactor = useMemo(() => {
    const iva = product.vatRate ?? 0;
    const rec = product.recargoRate ?? 0;
    return 1 + (iva + rec) / 100;
  }, [product.vatRate, product.recargoRate]);

  const purchaseTotal = useMemo(() => {
    if (product.purchasePrice === null) return null;
    return product.purchasePrice * taxFactor;
  }, [product.purchasePrice, taxFactor]);

  const marginPerUnit = useMemo(() => {
    if (finalPrice === null || purchaseTotal === null) return null;
    return finalPrice - purchaseTotal;
  }, [finalPrice, purchaseTotal]);

  const marginTotalStock = useMemo(() => {
    if (marginPerUnit === null) return null;
    if (product.stock === null) return null;
    return marginPerUnit * product.stock;
  }, [marginPerUnit, product.stock]);

  const setPromo = (promo: PromoType) => {
    setProduct((prev) => {
      if (promo === "2x1" || promo === "3x2" || promo === "second_half") {
        return { ...prev, promoType: promo, promoActive: true, discountPercent: null };
      }
      if (promo === "percent") return { ...prev, promoType: "percent", promoActive: true };
      return { ...prev, promoType: "none", promoActive: false };
    });
  };

  const addVariant = () => {
    setProduct((prev) => ({
      ...prev,
      extraVariants: [...prev.extraVariants, { img: "", flavor: "", size: "", stock: null }],
    }));
  };

  const updateVariant = (idx: number, patch: Partial<ExtraVariant>) => {
    setProduct((prev) => {
      const next = [...prev.extraVariants];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, extraVariants: next };
    });
  };

  const removeVariant = (idx: number) => {
    setProduct((prev) => ({
      ...prev,
      extraVariants: prev.extraVariants.filter((_, i) => i !== idx),
    }));
  };

  // ✅ cargar “familias”
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setTemplateLoading(true);
      setTemplateError("");

      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id,category,name,brand,price,old_price,purchase_price,vat_rate,recargo_rate,promo_type,promo_active,img,stock,bio,vegan,gluten_free,lactose_free,supplier_name,expiration_date,description,flavor,size,is_active"
          )
          .eq("is_active", true)
          .order("id", { ascending: false })
          .limit(800);

        if (error) throw error;

        const rows = (data ?? []) as ProductRow[];
        const map = new Map<string, ProductRow>();

        for (const r of rows) {
          const k = keyFamily(r.category, r.brand, r.name);
          if (!map.has(k)) map.set(k, r);
        }

        const options = Array.from(map.entries()).map(([familyKey, sampleRow]) => ({
          familyKey,
          sampleRow,
          label: `${sampleRow.category} · ${sampleRow.brand} · ${sampleRow.name}`,
        }));

        options.sort((a, b) => a.label.localeCompare(b.label));

        if (!alive) return;
        setFamilyOptions(options);
      } catch (e: any) {
        if (!alive) return;
        setTemplateError(e?.message ?? "No se pudieron cargar productos");
      } finally {
        if (!alive) return;
        setTemplateLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ plantilla: autocompleta (pero NO bloquea todo; solo name queda bloqueado)
  useEffect(() => {
    let alive = true;

    const fillFromTemplate = async () => {
      setMessage("");
      setExistingVariantKeys(new Set());

      if (!selectedFamilyKey) return;

      const selected = familyOptions.find((x) => x.familyKey === selectedFamilyKey)?.sampleRow;
      if (!selected) return;

      let inferredBasePrice: number | null = selected.price ?? null;
      let inferredDiscount: number | null = null;

      const hasOld = selected.old_price != null && Number(selected.old_price) > 0;
      const isUnitPromo =
        !!selected.promo_active &&
        (selected.promo_type === "2x1" || selected.promo_type === "3x2" || selected.promo_type === "second_half");

      if (hasOld && !isUnitPromo) {
        inferredBasePrice = Number(selected.old_price);
        const pct = (1 - Number(selected.price) / Number(selected.old_price)) * 100;
        inferredDiscount = clamp(round2(pct), 0, 100);
      } else {
        inferredBasePrice = Number(selected.price);
        inferredDiscount = null;
      }

      const iva = Number(selected.vat_rate ?? 0);
      const rec = Number(selected.recargo_rate ?? 0);
      const foundCombo = TAX_COMBOS.find((t) => t.iva === iva && t.recargo === rec);

      setProduct((prev) => ({
        ...prev,
        category: selected.category ?? "",
        name: selected.name ?? "", // ✅ se autocompleta pero queda bloqueado en UI
        brand: selected.brand ?? "",

        flavor: "",
        size: "",
        stock: null,

        basePrice: Number.isFinite(inferredBasePrice as any) ? (inferredBasePrice as number) : null,
        discountPercent: inferredDiscount,

        promoType: (selected.promo_type ?? "none") as PromoType,
        promoActive: !!selected.promo_active && (selected.promo_type ?? "none") !== "none",

        purchasePrice: selected.purchase_price == null ? null : Number(selected.purchase_price),

        vatRate: Number.isFinite(iva) ? iva : null,
        recargoRate: Number.isFinite(rec) ? rec : null,
        taxCombo: foundCombo ? foundCombo.value : "",

        img: (selected.img ?? "").toString(),
        extraImages: [],

        bio: !!selected.bio,
        vegan: !!selected.vegan,
        glutenFree: !!selected.gluten_free,
        lactoseFree: !!selected.lactose_free,
        supplierName: selected.supplier_name ?? "",
        expirationDate: selected.expiration_date ?? null,
        description: selected.description ?? "",

        extraVariants: [],
      }));

      // Carga inicial de variantes existentes (por si acaso), luego se mantiene actualizado con el efecto de abajo
      try {
        const { data, error } = await supabase
          .from("products")
          .select("flavor,size")
          .eq("category", selected.category)
          .eq("brand", selected.brand)
          .eq("name", selected.name)
          .eq("is_active", true)
          .limit(2000);

        if (error) throw error;

        const set = new Set<string>();
        for (const r of (data ?? []) as any[]) {
          set.add(keyVariant(r.flavor, r.size));
        }

        if (!alive) return;
        setExistingVariantKeys(set);
      } catch (e: any) {
        if (!alive) return;
        setMessage(`Aviso: no pude cargar variantes existentes para evitar duplicados (${e?.message ?? "error"})`);
      }
    };

    fillFromTemplate();
    return () => {
      alive = false;
    };
  }, [selectedFamilyKey, familyOptions]);

  // ✅ NUEVO: si editas category/brand (name bloqueado), recalcula duplicados con los valores actuales del formulario
  useEffect(() => {
    let alive = true;

    const reloadExisting = async () => {
      if (!isTemplateMode) return;
      if (!product.category.trim() || !product.brand.trim() || !product.name.trim()) return;

      try {
        const { data, error } = await supabase
          .from("products")
          .select("flavor,size")
          .eq("category", product.category)
          .eq("brand", product.brand)
          .eq("name", product.name)
          .eq("is_active", true)
          .limit(2000);

        if (error) throw error;

        const set = new Set<string>();
        for (const r of (data ?? []) as any[]) {
          set.add(keyVariant(r.flavor, r.size));
        }

        if (!alive) return;
        setExistingVariantKeys(set);
      } catch (e: any) {
        if (!alive) return;
        setMessage(`Aviso: no pude refrescar variantes existentes (${e?.message ?? "error"})`);
      }
    };

    reloadExisting();
    return () => {
      alive = false;
    };
  }, [isTemplateMode, product.category, product.brand, product.name]);

  const clearTemplateMode = () => {
    setSelectedFamilyKey("");
    setExistingVariantKeys(new Set());
    setMessage("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === "date") {
      const value = e.target.value;
      setProduct((prev) => ({ ...prev, expirationDate: value === "" ? null : value }));
      return;
    }

    if (name === "taxCombo") {
      const value = (e.target as HTMLSelectElement).value;
      const found = TAX_COMBOS.find((x) => x.value === value);

      setProduct((prev) => ({
        ...prev,
        taxCombo: value,
        vatRate: found ? found.iva : null,
        recargoRate: found ? found.recargo : null,
      }));
      return;
    }

    if (name === "promoActive" && e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      const checked = e.target.checked;
      setProduct((prev) => ({
        ...prev,
        promoActive: checked,
        promoType: checked ? prev.promoType : "none",
      }));
      return;
    }

    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      const checked = e.target.checked;
      setProduct((prev) => ({ ...prev, [name]: checked } as ProductForm));
      return;
    }

    if (e.target instanceof HTMLInputElement && e.target.getAttribute("data-is-number") === "1") {
      const raw = e.target.value;
      const numOrNull = raw === "" ? null : Number(raw);

      if (name === "discountPercent") {
        setProduct((prev) => ({
          ...prev,
          discountPercent: numOrNull,
          promoType: (numOrNull ?? 0) > 0 ? "percent" : prev.promoType === "percent" ? "none" : prev.promoType,
          promoActive: (numOrNull ?? 0) > 0 ? true : prev.promoType === "percent" ? false : prev.promoActive,
        }));
        return;
      }

      setProduct((prev) => ({ ...prev, [name]: numOrNull } as ProductForm));
      return;
    }

    const value = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    setProduct((prev) => ({ ...prev, [name]: value } as ProductForm));
  };

  const buildCommonRow = () => {
    if (product.basePrice === null) throw new Error("Falta el precio base");
    if (finalPrice === null) throw new Error("No se pudo calcular el precio final");

    const hasDiscount = discountPct > 0 && finalPrice < product.basePrice;

    const promo_type: PromoType = product.promoActive ? product.promoType : "none";
    const promo_active = product.promoActive && promo_type !== "none";

    const isUnitPromo =
      promo_active && (promo_type === "2x1" || promo_type === "3x2" || promo_type === "second_half");

    const common: any = {
      category: product.category.trim(),
      name: product.name.trim(),
      brand: product.brand.trim(),

      price: Number(finalPrice),
      old_price: isUnitPromo ? null : hasDiscount ? Number(product.basePrice) : null,

      purchase_price: product.purchasePrice === null ? null : Number(product.purchasePrice),

      vat_rate: product.vatRate === null ? 0 : Number(product.vatRate),
      recargo_rate: product.recargoRate === null ? 0 : Number(product.recargoRate),

      bio: !!product.bio,
      vegan: !!product.vegan,
      gluten_free: !!product.glutenFree,
      lactose_free: !!product.lactoseFree,

      supplier_name: product.supplierName.trim() || null,
      expiration_date: product.expirationDate ? product.expirationDate : null,
      description: product.description.trim() || null,

      promo_type,
      promo_active,
      is_active: true,
    };

    return { common, isUnitPromo };
  };

  // ✅ NUEVO: inserta gallery en product_images para cada producto creado
  const insertImagesForProducts = async (
    productIds: number[],
    primaryByProductId: Map<number, string | null>,
    extraUrls: string[]
  ) => {
    const extras = normalizeUrls(extraUrls); // ya sin vacíos y sin duplicados
    const rows: any[] = [];

    for (const pid of productIds) {
      const primary = (primaryByProductId.get(pid) ?? "").trim();
      const urls = normalizeUrls([primary, ...extras].filter(Boolean) as string[]);

      if (urls.length === 0) continue;

      urls.forEach((url, i) => {
        rows.push({
          product_id: pid,
          url,
          alt: null,
          sort_order: i,
          is_primary: i === 0,
        });
      });
    }

    if (rows.length === 0) return;

    const { error } = await supabase.from("product_images").insert(rows);
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!product.category.trim()) throw new Error("Falta la categoría");
      if (!product.name.trim()) throw new Error("Falta el nombre");
      if (!product.brand.trim()) throw new Error("Falta la marca");

      const { common } = buildCommonRow();

      // ✅ Galería: la 1ª URL (product.img) es la principal
      const mainImg = (product.img ?? "").trim();
      const extraGalleryUrls = product.extraImages ?? [];

      // ✅ MODO NORMAL: crea base + extras
      if (!isTemplateMode) {
        const baseRow = {
          ...common,
          img: mainImg || null, // ✅ también guardamos la principal en products.img (legacy)
          stock: product.stock === null ? 0 : Number(product.stock),
          flavor: (product.flavor ?? "").trim() || null,
          size: (product.size ?? "").trim() || null,
        };

        const extraRows = (product.extraVariants ?? [])
          .map((v) => {
            const flavor = (v.flavor ?? "").trim();
            const size = (v.size ?? "").trim();
            if (!flavor && !size) return null;

            const img = (v.img ?? "").trim() || mainImg || null; // ✅ si variante tiene img, esa será la principal de ESA fila
            const stock = v.stock === null || Number.isNaN(v.stock) ? 0 : Number(v.stock);

            return {
              ...common,
              img,
              stock,
              flavor: flavor || null,
              size: size || null,
            };
          })
          .filter(Boolean) as any[];

        const payload = [baseRow, ...extraRows];

        // ✅ IMPORTANTE: pedimos IDs de lo insertado
        const { data: inserted, error } = await supabase.from("products").insert(payload).select("id,img");
        if (error) throw error;

        const ids = (inserted ?? []).map((r: any) => Number(r.id)).filter((n) => Number.isFinite(n));
        const primaryMap = new Map<number, string | null>();
        (inserted ?? []).forEach((r: any) => primaryMap.set(Number(r.id), (r.img ?? null) as string | null));

        // ✅ guardar galería en product_images (primaria + extras)
        await insertImagesForProducts(ids, primaryMap, extraGalleryUrls);

        setMessage(`Producto creado ✅ (${payload.length} filas)`);
        onCreated?.();

        setProduct({
          category: "",
          name: "",
          brand: "",

          flavor: "",
          size: "",

          basePrice: null,
          discountPercent: null,

          promoType: "none",
          promoActive: false,

          purchasePrice: null,

          vatRate: null,
          recargoRate: null,
          taxCombo: "",

          img: "",
          extraImages: [],
          stock: null,

          bio: false,
          vegan: false,

          glutenFree: false,
          lactoseFree: false,
          supplierName: "",

          expirationDate: null,
          description: "",

          extraVariants: [],
        });

        setShowExtraImages(false);
        return;
      }

      // ✅ MODO PLANTILLA: añadir variaciones (NO crea base duplicado)
      const candidates: { img: string | null; flavor: string | null; size: string | null; stock: number }[] = [];

      const baseFlavor = (product.flavor ?? "").trim();
      const baseSize = (product.size ?? "").trim();
      const baseHas = !!baseFlavor || !!baseSize;

      if (baseHas) {
        candidates.push({
          img: mainImg || null,
          flavor: baseFlavor || null,
          size: baseSize || null,
          stock: product.stock === null ? 0 : Number(product.stock),
        });
      }

      for (const v of product.extraVariants ?? []) {
        const flavor = (v.flavor ?? "").trim();
        const size = (v.size ?? "").trim();
        if (!flavor && !size) continue;

        const img = (v.img ?? "").trim() || mainImg || null; // ✅ principal de esa fila
        const stock = v.stock === null || Number.isNaN(v.stock) ? 0 : Number(v.stock);

        candidates.push({ img, flavor: flavor || null, size: size || null, stock });
      }

      if (candidates.length === 0) {
        throw new Error("En modo variaciones: añade al menos un sabor/tamaño (base o extra).");
      }

      const toInsert = candidates
        .filter((c) => {
          const k = keyVariant(c.flavor, c.size);
          return !existingVariantKeys.has(k);
        })
        .map((c) => ({
          ...common,
          img: c.img,
          stock: c.stock,
          flavor: c.flavor,
          size: c.size,
        }));

      const skipped = candidates.length - toInsert.length;

      if (toInsert.length === 0) {
        throw new Error("Todas esas variaciones ya existen (mismo sabor+tamaño).");
      }

      const { data: inserted, error } = await supabase.from("products").insert(toInsert).select("id,img");
      if (error) throw error;

      const ids = (inserted ?? []).map((r: any) => Number(r.id)).filter((n) => Number.isFinite(n));
      const primaryMap = new Map<number, string | null>();
      (inserted ?? []).forEach((r: any) => primaryMap.set(Number(r.id), (r.img ?? null) as string | null));

      await insertImagesForProducts(ids, primaryMap, extraGalleryUrls);

      setMessage(
        `Variaciones añadidas ✅ (${toInsert.length} filas)${skipped > 0 ? ` · Omitidas por duplicado: ${skipped}` : ""}`
      );
      onCreated?.();

      const newSet = new Set(existingVariantKeys);
      for (const row of toInsert) newSet.add(keyVariant(row.flavor, row.size));
      setExistingVariantKeys(newSet);

      setProduct((prev) => ({
        ...prev,
        flavor: "",
        size: "",
        stock: null,
        extraVariants: [],
      }));
    } catch (err: any) {
      console.error(err);
      setMessage(`Error ❌: ${err?.message ?? "desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const commonLockedHint = isTemplateMode
    ? "Modo variaciones: se autocompleta desde plantilla pero puedes editar lo común. Solo el nombre queda bloqueado."
    : "Modo crear: creas el producto base + tipos extra en una sola vez.";

  return (
    <div className="container mx-auto p-4">
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Crear Producto</h1>
          <div className="text-sm text-gray-600 mt-1">{commonLockedHint}</div>
        </div>

        <div className="min-w-[320px]">
          <div className="text-xs font-semibold text-gray-700 mb-1">Añadir variaciones a producto existente</div>
          <div className="flex gap-2">
            <select
              value={selectedFamilyKey}
              onChange={(e) => setSelectedFamilyKey(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
              disabled={templateLoading}
            >
              <option value="">(Opcional) Elegir plantilla…</option>
              {familyOptions.map((o) => (
                <option key={o.familyKey} value={o.familyKey}>
                  {o.label}
                </option>
              ))}
            </select>

            {isTemplateMode && (
              <button
                type="button"
                onClick={clearTemplateMode}
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
                title="Salir del modo plantilla"
              >
                Quitar
              </button>
            )}
          </div>

          {templateError && <div className="text-xs text-red-700 mt-1">{templateError}</div>}
          {templateLoading && <div className="text-xs text-gray-600 mt-1">Cargando productos…</div>}
        </div>
      </div>

      <form className="grid grid-cols-1 gap-6 pb-10 overflow-visible" onSubmit={handleSubmit}>
        {/* categoría */}
        <div className="p-2">
          <select
            name="category"
            value={product.category}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          >
            <option value="" disabled>
              Categoría
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="p-2">
          <input
            type="text"
            name="name"
            value={product.name}
            onChange={handleChange}
            disabled={isFieldLocked("name")}
            placeholder="Nombre del producto"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6] disabled:opacity-70"
          />
          {isFieldLocked("name") && <div className="text-xs text-gray-500 mt-1">Bloqueado por plantilla</div>}
        </div>

        <div className="p-2">
          <textarea
            name="description"
            value={product.description}
            onChange={handleChange}
            placeholder="Descripción del producto"
            className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-[#f6f6f6]"
            rows={4}
          />
        </div>

        <div className="p-2">
          <input
            type="text"
            name="brand"
            value={product.brand}
            onChange={handleChange}
            placeholder="Marca"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />
        </div>

        <div className="p-2">
          <input
            type="text"
            name="supplierName"
            value={product.supplierName}
            onChange={handleChange}
            placeholder="Nombre del proveedor"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />
        </div>

        <div className="p-2">
          <input
            type="date"
            name="expirationDate"
            value={product.expirationDate ?? ""}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />
        </div>

        {/* sabor + tamaño base */}
        <div className="p-2 rounded-lg border border-gray-200 bg-white">
          <div className="text-sm font-semibold text-gray-800">
            {isTemplateMode ? "Nueva variación (para añadir)" : "Sabor + tamaño base"}
          </div>
          <div className="text-xs text-gray-500 mb-3">
            {isTemplateMode
              ? "Rellena esto si quieres añadir 1 variación rápido (y usa el botón para más)."
              : "Estos campos se guardan en la fila base."}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="flavor"
              value={product.flavor}
              onChange={handleChange}
              placeholder="Sabor — ej: Chocolate"
              className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-[#f6f6f6]"
            />
            <input
              type="text"
              name="size"
              value={product.size}
              onChange={handleChange}
              placeholder="Tamaño — ej: 1kg / 500ml"
              className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-[#f6f6f6]"
            />
          </div>
        </div>

        {/* venta */}
        <div className="p-2 grid grid-cols-3 gap-4">
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            data-is-number="1"
            name="basePrice"
            value={product.basePrice ?? ""}
            onChange={handleChange}
            placeholder="Precio base"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />

          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            data-is-number="1"
            name="discountPercent"
            value={product.discountPercent ?? ""}
            onChange={handleChange}
            placeholder="Descuento %"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />

          <input
            type="text"
            readOnly
            value={finalPrice === null ? "" : `${finalPrice.toFixed(2)}€`}
            placeholder="Precio final"
            className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-100 text-gray-800"
          />
        </div>

        {/* promos */}
        <div className="p-2">
          <div className="text-sm text-gray-700 mb-2">Promoción por unidades</div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPromo(product.promoType === "2x1" && product.promoActive ? "none" : "2x1")}
              className={`px-4 py-2 rounded-full border ${
                product.promoActive && product.promoType === "2x1"
                  ? "bg-[#8c0327] text-white border-[#8c0327]"
                  : "bg-white text-gray-800 border-gray-300"
              }`}
            >
              2x1
            </button>

            <button
              type="button"
              onClick={() => setPromo(product.promoType === "3x2" && product.promoActive ? "none" : "3x2")}
              className={`px-4 py-2 rounded-full border ${
                product.promoActive && product.promoType === "3x2"
                  ? "bg-[#8c0327] text-white border-[#8c0327]"
                  : "bg-white text-gray-800 border-gray-300"
              }`}
            >
              3x2
            </button>

            <button
              type="button"
              onClick={() => setPromo(product.promoType === "second_half" && product.promoActive ? "none" : "second_half")}
              className={`px-4 py-2 rounded-full border ${
                product.promoActive && product.promoType === "second_half"
                  ? "bg-[#8c0327] text-white border-[#8c0327]"
                  : "bg-white text-gray-800 border-gray-300"
              }`}
              title="2ª unidad al 50%"
            >
              2ª al 50%
            </button>

            <button
              type="button"
              onClick={() => setPromo("none")}
              className={`px-4 py-2 rounded-full border ${
                !product.promoActive || product.promoType === "none"
                  ? "bg-gray-100 text-gray-800 border-gray-300"
                  : "bg-white text-gray-800 border-gray-300"
              }`}
            >
              Sin promo
            </button>

            <label className="flex items-center gap-2 ml-2">
              <input type="checkbox" name="promoActive" checked={product.promoActive} onChange={handleChange} />
              <span className="text-sm">Promo activa</span>
            </label>
          </div>

          <div className="mt-1 text-xs text-gray-600">
            Nota: si activas 2x1/3x2/2ª al 50% se desactiva el descuento % para no mezclar promos.
          </div>
        </div>

        {/* compra + combo + margen */}
        <div className="p-2 grid grid-cols-3 gap-4">
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            data-is-number="1"
            name="purchasePrice"
            value={product.purchasePrice ?? ""}
            onChange={handleChange}
            placeholder="Coste (sin IVA)"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />

          <select
            name="taxCombo"
            value={product.taxCombo}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          >
            <option value="">IVA + Recargo…</option>
            {TAX_COMBOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            readOnly
            value={marginPerUnit === null ? "" : `${marginPerUnit.toFixed(2)}€`}
            placeholder="Margen €/ud"
            className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-100 text-gray-800"
          />
        </div>

        {/* stock + margen stock */}
        <div className="p-2 grid grid-cols-2 gap-4">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            data-is-number="1"
            name="stock"
            value={product.stock ?? ""}
            onChange={handleChange}
            placeholder={isTemplateMode ? "Stock (para la nueva variación)" : "Stock (base)"}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
          />

          <input
            type="text"
            readOnly
            value={marginTotalStock === null ? "" : `${marginTotalStock.toFixed(2)}€`}
            placeholder="Margen stock (base)"
            className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-100 text-gray-800"
          />
        </div>

        {/* ✅ IMAGEN PRINCIPAL + botón + desplegable de URLs */}
        <div className="p-2">
          <div className="flex gap-2 items-start">
            <input
              type="text"
              name="img"
              value={product.img}
              onChange={handleChange}
              placeholder={isTemplateMode ? "URL imagen (principal)" : "URL de la imagen (principal)"}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8c0327] focus:ring-[#8c0327] focus:ring-opacity-50 p-2 bg-[#f6f6f6]"
            />

            <button
              type="button"
              onClick={addExtraImage}
              className="shrink-0 px-3 py-2 rounded-md bg-black text-white text-sm hover:bg-gray-900"
              title="Añadir más imágenes"
            >
              + Añadir img
            </button>

            <button
              type="button"
              onClick={() => setShowExtraImages((s) => !s)}
              className="shrink-0 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
              title="Mostrar/ocultar imágenes extra"
            >
              {showExtraImages ? "Ocultar" : "Ver"} ({product.extraImages.length})
            </button>
          </div>

          <div className="mt-1 text-xs text-gray-600">
            La primera URL se guarda como <b>imagen principal</b> (también en <code>products.img</code>). Las demás se
            guardan en <code>product_images</code>.
          </div>

          {showExtraImages && product.extraImages.length > 0 && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <div className="text-sm font-semibold text-gray-800">Imágenes extra</div>
              <div className="text-xs text-gray-500">
                Se guardan como galería (ordenadas). La principal siempre es la 1ª URL.
              </div>

              {product.extraImages.map((u, idx) => (
                <div key={`img-extra-${idx}`} className="flex gap-2">
                  <input
                    value={u}
                    onChange={(e) => updateExtraImage(idx, e.target.value)}
                    placeholder={`URL extra #${idx + 1}`}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#f6f6f6]"
                  />
                  <button
                    type="button"
                    onClick={() => removeExtraImage(idx)}
                    className="px-3 py-2 rounded-md border border-red-200 text-red-700 text-sm hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* tipos extra */}
        <div className="p-2 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {isTemplateMode ? "Más variaciones para añadir" : "Tipos del mismo producto"}
              </div>
              <div className="text-xs text-gray-500">URL + Sabor + Tamaño + Stock</div>
            </div>

            <button type="button" onClick={addVariant} className="px-3 py-2 rounded-md bg-black text-white text-sm hover:bg-gray-900">
              + Añadir
            </button>
          </div>

          {product.extraVariants.length > 0 && (
            <div className="mt-4 space-y-3">
              {product.extraVariants.map((v, idx) => {
                const dup = isTemplateMode && existingVariantKeys.has(keyVariant(v.flavor, v.size));
                return (
                  <div
                    key={`v-${idx}`}
                    className={`rounded-md border p-3 ${dup ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        value={v.img}
                        onChange={(e) => updateVariant(idx, { img: e.target.value })}
                        placeholder="URL imagen (si pones, será la principal de esta variación)"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#f6f6f6]"
                      />
                      <input
                        value={v.flavor}
                        onChange={(e) => updateVariant(idx, { flavor: e.target.value })}
                        placeholder="Sabor"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#f6f6f6]"
                      />
                      <input
                        value={v.size}
                        onChange={(e) => updateVariant(idx, { size: e.target.value })}
                        placeholder="Tamaño"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#f6f6f6]"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v.stock ?? ""}
                        onChange={(e) =>
                          updateVariant(idx, { stock: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        placeholder="Stock"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-[#f6f6f6]"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Imagen usada:{" "}
                        <b>{(v.img || "").trim() ? "la del tipo" : (product.img || "").trim() ? "la principal" : "ninguna (pon una)"}</b>
                        {" · "}
                        Se creará fila si hay <b>sabor</b> o <b>tamaño</b>.
                        {dup && <span className="ml-2 text-amber-800 font-semibold">⚠️ Ya existe esa variación (se omitirá)</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="px-3 py-1.5 rounded-md border border-red-200 text-red-700 text-sm hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* flags */}
        <div className="p-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input type="checkbox" name="bio" checked={product.bio} onChange={handleChange} />
            <span>Bio</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="vegan" checked={product.vegan} onChange={handleChange} />
            <span>Vegan</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="glutenFree" checked={product.glutenFree} onChange={handleChange} />
            <span>Sin gluten</span>
          </label>

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="lactoseFree" checked={product.lactoseFree} onChange={handleChange} />
            <span>Sin lactosa</span>
          </label>
        </div>

        {/* submit */}
        <div className="col-span-full mt-6 p-2 pb-6">
          <button
            type="submit"
            disabled={loading}
            className="block w-full bg-[#8c0327] hover:bg-[#6b0220] text-white font-bold py-3 px-4 rounded-full disabled:opacity-50"
          >
            {loading ? "Guardando..." : isTemplateMode ? "Añadir variaciones" : "Crear Producto"}
          </button>

          {isTemplateMode && (
            <div className="text-xs text-gray-600 mt-2 text-center">
              En este modo no se crea “producto base” nuevo: solo se insertan filas nuevas (variaciones).
            </div>
          )}
        </div>

        {message && <p className="text-center mt-2">{message}</p>}
      </form>
    </div>
  );
}