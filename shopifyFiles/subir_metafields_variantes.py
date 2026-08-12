import csv
import os
import sys
import time
import requests

from dotenv import load_dotenv


# ============================================================
# CONFIGURACIÓN
# ============================================================

API_VERSION = "2026-07"
CSV_FILE = "variant_metafields_pending.csv"

load_dotenv()

SHOPIFY_STORE = os.getenv("SHOPIFY_STORE")
SHOPIFY_CLIENT_ID = os.getenv("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.getenv("SHOPIFY_CLIENT_SECRET")


if not SHOPIFY_STORE:
    sys.exit("❌ Falta SHOPIFY_STORE en .env")

if not SHOPIFY_CLIENT_ID:
    sys.exit("❌ Falta SHOPIFY_CLIENT_ID en .env")

if not SHOPIFY_CLIENT_SECRET:
    sys.exit("❌ Falta SHOPIFY_CLIENT_SECRET en .env")


# ============================================================
# OBTENER TOKEN ADMIN TEMPORAL
# ============================================================

def get_access_token():
    url = f"https://{SHOPIFY_STORE}/admin/oauth/access_token"

    response = requests.post(
        url,
        headers={
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data={
            "grant_type": "client_credentials",
            "client_id": SHOPIFY_CLIENT_ID,
            "client_secret": SHOPIFY_CLIENT_SECRET,
        },
        timeout=30,
    )

    if not response.ok:
        print("❌ Error obteniendo token")
        print("HTTP:", response.status_code)
        print(response.text)
        sys.exit(1)

    data = response.json()

    token = data.get("access_token")

    if not token:
        print("❌ Shopify no devolvió access_token")
        print(data)
        sys.exit(1)

    print("✅ Token Shopify obtenido")
    return token


# ============================================================
# GRAPHQL
# ============================================================

def graphql(token, query, variables=None):
    url = (
        f"https://{SHOPIFY_STORE}"
        f"/admin/api/{API_VERSION}/graphql.json"
    )

    response = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        json={
            "query": query,
            "variables": variables or {},
        },
        timeout=60,
    )

    if not response.ok:
        raise RuntimeError(
            f"HTTP {response.status_code}: {response.text}"
        )

    data = response.json()

    if data.get("errors"):
        raise RuntimeError(
            f"GraphQL errors: {data['errors']}"
        )

    return data["data"]


# ============================================================
# BUSCAR VARIANTE
# ============================================================

VARIANT_QUERY = """
query FindVariant($query: String!) {
  productVariants(first: 10, query: $query) {
    nodes {
      id
      sku
      barcode
      title

      product {
        id
        title
        handle
      }
    }
  }
}
"""


def find_variant(token, sku, barcode, handle):
    # --------------------------------
    # 1. Primero intentamos por SKU
    # --------------------------------

    if sku:
        data = graphql(
            token,
            VARIANT_QUERY,
            {
                "query": f"sku:{sku}"
            }
        )

        variants = data["productVariants"]["nodes"]

        exact = [
            v for v in variants
            if (v.get("sku") or "").strip() == sku.strip()
        ]

        if len(exact) == 1:
            return exact[0]

        if len(exact) > 1:
            print(
                f"⚠️ SKU duplicado {sku}. "
                f"Intentando resolver por handle..."
            )

            by_handle = [
                v for v in exact
                if v["product"]["handle"] == handle
            ]

            if len(by_handle) == 1:
                return by_handle[0]

    # --------------------------------
    # 2. Si falla, buscamos por barcode
    # --------------------------------

    if barcode:
        data = graphql(
            token,
            VARIANT_QUERY,
            {
                "query": f"barcode:{barcode}"
            }
        )

        variants = data["productVariants"]["nodes"]

        exact = [
            v for v in variants
            if (v.get("barcode") or "").strip()
            == barcode.strip()
        ]

        if len(exact) == 1:
            return exact[0]

        if len(exact) > 1:
            by_handle = [
                v for v in exact
                if v["product"]["handle"] == handle
            ]

            if len(by_handle) == 1:
                return by_handle[0]

    return None


# ============================================================
# METAFIELDS
# ============================================================

METAFIELD_MAP = {
    "ingredients": "ingredientes",
    "nutritional_info": "informacion_nutricional",
    "usage_instructions": "instrucciones_uso",
    "warnings": "advertencias",
    "allergens": "alergenos",
    "usage_tips": "consejos_uso",
    "medical_disclaimer": "aviso_medico",
    "legal_regulation": "regulacion_legal",
}


METAFIELDS_MUTATION = """
mutation SetVariantMetafields(
  $metafields: [MetafieldsSetInput!]!
) {
  metafieldsSet(metafields: $metafields) {

    metafields {
      id
      namespace
      key
      value
    }

    userErrors {
      field
      message
      code
    }
  }
}
"""


def set_variant_metafields(token, variant_id, row):
    metafields = []

    for csv_column, key in METAFIELD_MAP.items():

        value = (row.get(csv_column) or "").strip()

        # No creamos metafields completamente vacíos.
        if not value:
            continue

        metafields.append({
            "ownerId": variant_id,
            "namespace": "custom",
            "key": key,
            "type": "multi_line_text_field",
            "value": value,
        })

    if not metafields:
        return 0

    data = graphql(
        token,
        METAFIELDS_MUTATION,
        {
            "metafields": metafields
        }
    )

    result = data["metafieldsSet"]

    errors = result.get("userErrors") or []

    if errors:
        raise RuntimeError(
            f"metafieldsSet: {errors}"
        )

    return len(result.get("metafields") or [])


# ============================================================
# MAIN
# ============================================================

def main():

    if not os.path.exists(CSV_FILE):
        print(
            f"❌ No encuentro {CSV_FILE}"
        )
        sys.exit(1)

    token = get_access_token()

    with open(
        CSV_FILE,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:
        rows = list(csv.DictReader(f))

    print()
    print(
        f"📦 Variantes pendientes: {len(rows)}"
    )
    print()

    found = 0
    updated = 0
    not_found = 0
    errors = []

    for i, row in enumerate(rows, start=1):

        handle = (
            row.get("Handle") or ""
        ).strip()

        sku = (
            row.get("Variant SKU") or ""
        ).strip()

        barcode = (
            row.get("Variant Barcode") or ""
        ).strip()

        option = (
            row.get("Option1 Value") or ""
        ).strip()

        print(
            f"[{i}/{len(rows)}] "
            f"{handle} → {option} "
            f"(SKU {sku or '-'})"
        )

        try:

            variant = find_variant(
                token,
                sku,
                barcode,
                handle,
            )

            if not variant:

                print(
                    "   ❌ Variante no encontrada"
                )

                not_found += 1

                errors.append({
                    "handle": handle,
                    "sku": sku,
                    "barcode": barcode,
                    "error":
                        "Variante no encontrada",
                })

                continue

            found += 1

            count = set_variant_metafields(
                token,
                variant["id"],
                row,
            )

            updated += 1

            print(
                f"   ✅ {count} metafields"
            )

            # Pequeña pausa para evitar golpear
            # innecesariamente la API.
            time.sleep(0.1)

        except Exception as e:

            print(
                f"   ❌ ERROR: {e}"
            )

            errors.append({
                "handle": handle,
                "sku": sku,
                "barcode": barcode,
                "error": str(e),
            })

    # ========================================================
    # INFORME DE ERRORES
    # ========================================================

    if errors:

        with open(
            "errores_metafields_variantes.csv",
            "w",
            encoding="utf-8-sig",
            newline=""
        ) as f:

            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "handle",
                    "sku",
                    "barcode",
                    "error",
                ]
            )

            writer.writeheader()
            writer.writerows(errors)

    print()
    print("========================================")
    print("     RESULTADO METAFIELDS VARIANTES")
    print("========================================")
    print(f"Filas procesadas:       {len(rows)}")
    print(f"Variantes encontradas:  {found}")
    print(f"Variantes actualizadas: {updated}")
    print(f"No encontradas:         {not_found}")
    print(f"Errores:                {len(errors)}")

    if errors:
        print()
        print(
            "⚠️ Revisa:"
            " errores_metafields_variantes.csv"
        )

    print("========================================")


if __name__ == "__main__":
    main()