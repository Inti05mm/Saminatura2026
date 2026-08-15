from __future__ import annotations

import argparse
import csv
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

SHOPIFY_HEADERS = [
    "Handle","Title","Body (HTML)","Vendor","Product Category","Type","Tags","Published",
    "Option1 Name","Option1 Value","Option1 Linked To","Option2 Name","Option2 Value","Option2 Linked To",
    "Option3 Name","Option3 Value","Option3 Linked To","Variant SKU","Variant Grams",
    "Variant Inventory Tracker","Variant Inventory Qty","Variant Inventory Policy","Variant Fulfillment Service",
    "Variant Price","Variant Compare At Price","Variant Requires Shipping","Variant Taxable",
    "Unit Price Total Measure","Unit Price Total Measure Unit","Unit Price Base Measure","Unit Price Base Measure Unit",
    "Variant Barcode","Image Src","Image Position","Image Alt Text","Gift Card","SEO Title","SEO Description",
    "advertencias (product.metafields.custom.advertencias)",
    "alergenos (product.metafields.custom.alergenos)",
    "aviso_medico (product.metafields.custom.aviso_medico)",
    "bio (product.metafields.custom.bio)",
    "consejos_uso (product.metafields.custom.consejos_uso)",
    "expiration_date (product.metafields.custom.expiration_date)",
    "firesoft_codigo (product.metafields.custom.firesoft_codigo)",
    "firesoft_referencia (product.metafields.custom.firesoft_referencia)",
    "firesoft_sync_enabled (product.metafields.custom.firesoft_sync_enabled)",
    "gluten_free (product.metafields.custom.gluten_free)",
    "informacion_nutricional (product.metafields.custom.informacion_nutricional)",
    "Ingredientes (product.metafields.custom.ingredientes)",
    "instrucciones_uso (product.metafields.custom.instrucciones_uso)",
    "isgood (product.metafields.custom.isgood)",
    "is_discontinued (product.metafields.custom.is_discontinued)",
    "lactose_free (product.metafields.custom.lactose_free)",
    "recargo_rate (product.metafields.custom.recargo_rate)",
    "regulacion_legal (product.metafields.custom.regulacion_legal)",
    "supplier_name (product.metafields.custom.supplier_name)",
    "vat_rate (product.metafields.custom.vat_rate)",
    "vegan (product.metafields.custom.vegan)",
    "Variant Image","Variant Weight Unit","Variant Tax Code","Cost per item","Status",
]

VARIANT_META_HEADERS = [
    "Handle","Variant SKU","Variant Barcode","Option1 Value",
    "ingredients","nutritional_info","usage_instructions","warnings",
    "allergens","usage_tips","medical_disclaimer","legal_regulation",
]

def clean(v):
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s.lower() in {"null","none","nan"} else s

def truthy(v):
    return clean(v).lower() in {"true","t","1","yes","y","si","sí"}

def boolcsv(v):
    return "TRUE" if truthy(v) else "FALSE"

def fix_text(v):
    s = clean(v)
    if not s:
        return ""
    if not any(x in s for x in ("Ã","Â","â€","ðŸ")):
        return s
    for enc in ("latin1","cp1252"):
        try:
            return s.encode(enc).decode("utf-8")
        except Exception:
            pass
    return s

def dec(v):
    return clean(v).replace(",", ".")

def slugify(v):
    s = fix_text(v).lower().strip()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+","-",s).strip("-")

def safe_int(v, default=0):
    try:
        return int(float(clean(v).replace(",", ".")))
    except Exception:
        return default

def grams(size):
    s = fix_text(size).lower().strip()
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*kg", s)
    if m:
        return str(float(m.group(1).replace(",", "."))*1000).rstrip("0").rstrip(".")
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*g", s)
    if m:
        return m.group(1).replace(",", ".")
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*ml", s)
    if m:
        return m.group(1).replace(",", ".")
    return ""

def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def available_stock(p):
    base = safe_int(p.get("firesoft_stock") or p.get("stock"), 0)
    reserved = safe_int(p.get("online_reserved_stock"), 0)
    buffer_ = safe_int(p.get("online_stock_buffer"), 0)
    return str(max(0, base-reserved-buffer_))

def tags(p):
    out=[]
    if truthy(p.get("bio")): out.append("Bio")
    if truthy(p.get("vegan")): out.append("Vegano")
    if truthy(p.get("gluten_free")): out.append("Sin gluten")
    if truthy(p.get("lactose_free")): out.append("Sin lactosa")
    if fix_text(p.get("flavor")): out.append(fix_text(p.get("flavor")))
    if fix_text(p.get("size")): out.append(fix_text(p.get("size")))
    return ", ".join(dict.fromkeys(out))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("products_csv", nargs="?", default="products.csv")
    ap.add_argument("extra_csv", nargs="?", default="product_extra_info.csv")
    ap.add_argument("--out", default="shopify_import_completo.csv")
    ap.add_argument("--variant-meta-out", default="variant_metafields_completo.csv")
    a=ap.parse_args()

    products=read_csv(a.products_csv)
    extras=read_csv(a.extra_csv)

    by_id={clean(e.get("product_id")):e for e in extras if clean(e.get("product_id"))}
    by_slug={clean(e.get("product_slug")):e for e in extras if clean(e.get("product_slug"))}
    def extra(p):
        return by_id.get(clean(p.get("id"))) or by_slug.get(clean(p.get("slug"))) or {}

    # ========================================================
    # QUÉ PRODUCTOS SE IMPORTAN
    # ========================================================
    #
    # IMPORTANTE:
    # - is_active ya NO decide si el producto entra en Shopify.
    # - isgood decide si será ACTIVE o DRAFT.
    # - is_discontinued sí excluye el producto.
    #
    # Así:
    #   isgood = true  -> Shopify ACTIVE + Published TRUE
    #   isgood = false -> Shopify DRAFT  + Published FALSE
    #
    # Esto permite importar también los miles de productos pendientes
    # que antes no estaban visibles en la web Supabase.
    importable=[
        p for p in products
        if not truthy(p.get("is_discontinued"))
    ]

    reviewed_products=[
        p for p in importable
        if truthy(p.get("isgood"))
    ]

    pending_products=[
        p for p in importable
        if not truthy(p.get("isgood"))
    ]

    groups=defaultdict(list)

    for p in importable:
        gid=clean(p.get("variant_group_id"))

        key=(
            f"group:{gid}"
            if gid
            else f"product:{clean(p.get('id')) or clean(p.get('slug'))}"
        )

        groups[key].append(p)

    shop_rows=[]
    variant_meta=[]
    grouped_count=0
    variant_count=0

    for key, members in groups.items():
        members.sort(key=lambda p:(safe_int(p.get("variant_sort"),999999),safe_int(p.get("id"),999999)))
        grouped=key.startswith("group:")
        if grouped: grouped_count += 1
        first=members[0]

        # Shopify publica el PRODUCTO completo, no cada variante por separado.
        # Si un grupo tiene aunque sea una variante pendiente, lo dejamos DRAFT.
        group_isgood = all(
            truthy(m.get("isgood"))
            for m in members
        )

        group_name=fix_text(first.get("variant_group_name")) or fix_text(first.get("name"))
        handle=slugify(group_name) if grouped else (clean(first.get("slug")) or slugify(first.get("name")))
        title=group_name if grouped else fix_text(first.get("name"))

        for i,p in enumerate(members):
            e=extra(p)
            r={h:"" for h in SHOPIFY_HEADERS}
            r["Handle"]=handle

            if i==0:
                r["Title"]=title
                r["Body (HTML)"]=fix_text(p.get("description"))
                r["Vendor"]=fix_text(p.get("brand"))
                r["Type"]=fix_text(p.get("category"))
                r["Tags"]=tags(p)
                r["Published"]="TRUE" if group_isgood else "FALSE"
                r["Gift Card"]="FALSE"
                r["SEO Title"]=title
                r["SEO Description"]=fix_text(p.get("description"))[:320]

                # Metacampos de PRODUCTO. En grupos con variantes se dejan
                # vacíos si los valores difieren, para no mezclar datos.
                fields = {
                    "advertencias (product.metafields.custom.advertencias)": "warnings",
                    "alergenos (product.metafields.custom.alergenos)": "allergens",
                    "aviso_medico (product.metafields.custom.aviso_medico)": "medical_disclaimer",
                    "consejos_uso (product.metafields.custom.consejos_uso)": "usage_tips",
                    "informacion_nutricional (product.metafields.custom.informacion_nutricional)": "nutritional_info",
                    "Ingredientes (product.metafields.custom.ingredientes)": "ingredients",
                    "instrucciones_uso (product.metafields.custom.instrucciones_uso)": "usage_instructions",
                    "regulacion_legal (product.metafields.custom.regulacion_legal)": "legal_regulation",
                }
                for outcol, srcfield in fields.items():
                    vals=[fix_text(extra(m).get(srcfield)) for m in members]
                    r[outcol]=vals[0] if (not grouped or (len(set(vals))==1)) else ""

                r["bio (product.metafields.custom.bio)"]=boolcsv(p.get("bio"))
                r["expiration_date (product.metafields.custom.expiration_date)"]=clean(p.get("expiration_date"))
                r["firesoft_codigo (product.metafields.custom.firesoft_codigo)"]=clean(p.get("firesoft_codigo"))
                r["firesoft_referencia (product.metafields.custom.firesoft_referencia)"]=clean(p.get("firesoft_referencia"))
                r["firesoft_sync_enabled (product.metafields.custom.firesoft_sync_enabled)"]=boolcsv(p.get("firesoft_sync_enabled"))
                r["gluten_free (product.metafields.custom.gluten_free)"]=boolcsv(p.get("gluten_free"))
                r["isgood (product.metafields.custom.isgood)"]="TRUE" if group_isgood else "FALSE"
                r["is_discontinued (product.metafields.custom.is_discontinued)"]="FALSE"
                r["lactose_free (product.metafields.custom.lactose_free)"]=boolcsv(p.get("lactose_free"))
                r["recargo_rate (product.metafields.custom.recargo_rate)"]=dec(p.get("recargo_rate"))
                r["supplier_name (product.metafields.custom.supplier_name)"]=fix_text(p.get("supplier_name"))
                r["vat_rate (product.metafields.custom.vat_rate)"]=dec(p.get("vat_rate"))
                r["vegan (product.metafields.custom.vegan)"]=boolcsv(p.get("vegan"))

            if grouped:
                r["Option1 Name"]="Variante"
                r["Option1 Value"]=fix_text(p.get("variant_label")) or " · ".join(x for x in [fix_text(p.get("flavor")),fix_text(p.get("size"))] if x) or fix_text(p.get("name"))
            else:
                r["Option1 Name"]="Title"
                r["Option1 Value"]="Default Title"

            r["Variant SKU"]=clean(p.get("firesoft_referencia")) or clean(p.get("firesoft_codigo"))
            r["Variant Grams"]=grams(p.get("size"))
            r["Variant Inventory Tracker"]="shopify"
            r["Variant Inventory Qty"]=available_stock(p)
            r["Variant Inventory Policy"]="deny"
            r["Variant Fulfillment Service"]="manual"
            r["Variant Price"]=dec(p.get("price"))
            r["Variant Compare At Price"]=dec(p.get("old_price"))
            r["Variant Requires Shipping"]="TRUE"
            r["Variant Taxable"]="TRUE"
            r["Variant Barcode"]=clean(p.get("barcode"))
            r["Variant Weight Unit"]="g" if r["Variant Grams"] else ""
            r["Cost per item"]=dec(p.get("purchase_price"))
            r["Status"]="active" if group_isgood else "draft"

            image=fix_text(p.get("img"))
            if i==0 and image:
                r["Image Src"]=image
                r["Image Position"]="1"
                r["Image Alt Text"]=" - ".join(x for x in [fix_text(p.get("name")),fix_text(p.get("brand"))] if x)
            if grouped and image:
                r["Variant Image"]=image

            shop_rows.append(r)

            if grouped:
                variant_count += 1
                variant_meta.append({
                    "Handle":handle,
                    "Variant SKU":r["Variant SKU"],
                    "Variant Barcode":r["Variant Barcode"],
                    "Option1 Value":r["Option1 Value"],
                    "ingredients":fix_text(e.get("ingredients")),
                    "nutritional_info":fix_text(e.get("nutritional_info")),
                    "usage_instructions":fix_text(e.get("usage_instructions")),
                    "warnings":fix_text(e.get("warnings")),
                    "allergens":fix_text(e.get("allergens")),
                    "usage_tips":fix_text(e.get("usage_tips")),
                    "medical_disclaimer":fix_text(e.get("medical_disclaimer")),
                    "legal_regulation":fix_text(e.get("legal_regulation")),
                })

    with open(a.out,"w",encoding="utf-8-sig",newline="") as f:
        w=csv.DictWriter(f,fieldnames=SHOPIFY_HEADERS)
        w.writeheader()
        w.writerows(shop_rows)

    with open(a.variant_meta_out,"w",encoding="utf-8-sig",newline="") as f:
        w=csv.DictWriter(f,fieldnames=VARIANT_META_HEADERS)
        w.writeheader()
        w.writerows(variant_meta)

    print("\n=== SAMINATURA -> SHOPIFY ===")
    print(f"Productos Supabase:        {len(products)}")
    print(f"Productos importables:     {len(importable)}")
    print(f"Revisados / ACTIVE:        {len(reviewed_products)}")
    print(f"Pendientes / DRAFT:        {len(pending_products)}")
    print(f"Productos Shopify:         {len(groups)}")
    print(f"Grupos con variantes:      {grouped_count}")
    print(f"Variantes agrupadas:       {variant_count}")
    print(f"CSV Shopify:               {Path(a.out).resolve()}")
    print(f"Metafields de variante:    {Path(a.variant_meta_out).resolve()}\n")

if __name__=="__main__":
    main()
