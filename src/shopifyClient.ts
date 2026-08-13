const SHOPIFY_STORE_DOMAIN =
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();

const SHOPIFY_STOREFRONT_ACCESS_TOKEN =
  import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();

const SHOPIFY_API_VERSION = "2026-07";

function ensureShopifyConfig() {
  if (!SHOPIFY_STORE_DOMAIN) {
    throw new Error(
      "Falta VITE_SHOPIFY_STORE_DOMAIN en el .env.local"
    );
  }

  if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error(
      "Falta VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN en el .env.local"
    );
  }
}

export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  ensureShopifyConfig();

  const url =
    `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  console.log(
    "Dominio Shopify:",
    SHOPIFY_STORE_DOMAIN
  );

  console.log(
    "URL Shopify:",
    url
  );

  const response = await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "X-Shopify-Storefront-Access-Token":
          SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
      },

      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );

  const text =
    await response.text();

  console.log(
    "STATUS SHOPIFY:",
    response.status
  );

  console.log(
    "RESPUESTA SHOPIFY:",
    text
  );

  if (!response.ok) {
    throw new Error(
      `Shopify HTTP ${response.status}: ${text}`
    );
  }

  let json: any;

  try {
    json =
      JSON.parse(text);
  } catch {
    throw new Error(
      "Shopify devolvió una respuesta que no es JSON válido."
    );
  }

  if (
    json.errors?.length
  ) {
    console.error(
      "Errores GraphQL:",
      json.errors
    );

    throw new Error(
      JSON.stringify(
        json.errors,
        null,
        2
      )
    );
  }

  if (!json.data) {
    throw new Error(
      "Shopify no devolvió datos."
    );
  }

  return json.data as T;
}