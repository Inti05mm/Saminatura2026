import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  customerAccountFetch,
} from "../../shopifyCustomerApi";

import {
  useShopifyCustomer,
} from "./ShopifyCustomerContext";

type ShopifyFavoriteRow = {
  variant_id: string;
};

type ShopifyFavoritesContextValue = {
  favorites: ShopifyFavoriteRow[];
  loading: boolean;
  favoriteCount: number;

  isFavorite: (
    variantId: string
  ) => boolean;

  addFavorite: (
    variantId: string
  ) => Promise<void>;

  removeFavorite: (
    variantId: string
  ) => Promise<void>;

  toggleFavorite: (
    variantId: string
  ) => Promise<void>;

  refreshFavorites:
    () => Promise<void>;
};

const ShopifyFavoritesContext =
  createContext<
    ShopifyFavoritesContextValue | null
  >(null);

/*
  v2 porque ahora guardamos VARIANTES Shopify,
  no productos padre.

  Ejemplo:
  gid://shopify/ProductVariant/123...
*/
const GUEST_FAVORITES_KEY =
  "saminatura_guest_favorite_variants_shopify_v2";

const PENDING_FAVORITE_KEY =
  "saminatura_pending_favorite_variant_v2";

const FAVORITES_NAMESPACE =
  "custom";

const FAVORITES_KEY =
  "favorites";

function isShopifyVariantId(
  value: string
) {
  return value.startsWith(
    "gid://shopify/ProductVariant/"
  );
}

function normalizeVariantIds(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: string[] = [];
  const seen =
    new Set<string>();

  for (const item of value) {
    const id =
      String(item ?? "").trim();

    /*
      Ignoramos IDs antiguos de Product.
      Así no se marcan todas las variantes
      de un mismo producto.
    */
    if (
      !id ||
      !isShopifyVariantId(id) ||
      seen.has(id)
    ) {
      continue;
    }

    seen.add(id);
    result.push(id);
  }

  return result;
}

function rowsFromIds(
  ids: string[]
): ShopifyFavoriteRow[] {
  return normalizeVariantIds(
    ids
  ).map(
    (variant_id) => ({
      variant_id,
    })
  );
}

function readGuestFavorites():
  ShopifyFavoriteRow[] {
  try {
    const raw =
      localStorage.getItem(
        GUEST_FAVORITES_KEY
      );

    if (!raw) {
      return [];
    }

    return rowsFromIds(
      JSON.parse(raw)
    );
  } catch {
    return [];
  }
}

function writeGuestFavorites(
  favorites:
    ShopifyFavoriteRow[]
) {
  try {
    localStorage.setItem(
      GUEST_FAVORITES_KEY,
      JSON.stringify(
        normalizeVariantIds(
          favorites.map(
            (favorite) =>
              favorite.variant_id
          )
        )
      )
    );
  } catch {
    // No rompemos la app.
  }
}

function clearGuestFavorites() {
  try {
    localStorage.removeItem(
      GUEST_FAVORITES_KEY
    );
  } catch {
    // Sin acción.
  }
}

function readPendingFavorite():
  string | null {
  try {
    const value =
      localStorage.getItem(
        PENDING_FAVORITE_KEY
      );

    const id =
      String(value ?? "").trim();

    return isShopifyVariantId(
      id
    )
      ? id
      : null;
  } catch {
    return null;
  }
}

function clearPendingFavorite() {
  try {
    localStorage.removeItem(
      PENDING_FAVORITE_KEY
    );
  } catch {
    // Sin acción.
  }
}

type FavoritesQueryResponse = {
  customer: {
    id: string;

    metafield:
      | {
          value: string;
        }
      | null;
  } | null;
};

const FAVORITES_QUERY = `
  query CustomerFavorites {
    customer {
      id

      metafield(
        namespace: "${FAVORITES_NAMESPACE}"
        key: "${FAVORITES_KEY}"
      ) {
        value
      }
    }
  }
`;

type FavoritesMutationResponse = {
  metafieldsSet: {
    metafields:
      | Array<{
          id: string;
          value: string;
        }>
      | null;

    userErrors: Array<{
      field:
        | string[]
        | null;

      message: string;

      code:
        | string
        | null;
    }>;
  };
};

const FAVORITES_MUTATION = `
  mutation SetCustomerFavorites(
    $metafields: [MetafieldsSetInput!]!
  ) {
    metafieldsSet(
      metafields: $metafields
    ) {
      metafields {
        id
        value
      }

      userErrors {
        field
        message
        code
      }
    }
  }
`;

async function getRemoteFavorites() {
  const data =
    await customerAccountFetch<
      FavoritesQueryResponse
    >(
      FAVORITES_QUERY
    );

  const customer =
    data.customer;

  if (!customer) {
    throw new Error(
      "No se pudo obtener el cliente Shopify."
    );
  }

  let ids: string[] = [];

  const raw =
    customer.metafield
      ?.value;

  if (raw) {
    try {
      ids =
        normalizeVariantIds(
          JSON.parse(raw)
        );
    } catch {
      ids = [];
    }
  }

  return {
    customerId:
      customer.id,

    ids,
  };
}

async function saveRemoteFavorites(
  customerId: string,
  ids: string[]
) {
  const cleanIds =
    normalizeVariantIds(ids);

  const data =
    await customerAccountFetch<
      FavoritesMutationResponse
    >(
      FAVORITES_MUTATION,
      {
        metafields: [
          {
            ownerId:
              customerId,

            namespace:
              FAVORITES_NAMESPACE,

            key:
              FAVORITES_KEY,

            type:
              "json",

            value:
              JSON.stringify(
                cleanIds
              ),
          },
        ],
      }
    );

  const errors =
    data.metafieldsSet
      .userErrors ?? [];

  if (errors.length > 0) {
    throw new Error(
      errors
        .map(
          (error) =>
            error.message
        )
        .join("\n")
    );
  }
}

export function ShopifyFavoritesProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const {
    loggedIn,
    loading:
      customerLoading,
  } =
    useShopifyCustomer();

  const [
    favorites,
    setFavorites,
  ] =
    useState<
      ShopifyFavoriteRow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const favoritesRef =
    useRef<
      ShopifyFavoriteRow[]
    >([]);

  const setFavoritesSafely =
    useCallback(
      (
        next:
          ShopifyFavoriteRow[]
      ) => {
        const ids =
          normalizeVariantIds(
            next.map(
              (
                favorite
              ) =>
                favorite.variant_id
            )
          );

        const normalized =
          rowsFromIds(ids);

        favoritesRef.current =
          normalized;

        setFavorites(
          normalized
        );
      },
      []
    );

  useEffect(() => {
    favoritesRef.current =
      favorites;
  }, [favorites]);

  const refreshFavorites =
    useCallback(
      async () => {
        if (
          customerLoading
        ) {
          return;
        }

        setLoading(true);

        try {
          if (!loggedIn) {
            setFavoritesSafely(
              readGuestFavorites()
            );

            return;
          }

          const remote =
            await getRemoteFavorites();

          const guestIds =
            readGuestFavorites().map(
              (
                favorite
              ) =>
                favorite.variant_id
            );

          const pendingId =
            readPendingFavorite();

          const mergedIds =
            normalizeVariantIds([
              ...remote.ids,
              ...guestIds,
              ...(pendingId
                ? [
                    pendingId,
                  ]
                : []),
            ]);

          const remoteChanged =
            JSON.stringify(
              mergedIds
            ) !==
            JSON.stringify(
              normalizeVariantIds(
                remote.ids
              )
            );

          if (
            remoteChanged
          ) {
            await saveRemoteFavorites(
              remote.customerId,
              mergedIds
            );
          }

          clearGuestFavorites();
          clearPendingFavorite();

          setFavoritesSafely(
            rowsFromIds(
              mergedIds
            )
          );
        } catch (error) {
          console.error(
            "Error cargando favoritos Shopify:",
            error
          );

          if (!loggedIn) {
            setFavoritesSafely(
              readGuestFavorites()
            );
          } else {
            setFavoritesSafely(
              []
            );
          }
        } finally {
          setLoading(false);
        }
      },
      [
        customerLoading,
        loggedIn,
        setFavoritesSafely,
      ]
    );

  useEffect(() => {
    void refreshFavorites();
  }, [
    refreshFavorites,
  ]);

  const isFavorite =
    useCallback(
      (
        variantId:
          string
      ) =>
        favorites.some(
          (
            favorite
          ) =>
            favorite.variant_id ===
            String(
              variantId
            )
        ),
      [favorites]
    );

  const addFavorite =
    useCallback(
      async (
        variantId:
          string
      ) => {
        const id =
          String(
            variantId ??
              ""
          ).trim();

        if (
          !isShopifyVariantId(
            id
          )
        ) {
          return;
        }

        const alreadyExists =
          favoritesRef.current.some(
            (
              favorite
            ) =>
              favorite.variant_id ===
              id
          );

        if (
          alreadyExists
        ) {
          return;
        }

        const previous =
          favoritesRef.current;

        const next =
          rowsFromIds([
            id,

            ...previous.map(
              (
                favorite
              ) =>
                favorite.variant_id
            ),
          ]);

        setFavoritesSafely(
          next
        );

        try {
          if (!loggedIn) {
            writeGuestFavorites(
              next
            );

            return;
          }

          const remote =
            await getRemoteFavorites();

          const remoteNext =
            normalizeVariantIds([
              id,
              ...remote.ids,
            ]);

          await saveRemoteFavorites(
            remote.customerId,
            remoteNext
          );

          setFavoritesSafely(
            rowsFromIds(
              remoteNext
            )
          );
        } catch (error) {
          setFavoritesSafely(
            previous
          );

          throw error;
        }
      },
      [
        loggedIn,
        setFavoritesSafely,
      ]
    );

  const removeFavorite =
    useCallback(
      async (
        variantId:
          string
      ) => {
        const id =
          String(
            variantId ??
              ""
          ).trim();

        if (
          !isShopifyVariantId(
            id
          )
        ) {
          return;
        }

        const previous =
          favoritesRef.current;

        const exists =
          previous.some(
            (
              favorite
            ) =>
              favorite.variant_id ===
              id
          );

        if (!exists) {
          return;
        }

        const next =
          previous.filter(
            (
              favorite
            ) =>
              favorite.variant_id !==
              id
          );

        setFavoritesSafely(
          next
        );

        try {
          if (!loggedIn) {
            writeGuestFavorites(
              next
            );

            return;
          }

          const remote =
            await getRemoteFavorites();

          const remoteNext =
            remote.ids.filter(
              (
                remoteId
              ) =>
                remoteId !==
                id
            );

          await saveRemoteFavorites(
            remote.customerId,
            remoteNext
          );

          setFavoritesSafely(
            rowsFromIds(
              remoteNext
            )
          );
        } catch (error) {
          setFavoritesSafely(
            previous
          );

          throw error;
        }
      },
      [
        loggedIn,
        setFavoritesSafely,
      ]
    );

  const toggleFavorite =
    useCallback(
      async (
        variantId:
          string
      ) => {
        const id =
          String(
            variantId ??
              ""
          ).trim();

        if (
          !isShopifyVariantId(
            id
          )
        ) {
          return;
        }

        const current =
          favoritesRef.current.some(
            (
              favorite
            ) =>
              favorite.variant_id ===
              id
          );

        if (current) {
          await removeFavorite(
            id
          );
        } else {
          await addFavorite(
            id
          );
        }
      },
      [
        addFavorite,
        removeFavorite,
      ]
    );

  const value =
    useMemo(
      () => ({
        favorites,

        loading:
          loading ||
          customerLoading,

        favoriteCount:
          favorites.length,

        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        refreshFavorites,
      }),
      [
        favorites,
        loading,
        customerLoading,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        refreshFavorites,
      ]
    );

  return (
    <ShopifyFavoritesContext.Provider
      value={value}
    >
      {children}
    </ShopifyFavoritesContext.Provider>
  );
}

export function useShopifyFavorites() {
  const context =
    useContext(
      ShopifyFavoritesContext
    );

  if (!context) {
    throw new Error(
      "useShopifyFavorites debe utilizarse dentro de ShopifyFavoritesProvider"
    );
  }

  return context;
}