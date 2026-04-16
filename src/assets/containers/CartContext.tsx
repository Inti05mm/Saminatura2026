import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { UserContext } from "./UserContext";

type CartItem = { product_id: number; qty: number };
type Cart = { items: CartItem[] };

type CartContextType = {
  cart: Cart;
  loading: boolean;
  totalItems: number;
  addToCart: (productId: number, qty?: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  setQty: (productId: number, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  reloadCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);
const emptyCart: Cart = { items: [] };

// ✅ NUEVO: clave de localStorage (cesta invitado)
const LS_KEY = "cart_v1";

function safeParseCart(raw: string | null): Cart {
  if (!raw) return emptyCart;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return emptyCart;

    const items: CartItem[] = parsed.items
      .map((i: any) => ({
        product_id: Number(i?.product_id),
        qty: Number(i?.qty),
      }))
      .filter(
        (i: CartItem) =>
          Number.isFinite(i.product_id) &&
          i.product_id > 0 &&
          Number.isFinite(i.qty) &&
          i.qty > 0
      );

    return { items };
  } catch {
    return emptyCart;
  }
}

function writeLocalCart(c: Cart) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch {
    // si el navegador bloquea storage o está lleno, no rompemos la app
  }
}

function readLocalCart(): Cart {
  try {
    return safeParseCart(localStorage.getItem(LS_KEY));
  } catch {
    return emptyCart;
  }
}

// ✅ Limpieza: elimina del carrito IDs que no existan en products
async function pruneMissingProducts(inputCart: Cart): Promise<{ cart: Cart; removedIds: number[] }> {
  const ids = (inputCart.items ?? []).map((i) => Number(i.product_id)).filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) return { cart: inputCart, removedIds: [] };

  // Dedup para query más pequeña
  const uniqueIds = Array.from(new Set(ids));

  // Si hay muchísimos IDs, por seguridad los troceamos
  const chunkSize = 200;
  const existing = new Set<number>();

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);

    const { data, error } = await supabase
      .from("public_products")
      .select("id")
      .in("id", chunk);

    // Si falla por RLS / red, no podamos “adivinar” qué falta.
    // No tocamos el carrito para no borrar cosas incorrectamente.
    if (error) {
      console.warn("No se pudo validar productos del carrito:", error.message);
      return { cart: inputCart, removedIds: [] };
    }

    for (const row of data ?? []) {
      const id = Number((row as any)?.id);
      if (Number.isFinite(id)) existing.add(id);
    }
  }

  const removedIds = uniqueIds.filter((id) => !existing.has(id));
  if (removedIds.length === 0) return { cart: inputCart, removedIds: [] };

  const cleaned: Cart = {
    items: (inputCart.items ?? []).filter((i) => existing.has(Number(i.product_id))),
  };

  return { cart: cleaned, removedIds };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useContext(UserContext);

  const [cart, setCart] = useState<Cart>(emptyCart);
  const [loading, setLoading] = useState(false);

  const totalItems = useMemo(
    () => (cart.items ?? []).reduce((acc, i) => acc + (Number(i.qty) || 0), 0),
    [cart]
  );

  // ✅ evita bucle: reloadCart -> saveCart -> state -> effects -> reloadCart ...
  const pruningRef = useRef(false);

  // ✅ Guardar: siempre actualiza estado + localStorage
  // - si hay user => también DB
  const saveCart = async (newCart: Cart) => {
    if (initializing) return;

    // 1) Siempre guardamos local (invita2 + backup)
    const normalized = safeParseCart(JSON.stringify(newCart));
    setCart(normalized);
    writeLocalCart(normalized);

    // 2) Si NO hay user, terminamos aquí (guest)
    if (!user) return;

    // 3) Si hay user, intentamos DB
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ cart: normalized })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      console.error("Error guardando cart:", error.message);
      // no alertamos: no queremos molestar en cada click
      // el carrito seguirá funcionando en local igualmente
      return;
    }
  };

  // ✅ Recarga: si hay user => DB; si no hay user => localStorage
  const reloadCart = async () => {
    if (initializing) return;
    if (pruningRef.current) return;

    // Invitado -> localStorage
    if (!user) {
      const local = readLocalCart();

      pruningRef.current = true;
      try {
        const { cart: cleaned, removedIds } = await pruneMissingProducts(local);

        // Solo guardamos si cambió algo
        if (removedIds.length > 0) {
          await saveCart(cleaned);
        } else {
          setCart(local);
        }
      } finally {
        pruningRef.current = false;
      }

      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("cart")
      .eq("id", user.id)
      .single();

    setLoading(false);

    if (error) {
      console.error("Error cargando cart:", error.message);
      // si falla DB, al menos no rompas: usa local (por si hay algo)
      const local = readLocalCart();

      pruningRef.current = true;
      try {
        const { cart: cleaned, removedIds } = await pruneMissingProducts(local);
        if (removedIds.length > 0) await saveCart(cleaned);
        else setCart(local);
      } finally {
        pruningRef.current = false;
      }

      return;
    }

    const c = data?.cart;

    // Tu DB cart es jsonb; tu código esperaba {items:[...]}
    if (!c || !Array.isArray((c as any).items)) {
      setCart(emptyCart);
      writeLocalCart(emptyCart);
      return;
    }

    const normalized = safeParseCart(JSON.stringify(c));

    // ✅ aquí limpiamos IDs que ya no existen
    pruningRef.current = true;
    try {
      const { cart: cleaned, removedIds } = await pruneMissingProducts(normalized);

      if (removedIds.length > 0) {
        await saveCart(cleaned); // guarda limpio en DB + local
      } else {
        setCart(normalized);
        writeLocalCart(normalized);
      }
    } finally {
      pruningRef.current = false;
    }
  };

  const addToCart = async (productId: number, qty: number = 1) => {
    const items = [...(cart.items ?? [])];
    const idx = items.findIndex((i) => i.product_id === productId);

    if (idx >= 0) items[idx] = { ...items[idx], qty: (items[idx].qty ?? 0) + qty };
    else items.push({ product_id: productId, qty });

    await saveCart({ items });
  };

  const removeFromCart = async (productId: number) => {
    await saveCart({ items: (cart.items ?? []).filter((i) => i.product_id !== productId) });
  };

  const setQty = async (productId: number, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);

    await saveCart({
      items: (cart.items ?? []).map((i) => (i.product_id === productId ? { ...i, qty } : i)),
    });
  };

  const clearCart = async () => {
    await saveCart(emptyCart);
  };

  // ✅ Cuando termina initializing o cambia el user:
  // - Invitado: carga localStorage
  // - Logueado: carga DB (y copia local)
  useEffect(() => {
    if (initializing) return;
    reloadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, user?.id]);

  // ✅ BONUS: si el usuario se loguea y había carrito invitado, lo “fusionamos” una vez
  useEffect(() => {
    const mergeGuestIntoUser = async () => {
      if (initializing) return;
      if (!user) return;

      const guestCart = readLocalCart();
      if (!guestCart.items.length) return;

      // Si ya hay cart en DB cargado en estado, fusionamos con el actual (cart state)
      const mergedMap = new Map<number, number>();
      for (const i of cart.items ?? []) mergedMap.set(i.product_id, (mergedMap.get(i.product_id) ?? 0) + i.qty);
      for (const i of guestCart.items) mergedMap.set(i.product_id, (mergedMap.get(i.product_id) ?? 0) + i.qty);

      let merged: Cart = {
        items: Array.from(mergedMap.entries()).map(([product_id, qty]) => ({ product_id, qty })),
      };

      // ✅ limpiamos también el merged (por si el guest tenía IDs borrados)
      pruningRef.current = true;
      try {
        const pruned = await pruneMissingProducts(merged);
        merged = pruned.cart;

        // Guardamos merged en DB + local
        await saveCart(merged);

        // Limpiamos local para no re-merge cada vez
        try {
          localStorage.removeItem(LS_KEY);
        } catch {}
      } finally {
        pruningRef.current = false;
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    mergeGuestIntoUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <CartContext.Provider
      value={{ cart, loading, totalItems, addToCart, removeFromCart, setQty, clearCart, reloadCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}