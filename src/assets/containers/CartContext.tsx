import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../supabaseClient";
import { UserContext } from "./UserContext";

type CartItem = {
  product_id: number;
  qty: number;
};

type Cart = {
  items: CartItem[];
};

type CartContextType = {
  cart: Cart;
  loading: boolean;
  totalItems: number;
  addToCart: (
    productId: number,
    qty?: number
  ) => Promise<void>;
  removeFromCart: (
    productId: number
  ) => Promise<void>;
  setQty: (
    productId: number,
    qty: number
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  reloadCart: () => Promise<void>;
};

const CartContext =
  createContext<CartContextType | null>(
    null
  );

const emptyCart: Cart = {
  items: [],
};

/*
  Esta clave se utiliza únicamente para
  la cesta de una persona sin iniciar sesión.
*/
const GUEST_CART_KEY =
  "saminatura_guest_cart_v1";

/*
  Clave antigua.

  La conservamos temporalmente para migrar
  la cesta que ya pudiera existir antes
  de realizar este cambio.
*/
const OLD_CART_KEY = "cart_v1";

function safeParseCart(
  raw: string | null
): Cart {
  if (!raw) {
    return emptyCart;
  }

  try {
    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.items)
    ) {
      return emptyCart;
    }

    const items: CartItem[] =
      parsed.items
        .map((item: any) => ({
          product_id: Number(
            item?.product_id
          ),
          qty: Number(
            item?.qty
          ),
        }))
        .filter(
          (item: CartItem) =>
            Number.isFinite(
              item.product_id
            ) &&
            item.product_id > 0 &&
            Number.isFinite(
              item.qty
            ) &&
            item.qty > 0
        );

    return {
      items,
    };
  } catch {
    return emptyCart;
  }
}

function writeGuestCart(
  cart: Cart
) {
  try {
    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify(cart)
    );
  } catch {
    /*
      Si el navegador bloquea
      localStorage, no rompemos la app.
    */
  }
}

function readGuestCart(): Cart {
  try {
    const currentCart =
      localStorage.getItem(
        GUEST_CART_KEY
      );

    if (currentCart) {
      return safeParseCart(
        currentCart
      );
    }

    /*
      Migración de la clave antigua.

      Si todavía existe cart_v1,
      la pasamos una sola vez a la
      nueva clave de invitado.
    */
    const oldCart =
      localStorage.getItem(
        OLD_CART_KEY
      );

    if (oldCart) {
      const parsedOldCart =
        safeParseCart(oldCart);

      writeGuestCart(
        parsedOldCart
      );

      localStorage.removeItem(
        OLD_CART_KEY
      );

      return parsedOldCart;
    }

    return emptyCart;
  } catch {
    return emptyCart;
  }
}

function clearGuestCart() {
  try {
    localStorage.removeItem(
      GUEST_CART_KEY
    );

    localStorage.removeItem(
      OLD_CART_KEY
    );
  } catch {
    // Sin acción.
  }
}

/*
  Fusiona la cesta guardada en la cuenta
  con la cesta creada como invitado.

  Aquí sí se suman las cantidades porque
  ambas cestas son diferentes:

  - una procede de Supabase;
  - otra procede del modo invitado.

  Ya no se mezcla el estado React con la
  misma copia de localStorage.
*/
function mergeCarts(
  accountCart: Cart,
  guestCart: Cart
): Cart {
  const mergedMap =
    new Map<number, number>();

  for (const item of
    accountCart.items ?? []) {
    mergedMap.set(
      item.product_id,
      item.qty
    );
  }

  for (const item of
    guestCart.items ?? []) {
    const previousQty =
      mergedMap.get(
        item.product_id
      ) ?? 0;

    mergedMap.set(
      item.product_id,
      previousQty + item.qty
    );
  }

  return {
    items: Array.from(
      mergedMap.entries()
    ).map(
      ([product_id, qty]) => ({
        product_id,
        qty,
      })
    ),
  };
}

/*
  Elimina del carrito productos que
  ya no existen en public_products.
*/
async function pruneMissingProducts(
  inputCart: Cart
): Promise<{
  cart: Cart;
  removedIds: number[];
}> {
  const ids =
    (inputCart.items ?? [])
      .map((item) =>
        Number(
          item.product_id
        )
      )
      .filter(
        (productId) =>
          Number.isFinite(
            productId
          ) &&
          productId > 0
      );

  if (ids.length === 0) {
    return {
      cart: inputCart,
      removedIds: [],
    };
  }

  const uniqueIds =
    Array.from(
      new Set(ids)
    );

  const chunkSize = 200;

  const existing =
    new Set<number>();

  for (
    let index = 0;
    index < uniqueIds.length;
    index += chunkSize
  ) {
    const chunk =
      uniqueIds.slice(
        index,
        index + chunkSize
      );

    const { data, error } =
      await supabase
        .from(
          "public_products"
        )
        .select("id")
        .in("id", chunk);

    /*
      Si falla la consulta no eliminamos
      nada, porque no podemos saber qué
      producto existe realmente.
    */
    if (error) {
      console.warn(
        "No se pudo validar productos del carrito:",
        error.message
      );

      return {
        cart: inputCart,
        removedIds: [],
      };
    }

    for (const row of
      data ?? []) {
      const id = Number(
        (row as any)?.id
      );

      if (
        Number.isFinite(id)
      ) {
        existing.add(id);
      }
    }
  }

  const removedIds =
    uniqueIds.filter(
      (id) =>
        !existing.has(id)
    );

  if (
    removedIds.length === 0
  ) {
    return {
      cart: inputCart,
      removedIds: [],
    };
  }

  const cleaned: Cart = {
    items:
      (inputCart.items ?? [])
        .filter((item) =>
          existing.has(
            Number(
              item.product_id
            )
          )
        ),
  };

  return {
    cart: cleaned,
    removedIds,
  };
}

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    initializing,
  } =
    useContext(UserContext);

  const [cart, setCart] =
    useState<Cart>(emptyCart);

  const [loading, setLoading] =
    useState(false);

  const totalItems =
    useMemo(
      () =>
        (cart.items ?? []).reduce(
          (total, item) =>
            total +
            (Number(
              item.qty
            ) || 0),
          0
        ),
      [cart]
    );

  /*
    Evita ejecutar varias cargas o
    limpiezas al mismo tiempo.
  */
  const processingRef =
    useRef(false);

  /*
    Guarda el carrito.

    Sin sesión:
    - estado React;
    - localStorage invitado.

    Con sesión:
    - estado React;
    - Supabase.

    La cesta del usuario registrado ya
    no se guarda en la clave del invitado.
  */
  const saveCart = async (
    newCart: Cart
  ) => {
    if (initializing) {
      return;
    }

    const normalized =
      safeParseCart(
        JSON.stringify(
          newCart
        )
      );

    setCart(normalized);

    /*
      INVITADO
    */
    if (!user) {
      writeGuestCart(
        normalized
      );

      return;
    }

    /*
      USUARIO REGISTRADO
    */
    setLoading(true);

    try {
      const { error } =
        await supabase
          .from("profiles")
          .update({
            cart: normalized,
          })
          .eq("id", user.id);

      if (error) {
        console.error(
          "Error guardando cart:",
          error.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
    Carga el carrito.

    Sin sesión:
    - carga desde localStorage.

    Con sesión:
    - carga el carrito de Supabase;
    - lee la cesta invitada;
    - fusiona ambas una sola vez;
    - guarda el resultado en Supabase;
    - elimina la cesta invitada.
  */
  const reloadCart = async () => {
    if (initializing) {
      return;
    }

    if (
      processingRef.current
    ) {
      return;
    }

    processingRef.current =
      true;

    setLoading(true);

    try {
      /*
        INVITADO
      */
      if (!user) {
        const guestCart =
          readGuestCart();

        const {
          cart: cleaned,
          removedIds,
        } =
          await pruneMissingProducts(
            guestCart
          );

        setCart(cleaned);

        if (
          removedIds.length >
          0
        ) {
          writeGuestCart(
            cleaned
          );
        }

        return;
      }

      /*
        USUARIO REGISTRADO
      */
      const guestCart =
        readGuestCart();

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select("cart")
          .eq("id", user.id)
          .single();

      if (error) {
        console.error(
          "Error cargando cart:",
          error.message
        );

        /*
          Si falla Supabase mantenemos
          temporalmente la cesta invitada.
        */
        const {
          cart: cleanedGuest,
        } =
          await pruneMissingProducts(
            guestCart
          );

        setCart(
          cleanedGuest
        );

        return;
      }

      const accountCart =
        data?.cart &&
        Array.isArray(
          (data.cart as any)
            .items
        )
          ? safeParseCart(
              JSON.stringify(
                data.cart
              )
            )
          : emptyCart;

      /*
        Solo fusionamos la cesta invitada
        real con la cesta real de Supabase.
      */
      const mergedCart =
        guestCart.items.length >
        0
          ? mergeCarts(
              accountCart,
              guestCart
            )
          : accountCart;

      const {
        cart: cleanedMerged,
      } =
        await pruneMissingProducts(
          mergedCart
        );

      setCart(
        cleanedMerged
      );

      /*
        Si había una cesta invitada o se
        eliminaron productos inválidos,
        guardamos el resultado en Supabase.
      */
      const needsUpdate =
        guestCart.items.length >
          0 ||
        JSON.stringify(
          cleanedMerged
        ) !==
          JSON.stringify(
            accountCart
          );

      if (needsUpdate) {
        const {
          error: updateError,
        } =
          await supabase
            .from("profiles")
            .update({
              cart:
                cleanedMerged,
            })
            .eq(
              "id",
              user.id
            );

        if (updateError) {
          console.error(
            "Error fusionando la cesta invitada:",
            updateError.message
          );

          /*
            No eliminamos la cesta local
            si no se pudo guardar.
          */
          return;
        }
      }

      /*
        Solo se elimina después de haber
        guardado correctamente la fusión.
      */
      if (
        guestCart.items.length >
        0
      ) {
        clearGuestCart();
      }
    } finally {
      processingRef.current =
        false;

      setLoading(false);
    }
  };

  const addToCart = async (
    productId: number,
    qty: number = 1
  ) => {
    const items = [
      ...(cart.items ?? []),
    ];

    const index =
      items.findIndex(
        (item) =>
          item.product_id ===
          productId
      );

    if (index >= 0) {
      items[index] = {
        ...items[index],
        qty:
          (items[index].qty ??
            0) + qty,
      };
    } else {
      items.push({
        product_id:
          productId,
        qty,
      });
    }

    await saveCart({
      items,
    });
  };

  const removeFromCart =
    async (
      productId: number
    ) => {
      await saveCart({
        items:
          (cart.items ?? [])
            .filter(
              (item) =>
                item.product_id !==
                productId
            ),
      });
    };

  const setQty = async (
    productId: number,
    qty: number
  ) => {
    if (qty <= 0) {
      await removeFromCart(
        productId
      );

      return;
    }

    await saveCart({
      items:
        (cart.items ?? [])
          .map((item) =>
            item.product_id ===
            productId
              ? {
                  ...item,
                  qty,
                }
              : item
          ),
    });
  };

  const clearCart =
    async () => {
      await saveCart(
        emptyCart
      );
    };

  /*
    Este es ahora el único efecto.

    Antes había dos efectos:
    - reloadCart();
    - mergeGuestIntoUser();

    Los dos se ejecutaban al iniciar sesión
    y provocaban la duplicación.

    Ahora reloadCart realiza la carga y la
    fusión en un único proceso.
  */
  useEffect(() => {
    if (initializing) {
      return;
    }

    void reloadCart();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initializing,
    user?.id,
  ]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        totalItems,
        addToCart,
        removeFromCart,
        setQty,
        clearCart,
        reloadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart debe usarse dentro de <CartProvider>"
    );
  }

  return context;
}