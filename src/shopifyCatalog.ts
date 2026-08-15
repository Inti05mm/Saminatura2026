import { shopifyFetch } from "./shopifyClient";

export type ShopifyCatalogProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];

  featuredImage: {
    url: string;
    altText: string | null;
  } | null;

  variants: {
    nodes: {
      id: string;
      title: string;
      sku: string | null;
      barcode: string | null;
      availableForSale: boolean;
      quantityAvailable: number | null;

      image: {
        url: string;
        altText: string | null;
      } | null;

      price: {
        amount: string;
        currencyCode: string;
      };

      compareAtPrice: {
        amount: string;
        currencyCode: string;
      } | null;
    }[];
  };

  bio: { value: string } | null;
  vegan: { value: string } | null;
  glutenFree: { value: string } | null;
  lactoseFree: { value: string } | null;

  promoType: { value: string } | null;
  promoActive: { value: string } | null;
};

type ProductsResponse = {
  products: {
    nodes: ShopifyCatalogProduct[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

const PRODUCTS_QUERY = `
  query Products(
    $first: Int!,
    $after: String
  ) {
    products(
      first: $first
      after: $after
      sortKey: TITLE
    ) {
      nodes {
        id
        handle
        title
        description
        vendor
        productType
        tags

        featuredImage {
          url
          altText
        }

        bio: metafield(
          namespace: "custom"
          key: "bio"
        ) {
          value
        }

        vegan: metafield(
          namespace: "custom"
          key: "vegan"
        ) {
          value
        }

        glutenFree: metafield(
          namespace: "custom"
          key: "gluten_free"
        ) {
          value
        }

        lactoseFree: metafield(
          namespace: "custom"
          key: "lactose_free"
        ) {
          value
        }

        promoType: metafield(
          namespace: "custom"
          key: "promo_type"
        ) {
          value
        }

        promoActive: metafield(
          namespace: "custom"
          key: "promo_active"
        ) {
          value
        }

        variants(first: 100) {
          nodes {
            id
            title
            sku
            barcode
            availableForSale
            quantityAvailable

            image {
              url
              altText
            }

            price {
              amount
              currencyCode
            }

            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getAllShopifyProducts() {
  const all: ShopifyCatalogProduct[] = [];

  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data =
      await shopifyFetch<ProductsResponse>(
        PRODUCTS_QUERY,
        {
          first: 100,
          after,
        }
      );

    all.push(
      ...data.products.nodes
    );

    hasNextPage =
      data.products.pageInfo
        .hasNextPage;

    after =
      data.products.pageInfo
        .endCursor;
  }

  return all;
}