import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { shopifyFetch } from "../../shopifyClient";

const CART_ID_KEY = "saminatura_shopify_cart_id";

export type ShopifyCartLine = {
  id: string;
  quantity: number;

  merchandise: {
    id: string;
    title: string;
    sku: string | null;

    image: {
      url: string;
      altText: string | null;
    } | null;

    price: {
      amount: string;
      currencyCode: string;
    };

    product: {
      title: string;
      handle: string;
      vendor: string;
    };
  };
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;

  cost: {
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };

    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };

  lines: {
    nodes: ShopifyCartLine[];
  };
};

type ShopifyCartContextType = {
  cart: ShopifyCart | null;
  loading: boolean;
  totalItems: number;

  addToCart: (
    variantId: string,
    quantity?: number
  ) => Promise<void>;

  removeFromCart: (
    lineId: string
  ) => Promise<void>;

  setQty: (
    lineId: string,
    quantity: number
  ) => Promise<void>;

  clearCart: () => Promise<void>;

  reloadCart: () => Promise<void>;

  goToCheckout: () => void;
};

const ShopifyCartContext =
  createContext<ShopifyCartContextType | null>(
    null
  );

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity

    cost {
      subtotalAmount {
        amount
        currencyCode
      }

      totalAmount {
        amount
        currencyCode
      }
    }

    lines(first: 100) {
      nodes {
        id
        quantity

        merchandise {
          ... on ProductVariant {
            id
            title
            sku

            image {
              url
              altText
            }

            price {
              amount
              currencyCode
            }

            product {
              title
              handle
              vendor
            }
          }
        }
      }
    }
  }
`;

const CREATE_CART = `
  mutation CartCreate(
    $input: CartInput
  ) {
    cartCreate(input: $input) {
      cart {
        ...CartFields
      }

      userErrors {
        field
        message
        code
      }
    }
  }

  ${CART_FRAGMENT}
`;

const GET_CART = `
  query GetCart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }

  ${CART_FRAGMENT}
`;

const ADD_LINES = `
  mutation CartLinesAdd(
    $cartId: ID!,
    $lines: [CartLineInput!]!
  ) {
    cartLinesAdd(
      cartId: $cartId,
      lines: $lines
    ) {
      cart {
        ...CartFields
      }

      userErrors {
        field
        message
        code
      }
    }
  }

  ${CART_FRAGMENT}
`;

const UPDATE_LINES = `
  mutation CartLinesUpdate(
    $cartId: ID!,
    $lines: [CartLineUpdateInput!]!
  ) {
    cartLinesUpdate(
      cartId: $cartId,
      lines: $lines
    ) {
      cart {
        ...CartFields
      }

      userErrors {
        field
        message
        code
      }
    }
  }

  ${CART_FRAGMENT}
`;

const REMOVE_LINES = `
  mutation CartLinesRemove(
    $cartId: ID!,
    $lineIds: [ID!]!
  ) {
    cartLinesRemove(
      cartId: $cartId,
      lineIds: $lineIds
    ) {
      cart {
        ...CartFields
      }

      userErrors {
        field
        message
        code
      }
    }
  }

  ${CART_FRAGMENT}
`;

function getStoredCartId() {
  try {
    return localStorage.getItem(
      CART_ID_KEY
    );
  } catch {
    return null;
  }
}

function storeCartId(id: string) {
  try {
    localStorage.setItem(
      CART_ID_KEY,
      id
    );
  } catch {
    // No rompemos la aplicación.
  }
}

function removeStoredCartId() {
  try {
    localStorage.removeItem(
      CART_ID_KEY
    );
  } catch {
    // Sin acción.
  }
}

function checkErrors(
  errors:
    | {
        message: string;
        code?: string;
      }[]
    | undefined
) {
  if (!errors?.length) {
    return;
  }

  throw new Error(
    errors
      .map((error) => error.message)
      .join(" | ")
  );
}

export function ShopifyCartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] =
    useState<ShopifyCart | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const totalItems = useMemo(
    () => cart?.totalQuantity ?? 0,
    [cart]
  );

  const createCart = async (
    variantId?: string,
    quantity = 1
  ) => {
    const lines = variantId
      ? [
          {
            merchandiseId:
              variantId,
            quantity,
          },
        ]
      : [];

    const data =
      await shopifyFetch<{
        cartCreate: {
          cart: ShopifyCart | null;
          userErrors: {
            message: string;
            code?: string;
          }[];
        };
      }>(
        CREATE_CART,
        {
          input: {
            lines,
          },
        }
      );

    checkErrors(
      data.cartCreate.userErrors
    );

    const newCart =
      data.cartCreate.cart;

    if (!newCart) {
      throw new Error(
        "Shopify no devolvió la cesta."
      );
    }

    setCart(newCart);
    storeCartId(newCart.id);

    return newCart;
  };

  const reloadCart =
    async () => {
      const cartId =
        getStoredCartId();

      if (!cartId) {
        setCart(null);
        return;
      }

      setLoading(true);

      try {
        const data =
          await shopifyFetch<{
            cart: ShopifyCart | null;
          }>(
            GET_CART,
            {
              id: cartId,
            }
          );

        /*
          Shopify puede devolver null si
          esa cesta ya ha caducado.
        */
        if (!data.cart) {
          removeStoredCartId();
          setCart(null);
          return;
        }

        setCart(data.cart);
      } catch (error) {
        console.error(
          "Error recuperando carrito Shopify:",
          error
        );

        /*
          No eliminamos automáticamente
          el ID ante cualquier error de red.
        */
      } finally {
        setLoading(false);
      }
    };

  const addToCart = async (
    variantId: string,
    quantity = 1
  ) => {
    if (
      !variantId ||
      quantity <= 0
    ) {
      return;
    }

    setLoading(true);

    try {
      const cartId =
        cart?.id ??
        getStoredCartId();

      /*
        Si todavía no existe carrito,
        lo creamos directamente con
        el producto.
      */
      if (!cartId) {
        await createCart(
          variantId,
          quantity
        );

        return;
      }

      const data =
        await shopifyFetch<{
          cartLinesAdd: {
            cart: ShopifyCart | null;
            userErrors: {
              message: string;
              code?: string;
            }[];
          };
        }>(
          ADD_LINES,
          {
            cartId,
            lines: [
              {
                merchandiseId:
                  variantId,
                quantity,
              },
            ],
          }
        );

      checkErrors(
        data.cartLinesAdd.userErrors
      );

      if (
        !data.cartLinesAdd.cart
      ) {
        throw new Error(
          "Shopify no devolvió la cesta actualizada."
        );
      }

      setCart(
        data.cartLinesAdd.cart
      );
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart =
    async (lineId: string) => {
      const cartId =
        cart?.id ??
        getStoredCartId();

      if (
        !cartId ||
        !lineId
      ) {
        return;
      }

      setLoading(true);

      try {
        const data =
          await shopifyFetch<{
            cartLinesRemove: {
              cart:
                ShopifyCart | null;
              userErrors: {
                message: string;
                code?: string;
              }[];
            };
          }>(
            REMOVE_LINES,
            {
              cartId,
              lineIds: [lineId],
            }
          );

        checkErrors(
          data.cartLinesRemove
            .userErrors
        );

        if (
          data.cartLinesRemove.cart
        ) {
          setCart(
            data.cartLinesRemove
              .cart
          );
        }
      } finally {
        setLoading(false);
      }
    };

  const setQty = async (
    lineId: string,
    quantity: number
  ) => {
    if (quantity <= 0) {
      await removeFromCart(
        lineId
      );

      return;
    }

    const cartId =
      cart?.id ??
      getStoredCartId();

    if (
      !cartId ||
      !lineId
    ) {
      return;
    }

    setLoading(true);

    try {
      const data =
        await shopifyFetch<{
          cartLinesUpdate: {
            cart:
              ShopifyCart | null;
            userErrors: {
              message: string;
              code?: string;
            }[];
          };
        }>(
          UPDATE_LINES,
          {
            cartId,
            lines: [
              {
                id: lineId,
                quantity,
              },
            ],
          }
        );

      checkErrors(
        data.cartLinesUpdate
          .userErrors
      );

      if (
        data.cartLinesUpdate.cart
      ) {
        setCart(
          data.cartLinesUpdate
            .cart
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const clearCart =
    async () => {
      const currentCart =
        cart;

      if (
        !currentCart ||
        currentCart.lines.nodes
          .length === 0
      ) {
        removeStoredCartId();
        setCart(null);
        return;
      }

      const lineIds =
        currentCart.lines.nodes.map(
          (line) => line.id
        );

      setLoading(true);

      try {
        const data =
          await shopifyFetch<{
            cartLinesRemove: {
              cart:
                ShopifyCart | null;
              userErrors: {
                message: string;
                code?: string;
              }[];
            };
          }>(
            REMOVE_LINES,
            {
              cartId:
                currentCart.id,
              lineIds,
            }
          );

        checkErrors(
          data.cartLinesRemove
            .userErrors
        );

        /*
          Dejamos la cesta Shopify
          existente, pero vacía.
        */
        if (
          data.cartLinesRemove.cart
        ) {
          setCart(
            data.cartLinesRemove
              .cart
          );
        }
      } finally {
        setLoading(false);
      }
    };

  const goToCheckout = () => {
    if (!cart?.checkoutUrl) {
      return;
    }

    window.location.href =
      cart.checkoutUrl;
  };

  useEffect(() => {
    void reloadCart();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ShopifyCartContext.Provider
      value={{
        cart,
        loading,
        totalItems,
        addToCart,
        removeFromCart,
        setQty,
        clearCart,
        reloadCart,
        goToCheckout,
      }}
    >
      {children}
    </ShopifyCartContext.Provider>
  );
}

export function useShopifyCart() {
  const context =
    useContext(
      ShopifyCartContext
    );

  if (!context) {
    throw new Error(
      "useShopifyCart debe usarse dentro de <ShopifyCartProvider>"
    );
  }

  return context;
}