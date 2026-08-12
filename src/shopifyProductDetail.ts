import { shopifyFetch } from "./shopifyClient";

export type ShopifyDetailMetafield = {
  value: string;
} | null;

export type ShopifyDetailVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  sku: string | null;
  barcode: string | null;

  price: {
    amount: string;
    currencyCode: string;
  };

  compareAtPrice: {
    amount: string;
    currencyCode: string;
  } | null;

  image: {
    url: string;
    altText: string | null;
  } | null;

  ingredients: ShopifyDetailMetafield;
  nutritionalInfo: ShopifyDetailMetafield;
  usageInstructions: ShopifyDetailMetafield;
  warnings: ShopifyDetailMetafield;
  allergens: ShopifyDetailMetafield;
  usageTips: ShopifyDetailMetafield;
  medicalDisclaimer: ShopifyDetailMetafield;
  legalRegulation: ShopifyDetailMetafield;
};

export type ShopifyDetailProduct = {
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

  images: {
    nodes: {
      url: string;
      altText: string | null;
    }[];
  };

  bio: ShopifyDetailMetafield;
  vegan: ShopifyDetailMetafield;
  glutenFree: ShopifyDetailMetafield;
  lactoseFree: ShopifyDetailMetafield;

  ingredients: ShopifyDetailMetafield;
  nutritionalInfo: ShopifyDetailMetafield;
  usageInstructions: ShopifyDetailMetafield;
  warnings: ShopifyDetailMetafield;
  allergens: ShopifyDetailMetafield;
  usageTips: ShopifyDetailMetafield;
  medicalDisclaimer: ShopifyDetailMetafield;
  legalRegulation: ShopifyDetailMetafield;

  variants: {
    nodes: ShopifyDetailVariant[];
  };
};

type ProductResponse = {
  productByHandle: ShopifyDetailProduct | null;
};

const PRODUCT_DETAIL_QUERY = `
  query ProductDetail($handle: String!) {
    productByHandle(handle: $handle) {
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

      images(first: 20) {
        nodes {
          url
          altText
        }
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

      ingredients: metafield(
        namespace: "custom"
        key: "ingredientes"
      ) {
        value
      }

      nutritionalInfo: metafield(
        namespace: "custom"
        key: "informacion_nutricional"
      ) {
        value
      }

      usageInstructions: metafield(
        namespace: "custom"
        key: "instrucciones_uso"
      ) {
        value
      }

      warnings: metafield(
        namespace: "custom"
        key: "advertencias"
      ) {
        value
      }

      allergens: metafield(
        namespace: "custom"
        key: "alergenos"
      ) {
        value
      }

      usageTips: metafield(
        namespace: "custom"
        key: "consejos_uso"
      ) {
        value
      }

      medicalDisclaimer: metafield(
        namespace: "custom"
        key: "aviso_medico"
      ) {
        value
      }

      legalRegulation: metafield(
        namespace: "custom"
        key: "regulacion_legal"
      ) {
        value
      }

      variants(first: 100) {
        nodes {
          id
          title
          availableForSale
          quantityAvailable
          sku
          barcode

          price {
            amount
            currencyCode
          }

          compareAtPrice {
            amount
            currencyCode
          }

          image {
            url
            altText
          }

          ingredients: metafield(
            namespace: "custom"
            key: "ingredientes"
          ) {
            value
          }

          nutritionalInfo: metafield(
            namespace: "custom"
            key: "informacion_nutricional"
          ) {
            value
          }

          usageInstructions: metafield(
            namespace: "custom"
            key: "instrucciones_uso"
          ) {
            value
          }

          warnings: metafield(
            namespace: "custom"
            key: "advertencias"
          ) {
            value
          }

          allergens: metafield(
            namespace: "custom"
            key: "alergenos"
          ) {
            value
          }

          usageTips: metafield(
            namespace: "custom"
            key: "consejos_uso"
          ) {
            value
          }

          medicalDisclaimer: metafield(
            namespace: "custom"
            key: "aviso_medico"
          ) {
            value
          }

          legalRegulation: metafield(
            namespace: "custom"
            key: "regulacion_legal"
          ) {
            value
          }
        }
      }
    }
  }
`;

export async function getShopifyProductByHandle(
  handle: string
) {
  const data =
    await shopifyFetch<ProductResponse>(
      PRODUCT_DETAIL_QUERY,
      {
        handle,
      }
    );

  return data.productByHandle;
}