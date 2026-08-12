import { useEffect, useState } from "react";
import { shopifyFetch } from "./shopifyClient";

type Product = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  description: string;
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        quantityAvailable: number | null;
        barcode: string | null;
      };
    }[];
  };
};

type ShopifyResponse = {
  products: {
    edges: {
      node: Product;
    }[];
  };
};

const PRODUCTS_QUERY = `
  query Products {
    products(first: 10) {
      edges {
        node {
          id
          title
          handle
          vendor
          description

          featuredImage {
            url
            altText
          }

          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }

          variants(first: 10) {
            edges {
              node {
                id
                title
                availableForSale
                quantityAvailable
                barcode
              }
            }
          }
        }
      }
    }
  }
`;

export default function ShopifyTest() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await shopifyFetch<ShopifyResponse>(PRODUCTS_QUERY);

        setProducts(data.products.edges.map((edge) => edge.node));
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Error desconocido consultando Shopify"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        Cargando Shopify...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-red-600">
        <h1 className="mb-4 text-2xl font-bold">
          Error Shopify
        </h1>

        <pre className="whitespace-pre-wrap">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="mb-8 text-3xl font-bold">
        Productos desde Shopify
      </h1>

      {products.length === 0 ? (
        <p>No se encontraron productos.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border p-5"
            >
              {product.featuredImage && (
                <img
                  src={product.featuredImage.url}
                  alt={
                    product.featuredImage.altText ||
                    product.title
                  }
                  className="mb-4 h-48 w-full object-contain"
                />
              )}

              <h2 className="text-xl font-semibold">
                {product.title}
              </h2>

              <p className="mt-1">
                Marca: {product.vendor || "Sin marca"}
              </p>

              <p className="mt-2 text-lg font-bold">
                {
                  product.priceRange.minVariantPrice
                    .amount
                }{" "}
                {
                  product.priceRange.minVariantPrice
                    .currencyCode
                }
              </p>

              <div className="mt-4 text-sm">
                {product.variants.edges.map(
                  ({ node }) => (
                    <div
                      key={node.id}
                      className="mt-3 rounded border p-3"
                    >
                      <div>
                        Variante: {node.title}
                      </div>

                      <div>
                        Disponible:{" "}
                        {node.availableForSale
                          ? "Sí"
                          : "No"}
                      </div>

                      <div>
                        Stock:{" "}
                        {node.quantityAvailable ??
                          "No disponible"}
                      </div>

                      <div>
                        Barcode:{" "}
                        {node.barcode ??
                          "Sin barcode"}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}