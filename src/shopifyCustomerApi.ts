import {
  getShopifyCustomerAccessToken,
} from "./shopifyCustomerAuth";

const SHOP_DOMAIN =
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();

type CustomerApiConfig = {
  graphql_api: string;
};

type ShopifyUserError = {
  field: string[] | null;
  message: string;
  code?: string | null;
};

/* ============================================================
   MONEY
   ============================================================ */

export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

/* ============================================================
   DIRECCIONES
   ============================================================ */

export type ShopifyCustomerAddress = {
  id: string;

  firstName: string | null;
  lastName: string | null;

  company: string | null;

  address1: string | null;
  address2: string | null;

  city: string | null;

  province: string | null;
  zoneCode: string | null;

  country: string | null;
  territoryCode: string | null;

  zip: string | null;

  phoneNumber: string | null;

  formattedArea: string | null;
};

/* ============================================================
   PEDIDOS
   ============================================================ */

export type ShopifyOrderLineItem = {
  id: string;

  name: string;
  title: string;

  quantity: number;

  sku: string | null;

  vendor: string | null;

  variantTitle: string | null;

  productId: string | null;
  variantId: string | null;

  image: {
    url: string;
    altText: string | null;
  } | null;

  price: ShopifyMoney | null;

  totalPrice: ShopifyMoney | null;
};

export type ShopifyCustomerOrder = {
  id: string;

  name: string;
  number: number;

  confirmationNumber: string | null;

  createdAt: string;
  processedAt: string;
  updatedAt: string;

  financialStatus: string | null;

  fulfillmentStatus: string;

  email: string | null;
  phone: string | null;

  cancelledAt: string | null;

  requiresShipping: boolean;

  subtotal: ShopifyMoney | null;

  totalShipping: ShopifyMoney;

  totalTax: ShopifyMoney | null;

  totalRefunded: ShopifyMoney;

  totalPrice: ShopifyMoney;

  shippingAddress:
    | ShopifyCustomerAddress
    | null;

  lineItems: {
    nodes: ShopifyOrderLineItem[];
  };

  statusPageUrl: string;
};

/* ============================================================
   CLIENTE
   ============================================================ */

export type ShopifyCustomer = {
  id: string;

  firstName: string | null;
  lastName: string | null;

  displayName: string;

  emailAddress: {
    emailAddress: string;
  } | null;

  phoneNumber: {
    phoneNumber: string;
  } | null;

  defaultAddress:
    | ShopifyCustomerAddress
    | null;

  addresses: {
    nodes: ShopifyCustomerAddress[];
  };

  orders: {
    nodes: ShopifyCustomerOrder[];
  };
};

/* ============================================================
   INPUTS
   ============================================================ */

export type UpdateCustomerInput = {
  firstName?: string;
  lastName?: string;
};

export type CustomerAddressInput = {
  firstName?: string;
  lastName?: string;

  company?: string;

  address1: string;
  address2?: string;

  city: string;

  territoryCode: string;
  zoneCode?: string;

  zip: string;

  phoneNumber?: string;
};

/* ============================================================
   HELPERS
   ============================================================ */

function ensureShopDomain() {
  if (!SHOP_DOMAIN) {
    throw new Error(
      "Falta VITE_SHOPIFY_STORE_DOMAIN."
    );
  }
}

function throwUserErrors(
  errors:
    | ShopifyUserError[]
    | undefined
    | null
) {
  if (!errors?.length) {
    return;
  }

  throw new Error(
    errors
      .map(
        (error) =>
          error.message
      )
      .join("\n")
  );
}

/* ============================================================
   CUSTOMER ACCOUNT API CONFIG
   ============================================================ */

export async function getCustomerApiConfig(): Promise<CustomerApiConfig> {
  ensureShopDomain();

  const response = await fetch(
    `https://${SHOP_DOMAIN}/.well-known/customer-account-api`
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener Customer Account API (${response.status}).`
    );
  }

  return response.json();
}

/* ============================================================
   CUSTOMER ACCOUNT FETCH
   ============================================================ */

export async function customerAccountFetch<T>(
  query: string,
  variables: Record<
    string,
    unknown
  > = {}
): Promise<T> {
  const accessToken =
    getShopifyCustomerAccessToken();

  if (!accessToken) {
    throw new Error(
      "No hay sesión Shopify activa."
    );
  }

  const config =
    await getCustomerApiConfig();

  const response = await fetch(
    config.graphql_api,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          accessToken,
      },

      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );

  const raw =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Customer Account API ${response.status}: ${raw}`
    );
  }

  let parsed: any;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "Shopify devolvió una respuesta no válida."
    );
  }

  if (
    parsed.errors?.length
  ) {
    throw new Error(
      parsed.errors
        .map(
          (error: any) =>
            error.message ??
            JSON.stringify(
              error
            )
        )
        .join("\n")
    );
  }

  return parsed.data as T;
}

/* ============================================================
   CLIENTE + DIRECCIONES + PEDIDOS
   ============================================================ */

const CUSTOMER_QUERY = `
  query Customer {
    customer {
      id

      firstName
      lastName
      displayName

      emailAddress {
        emailAddress
      }

      phoneNumber {
        phoneNumber
      }

      defaultAddress {
        id

        firstName
        lastName

        company

        address1
        address2

        city

        province
        zoneCode

        country
        territoryCode

        zip
        phoneNumber

        formattedArea
      }

      addresses(first: 50) {
        nodes {
          id

          firstName
          lastName

          company

          address1
          address2

          city

          province
          zoneCode

          country
          territoryCode

          zip
          phoneNumber

          formattedArea
        }
      }

      orders(
        first: 20
        reverse: true
      ) {
        nodes {
          id

          name
          number

          confirmationNumber

          createdAt
          processedAt
          updatedAt

          financialStatus
          fulfillmentStatus

          email
          phone

          cancelledAt

          requiresShipping

          subtotal {
            amount
            currencyCode
          }

          totalShipping {
            amount
            currencyCode
          }

          totalTax {
            amount
            currencyCode
          }

          totalRefunded {
            amount
            currencyCode
          }

          totalPrice {
            amount
            currencyCode
          }

          shippingAddress {
            id

            firstName
            lastName

            company

            address1
            address2

            city

            province
            zoneCode

            country
            territoryCode

            zip
            phoneNumber

            formattedArea
          }

          lineItems(first: 100) {
            nodes {
              id

              name
              title

              quantity

              sku

              vendor

              variantTitle

              productId
              variantId

              image {
                url
                altText
              }

              price {
                amount
                currencyCode
              }

              totalPrice {
                amount
                currencyCode
              }
            }
          }

          statusPageUrl
        }
      }
    }
  }
`;

export async function getShopifyCustomer() {
  const data =
    await customerAccountFetch<{
      customer: ShopifyCustomer;
    }>(
      CUSTOMER_QUERY
    );

  return data.customer;
}

/* ============================================================
   ACTUALIZAR NOMBRE / APELLIDOS
   ============================================================ */

const CUSTOMER_UPDATE_MUTATION = `
  mutation CustomerUpdate(
    $input: CustomerUpdateInput!
  ) {
    customerUpdate(
      input: $input
    ) {
      customer {
        id
        firstName
        lastName
        displayName

        emailAddress {
          emailAddress
        }

        phoneNumber {
          phoneNumber
        }
      }

      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function updateShopifyCustomer(
  input: UpdateCustomerInput
) {
  const data =
    await customerAccountFetch<{
      customerUpdate: {
        customer:
          | {
              id: string;

              firstName:
                | string
                | null;

              lastName:
                | string
                | null;

              displayName: string;

              emailAddress: {
                emailAddress: string;
              } | null;

              phoneNumber: {
                phoneNumber: string;
              } | null;
            }
          | null;

        userErrors: ShopifyUserError[];
      };
    }>(
      CUSTOMER_UPDATE_MUTATION,
      {
        input,
      }
    );

  throwUserErrors(
    data.customerUpdate
      .userErrors
  );

  if (
    !data.customerUpdate
      .customer
  ) {
    throw new Error(
      "Shopify no devolvió el cliente actualizado."
    );
  }

  return data.customerUpdate
    .customer;
}

/* ============================================================
   CREAR DIRECCIÓN
   ============================================================ */

const ADDRESS_CREATE_MUTATION = `
  mutation CustomerAddressCreate(
    $address: CustomerAddressInput!
    $defaultAddress: Boolean
  ) {
    customerAddressCreate(
      address: $address
      defaultAddress: $defaultAddress
    ) {
      customerAddress {
        id

        firstName
        lastName

        company

        address1
        address2

        city

        province
        zoneCode

        country
        territoryCode

        zip
        phoneNumber

        formattedArea
      }

      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function createShopifyCustomerAddress(
  address: CustomerAddressInput,
  defaultAddress = false
) {
  const data =
    await customerAccountFetch<{
      customerAddressCreate: {
        customerAddress:
          | ShopifyCustomerAddress
          | null;

        userErrors: ShopifyUserError[];
      };
    }>(
      ADDRESS_CREATE_MUTATION,
      {
        address,
        defaultAddress,
      }
    );

  throwUserErrors(
    data.customerAddressCreate
      .userErrors
  );

  if (
    !data
      .customerAddressCreate
      .customerAddress
  ) {
    throw new Error(
      "No se pudo crear la dirección."
    );
  }

  return data
    .customerAddressCreate
    .customerAddress;
}

/* ============================================================
   ACTUALIZAR DIRECCIÓN
   ============================================================ */

const ADDRESS_UPDATE_MUTATION = `
  mutation CustomerAddressUpdate(
    $addressId: ID!
    $address: CustomerAddressInput!
    $defaultAddress: Boolean
  ) {
    customerAddressUpdate(
      addressId: $addressId
      address: $address
      defaultAddress: $defaultAddress
    ) {
      customerAddress {
        id

        firstName
        lastName

        company

        address1
        address2

        city

        province
        zoneCode

        country
        territoryCode

        zip
        phoneNumber

        formattedArea
      }

      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function updateShopifyCustomerAddress(
  addressId: string,
  address: CustomerAddressInput,
  defaultAddress = false
) {
  const data =
    await customerAccountFetch<{
      customerAddressUpdate: {
        customerAddress:
          | ShopifyCustomerAddress
          | null;

        userErrors: ShopifyUserError[];
      };
    }>(
      ADDRESS_UPDATE_MUTATION,
      {
        addressId,
        address,
        defaultAddress,
      }
    );

  throwUserErrors(
    data.customerAddressUpdate
      .userErrors
  );

  if (
    !data
      .customerAddressUpdate
      .customerAddress
  ) {
    throw new Error(
      "No se pudo actualizar la dirección."
    );
  }

  return data
    .customerAddressUpdate
    .customerAddress;
}

/* ============================================================
   ELIMINAR DIRECCIÓN
   ============================================================ */

const ADDRESS_DELETE_MUTATION = `
  mutation CustomerAddressDelete(
    $addressId: ID!
  ) {
    customerAddressDelete(
      addressId: $addressId
    ) {
      deletedAddressId

      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function deleteShopifyCustomerAddress(
  addressId: string
) {
  const data =
    await customerAccountFetch<{
      customerAddressDelete: {
        deletedAddressId:
          | string
          | null;

        userErrors: ShopifyUserError[];
      };
    }>(
      ADDRESS_DELETE_MUTATION,
      {
        addressId,
      }
    );

  throwUserErrors(
    data.customerAddressDelete
      .userErrors
  );

  return data
    .customerAddressDelete
    .deletedAddressId;
}