const SHOPIFY_STORE_DOMAIN =
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;

const SHOPIFY_API_VERSION = "2026-07";

export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {

  console.log(
    "Dominio Shopify:",
    SHOPIFY_STORE_DOMAIN
  );

  const url =
    `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  console.log("URL Shopify:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const text = await response.text();

  console.log("STATUS SHOPIFY:", response.status);
  console.log("RESPUESTA SHOPIFY:", text);

  if (!response.ok) {
    throw new Error(
      `Shopify HTTP ${response.status}: ${text}`
    );
  }

  const json = JSON.parse(text);

  if (json.errors) {
    console.error(
      "Errores GraphQL:",
      json.errors
    );

    throw new Error(
      JSON.stringify(json.errors, null, 2)
    );
  }

  return json.data as T;
}