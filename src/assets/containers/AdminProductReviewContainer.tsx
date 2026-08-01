import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

type ExpirationPrecision = "day" | "month";

type PromoType = "none" | "percent" | "2x1" | "3x2" | "second_half";

type ProductRow = {
  id: number;
  category: string;
  name: string;
  brand: string;

  price: number; // precio final que se vende
  old_price: number | null; // precio base tachado (si descuento %)

  purchase_price: number | null;

  vat_rate: number;
  recargo_rate: number;

  promo_type: PromoType;
  promo_active: boolean;

  img: string | null; // (se sincroniza desde product_images.is_primary con trigger)
  stock: number;

  bio: boolean;
  vegan: boolean;

  gluten_free: boolean;
  lactose_free: boolean;
  supplier_name: string | null;

  description: string | null;
  is_active: boolean;

  expiration_date: string | null;
  expiration_date_precision: ExpirationPrecision;
  expiration_date_manual: boolean;

  flavor: string | null;
  size: string | null;

  isgood: boolean;
  is_discontinued: boolean;
  barcode: string | null;
  firesoft_codigo: string | null;
  firesoft_referencia: string | null;
  firesoft_sync_enabled: boolean;
};

type ProductImageRow = {
  id: number; // >0 en DB, <0 temporal en UI
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
};

type ProductExtraInfo = {
  ingredients: string;
  nutritional_info: string;
  usage_instructions: string;
  warnings: string;
  allergens: string;
  usage_tips: string;
  medical_disclaimer: string;
  legal_regulation: string;
};

const EMPTY_EXTRA_INFO: ProductExtraInfo = {
  ingredients: "",
  nutritional_info: "",
  usage_instructions: "",
  warnings: "",
  allergens: "",
  usage_tips: "",
  medical_disclaimer: "",
  legal_regulation: "",
};

const PAGE_SIZE = 20;
const ADMIN_PRODUCTS_TABLE = "products";

const CATEGORIES = [
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

const TAX_OPTIONS = [
  { key: "0+0", label: "0% + 0%", vat: 0, recargo: 0 },
  { key: "4+0.5", label: "4% + 0.5%", vat: 4, recargo: 0.5 },
  { key: "5+0", label: "5% + 0%", vat: 5, recargo: 0 },
  { key: "10+1.4", label: "10% + 1.4%", vat: 10, recargo: 1.4 },
  { key: "7.5+1", label: "7.5% + 1%", vat: 7.5, recargo: 1 },
  { key: "21+5.2", label: "21% + 5.2%", vat: 21, recargo: 5.2 },
  { key: "2+0.26", label: "2% + 0.26%", vat: 2, recargo: 0.26 },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function getTaxKey(vat: number, recargo: number) {
  const found = TAX_OPTIONS.find((o) => o.vat === vat && o.recargo === recargo);
  return found?.key ?? "custom";
}

function applyTaxFromKey(key: string) {
  const found = TAX_OPTIONS.find((o) => o.key === key);
  if (!found) return { vat_rate: 0, recargo_rate: 0 };
  return { vat_rate: found.vat, recargo_rate: found.recargo };
}

function normalizePromoType(v: any): PromoType {
  const s = String(v ?? "none");
  if (s === "percent" || s === "2x1" || s === "3x2" || s === "second_half" || s === "none") return s;
  return "none";
}

function normalizeExpirationPrecision(v: any): ExpirationPrecision {
  return String(v ?? "day") === "month" ? "month" : "day";
}

function toMonthInputValue(date: string | null) {
  if (!date) return "";
  return String(date).slice(0, 7);
}

function fromMonthInputValue(month: string) {
  const value = String(month ?? "").trim();
  return value ? `${value}-01` : null;
}

function formatExpiration(
  date: string | null,
  precision: ExpirationPrecision = "day"
) {
  if (!date) return "—";

  if (precision === "month") {
    const [year, month] = String(date).slice(0, 7).split("-");
    return year && month ? `${month}/${year}` : String(date);
  }

  return String(date);
}

function normalizeRow(r: any): ProductRow {
  return {
    id: Number(r.id),
    category: r.category ?? "",
    name: r.name ?? "",
    brand: r.brand ?? "",

    price: Number(r.price ?? 0),
    old_price: r.old_price === null || r.old_price === undefined ? null : Number(r.old_price),

    purchase_price: r.purchase_price === null || r.purchase_price === undefined ? null : Number(r.purchase_price),

    vat_rate: Number(r.vat_rate ?? 0),
    recargo_rate: Number(r.recargo_rate ?? 0),

    promo_type: normalizePromoType(r.promo_type),
    promo_active: !!r.promo_active,

    img: r.img ?? null,
    stock: Number(r.stock ?? 0),

    bio: !!r.bio,
    vegan: !!r.vegan,

    gluten_free: !!r.gluten_free,
    lactose_free: !!r.lactose_free,
    supplier_name: r.supplier_name ?? null,

    description: r.description ?? null,
    is_active: r.is_active ?? true,

    expiration_date: r.expiration_date ?? null,
    expiration_date_precision: normalizeExpirationPrecision(r.expiration_date_precision),
    expiration_date_manual: !!r.expiration_date_manual,

    flavor: r.flavor ?? null,
    size: r.size ?? null,

    isgood: !!r.isgood,
    is_discontinued: !!r.is_discontinued,
    barcode: r.barcode ?? null,
    firesoft_codigo: r.firesoft_codigo ?? null,
    firesoft_referencia: r.firesoft_referencia ?? null,
    firesoft_sync_enabled: r.firesoft_sync_enabled ?? true,
  };
}

function normalizeExtraInfo(r: any): ProductExtraInfo {
  return {
    ingredients: r?.ingredients ?? "",
    nutritional_info: r?.nutritional_info ?? "",
    usage_instructions: r?.usage_instructions ?? "",
    warnings: r?.warnings ?? "",
    allergens: r?.allergens ?? "",
    usage_tips: r?.usage_tips ?? "",
    medical_disclaimer: r?.medical_disclaimer ?? "",
    legal_regulation: r?.legal_regulation ?? "",
  };
}

function cleanNullableText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function hasAnyExtraInfo(info: ProductExtraInfo) {
  return Object.values(info).some((v) => String(v ?? "").trim() !== "");
}

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

function calcMarginPerUnit(r: ProductRow) {
  if (r.purchase_price === null) return null;
  const factor = 1 + (Number(r.vat_rate ?? 0) + Number(r.recargo_rate ?? 0)) / 100;
  const costTotal = r.purchase_price * factor;
  return Number(r.price ?? 0) - costTotal;
}

function calcMarginStock(r: ProductRow) {
  const m = calcMarginPerUnit(r);
  if (m === null) return null;
  return m * Number(r.stock ?? 0);
}

function promoLabel(r: ProductRow) {
  if (!r.promo_active || r.promo_type === "none") {
    if (r.old_price !== null && r.old_price > r.price) {
      const pct = Math.round(((r.old_price - r.price) / r.old_price) * 100);
      return pct > 0 ? `-${pct}%` : "—";
    }
    return "—";
  }

  if (r.promo_type === "2x1") return "2x1";
  if (r.promo_type === "3x2") return "3x2";
  if (r.promo_type === "second_half") return "2ª al 50%";

  if (r.promo_type === "percent") {
    if (r.old_price !== null && r.old_price > r.price) {
      const pct = Math.round(((r.old_price - r.price) / r.old_price) * 100);
      return pct > 0 ? `-${pct}%` : "Descuento";
    }
    return "Descuento";
  }

  return "—";
}

function isValidUrlLike(s: string) {
  const v = (s ?? "").trim();
  if (!v) return false;

  if (v.startsWith("/")) return true;

  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeImagesEnsurePrimary(list: ProductImageRow[]) {
  const cleaned = list.map((x, idx) => ({
    ...x,
    url: (x.url ?? "").trim(),
    alt: x.alt === null ? null : String(x.alt),
    sort_order: Number.isFinite(Number(x.sort_order)) ? Number(x.sort_order) : idx,
    is_primary: !!x.is_primary,
  }));

  let found = false;
  const fixed = cleaned.map((x) => {
    if (x.is_primary) {
      if (found) return { ...x, is_primary: false };
      found = true;
      return x;
    }
    return x;
  });

  if (!fixed.some((x) => x.is_primary) && fixed.length > 0) {
    const idx = fixed.findIndex((x) => isValidUrlLike(x.url));
    const pick = idx >= 0 ? idx : 0;
    fixed[pick] = { ...fixed[pick], is_primary: true };
  }

  fixed.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

  return fixed;
}

export default function AdminProductReviewContainer() {
  const [search, setSearch] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [showActive, setShowActive] = useState(false);
  const [showInactive, setShowInactive] = useState(true);

  const debouncedSearch = useDebounced(search, 350);
  const debouncedBarcodeSearch = useDebounced(barcodeSearch, 350);

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [editTaxKey, setEditTaxKey] = useState<string>("0+0");
  const [editDiscountPercent, setEditDiscountPercent] = useState<number | null>(null);

  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesSaving, setImagesSaving] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const initialImageIdsRef = useRef<number[]>([]);
  const tempImageIdRef = useRef(-1);

  const [extraInfo, setExtraInfo] = useState<ProductExtraInfo>(EMPTY_EXTRA_INFO);
  const [extraInfoLoading, setExtraInfoLoading] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);

    try {
      let q = supabase.from(ADMIN_PRODUCTS_TABLE).select(
        "id, category, name, brand, price, old_price, purchase_price, vat_rate, recargo_rate, promo_type, promo_active, img, stock, bio, vegan, gluten_free, lactose_free, supplier_name, description, is_active, expiration_date, expiration_date_precision, expiration_date_manual, flavor, size, isgood, is_discontinued, barcode, firesoft_codigo, firesoft_referencia, firesoft_sync_enabled",
        { count: "exact" }
      );

      q = q
        .eq("isgood", false)
        .eq("is_discontinued", false);

      if (showActive && !showInactive) q = q.eq("is_active", true);
      if (!showActive && showInactive) q = q.eq("is_active", false);

      if (!showActive && !showInactive) {
        setRows([]);
        setTotal(0);
        setLoadingList(false);
        return;
      }

      const searchTerm = debouncedSearch.trim();
      const barcodeTerm = debouncedBarcodeSearch.trim();

      if (searchTerm) q = q.ilike("name", `%${searchTerm}%`);
      if (barcodeTerm) q = q.ilike("barcode", `%${barcodeTerm}%`);

      if (category) q = q.eq("category", category);
      if (brand) q = q.eq("brand", brand);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let { data, error, count } = await q.order("id", { ascending: false }).range(from, to);

      if (error && String(error.message || "").toLowerCase().includes("recargo_rate")) {
        let q2 = supabase.from(ADMIN_PRODUCTS_TABLE).select(
          "id, category, name, brand, price, old_price, purchase_price, vat_rate, promo_type, promo_active, img, stock, bio, vegan, gluten_free, lactose_free, supplier_name, description, is_active, expiration_date, expiration_date_precision, expiration_date_manual, flavor, size, isgood, is_discontinued, barcode, firesoft_codigo, firesoft_referencia, firesoft_sync_enabled",
          { count: "exact" }
        );

        q2 = q2
          .eq("isgood", false)
          .eq("is_discontinued", false);

        if (showActive && !showInactive) q2 = q2.eq("is_active", true);
        if (!showActive && showInactive) q2 = q2.eq("is_active", false);

        const searchTermFallback = debouncedSearch.trim();
        const barcodeTermFallback = debouncedBarcodeSearch.trim();

        if (searchTermFallback) q2 = q2.ilike("name", `%${searchTermFallback}%`);
        if (barcodeTermFallback) q2 = q2.ilike("barcode", `%${barcodeTermFallback}%`);

        if (category) q2 = q2.eq("category", category);
        if (brand) q2 = q2.eq("brand", brand);

        const res2 = await q2.order("id", { ascending: false }).range(from, to);
        data = res2.data as any;
        count = res2.count as any;
        error = res2.error as any;

        if (!error && data) data = (data ?? []).map((x: any) => ({ ...x, recargo_rate: 0 }));
      }

      if (error) throw error;

      setRows((data ?? []).map(normalizeRow));
      setTotal(count ?? 0);
    } catch (e: any) {
      console.error(e);
      setListError(e?.message ?? "Error cargando productos");
      setRows([]);
      setTotal(0);
    } finally {
      setLoadingList(false);
    }
  }, [showActive, showInactive, debouncedSearch, debouncedBarcodeSearch, category, brand, page]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await refreshList();
    })();

    return () => {
      alive = false;
    };
  }, [refreshList]);

  const brands = useMemo(() => {
    const set = new Set(rows.map((r) => r.brand).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [rows]);

  const loadImagesForProduct = useCallback(async (productId: number) => {
    setImagesLoading(true);
    setImagesError(null);

    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, url, alt, sort_order, is_primary")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;

      const list: ProductImageRow[] = (data ?? []).map((x: any) => ({
        id: Number(x.id),
        url: String(x.url ?? ""),
        alt: x.alt ?? null,
        sort_order: Number(x.sort_order ?? 0),
        is_primary: !!x.is_primary,
      }));

      initialImageIdsRef.current = list.map((x) => x.id);
      setImages(normalizeImagesEnsurePrimary(list));
    } catch (e: any) {
      console.error(e);
      setImages([]);
      initialImageIdsRef.current = [];
      setImagesError(e?.message ?? "Error cargando imágenes");
    } finally {
      setImagesLoading(false);
    }
  }, []);

  const loadExtraInfoForProduct = useCallback(async (productId: number) => {
    setExtraInfoLoading(true);

    try {
      const { data, error } = await supabase
        .from("product_extra_info")
        .select(
          "ingredients, nutritional_info, usage_instructions, warnings, allergens, usage_tips, medical_disclaimer, legal_regulation"
        )
        .eq("product_id", productId)
        .maybeSingle();

      if (error) throw error;

      setExtraInfo(normalizeExtraInfo(data));
    } catch (e) {
      console.error(e);
      setExtraInfo(EMPTY_EXTRA_INFO);
    } finally {
      setExtraInfoLoading(false);
    }
  }, []);

  const openEdit = useCallback(
    async (r: ProductRow) => {
      setSaveMsg(null);
      setEditing({ ...r });
      setEditTaxKey(getTaxKey(Number(r.vat_rate ?? 0), Number(r.recargo_rate ?? 0)));

      if (r.old_price !== null && r.old_price > r.price && r.old_price > 0) {
        const pct = ((r.old_price - r.price) / r.old_price) * 100;
        setEditDiscountPercent(clamp(Math.round(pct * 100) / 100, 0, 100));
      } else {
        setEditDiscountPercent(null);
      }

      setImages([]);
      setImagesError(null);
      initialImageIdsRef.current = [];
      tempImageIdRef.current = -1;
      setExtraInfo(EMPTY_EXTRA_INFO);

      await Promise.all([loadImagesForProduct(r.id), loadExtraInfoForProduct(r.id)]);
    },
    [loadImagesForProduct, loadExtraInfoForProduct]
  );

  const closeEdit = () => {
    setEditing(null);
    setSaveMsg(null);
    setEditDiscountPercent(null);

    setImages([]);
    setImagesError(null);
    initialImageIdsRef.current = [];
    tempImageIdRef.current = -1;

    setExtraInfo(EMPTY_EXTRA_INFO);
  };

  const onEditChange = (patch: Partial<ProductRow>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const onExtraInfoChange = (patch: Partial<ProductExtraInfo>) => {
    setExtraInfo((prev) => ({ ...prev, ...patch }));
  };

  const setEditPromo = (promo: PromoType) => {
    setEditing((prev) => {
      if (!prev) return prev;

      if (promo === "2x1" || promo === "3x2" || promo === "second_half") {
        setEditDiscountPercent(null);
        return { ...prev, promo_type: promo, promo_active: true, old_price: null };
      }

      if (promo === "percent") {
        return { ...prev, promo_type: "percent", promo_active: true };
      }

      return { ...prev, promo_type: "none", promo_active: false };
    });
  };

  const editDiscountPct = useMemo(() => {
    const raw = editDiscountPercent ?? 0;
    if (Number.isNaN(raw)) return 0;
    return clamp(raw, 0, 100);
  }, [editDiscountPercent]);

  const editFinalPrice = useMemo(() => {
    if (!editing) return null;
    const base = editing.old_price !== null ? Number(editing.old_price) : Number(editing.price ?? 0);
    if (!base || base <= 0) return round2(Number(editing.price ?? 0));
    return round2(base * (1 - editDiscountPct / 100));
  }, [editing, editDiscountPct]);

  const applyPercentToEditing = (pct: number | null) => {
    if (!editing) return;

    const safePct = pct === null ? null : clamp(pct, 0, 100);
    const base = editing.old_price !== null ? Number(editing.old_price) : Number(editing.price ?? 0);

    if (safePct === null || safePct <= 0) {
      setEditDiscountPercent(null);
      onEditChange({
        promo_active: false,
        promo_type: "none",
        old_price: null,
        price: Number(editing.price ?? 0),
      });
      return;
    }

    onEditChange({
      promo_active: true,
      promo_type: "percent",
      old_price: base,
      price: round2(base * (1 - safePct / 100)),
    });
  };

  const setPrimaryImage = (id: number) => {
    setImages((prev) => {
      const next = normalizeImagesEnsurePrimary(
        prev.map((x) => ({
          ...x,
          is_primary: x.id === id,
        }))
      );

      const primary = next.find((x) => x.is_primary);
      if (primary?.url && editing) {
        setEditing((p) => (p ? { ...p, img: primary.url.trim() } : p));
      }

      return next;
    });
  };

  const patchImage = (id: number, patch: Partial<ProductImageRow>) => {
    setImages((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
      const fixed = normalizeImagesEnsurePrimary(next);

      const primary = fixed.find((x) => x.is_primary);
      if (primary?.url && editing) {
        setEditing((p) => (p ? { ...p, img: primary.url.trim() } : p));
      }

      return fixed;
    });
  };

  const addImageRow = () => {
    const tempId = tempImageIdRef.current--;

    setImages((prev) => {
      const maxSort = prev.length ? Math.max(...prev.map((x) => Number(x.sort_order ?? 0))) : -1;

      const next = [
        ...prev,
        {
          id: tempId,
          url: "",
          alt: null,
          sort_order: maxSort + 1,
          is_primary: prev.length === 0,
        },
      ];

      return normalizeImagesEnsurePrimary(next);
    });
  };

  const removeImageRow = (id: number) => {
    setImages((prev) => {
      const next = prev.filter((x) => x.id !== id);
      const fixed = normalizeImagesEnsurePrimary(next);

      const primary = fixed.find((x) => x.is_primary);
      if (primary?.url && editing) setEditing((p) => (p ? { ...p, img: primary.url.trim() } : p));
      if (!primary && editing) setEditing((p) => (p ? { ...p, img: null } : p));

      return fixed;
    });
  };

  const saveProductImages = useCallback(
    async (productId: number) => {
      setImagesSaving(true);
      setImagesError(null);

      try {
        const filtered = normalizeImagesEnsurePrimary(images).filter((x) => x.url.trim() !== "");
        const ensured = normalizeImagesEnsurePrimary(filtered);

        const initialIds = initialImageIdsRef.current ?? [];
        const currentDbIds = ensured.filter((x) => x.id > 0).map((x) => x.id);

        const toDelete = initialIds.filter((id) => !currentDbIds.includes(id));

        if (toDelete.length > 0) {
          const { error: delErr } = await supabase.from("product_images").delete().in("id", toDelete);
          if (delErr) throw delErr;
        }

        const updates = ensured.filter((x) => x.id > 0);

        for (const img of updates) {
          const { error: upErr } = await supabase
            .from("product_images")
            .update({
              url: img.url.trim(),
              alt: img.alt && String(img.alt).trim() !== "" ? String(img.alt).trim() : null,
              sort_order: Number(img.sort_order ?? 0),
              is_primary: !!img.is_primary,
            })
            .eq("id", img.id);

          if (upErr) throw upErr;
        }

        const inserts = ensured.filter((x) => x.id < 0);

        if (inserts.length > 0) {
          const payload = inserts.map((img) => ({
            product_id: productId,
            url: img.url.trim(),
            alt: img.alt && String(img.alt).trim() !== "" ? String(img.alt).trim() : null,
            sort_order: Number(img.sort_order ?? 0),
            is_primary: !!img.is_primary,
          }));

          const { data: insData, error: insErr } = await supabase
            .from("product_images")
            .insert(payload)
            .select("id, url, alt, sort_order, is_primary");

          if (insErr) throw insErr;

          const reloaded: ProductImageRow[] = (insData ?? []).map((x: any) => ({
            id: Number(x.id),
            url: String(x.url ?? ""),
            alt: x.alt ?? null,
            sort_order: Number(x.sort_order ?? 0),
            is_primary: !!x.is_primary,
          }));

          void reloaded;
          await new Promise((r) => setTimeout(r, 0));
        }

        const { data, error } = await supabase
          .from("product_images")
          .select("id, url, alt, sort_order, is_primary")
          .eq("product_id", productId)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });

        if (error) throw error;

        const list: ProductImageRow[] = (data ?? []).map((x: any) => ({
          id: Number(x.id),
          url: String(x.url ?? ""),
          alt: x.alt ?? null,
          sort_order: Number(x.sort_order ?? 0),
          is_primary: !!x.is_primary,
        }));

        initialImageIdsRef.current = list.map((x) => x.id);
        const fixed = normalizeImagesEnsurePrimary(list);
        setImages(fixed);

        const primary = fixed.find((x) => x.is_primary);
        if (primary?.url) setEditing((p) => (p ? { ...p, img: primary.url.trim() } : p));
        else setEditing((p) => (p ? { ...p, img: null } : p));
      } catch (e: any) {
        console.error(e);
        setImagesError(e?.message ?? "Error guardando imágenes");
        throw e;
      } finally {
        setImagesSaving(false);
      }
    },
    [images]
  );

  const saveProductExtraInfo = useCallback(async (productId: number) => {
    const payload = {
      product_id: productId,
      ingredients: cleanNullableText(extraInfo.ingredients),
      nutritional_info: cleanNullableText(extraInfo.nutritional_info),
      usage_instructions: cleanNullableText(extraInfo.usage_instructions),
      warnings: cleanNullableText(extraInfo.warnings),
      allergens: cleanNullableText(extraInfo.allergens),
      usage_tips: cleanNullableText(extraInfo.usage_tips),
      medical_disclaimer: cleanNullableText(extraInfo.medical_disclaimer),
      legal_regulation: cleanNullableText(extraInfo.legal_regulation),
    };

    if (!hasAnyExtraInfo(extraInfo)) {
      const { error } = await supabase.from("product_extra_info").delete().eq("product_id", productId);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("product_extra_info").upsert(payload, {
      onConflict: "product_id",
    });

    if (error) throw error;
  }, [extraInfo]);

  const saveEdit = async () => {
    if (!editing) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const tax =
        editTaxKey === "custom"
          ? { vat_rate: Number(editing.vat_rate ?? 0), recargo_rate: Number(editing.recargo_rate ?? 0) }
          : applyTaxFromKey(editTaxKey);

      const isUnitPromo =
        !!editing.promo_active &&
        (editing.promo_type === "2x1" || editing.promo_type === "3x2" || editing.promo_type === "second_half");

      const payload: any = {
        category: editing.category.trim(),
        name: editing.name.trim(),
        brand: editing.brand.trim(),
        price: Number(editing.price),

        old_price: isUnitPromo
          ? null
          : editing.old_price === null || (editing.old_price as any) === ""
          ? null
          : Number(editing.old_price),

        purchase_price:
          editing.purchase_price === null || (editing.purchase_price as any) === ""
            ? null
            : Number(editing.purchase_price),

        vat_rate: Number(tax.vat_rate ?? 0),
        recargo_rate: Number(tax.recargo_rate ?? 0),

        img: editing.img && editing.img.trim() !== "" ? editing.img.trim() : null,

        bio: !!editing.bio,
        vegan: !!editing.vegan,

        gluten_free: !!editing.gluten_free,
        lactose_free: !!editing.lactose_free,
        supplier_name: editing.supplier_name?.trim() || null,

        description: editing.description?.trim() || null,

        expiration_date: editing.expiration_date && editing.expiration_date.trim() !== "" ? editing.expiration_date : null,
        expiration_date_precision: editing.expiration_date_precision ?? "day",
        expiration_date_manual: true,

        promo_type: editing.promo_active ? editing.promo_type : "none",
        promo_active: !!editing.promo_active && editing.promo_type !== "none",

        flavor: editing.flavor?.trim() || null,
        size: editing.size?.trim() || null,

        isgood: true,
        is_active: true,
      };

      const { error } = await supabase.from(ADMIN_PRODUCTS_TABLE).update(payload).eq("id", editing.id);
      if (error) throw error;

      await saveProductImages(editing.id);
      await saveProductExtraInfo(editing.id);

      const primaryNow = images.find((x) => x.is_primary)?.url?.trim() || payload.img || null;

      const nextLocal: ProductRow = {
        ...editing,
        ...tax,
        promo_type: payload.promo_type,
        promo_active: payload.promo_active,
        old_price: payload.old_price,
        price: payload.price,
        flavor: payload.flavor,
        size: payload.size,
        img: primaryNow,
        isgood: true,
        is_active: true,
      };

      void nextLocal;
      setSaveMsg("Guardado y marcado como revisado ✅");
      setRows((prev) => prev.filter((r) => r.id !== editing.id));
      setTotal((t) => Math.max(0, t - 1));
      closeEdit();
    } catch (e: any) {
      console.error(e);
      setSaveMsg(`Error guardando ❌: ${e?.message ?? "desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  const markAsReviewed = async (r: ProductRow) => {
    if (r.is_discontinued) {
      alert("Este producto está descatalogado en Firesoft.");
      return;
    }

    const ok = confirm(
      `¿Marcar "${r.name}" como revisado y publicarlo directamente?`
    );
    if (!ok) return;

    setDeletingId(r.id);

    try {
      const { error } = await supabase
        .from(ADMIN_PRODUCTS_TABLE)
        .update({
          isgood: true,
          is_active: true,
        })
        .eq("id", r.id);

      if (error) throw error;

      setRows((prev) => prev.filter((x) => x.id !== r.id));
      setTotal((t) => Math.max(0, t - 1));

      if (editing?.id === r.id) closeEdit();
    } catch (e: any) {
      alert(`Error marcando como revisado: ${e?.message ?? "desconocido"}`);
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setBarcodeSearch("");
    setCategory("");
    setBrand("");
    setShowActive(false);
    setShowInactive(true);
    setPage(1);
  };

  const primaryPreviewUrl = useMemo(() => {
    const p = images.find((x) => x.is_primary);
    const url = (p?.url ?? editing?.img ?? "").trim();
    return url || "https://placehold.co/96x96?text=IMG";
  }, [images, editing?.img]);

  return (
    <section className="w-full">
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revisión de productos pendientes</h2>
          <p className="text-sm text-gray-600">Edita productos pendientes. Al guardar se marcan como revisados y quedan activos en la tienda.</p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Buscar por nombre…"
            className="w-full md:w-72 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />

          <input
            value={barcodeSearch}
            onChange={(e) => {
              setPage(1);
              setBarcodeSearch(e.target.value);
            }}
            placeholder="Buscar por código de barras…"
            className="w-full md:w-60 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />

          <select
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            className="w-full md:w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                Categoría: {c}
              </option>
            ))}
          </select>

          <select
            value={brand}
            onChange={(e) => {
              setPage(1);
              setBrand(e.target.value);
            }}
            className="w-full md:w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {brands.map((b) => (
              <option key={b || "all"} value={b}>
                {b ? `Marca: ${b}` : "Todas las marcas"}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-4 px-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showActive}
                onChange={(e) => {
                  setPage(1);
                  setShowActive(e.target.checked);
                }}
              />
              Activos
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setPage(1);
                  setShowInactive(e.target.checked);
                }}
              />
              Inactivos
            </label>
          </div>

          <button onClick={resetFilters} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Limpiar
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loadingList ? (
          <div className="p-6 text-gray-600">Cargando productos…</div>
        ) : listError ? (
          <div className="p-6 text-red-700">
            <p className="font-semibold">Error cargando productos</p>
            <p className="text-sm mt-1">{listError}</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <p className="text-sm text-gray-600">
                Total: <span className="font-semibold">{total}</span>
              </p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-md border border-gray-300 text-sm disabled:opacity-50"
                  >
                    ◀
                  </button>

                  <span className="text-sm text-gray-700">
                    Página <b>{page}</b> / {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-md border border-gray-300 text-sm disabled:opacity-50"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-[1250px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-left px-4 py-3">Variación</th>
                    <th className="text-left px-4 py-3">Categoría</th>
                    <th className="text-left px-4 py-3">Marca</th>
                    <th className="text-left px-4 py-3">PVP</th>
                    <th className="text-left px-4 py-3">Promo</th>
                    <th className="text-left px-4 py-3">Coste</th>
                    <th className="text-left px-4 py-3">IVA+RE</th>
                    <th className="text-left px-4 py-3">Stock</th>
                    <th className="text-left px-4 py-3">Margen (stock)</th>
                    <th className="text-left px-4 py-3">Caducidad</th>
                    <th className="text-left px-4 py-3">Proveedor</th>
                    <th className="text-right px-4 py-3">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {rows.map((r) => {
                    const marginStock = calcMarginStock(r);
                    const promoTxt = promoLabel(r);

                    const attrsStr =
                      r.flavor || r.size
                        ? `${r.flavor ?? ""}${r.flavor && r.size ? " · " : ""}${r.size ?? ""}`
                        : "—";

                    return (
                      <tr key={r.id} className={`hover:bg-gray-50 ${!r.is_active ? "opacity-70" : ""}`}>
                        <td className="px-4 py-3 text-gray-600">{r.id}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={r.img && r.img.trim() !== "" ? r.img : "https://placehold.co/64x64?text=IMG"}
                              alt={r.name}
                              className="h-10 w-10 rounded-md object-cover border"
                            />
                            <div>
                              <div className="font-semibold text-gray-900">{r.name}</div>
                              {r.barcode && <div className="text-xs text-gray-500">Código: {r.barcode}</div>}
                              {r.old_price !== null && (
                                <div className="text-xs text-gray-500">
                                  Antes: <del>{Number(r.old_price).toFixed(2)}€</del>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-700">{attrsStr}</td>

                        <td className="px-4 py-3">{r.category}</td>
                        <td className="px-4 py-3">{r.brand}</td>

                        <td className="px-4 py-3">{Number(r.price).toFixed(2)}€</td>

                        <td className="px-4 py-3">
                          {promoTxt === "—" ? (
                            "—"
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">{promoTxt}</span>
                          )}
                        </td>

                        <td className="px-4 py-3">{r.purchase_price !== null ? `${Number(r.purchase_price).toFixed(2)}€` : "—"}</td>

                        <td className="px-4 py-3">
                          {Number(r.vat_rate ?? 0)}% + {Number(r.recargo_rate ?? 0)}%
                        </td>

                        <td className="px-4 py-3">{r.stock}</td>

                        <td className="px-4 py-3">{marginStock === null ? "—" : `${marginStock.toFixed(2)}€`}</td>

                        <td className="px-4 py-3">{formatExpiration(r.expiration_date, r.expiration_date_precision)}</td>

                        <td className="px-4 py-3">{r.supplier_name?.trim() ? r.supplier_name : "—"}</td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                         

                          <button
                            onClick={() => markAsReviewed(r)}
                            disabled={deletingId === r.id || r.is_discontinued}
                            className="ml-2 px-3 py-1 rounded-md border border-blue-300 text-blue-800 text-sm hover:bg-blue-50 disabled:opacity-50"
                          >
                            {deletingId === r.id ? "Actualizando…" : "Marcar revisado"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-10 text-center text-gray-600">
                        No hay resultados con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img src={primaryPreviewUrl} alt={editing.name} className="h-12 w-12 rounded-md object-cover border" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Editar producto #{editing.id}</h3>
                  <p className="text-xs text-gray-500">Al guardar se marca como revisado y activo</p>
                </div>
              </div>

              <button onClick={closeEdit} className="text-gray-600 hover:text-gray-900">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-800 mb-3">Datos básicos</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm">
                    <span className="text-gray-700">Nombre</span>
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editing.name}
                      onChange={(e) => onEditChange({ name: e.target.value })}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="text-gray-700">Marca</span>
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editing.brand}
                      onChange={(e) => onEditChange({ brand: e.target.value })}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="text-gray-700">Proveedor</span>
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editing.supplier_name ?? ""}
                      onChange={(e) => onEditChange({ supplier_name: e.target.value })}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="text-gray-700">Categoría</span>
                    <select
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                      value={editing.category ?? ""}
                      onChange={(e) => onEditChange({ category: e.target.value })}
                    >
                      <option value="">Selecciona categoría…</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="text-gray-700">Caducidad</span>

                    <div className="mt-1 grid grid-cols-[130px_1fr] gap-2">
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                        value={editing.expiration_date_precision ?? "day"}
                        onChange={(e) => {
                          const precision = normalizeExpirationPrecision(e.target.value);

                          onEditChange({
                            expiration_date_precision: precision,
                            expiration_date:
                              precision === "month"
                                ? fromMonthInputValue(
                                    toMonthInputValue(editing.expiration_date)
                                  )
                                : editing.expiration_date,
                            expiration_date_manual: true,
                          });
                        }}
                      >
                        <option value="day">Día/mes/año</option>
                        <option value="month">Mes/año</option>
                      </select>

                      {editing.expiration_date_precision === "month" ? (
                        <input
                          type="month"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={toMonthInputValue(editing.expiration_date)}
                          onChange={(e) =>
                            onEditChange({
                              expiration_date: fromMonthInputValue(e.target.value),
                              expiration_date_precision: "month",
                              expiration_date_manual: true,
                            })
                          }
                        />
                      ) : (
                        <input
                          type="date"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={editing.expiration_date ?? ""}
                          onChange={(e) =>
                            onEditChange({
                              expiration_date: e.target.value || null,
                              expiration_date_precision: "day",
                              expiration_date_manual: true,
                            })
                          }
                        />
                      )}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      Al guardarla manualmente, la API no la sobrescribirá.
                    </div>
                  </label>

                  <label className="text-sm">
                    <span className="text-gray-700">Stock</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
                      value={editing.stock ?? 0}
                      readOnly
                      disabled
                      title="El stock viene de Firesoft"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      Solo lectura: se sincroniza desde Firesoft.
                    </div>
                  </label>
                </div>

                <div className="mt-5 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-800 mb-3">Variación</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm">
                      <span className="text-gray-700">Sabor</span>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={editing.flavor ?? ""}
                        onChange={(e) => onEditChange({ flavor: e.target.value || null })}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="text-gray-700">Tamaño</span>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={editing.size ?? ""}
                        onChange={(e) => onEditChange({ size: e.target.value || null })}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Imágenes (URLs)</div>
                    <div className="text-xs text-gray-500">Se guardan en <b>product_images</b>. Marca una como principal.</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addImageRow}
                      className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
                    >
                      + Añadir URL
                    </button>

                    <button
                      type="button"
                      onClick={() => loadImagesForProduct(editing.id)}
                      disabled={imagesLoading}
                      className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {imagesLoading ? "Recargando…" : "Recargar"}
                    </button>
                  </div>
                </div>

                {imagesError && (
                  <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {imagesError}
                  </div>
                )}

                {imagesLoading ? (
                  <div className="text-sm text-gray-600">Cargando imágenes…</div>
                ) : (
                  <>
                    <div className="overflow-auto">
                      <table className="min-w-[900px] w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="text-left px-3 py-2">Principal</th>
                            <th className="text-left px-3 py-2">Preview</th>
                            <th className="text-left px-3 py-2">URL</th>
                            <th className="text-left px-3 py-2">ALT</th>
                            <th className="text-left px-3 py-2">Orden</th>
                            <th className="text-right px-3 py-2">Acción</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {images.map((img) => {
                            const ok = img.url.trim() === "" ? true : isValidUrlLike(img.url);

                            return (
                              <tr key={img.id} className={!ok ? "bg-red-50" : ""}>
                                <td className="px-3 py-2">
                                  <input
                                    type="radio"
                                    name="primary_image"
                                    checked={img.is_primary}
                                    onChange={() => setPrimaryImage(img.id)}
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <img
                                    src={img.url.trim() ? img.url.trim() : "https://placehold.co/64x64?text=IMG"}
                                    alt={img.alt ?? ""}
                                    className="h-10 w-10 rounded-md object-cover border"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    className={`w-full rounded-md border px-3 py-2 ${ok ? "border-gray-300" : "border-red-300"}`}
                                    value={img.url}
                                    placeholder="https://..."
                                    onChange={(e) => patchImage(img.id, { url: e.target.value })}
                                  />
                                  {!ok && img.url.trim() !== "" && (
                                    <div className="text-xs text-red-700 mt-1">URL no válida (usa http/https o /ruta)</div>
                                  )}
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={img.alt ?? ""}
                                    placeholder="Texto alternativo (opcional)"
                                    onChange={(e) => patchImage(img.id, { alt: e.target.value === "" ? null : e.target.value })}
                                  />
                                </td>

                                <td className="px-3 py-2 w-[110px]">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={img.sort_order}
                                    onChange={(e) => patchImage(img.id, { sort_order: Number(e.target.value) })}
                                  />
                                </td>

                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => removeImageRow(img.id)}
                                    className="px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {images.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-6 text-center text-gray-600">
                                No hay imágenes. Pulsa <b>“+ Añadir URL”</b>.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-xs text-gray-600">
                      Tip: el campo <b>products.img</b> se sincroniza desde la imagen marcada como <b>principal</b> (trigger).
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-800 mb-3">Precio (descuento %)</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="text-sm">
                    <div className="text-gray-600 text-xs mb-1">Precio base (tachado)</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editing.old_price ?? ""}
                      placeholder="Base"
                      disabled={editing.promo_active && (editing.promo_type === "2x1" || editing.promo_type === "3x2" || editing.promo_type === "second_half")}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        onEditChange({ old_price: v });

                        if (v !== null && editDiscountPercent && editDiscountPercent > 0) {
                          onEditChange({ price: round2(v * (1 - clamp(editDiscountPercent, 0, 100) / 100)) });
                        }
                      }}
                    />
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-600 text-xs mb-1">Descuento %</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editDiscountPercent ?? ""}
                      placeholder="%"
                      disabled={editing.promo_active && (editing.promo_type === "2x1" || editing.promo_type === "3x2" || editing.promo_type === "second_half")}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setEditDiscountPercent(v);
                        applyPercentToEditing(v);
                      }}
                    />
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-600 text-xs mb-1">Precio final (auto)</div>
                    <input
                      type="text"
                      readOnly
                      className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 text-gray-800"
                      value={editFinalPrice === null ? "" : `${editFinalPrice.toFixed(2)}€`}
                    />
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  Se guardará: <b>price</b> = precio final · <b>old_price</b> = base (solo si hay descuento %) · <b>promo_type</b> = percent
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-800 mb-3">Promoción por unidades</div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPromo(editing.promo_active && editing.promo_type === "2x1" ? "none" : "2x1")}
                    className={`px-4 py-2 rounded-full border ${
                      editing.promo_active && editing.promo_type === "2x1" ? "bg-[#8c0327] text-white border-[#8c0327]" : "bg-white text-gray-800 border-gray-300"
                    }`}
                  >
                    2x1
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPromo(editing.promo_active && editing.promo_type === "3x2" ? "none" : "3x2")}
                    className={`px-4 py-2 rounded-full border ${
                      editing.promo_active && editing.promo_type === "3x2" ? "bg-[#8c0327] text-white border-[#8c0327]" : "bg-white text-gray-800 border-gray-300"
                    }`}
                  >
                    3x2
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPromo(editing.promo_active && editing.promo_type === "second_half" ? "none" : "second_half")}
                    className={`px-4 py-2 rounded-full border ${
                      editing.promo_active && editing.promo_type === "second_half" ? "bg-[#8c0327] text-white border-[#8c0327]" : "bg-white text-gray-800 border-gray-300"
                    }`}
                    title="2ª unidad al 50%"
                  >
                    2ª al 50%
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPromo("none")}
                    className={`px-4 py-2 rounded-full border ${
                      !editing.promo_active || editing.promo_type === "none" ? "bg-gray-100 text-gray-800 border-gray-300" : "bg-white text-gray-800 border-gray-300"
                    }`}
                  >
                    Sin promo
                  </button>

                  <label className="flex items-center gap-2 ml-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editing.promo_active}
                      onChange={(e) => onEditChange({ promo_active: e.target.checked, promo_type: e.target.checked ? editing.promo_type : "none" })}
                    />
                    Promo activa
                  </label>
                </div>

                <div className="mt-2 text-xs text-gray-600">Nota: si activas 2x1/3x2/2ª mitad, se desactiva el descuento % (y old_price se pone a null).</div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-800 mb-3">Coste e impuestos</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm">
                    <span className="text-gray-700">Precio coste (sin IVA)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editing.purchase_price ?? ""}
                      onChange={(e) => onEditChange({ purchase_price: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="text-gray-700">IVA + Recargo</span>
                    <select
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                      value={editTaxKey}
                      onChange={(e) => {
                        const key = e.target.value;
                        setEditTaxKey(key);

                        if (key !== "custom") {
                          const tax = applyTaxFromKey(key);
                          onEditChange({ vat_rate: tax.vat_rate, recargo_rate: tax.recargo_rate });
                        }
                      }}
                    >
                      {TAX_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                      <option value="custom">Personalizado</option>
                    </select>

                    {editTaxKey === "custom" ? (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={editing.vat_rate ?? 0}
                          onChange={(e) => onEditChange({ vat_rate: Number(e.target.value) })}
                          placeholder="IVA %"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={editing.recargo_rate ?? 0}
                          onChange={(e) => onEditChange({ recargo_rate: Number(e.target.value) })}
                          placeholder="Recargo %"
                        />
                      </div>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-800 mb-3">Contenido</div>

                <label className="text-sm block">
                  <span className="text-gray-700">Imagen principal (products.img)</span>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                    value={editing.img ?? ""}
                    readOnly
                    placeholder="Se rellena desde product_images (principal)"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Para cambiarla, marca otra URL como <b>principal</b> arriba.
                  </div>
                </label>

                <label className="text-sm block mt-4">
                  <span className="text-gray-700">Descripción</span>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    value={editing.description ?? ""}
                    onChange={(e) => onEditChange({ description: e.target.value })}
                    rows={4}
                    placeholder="Descripción del producto…"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.bio} onChange={(e) => onEditChange({ bio: e.target.checked })} />
                    Bio
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.vegan} onChange={(e) => onEditChange({ vegan: e.target.checked })} />
                    Vegan
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.gluten_free} onChange={(e) => onEditChange({ gluten_free: e.target.checked })} />
                    Sin gluten
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.lactose_free} onChange={(e) => onEditChange({ lactose_free: e.target.checked })} />
                    Sin lactosa
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-800 mb-3">Información extra del producto</div>

                {extraInfoLoading ? (
                  <div className="text-sm text-gray-600">Cargando información extra…</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <label className="text-sm block">
                      <span className="text-gray-700">Ingredientes</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.ingredients}
                        onChange={(e) => onExtraInfoChange({ ingredients: e.target.value })}
                        rows={4}
                        placeholder="Ingredientes…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Información nutricional</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.nutritional_info}
                        onChange={(e) => onExtraInfoChange({ nutritional_info: e.target.value })}
                        rows={4}
                        placeholder="Información nutricional…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Modo de empleo</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.usage_instructions}
                        onChange={(e) => onExtraInfoChange({ usage_instructions: e.target.value })}
                        rows={4}
                        placeholder="Modo de empleo…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Advertencias</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.warnings}
                        onChange={(e) => onExtraInfoChange({ warnings: e.target.value })}
                        rows={4}
                        placeholder="Advertencias…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Alérgenos</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.allergens}
                        onChange={(e) => onExtraInfoChange({ allergens: e.target.value })}
                        rows={3}
                        placeholder="Alérgenos…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Consejos de uso</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.usage_tips}
                        onChange={(e) => onExtraInfoChange({ usage_tips: e.target.value })}
                        rows={3}
                        placeholder="Consejos de uso…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Disclaimer médico</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.medical_disclaimer}
                        onChange={(e) => onExtraInfoChange({ medical_disclaimer: e.target.value })}
                        rows={3}
                        placeholder="Responsabilidad médica…"
                      />
                    </label>

                    <label className="text-sm block">
                      <span className="text-gray-700">Regulación legal</span>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={extraInfo.legal_regulation}
                        onChange={(e) => onExtraInfoChange({ legal_regulation: e.target.value })}
                        rows={3}
                        placeholder="Regulación legal"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-gray-600">
                {(() => {
                  const mUd = calcMarginPerUnit(editing);
                  const mSt = calcMarginStock(editing);

                  return (
                    <>
                      Margen €/ud: <b>{mUd === null ? "—" : `${mUd.toFixed(2)}€`}</b> · Margen stock:{" "}
                      <b>{mSt === null ? "—" : `${mSt.toFixed(2)}€`}</b>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between shrink-0 bg-white">
              <div className="text-sm text-gray-600">{saveMsg ?? " "}</div>

              <div className="flex items-center gap-2">
                <button onClick={closeEdit} className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50">
                  Cerrar
                </button>

                <button
                  onClick={saveEdit}
                  disabled={saving || imagesSaving || extraInfoLoading}
                  className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {saving || imagesSaving ? "Guardando…" : "Guardar y marcar revisado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}