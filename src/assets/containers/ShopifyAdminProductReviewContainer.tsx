import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type PromoType = "none" | "percent" | "2x1" | "3x2" | "second_half";
type ExpirationPrecision = "day" | "month";

type ShopifySelectedOption = {
  name: string | null;
  value: string | null;
  option_value_id?: string | null;
};

type ShopifyVariant = {
  id: string | null;
  numeric_id: string | null;
  title: string | null;
  sku: string | null;
  barcode: string | null;

  price: number;
  compare_at_price: number | null;
  position: number;

  selected_options: ShopifySelectedOption[];

  image_url?: string | null;
  image_alt?: string | null;

  inventory_item_id: string | null;
  unit_cost: number | null;

  available: number;
  on_hand: number;
  committed: number;
};

type ShopifyProductImage = {
  id: string;
  alt: string | null;
  media_content_type: string | null;
  url: string | null;
};

type ShopifyProductOption = {
  id: string;
  name: string;
  position: number;
  values: string[];
};

type ShopifyProductRow = {
  id: string;
  numeric_id: string | null;

  title: string;
  vendor: string;
  product_type: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | string;

  description_html: string;
  has_only_default_variant: boolean;

  image_url: string | null;
  images: ShopifyProductImage[];

  options: ShopifyProductOption[];
  variants: ShopifyVariant[];

  // Primera variante para mantener la tabla principal compacta.
  variant: ShopifyVariant;

  metafields: {
    isgood: boolean;
    is_discontinued: boolean;

    // Solo lectura. Lo mantiene la integración FireSoft.
    firesoft_sync_enabled: boolean;
    firesoft_referencia: string | null;
    firesoft_codigo: string | null;

    supplier_name: string | null;

    vat_rate: number;
    recargo_rate: number;

    // Promociones de tienda.
    // El precio tachado usa compare_at_price nativo de Shopify.
    promo_type: PromoType;
    promo_active: boolean;

    expiration_date: string | null;
    expiration_date_precision: ExpirationPrecision;
    expiration_date_manual: boolean;

    bio: boolean;
    vegan: boolean;
    gluten_free: boolean;
    lactose_free: boolean;

    ingredientes: string;
    informacion_nutricional: string;
    instrucciones_uso: string;
    advertencias: string;
    alergenos: string;
    consejos_uso: string;
    aviso_medico: string;
    regulacion_legal: string;
  };
};

type ProductsResponse = {
  ok: boolean;
  products: ShopifyProductRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  error?: string;
  errors?: any[];
};

type ProductDetailResponse = {
  ok: boolean;
  product?: ShopifyProductRow;
  error?: string;
  errors?: any[];
};

const SHOPIFY_API_BASE = "/api";

const PAGE_SIZE = 20;

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

function useDebounced<T>(
  value: T,
  delay = 350
) {
  const [debounced, setDebounced] =
    useState(value);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebounced(value),
      delay
    );

    return () =>
      window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatMoney(
  value: number | null | undefined,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "es-ES",
    {
      style: "currency",
      currency,
    }
  ).format(
    Number.isFinite(Number(value))
      ? Number(value)
      : 0
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function promoLabel(row: ShopifyProductRow) {
  const promoType = row.metafields.promo_type ?? "none";
  const promoActive = !!row.metafields.promo_active;

  if (!promoActive || promoType === "none") {
    if (
      row.variant.compare_at_price !== null &&
      row.variant.compare_at_price > row.variant.price
    ) {
      const pct = Math.round(
        ((row.variant.compare_at_price - row.variant.price) /
          row.variant.compare_at_price) *
          100
      );

      return pct > 0 ? `-${pct}%` : "—";
    }

    return "—";
  }

  if (promoType === "2x1") return "2x1";
  if (promoType === "3x2") return "3x2";
  if (promoType === "second_half") return "2ª al 50%";

  if (promoType === "percent") {
    if (
      row.variant.compare_at_price !== null &&
      row.variant.compare_at_price > row.variant.price
    ) {
      const pct = Math.round(
        ((row.variant.compare_at_price - row.variant.price) /
          row.variant.compare_at_price) *
          100
      );

      return pct > 0 ? `-${pct}%` : "Descuento";
    }

    return "Descuento";
  }

  return "—";
}

function getTaxKey(
  vat: number,
  recargo: number
) {
  return (
    TAX_OPTIONS.find(
      (item) =>
        item.vat === vat &&
        item.recargo === recargo
    )?.key ?? "custom"
  );
}

function formatExpiration(
  date: string | null,
  precision: ExpirationPrecision
) {
  if (!date) return "—";

  if (precision === "month") {
    const [year, month] =
      date.slice(0, 7).split("-");

    return year && month
      ? `${month}/${year}`
      : date;
  }

  return date;
}

function toMonthValue(
  date: string | null
) {
  return date
    ? String(date).slice(0, 7)
    : "";
}

function fromMonthValue(
  value: string
) {
  const clean = value.trim();
  return clean
    ? `${clean}-01`
    : null;
}

function calcMarginPerUnit(
  row: ShopifyProductRow
) {
  const cost =
    row.variant.unit_cost;

  if (cost === null) {
    return null;
  }

  const factor =
    1 +
    (
      Number(
        row.metafields.vat_rate ?? 0
      ) +
      Number(
        row.metafields.recargo_rate ?? 0
      )
    ) /
      100;

  return (
    Number(row.variant.price ?? 0) -
    cost * factor
  );
}

function calcMarginStock(
  row: ShopifyProductRow
) {
  const margin =
    calcMarginPerUnit(row);

  if (margin === null) {
    return null;
  }

  return (
    margin *
    Number(
      row.variant.available ?? 0
    )
  );
}


function htmlToPlainText(value: string) {
  if (!value) return "";

  const doc =
    new DOMParser().parseFromString(
      value,
      "text/html"
    );

  return (
    doc.body.textContent ??
    ""
  )
    .replace(/\u00a0/g, " ")
    .trim();
}

function plainTextToHtml(value: string) {
  const clean =
    value.replace(/\r\n/g, "\n").trim();

  if (!clean) {
    return "";
  }

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  return clean
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(
          paragraph
            .replace(/\n/g, "<br>")
        )}</p>`
    )
    .join("");
}

function getApiError(
  data: any,
  fallback: string
) {
  if (data?.error) {
    return String(data.error);
  }

  if (Array.isArray(data?.errors)) {
    const message = data.errors
      .map(
        (item: any) =>
          item?.message
      )
      .filter(Boolean)
      .join(", ");

    if (message) {
      return message;
    }
  }

  return fallback;
}

function optionValue(
  variant: ShopifyVariant,
  name: string
) {
  return (
    variant.selected_options?.find(
      (option) =>
        option.name === name
    )?.value ?? ""
  );
}

function variantPrettyLabel(
  variant: ShopifyVariant
) {
  const native =
    optionValue(
      variant,
      "Variante"
    );

  if (native) {
    return native;
  }

  if (
    variant.title &&
    variant.title !== "Default Title"
  ) {
    return variant.title;
  }

  return "—";
}

export default function ShopifyAdminProductReviewContainer() {
  const [search, setSearch] =
    useState("");

  const [
    barcodeSearch,
    setBarcodeSearch,
  ] = useState("");

  const [category, setCategory] =
    useState("");

  const [vendor, setVendor] =
    useState("");

  const [showActive, setShowActive] =
    useState(false);

  const [showInactive, setShowInactive] =
    useState(true);

  const [page, setPage] =
    useState(1);

  const [rows, setRows] =
    useState<ShopifyProductRow[]>([]);

  const [total, setTotal] =
    useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    loadingList,
    setLoadingList,
  ] = useState(true);

  const [
    listError,
    setListError,
  ] = useState<string | null>(
    null
  );

  const [
    editing,
    setEditing,
  ] =
    useState<ShopifyProductRow | null>(
      null
    );

  const [
    loadingDetail,
    setLoadingDetail,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saveMsg, setSaveMsg] =
    useState<string | null>(null);

  const [taxKey, setTaxKey] =
    useState("0+0");

  const [
    editDiscountPercent,
    setEditDiscountPercent,
  ] = useState<number | null>(null);

  // ==========================================
  // VARIANTES NATIVAS SHOPIFY
  // ==========================================

  const [
    variantBarcode,
    setVariantBarcode,
  ] = useState("");

  const [
    variantSearching,
    setVariantSearching,
  ] = useState(false);

  const [
    variantFound,
    setVariantFound,
  ] =
    useState<ShopifyProductRow | null>(
      null
    );

  // Cuando se crea el primer grupo,
  // necesitamos nombrar la variante actual.
  const [
    currentFlavor,
    setCurrentFlavor,
  ] = useState("");

  const [
    currentSize,
    setCurrentSize,
  ] = useState("");

  // Datos de la nueva variante.
  const [
    newFlavor,
    setNewFlavor,
  ] = useState("");

  const [
    newSize,
    setNewSize,
  ] = useState("");

  const [
    mergingVariant,
    setMergingVariant,
  ] = useState(false);

  const debouncedSearch =
    useDebounced(search);

  const debouncedBarcode =
    useDebounced(barcodeSearch);

  const loadProducts =
    useCallback(async () => {
      setLoadingList(true);
      setListError(null);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page)
        );

        params.set(
          "page_size",
          String(PAGE_SIZE)
        );

        params.set(
          "reviewed",
          "false"
        );

        params.set(
          "include_discontinued",
          "false"
        );

        if (
          debouncedSearch.trim()
        ) {
          params.set(
            "search",
            debouncedSearch.trim()
          );
        }

        if (
          debouncedBarcode.trim()
        ) {
          params.set(
            "barcode",
            debouncedBarcode.trim()
          );
        }

        if (category) {
          params.set(
            "category",
            category
          );
        }

        if (vendor) {
          params.set(
            "vendor",
            vendor
          );
        }

        if (
          showActive &&
          !showInactive
        ) {
          params.set(
            "status",
            "ACTIVE"
          );
        } else if (
          !showActive &&
          showInactive
        ) {
          params.set(
            "status",
            "INACTIVE"
          );
        } else if (
          showActive &&
          showInactive
        ) {
          params.set(
            "status",
            "ALL"
          );
        } else {
          setRows([]);
          setTotal(0);
          setTotalPages(1);
          setLoadingList(false);
          return;
        }

        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products?${params.toString()}`,
            {
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const data =
          (await response.json()) as ProductsResponse;

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            getApiError(
              data,
              `Error API (${response.status})`
            )
          );
        }

        setRows(
          Array.isArray(
            data.products
          )
            ? data.products
            : []
        );

        setTotal(
          Number(data.total ?? 0)
        );

        setTotalPages(
          Math.max(
            1,
            Number(
              data.total_pages ?? 1
            )
          )
        );
      } catch (error: any) {
        console.error(error);

        setRows([]);
        setTotal(0);
        setTotalPages(1);

        setListError(
          error?.message ??
            "Error cargando productos de Shopify."
        );
      } finally {
        setLoadingList(false);
      }
    }, [
      page,
      debouncedSearch,
      debouncedBarcode,
      category,
      vendor,
      showActive,
      showInactive,
    ]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories =
    useMemo(() => {
      const current =
        rows
          .map(
            (row) =>
              row.product_type
          )
          .filter(Boolean);

      return Array.from(
        new Set([
          ...CATEGORIES,
          ...current,
        ])
      ).sort();
    }, [rows]);

  const vendors =
    useMemo(() => {
      return Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.vendor
            )
            .filter(Boolean)
        )
      ).sort();
    }, [rows]);

  const openEdit =
    async (
      row: ShopifyProductRow
    ) => {
      setSaveMsg(null);
      setLoadingDetail(true);

      setVariantBarcode("");
      setVariantFound(null);
      setCurrentFlavor("");
      setCurrentSize("");
      setNewFlavor("");
      setNewSize("");

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products/${row.numeric_id ?? row.id}`,
            {
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const data =
          (await response.json()) as ProductDetailResponse;

        if (
          !response.ok ||
          data.ok === false ||
          !data.product
        ) {
          throw new Error(
            getApiError(
              data,
              "No se pudo cargar el producto."
            )
          );
        }

        const product =
          structuredClone(
            data.product
          );

        setEditing(product);

        setTaxKey(
          getTaxKey(
            Number(
              product.metafields
                .vat_rate ?? 0
            ),
            Number(
              product.metafields
                .recargo_rate ?? 0
            )
          )
        );

        if (
          product.variant.compare_at_price !== null &&
          product.variant.compare_at_price > product.variant.price &&
          product.variant.compare_at_price > 0
        ) {
          const pct =
            ((product.variant.compare_at_price - product.variant.price) /
              product.variant.compare_at_price) *
            100;

          setEditDiscountPercent(
            clamp(Math.round(pct * 100) / 100, 0, 100)
          );
        } else {
          setEditDiscountPercent(null);
        }
      } catch (error: any) {
        alert(
          error?.message ??
            "No se pudo cargar el producto."
        );
      } finally {
        setLoadingDetail(false);
      }
    };

  const reloadEditing =
    async () => {
      if (!editing) return;

      const response =
        await fetch(
          `${SHOPIFY_API_BASE}/shopify/admin/products/${editing.numeric_id ?? editing.id}`
        );

      const data =
        (await response.json()) as ProductDetailResponse;

      if (
        response.ok &&
        data.ok &&
        data.product
      ) {
        setEditing(
          structuredClone(
            data.product
          )
        );
      }
    };

  const closeEdit = () => {
    setEditing(null);
    setSaveMsg(null);

    setVariantBarcode("");
    setVariantFound(null);
    setCurrentFlavor("");
    setCurrentSize("");
    setNewFlavor("");
    setNewSize("");
    setEditDiscountPercent(null);
  };

  const patchProduct = (
    patch: Partial<ShopifyProductRow>
  ) => {
    setEditing((current) =>
      current
        ? {
            ...current,
            ...patch,
          }
        : current
    );
  };

  const patchVariant = (
    patch: Partial<ShopifyVariant>
  ) => {
    setEditing((current) => {
      if (!current) {
        return current;
      }

      const currentVariant =
        current.variant;

      const nextVariant = {
        ...currentVariant,
        ...patch,
      };

      const nextVariants =
        current.variants.map(
          (variant) =>
            variant.id ===
            currentVariant.id
              ? nextVariant
              : variant
        );

      return {
        ...current,
        variant: nextVariant,
        variants: nextVariants,
      };
    });
  };

  const patchMetafields = (
    patch: Partial<
      ShopifyProductRow["metafields"]
    >
  ) => {
    setEditing((current) =>
      current
        ? {
            ...current,
            metafields: {
              ...current.metafields,
              ...patch,
            },
          }
        : current
    );
  };

  const editDiscountPct = useMemo(() => {
    const raw = editDiscountPercent ?? 0;

    if (Number.isNaN(raw)) {
      return 0;
    }

    return clamp(raw, 0, 100);
  }, [editDiscountPercent]);

  const editFinalPrice = useMemo(() => {
    if (!editing) {
      return null;
    }

    const base =
      editing.variant.compare_at_price !== null
        ? Number(editing.variant.compare_at_price)
        : Number(editing.variant.price ?? 0);

    if (!base || base <= 0) {
      return round2(Number(editing.variant.price ?? 0));
    }

    return round2(
      base * (1 - editDiscountPct / 100)
    );
  }, [editing, editDiscountPct]);

  const setEditPromo = (promo: PromoType) => {
    setEditing((current) => {
      if (!current) {
        return current;
      }

      const next = structuredClone(current);

      if (
        promo === "2x1" ||
        promo === "3x2" ||
        promo === "second_half"
      ) {
        setEditDiscountPercent(null);

        next.variant.compare_at_price = null;
        next.metafields.promo_type = promo;
        next.metafields.promo_active = true;

        return next;
      }

      if (promo === "percent") {
        next.metafields.promo_type = "percent";
        next.metafields.promo_active = true;

        return next;
      }

      next.metafields.promo_type = "none";
      next.metafields.promo_active = false;

      return next;
    });
  };

  const applyPercentToEditing = (
    pct: number | null
  ) => {
    if (!editing) {
      return;
    }

    const safePct =
      pct === null
        ? null
        : clamp(pct, 0, 100);

    const base =
      editing.variant.compare_at_price !== null
        ? Number(editing.variant.compare_at_price)
        : Number(editing.variant.price ?? 0);

    if (
      safePct === null ||
      safePct <= 0
    ) {
      setEditDiscountPercent(null);

      patchVariant({
        compare_at_price: null,
      });

      patchMetafields({
        promo_active: false,
        promo_type: "none",
      });

      return;
    }

    setEditDiscountPercent(safePct);

    patchVariant({
      compare_at_price: base,
      price: round2(
        base * (1 - safePct / 100)
      ),
    });

    patchMetafields({
      promo_active: true,
      promo_type: "percent",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      // IMPORTANTE:
      // No mandamos SKU, barcode, coste, stock ni firesoft_sync_enabled.
      // Esos datos pertenecen a FireSoft.
      const payload = {
        title:
          editing.title.trim(),

        vendor:
          editing.vendor.trim(),

        product_type:
          editing.product_type.trim(),

        description_html:
          editing.description_html ?? "",

        // Guardar desde esta pantalla significa aprobar el producto.
        status: "ACTIVE",

        variant: {
          id:
            editing.variant.id,

          price:
            Number(
              editing.variant.price ?? 0
            ),

          compare_at_price:
            editing.variant
              .compare_at_price ===
            null
              ? null
              : Number(
                  editing.variant
                    .compare_at_price
                ),
        },

        metafields: {
          isgood: true,

          is_discontinued: false,

          supplier_name:
            editing.metafields
              .supplier_name,

          vat_rate:
            Number(
              editing.metafields
                .vat_rate ?? 0
            ),

          recargo_rate:
            Number(
              editing.metafields
                .recargo_rate ?? 0
            ),

          promo_type:
            editing.metafields
              .promo_active
              ? editing.metafields
                  .promo_type
              : "none",

          promo_active:
            !!editing.metafields
              .promo_active &&
            editing.metafields
              .promo_type !== "none",

          expiration_date:
            editing.metafields
              .expiration_date ||
            null,

          expiration_date_precision:
            editing.metafields
              .expiration_date_precision ||
            "day",

          expiration_date_manual:
            true,

          bio:
            editing.metafields.bio,

          vegan:
            editing.metafields
              .vegan,

          gluten_free:
            editing.metafields
              .gluten_free,

          lactose_free:
            editing.metafields
              .lactose_free,

          ingredientes:
            editing.metafields
              .ingredientes,

          informacion_nutricional:
            editing.metafields
              .informacion_nutricional,

          instrucciones_uso:
            editing.metafields
              .instrucciones_uso,

          advertencias:
            editing.metafields
              .advertencias,

          alergenos:
            editing.metafields
              .alergenos,

          consejos_uso:
            editing.metafields
              .consejos_uso,

          aviso_medico:
            editing.metafields
              .aviso_medico,

          regulacion_legal:
            editing.metafields
              .regulacion_legal,
        },
      };

      const response =
        await fetch(
          `${SHOPIFY_API_BASE}/shopify/admin/products/${editing.numeric_id ?? editing.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.ok === false
      ) {
        throw new Error(
          getApiError(
            data,
            "No se pudo guardar el producto."
          )
        );
      }

      if (data.product) {
        setEditing(
          structuredClone(
            data.product
          )
        );
      }

      setSaveMsg(
        "Guardado y marcado como revisado ✅"
      );

      setRows((current) =>
        current.filter(
          (item) =>
            item.id !== editing.id
        )
      );

      setTotal((current) =>
        Math.max(
          0,
          current - 1
        )
      );

      window.setTimeout(
        () => closeEdit(),
        350
      );
    } catch (error: any) {
      console.error(error);

      setSaveMsg(
        `Error guardando ❌: ${
          error?.message ??
          "desconocido"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const setVisibility =
    async (
      row: ShopifyProductRow,
      visible: boolean
    ) => {
      const ok =
        window.confirm(
          visible
            ? `¿Mostrar "${row.title}" en la tienda?`
            : `¿Ocultar "${row.title}" de la tienda?`
        );

      if (!ok) return;

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products/${row.numeric_id ?? row.id}/visibility`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                visible,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            getApiError(
              data,
              "No se pudo cambiar la visibilidad."
            )
          );
        }

        await loadProducts();

        if (
          editing?.id ===
          row.id
        ) {
          await reloadEditing();
        }
      } catch (error: any) {
        alert(
          error?.message ??
            "No se pudo cambiar la visibilidad."
        );
      }
    };

  const markAsReviewed =
    async (
      row: ShopifyProductRow
    ) => {
      const ok =
        window.confirm(
          `¿Marcar "${row.title}" como revisado y publicarlo en Shopify?`
        );

      if (!ok) return;

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products/${row.numeric_id ?? row.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                status: "ACTIVE",
                metafields: {
                  isgood: true,
                  is_discontinued: false,
                },
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            getApiError(
              data,
              "No se pudo marcar como revisado."
            )
          );
        }

        setRows((current) =>
          current.filter(
            (item) =>
              item.id !== row.id
          )
        );

        setTotal((current) =>
          Math.max(
            0,
            current - 1
          )
        );

        if (
          editing?.id ===
          row.id
        ) {
          closeEdit();
        }
      } catch (error: any) {
        alert(
          error?.message ??
            "Error marcando el producto como revisado."
        );
      }
    };


  const searchVariantByBarcode =
    async () => {
      if (!editing) return;

      const code =
        variantBarcode
          .trim()
          .replace(/\s+/g, "");

      setVariantFound(null);
      setSaveMsg(null);

      if (!code) {
        setSaveMsg(
          "Introduce un código de barras."
        );
        return;
      }

      if (
        editing.variants.some(
          (variant) =>
            variant.barcode ===
            code
        )
      ) {
        setSaveMsg(
          "Ese barcode ya pertenece a este producto."
        );
        return;
      }

      setVariantSearching(true);

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products/search-by-barcode?barcode=${encodeURIComponent(
              code
            )}`
          );

        const data =
          (await response.json()) as ProductDetailResponse;

        if (
          !response.ok ||
          data.ok === false ||
          !data.product
        ) {
          throw new Error(
            getApiError(
              data,
              "Producto no encontrado."
            )
          );
        }

        if (
          data.product.id ===
          editing.id
        ) {
          throw new Error(
            "Ese barcode pertenece al producto que estás editando."
          );
        }

        setVariantFound(
          data.product
        );
      } catch (error: any) {
        setSaveMsg(
          error?.message ??
            "No se encontró el producto."
        );
      } finally {
        setVariantSearching(false);
      }
    };

  const mergeFoundVariant =
    async () => {
      if (
        !editing ||
        !variantFound
      ) {
        return;
      }

      if (
        !newFlavor.trim() &&
        !newSize.trim()
      ) {
        setSaveMsg(
          "Indica sabor o tamaño de la nueva variante."
        );
        return;
      }

      if (
        editing
          .has_only_default_variant &&
        !currentFlavor.trim() &&
        !currentSize.trim()
      ) {
        setSaveMsg(
          "Como es la primera variante, indica también el sabor/tamaño del producto actual."
        );
        return;
      }

      const ok =
        window.confirm(
          `Se convertirá "${variantFound.title}" en una variante NATIVA de "${editing.title}".\n\nEl producto independiente origen NO se borrará: se archivará después de crear correctamente la variante.\n\n¿Continuar?`
        );

      if (!ok) return;

      setMergingVariant(true);
      setSaveMsg(null);

      try {
        const response =
          await fetch(
            `${SHOPIFY_API_BASE}/shopify/admin/products/${editing.numeric_id ?? editing.id}/merge-variant`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                source_product_id:
                  variantFound.numeric_id ??
                  variantFound.id,

                source_barcode:
                  variantFound.variant
                    .barcode,

                current_flavor:
                  currentFlavor.trim() ||
                  null,

                current_size:
                  currentSize.trim() ||
                  null,

                new_flavor:
                  newFlavor.trim() ||
                  null,

                new_size:
                  newSize.trim() ||
                  null,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.ok === false
        ) {
          throw new Error(
            getApiError(
              data,
              "No se pudo crear la variante."
            )
          );
        }

        if (data.product) {
          setEditing(
            structuredClone(
              data.product
            )
          );
        } else {
          await reloadEditing();
        }

        setVariantBarcode("");
        setVariantFound(null);
        setCurrentFlavor("");
        setCurrentSize("");
        setNewFlavor("");
        setNewSize("");

        setSaveMsg(
          data.warning
            ? `Variante creada ✅ · ${data.warning}`
            : "Variante Shopify creada ✅. El producto origen quedó archivado."
        );

        await loadProducts();
      } catch (error: any) {
        console.error(error);

        setSaveMsg(
          `Error creando variante ❌: ${
            error?.message ??
            "desconocido"
          }`
        );
      } finally {
        setMergingVariant(false);
      }
    };

  const resetFilters = () => {
    setSearch("");
    setBarcodeSearch("");
    setCategory("");
    setVendor("");
    setShowActive(false);
    setShowInactive(true);
    setPage(1);
  };

  return (
    <section className="w-full">
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Revisión de productos pendientes
          </h2>

          <p className="text-sm text-gray-600">
            Productos de Shopify todavía no revisados. Edita sus datos y, al aprobarlos, se marcan como revisados y se publican.
          </p>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(
                event.target.value
              );
            }}
            placeholder="Buscar por nombre…"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm xl:w-56"
          />

          <input
            value={barcodeSearch}
            onChange={(event) => {
              setPage(1);

              setBarcodeSearch(
                event.target.value.replace(
                  /\s+/g,
                  ""
                )
              );
            }}
            placeholder="Código de barras…"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm xl:w-52"
          />

          <select
            value={category}
            onChange={(event) => {
              setPage(1);
              setCategory(
                event.target.value
              );
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm xl:w-48"
          >
            <option value="">
              Todas las categorías
            </option>

            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <select
            value={vendor}
            onChange={(event) => {
              setPage(1);
              setVendor(
                event.target.value
              );
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm xl:w-48"
          >
            <option value="">
              Todas las marcas
            </option>

            {vendors.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showActive}
              onChange={(event) => {
                setPage(1);
                setShowActive(
                  event.target.checked
                );
              }}
            />
            Activos
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => {
                setPage(1);
                setShowInactive(
                  event.target.checked
                );
              }}
            />
            Inactivos
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      {listError && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {listError}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loadingList ? (
          <div className="p-6 text-gray-600">
            Cargando productos…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm text-gray-600">
                Total:{" "}
                <b>{total}</b>
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                >
                  ◀
                </button>

                <span className="text-sm">
                  Página{" "}
                  <b>{page}</b> /{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                    )
                  }
                  className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                >
                  ▶
                </button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-[1450px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left">
                      Variantes
                    </th>
                    <th className="px-4 py-3 text-left">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left">
                      Marca
                    </th>
                    <th className="px-4 py-3 text-left">
                      PVP
                    </th>
                    <th className="px-4 py-3 text-left">
                      Promo
                    </th>
                    <th className="px-4 py-3 text-left">
                      Coste
                    </th>
                    <th className="px-4 py-3 text-left">
                      IVA+RE
                    </th>
                    <th className="px-4 py-3 text-left">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left">
                      Margen stock
                    </th>
                    <th className="px-4 py-3 text-left">
                      Caducidad
                    </th>
                    <th className="px-4 py-3 text-left">
                      Proveedor
                    </th>
                    <th className="px-4 py-3 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => {
                    const visible =
                      row.status ===
                      "ACTIVE";

                    const margin =
                      calcMarginStock(
                        row
                      );

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-gray-50 ${
                          !visible
                            ? "opacity-70"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-600">
                          {row.numeric_id ??
                            row.id}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                row.image_url ||
                                "https://placehold.co/64x64?text=IMG"
                              }
                              alt={
                                row.title
                              }
                              className="h-10 w-10 rounded-md border object-cover"
                            />

                            <div>
                              <div className="font-semibold">
                                {row.title}
                              </div>

                              <div className="mt-1 flex gap-1">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                                  Pendiente
                                </span>

                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    visible
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {visible
                                    ? "Visible"
                                    : "Oculto"}
                                </span>
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                Barcode:{" "}
                                <span className="font-mono">
                                  {row.variant
                                    .barcode ||
                                    "—"}
                                </span>
                              </div>

                              {row.variant.compare_at_price !== null && (
                                <div className="text-xs text-gray-500">
                                  Antes:{" "}
                                  <del>
                                    {formatMoney(
                                      row.variant.compare_at_price
                                    )}
                                  </del>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {row.variants
                            .length > 1 ? (
                            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                              {
                                row
                                  .variants
                                  .length
                              }{" "}
                              variantes
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {row.product_type ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.vendor ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          {formatMoney(
                            row.variant
                              .price
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {promoLabel(row) === "—" ? (
                            "—"
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                              {promoLabel(row)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {row.variant
                            .unit_cost !==
                          null
                            ? formatMoney(
                                row.variant
                                  .unit_cost
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-3">
                          {
                            row
                              .metafields
                              .vat_rate
                          }
                          % +{" "}
                          {
                            row
                              .metafields
                              .recargo_rate
                          }
                          %
                        </td>

                        <td className="px-4 py-3">
                          {
                            row.variant
                              .available
                          }
                        </td>

                        <td className="px-4 py-3">
                          {margin === null
                            ? "—"
                            : formatMoney(
                                margin
                              )}
                        </td>

                        <td className="px-4 py-3">
                          {formatExpiration(
                            row
                              .metafields
                              .expiration_date,
                            row
                              .metafields
                              .expiration_date_precision
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {row.metafields
                            .supplier_name ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={
                              loadingDetail
                            }
                            onClick={() =>
                              void openEdit(
                                row
                              )
                            }
                            className="rounded-md border px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void markAsReviewed(
                                row
                              )
                            }
                            className="ml-2 rounded-md border border-blue-300 px-3 py-1 text-blue-800 hover:bg-blue-50"
                          >
                            Marcar revisado
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-4 py-10 text-center text-gray-600"
                      >
                        No hay resultados.
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    editing.image_url ||
                    "https://placehold.co/64x64?text=IMG"
                  }
                  alt={
                    editing.title
                  }
                  className="h-12 w-12 rounded-md border object-cover"
                />

                <div>
                  <h3 className="text-lg font-bold">
                    Revisar producto #
                    {editing.numeric_id ??
                      ""}
                  </h3>

                  <p className="text-xs text-gray-500">
                    Al guardar se marcará como revisado y se publicará. SKU, barcode, coste y stock siguen bloqueados por FireSoft.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeEdit}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* DATOS BÁSICOS */}
              <div className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-semibold">
                  Datos básicos
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    Nombre
                    <input
                      value={
                        editing.title
                      }
                      onChange={(
                        event
                      ) =>
                        patchProduct({
                          title:
                            event
                              .target
                              .value,
                        })
                      }
                      className="mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </label>

                  <label className="text-sm">
                    Marca
                    <input
                      value={
                        editing.vendor
                      }
                      onChange={(
                        event
                      ) =>
                        patchProduct({
                          vendor:
                            event
                              .target
                              .value,
                        })
                      }
                      className="mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </label>

                  <label className="text-sm">
                    Proveedor
                    <input
                      value={
                        editing
                          .metafields
                          .supplier_name ??
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        patchMetafields({
                          supplier_name:
                            event
                              .target
                              .value ||
                            null,
                        })
                      }
                      className="mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </label>

                  <label className="text-sm">
                    Categoría
                    <select
                      value={
                        editing.product_type
                      }
                      onChange={(
                        event
                      ) =>
                        patchProduct({
                          product_type:
                            event
                              .target
                              .value,
                        })
                      }
                      className="mt-1 w-full rounded-md border bg-white px-3 py-2"
                    >
                      <option value="">
                        Selecciona categoría…
                      </option>

                      {categories.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item
                            }
                            value={
                              item
                            }
                          >
                            {
                              item
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="text-sm">
                    Caducidad

                    <div className="mt-1 grid grid-cols-[135px_1fr] gap-2">
                      <select
                        value={
                          editing
                            .metafields
                            .expiration_date_precision
                        }
                        onChange={(
                          event
                        ) => {
                          const precision =
                            event
                              .target
                              .value as ExpirationPrecision;

                          patchMetafields({
                            expiration_date_precision:
                              precision,

                            expiration_date:
                              precision ===
                              "month"
                                ? fromMonthValue(
                                    toMonthValue(
                                      editing
                                        .metafields
                                        .expiration_date
                                    )
                                  )
                                : editing
                                    .metafields
                                    .expiration_date,

                            expiration_date_manual:
                              true,
                          });
                        }}
                        className="rounded-md border bg-white px-3 py-2"
                      >
                        <option value="day">
                          Día/mes/año
                        </option>
                        <option value="month">
                          Mes/año
                        </option>
                      </select>

                      {editing
                        .metafields
                        .expiration_date_precision ===
                      "month" ? (
                        <input
                          type="month"
                          value={toMonthValue(
                            editing
                              .metafields
                              .expiration_date
                          )}
                          onChange={(
                            event
                          ) =>
                            patchMetafields({
                              expiration_date:
                                fromMonthValue(
                                  event
                                    .target
                                    .value
                                ),
                              expiration_date_manual:
                                true,
                            })
                          }
                          className="rounded-md border px-3 py-2"
                        />
                      ) : (
                        <input
                          type="date"
                          value={
                            editing
                              .metafields
                              .expiration_date ??
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            patchMetafields({
                              expiration_date:
                                event
                                  .target
                                  .value ||
                                null,
                              expiration_date_manual:
                                true,
                            })
                          }
                          className="rounded-md border px-3 py-2"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* VARIANTES NATIVAS */}
              <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Variantes del mismo producto · Shopify nativo
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
                    Busca otro producto por barcode. Al relacionarlo se crea una ProductVariant real dentro de este producto y el producto independiente origen se archiva, no se borra.
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-purple-100 bg-white p-3">
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      value={
                        variantBarcode
                      }
                      onChange={(
                        event
                      ) => {
                        setVariantBarcode(
                          event
                            .target
                            .value.replace(
                              /\s+/g,
                              ""
                            )
                        );

                        setVariantFound(
                          null
                        );
                      }}
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.preventDefault();
                          void searchVariantByBarcode();
                        }
                      }}
                      placeholder="Barcode del producto que quieres convertir en variante…"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />

                    <button
                      type="button"
                      disabled={
                        variantSearching ||
                        !variantBarcode.trim()
                      }
                      onClick={() =>
                        void searchVariantByBarcode()
                      }
                      className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {variantSearching
                        ? "Buscando…"
                        : "Buscar"}
                    </button>
                  </div>

                  {variantFound && (
                    <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            variantFound.image_url ||
                            "https://placehold.co/64x64?text=IMG"
                          }
                          alt={
                            variantFound.title
                          }
                          className="h-12 w-12 rounded-md border object-cover"
                        />

                        <div>
                          <div className="font-semibold">
                            {
                              variantFound.title
                            }
                          </div>

                          <div className="text-xs text-gray-500">
                            Barcode:{" "}
                            <span className="font-mono">
                              {variantFound.variant
                                .barcode ||
                                "—"}
                            </span>
                            {" · "}
                            SKU:{" "}
                            <span className="font-mono">
                              {variantFound.variant
                                .sku ||
                                "—"}
                            </span>
                            {" · "}
                            Stock:{" "}
                            {
                              variantFound.variant
                                .available
                            }
                          </div>
                        </div>
                      </div>

                      {editing.has_only_default_variant && (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                          <div className="text-sm font-semibold text-amber-900">
                            Primera variante: identifica también el producto actual
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="text-sm">
                              Sabor actual
                              <input
                                value={
                                  currentFlavor
                                }
                                onChange={(
                                  event
                                ) =>
                                  setCurrentFlavor(
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Ej. Chocolate"
                                className="mt-1 w-full rounded-md border bg-white px-3 py-2"
                              />
                            </label>

                            <label className="text-sm">
                              Tamaño actual
                              <input
                                value={
                                  currentSize
                                }
                                onChange={(
                                  event
                                ) =>
                                  setCurrentSize(
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Ej. 1 kg"
                                className="mt-1 w-full rounded-md border bg-white px-3 py-2"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-sm">
                          Sabor nueva variante
                          <input
                            value={
                              newFlavor
                            }
                            onChange={(
                              event
                            ) =>
                              setNewFlavor(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Ej. Vainilla"
                            className="mt-1 w-full rounded-md border bg-white px-3 py-2"
                          />
                        </label>

                        <label className="text-sm">
                          Tamaño nueva variante
                          <input
                            value={
                              newSize
                            }
                            onChange={(
                              event
                            ) =>
                              setNewSize(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Ej. 2 kg"
                            className="mt-1 w-full rounded-md border bg-white px-3 py-2"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={
                          mergingVariant
                        }
                        onClick={() =>
                          void mergeFoundVariant()
                        }
                        className="mt-4 rounded-md border border-purple-300 bg-white px-4 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50 disabled:opacity-50"
                      >
                        {mergingVariant
                          ? "Creando variante…"
                          : "Relacionar como variante Shopify"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-purple-100 bg-white p-3">
                  <div className="text-sm font-semibold">
                    Variantes actuales
                  </div>

                  <div className="mt-3 overflow-auto">
                    <table className="min-w-[850px] w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">
                            Variante
                          </th>
                          <th className="px-3 py-2 text-left">
                            Barcode
                          </th>
                          <th className="px-3 py-2 text-left">
                            SKU / FireSoft
                          </th>
                          <th className="px-3 py-2 text-left">
                            PVP
                          </th>
                          <th className="px-3 py-2 text-left">
                            Coste
                          </th>
                          <th className="px-3 py-2 text-left">
                            Stock
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {editing.variants.map(
                          (
                            variant
                          ) => (
                            <tr
                              key={
                                variant.id ??
                                variant.title ??
                                ""
                              }
                            >
                              <td className="px-3 py-2 font-semibold">
                                {variantPrettyLabel(
                                  variant
                                )}
                              </td>

                              <td className="px-3 py-2 font-mono text-xs">
                                {variant.barcode ||
                                  "—"}
                              </td>

                              <td className="px-3 py-2 font-mono text-xs">
                                {variant.sku ||
                                  "—"}
                              </td>

                              <td className="px-3 py-2">
                                {formatMoney(
                                  variant.price
                                )}
                              </td>

                              <td className="px-3 py-2">
                                {variant.unit_cost !==
                                null
                                  ? formatMoney(
                                      variant.unit_cost
                                    )
                                  : "—"}
                              </td>

                              <td className="px-3 py-2">
                                {
                                  variant.available
                                }
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    SKU, barcode, coste y stock no se editan aquí. FireSoft sigue siendo la fuente de verdad.
                  </div>
                </div>
              </div>

              {/* DATOS FIRESOFT */}
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-3 text-sm font-semibold">
                  Datos FireSoft / solo lectura
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    Código de barras
                    <input
                      value={
                        editing.variant
                          .barcode ??
                        ""
                      }
                      readOnly
                      disabled
                      className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-600"
                    />
                  </label>

                  <label className="text-sm">
                    SKU / Código FireSoft
                    <input
                      value={
                        editing.variant
                          .sku ??
                        editing
                          .metafields
                          .firesoft_codigo ??
                        ""
                      }
                      readOnly
                      disabled
                      className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-600"
                    />
                  </label>

                  <label className="text-sm">
                    Referencia FireSoft
                    <input
                      value={
                        editing
                          .metafields
                          .firesoft_referencia ??
                        ""
                      }
                      readOnly
                      disabled
                      className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-600"
                    />
                  </label>

                  <label className="text-sm">
                    Stock disponible
                    <input
                      type="number"
                      value={
                        editing.variant
                          .available
                      }
                      readOnly
                      disabled
                      className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-600"
                    />
                  </label>

                  <label className="text-sm">
                    Coste proveedor sin IVA
                    <input
                      type="number"
                      value={
                        editing.variant
                          .unit_cost ??
                        ""
                      }
                      readOnly
                      disabled
                      className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-600"
                    />

                    <div className="mt-1 text-xs text-gray-500">
                      Solo lectura: el coste se actualiza desde FireSoft.
                    </div>
                  </label>
                </div>
              </div>

              {/* PRECIO Y MARGEN */}
              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="mb-3 text-sm font-semibold text-gray-800">
                  Precio de venta y margen
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="text-sm">
                    <div className="mb-1 text-xs text-gray-600">
                      Precio venta / PVP
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={editing.variant.price ?? ""}
                      placeholder="Ej: 3.50"
                      onChange={(event) => {
                        const value =
                          event.target.value === ""
                            ? 0
                            : Number(event.target.value);

                        patchVariant({
                          price: value,
                        });
                      }}
                    />

                    <div className="mt-1 text-xs text-gray-500">
                      Este es el precio real que verá el cliente en la web.
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="mb-1 text-xs text-gray-600">
                      Precio coste proveedor sin IVA
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      readOnly
                      disabled
                      className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
                      value={editing.variant.unit_cost ?? ""}
                      placeholder="—"
                    />

                    <div className="mt-1 text-xs text-gray-500">
                      Solo lectura: viene de FireSoft.
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="mb-1 text-xs text-gray-600">
                      IVA + Recargo
                    </div>

                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                      value={taxKey}
                      onChange={(event) => {
                        const key =
                          event.target.value;

                        setTaxKey(key);

                        if (
                          key !== "custom"
                        ) {
                          const option =
                            TAX_OPTIONS.find(
                              (item) =>
                                item.key === key
                            );

                          if (option) {
                            patchMetafields({
                              vat_rate:
                                option.vat,
                              recargo_rate:
                                option.recargo,
                            });
                          }
                        }
                      }}
                    >
                      {TAX_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.key}
                            value={option.key}
                          >
                            {option.label}
                          </option>
                        )
                      )}

                      <option value="custom">
                        Personalizado
                      </option>
                    </select>

                    {taxKey === "custom" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={editing.metafields.vat_rate ?? 0}
                          onChange={(event) =>
                            patchMetafields({
                              vat_rate: Number(
                                event.target.value
                              ),
                            })
                          }
                          placeholder="IVA %"
                        />

                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={editing.metafields.recargo_rate ?? 0}
                          onChange={(event) =>
                            patchMetafields({
                              recargo_rate: Number(
                                event.target.value
                              ),
                            })
                          }
                          placeholder="Recargo %"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  {(() => {
                    const factor =
                      1 +
                      (
                        Number(
                          editing.metafields.vat_rate ?? 0
                        ) +
                        Number(
                          editing.metafields.recargo_rate ?? 0
                        )
                      ) /
                        100;

                    const cost =
                      editing.variant.unit_cost;

                    const totalCost =
                      cost === null
                        ? null
                        : round2(
                            Number(cost) * factor
                          );

                    const margin =
                      totalCost === null
                        ? null
                        : round2(
                            Number(
                              editing.variant.price ?? 0
                            ) - totalCost
                          );

                    const marginPct =
                      margin === null ||
                      Number(
                        editing.variant.price ?? 0
                      ) <= 0
                        ? null
                        : round2(
                            (margin /
                              Number(
                                editing.variant.price
                              )) *
                              100
                          );

                    return (
                      <>
                        <div>
                          Coste con IVA + recargo:{" "}
                          <b>
                            {totalCost === null
                              ? "—"
                              : formatMoney(
                                  totalCost
                                )}
                          </b>
                        </div>

                        <div>
                          Margen €/ud:{" "}
                          <b>
                            {margin === null
                              ? "—"
                              : formatMoney(
                                  margin
                                )}
                          </b>
                        </div>

                        <div>
                          Margen %:{" "}
                          <b>
                            {marginPct === null
                              ? "—"
                              : `${marginPct.toFixed(
                                  2
                                )}%`}
                          </b>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* DESCUENTO POR PORCENTAJE */}
              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="mb-3 text-sm font-semibold text-gray-800">
                  Descuento por porcentaje
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="text-sm">
                    <div className="mb-1 text-xs text-gray-600">
                      Precio anterior tachado
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={
                        editing.variant.compare_at_price ??
                        ""
                      }
                      placeholder="Ej: 4.00"
                      disabled={
                        editing.metafields.promo_active &&
                        (
                          editing.metafields.promo_type === "2x1" ||
                          editing.metafields.promo_type === "3x2" ||
                          editing.metafields.promo_type === "second_half"
                        )
                      }
                      onChange={(event) => {
                        const value =
                          event.target.value === ""
                            ? null
                            : Number(
                                event.target.value
                              );

                        patchVariant({
                          compare_at_price:
                            value,
                        });

                        if (
                          value !== null &&
                          editDiscountPercent &&
                          editDiscountPercent > 0
                        ) {
                          patchVariant({
                            price: round2(
                              value *
                                (
                                  1 -
                                  clamp(
                                    editDiscountPercent,
                                    0,
                                    100
                                  ) /
                                    100
                                )
                            ),
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="text-sm">
                    <div className="mb-1 text-xs text-gray-600">
                      Descuento %
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={
                        editDiscountPercent ??
                        ""
                      }
                      placeholder="%"
                      disabled={
                        editing.metafields.promo_active &&
                        (
                          editing.metafields.promo_type === "2x1" ||
                          editing.metafields.promo_type === "3x2" ||
                          editing.metafields.promo_type === "second_half"
                        )
                      }
                      onChange={(event) => {
                        const value =
                          event.target.value === ""
                            ? null
                            : Number(
                                event.target.value
                              );

                        setEditDiscountPercent(
                          value
                        );

                        applyPercentToEditing(
                          value
                        );
                      }}
                    />
                  </div>

                  <div className="text-sm">
                    <div className="mb-1 text-xs text-gray-600">
                      Precio final calculado
                    </div>

                    <input
                      type="text"
                      readOnly
                      className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-800"
                      value={
                        editFinalPrice === null
                          ? ""
                          : formatMoney(
                              editFinalPrice
                            )
                      }
                    />
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  El precio anterior usa el campo nativo <b>compareAtPrice</b> de Shopify. Si aplicas descuento, el cliente verá ese precio tachado y el PVP actual como precio final.
                </div>
              </div>

              {/* PROMOCIÓN POR UNIDADES */}
              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <div className="mb-3 text-sm font-semibold text-gray-800">
                  Promoción por unidades
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditPromo(
                        editing.metafields.promo_active &&
                          editing.metafields.promo_type === "2x1"
                          ? "none"
                          : "2x1"
                      )
                    }
                    className={`rounded-full border px-4 py-2 ${
                      editing.metafields.promo_active &&
                      editing.metafields.promo_type === "2x1"
                        ? "border-[#8c0327] bg-[#8c0327] text-white"
                        : "border-gray-300 bg-white text-gray-800"
                    }`}
                  >
                    2x1
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditPromo(
                        editing.metafields.promo_active &&
                          editing.metafields.promo_type === "3x2"
                          ? "none"
                          : "3x2"
                      )
                    }
                    className={`rounded-full border px-4 py-2 ${
                      editing.metafields.promo_active &&
                      editing.metafields.promo_type === "3x2"
                        ? "border-[#8c0327] bg-[#8c0327] text-white"
                        : "border-gray-300 bg-white text-gray-800"
                    }`}
                  >
                    3x2
                  </button>

                  <button
                    type="button"
                    title="2ª unidad al 50%"
                    onClick={() =>
                      setEditPromo(
                        editing.metafields.promo_active &&
                          editing.metafields.promo_type === "second_half"
                          ? "none"
                          : "second_half"
                      )
                    }
                    className={`rounded-full border px-4 py-2 ${
                      editing.metafields.promo_active &&
                      editing.metafields.promo_type === "second_half"
                        ? "border-[#8c0327] bg-[#8c0327] text-white"
                        : "border-gray-300 bg-white text-gray-800"
                    }`}
                  >
                    2ª al 50%
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditPromo("none")
                    }
                    className={`rounded-full border px-4 py-2 ${
                      !editing.metafields.promo_active ||
                      editing.metafields.promo_type === "none"
                        ? "border-gray-300 bg-gray-100 text-gray-800"
                        : "border-gray-300 bg-white text-gray-800"
                    }`}
                  >
                    Sin promo
                  </button>

                  <label className="ml-2 flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={
                        editing.metafields.promo_active
                      }
                      onChange={(event) =>
                        patchMetafields({
                          promo_active:
                            event.target.checked,
                          promo_type:
                            event.target.checked
                              ? editing.metafields.promo_type
                              : "none",
                        })
                      }
                    />

                    Promo activa
                  </label>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  Si activas 2x1, 3x2 o 2ª unidad al 50%, se desactiva el descuento porcentual y el precio anterior tachado.
                </div>
              </div>

              {/* CONTENIDO */}
              <div className="mt-4 rounded-lg border p-4">
                <div className="mb-3 text-sm font-semibold">
                  Contenido
                </div>

                <label className="block text-sm">
                  Descripción
                  <textarea
                    value={htmlToPlainText(
                      editing.description_html ?? ""
                    )}
                    onChange={(event) =>
                      patchProduct({
                        description_html:
                          plainTextToHtml(
                            event.target.value
                          ),
                      })
                    }
                    rows={5}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-6">
                  {[
                    [
                      "bio",
                      "Bio",
                    ],
                    [
                      "vegan",
                      "Vegan",
                    ],
                    [
                      "gluten_free",
                      "Sin gluten",
                    ],
                    [
                      "lactose_free",
                      "Sin lactosa",
                    ],
                  ].map(
                    ([
                      key,
                      label,
                    ]) => (
                      <label
                        key={
                          key
                        }
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={
                            Boolean(
                              editing
                                .metafields[
                                key as keyof ShopifyProductRow["metafields"]
                              ]
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            patchMetafields(
                              {
                                [key]:
                                  event
                                    .target
                                    .checked,
                              } as any
                            )
                          }
                        />

                        {label}
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* IMÁGENES */}
              <div className="mt-4 rounded-lg border p-4">
                <div className="mb-3 text-sm font-semibold">
                  Imágenes Shopify
                </div>

                <div className="flex flex-wrap gap-3">
                  {editing.images
                    .filter(
                      (image) =>
                        Boolean(
                          image.url
                        )
                    )
                    .map(
                      (
                        image
                      ) => (
                        <div
                          key={
                            image.id
                          }
                          className="w-28 rounded-lg border bg-gray-50 p-2"
                        >
                          <img
                            src={
                              image.url!
                            }
                            alt={
                              image.alt ??
                              editing.title
                            }
                            className="h-20 w-full rounded-md object-cover"
                          />

                          <div className="mt-1 truncate text-[10px] text-gray-500">
                            {image.alt ||
                              "Sin ALT"}
                          </div>
                        </div>
                      )
                    )}

                  {editing.images
                    .filter(
                      (image) =>
                        Boolean(
                          image.url
                        )
                    ).length ===
                    0 && (
                    <div className="text-sm text-gray-500">
                      No hay imágenes.
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Aquí se muestran las imágenes ya guardadas en Shopify. No se alteran al guardar los datos del producto.
                </div>
              </div>

              {/* INFORMACIÓN EXTRA */}
              <div className="mt-4 rounded-lg border p-4">
                <div className="mb-3 text-sm font-semibold">
                  Información extra del producto
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    [
                      "ingredientes",
                      "Ingredientes",
                    ],
                    [
                      "informacion_nutricional",
                      "Información nutricional",
                    ],
                    [
                      "instrucciones_uso",
                      "Modo de empleo",
                    ],
                    [
                      "advertencias",
                      "Advertencias",
                    ],
                    [
                      "alergenos",
                      "Alérgenos",
                    ],
                    [
                      "consejos_uso",
                      "Consejos de uso",
                    ],
                    [
                      "aviso_medico",
                      "Aviso médico",
                    ],
                    [
                      "regulacion_legal",
                      "Regulación legal",
                    ],
                  ].map(
                    ([
                      key,
                      label,
                    ]) => (
                      <label
                        key={
                          key
                        }
                        className="block text-sm"
                      >
                        {label}

                        <textarea
                          rows={3}
                          value={String(
                            editing
                              .metafields[
                              key as keyof ShopifyProductRow["metafields"]
                            ] ??
                              ""
                          )}
                          onChange={(
                            event
                          ) =>
                            patchMetafields(
                              {
                                [key]:
                                  event
                                    .target
                                    .value,
                              } as any
                            )
                          }
                          className="mt-1 w-full rounded-md border px-3 py-2"
                        />
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-600">
                Margen €/ud:{" "}
                <b>
                  {calcMarginPerUnit(
                    editing
                  ) === null
                    ? "—"
                    : formatMoney(
                        round2(
                          calcMarginPerUnit(
                            editing
                          )!
                        )
                      )}
                </b>

                {" · "}

                Margen stock:{" "}
                <b>
                  {calcMarginStock(
                    editing
                  ) === null
                    ? "—"
                    : formatMoney(
                        round2(
                          calcMarginStock(
                            editing
                          )!
                        )
                      )}
                </b>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t bg-white px-5 py-4">
              <div className="text-sm text-gray-600">
                {saveMsg ?? " "}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border px-4 py-2 hover:bg-gray-50"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    mergingVariant
                  }
                  onClick={() =>
                    void saveEdit()
                  }
                  className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving
                    ? "Guardando…"
                    : "Guardar y marcar revisado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}