import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

type FavoriteRow = {
  id: number;
  product_id: number;
};

type FavoritesContextValue = {
  favorites: FavoriteRow[];
  loading: boolean;
  favoriteCount: number;
  isFavorite: (productId: number) => boolean;
  addFavorite: (productId: number) => Promise<void>;
  removeFavorite: (productId: number) => Promise<void>;
  toggleFavorite: (productId: number) => Promise<void>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext =
  createContext<FavoritesContextValue | null>(null);

const GUEST_FAVORITES_KEY =
  "saminatura_guest_favorites_v1";

const PENDING_FAVORITE_KEY =
  "saminatura_pending_favorite_v1";

function normalizeFavoriteRows(value: unknown): FavoriteRow[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const result: FavoriteRow[] = [];

  for (const item of value) {
    const productId = Number((item as any)?.product_id);

    if (
      !Number.isFinite(productId) ||
      productId <= 0 ||
      seen.has(productId)
    ) {
      continue;
    }

    seen.add(productId);

    result.push({
      id: Number((item as any)?.id) || -Date.now() - result.length,
      product_id: productId,
    });
  }

  return result;
}

function readGuestFavorites(): FavoriteRow[] {
  try {
    const raw = localStorage.getItem(
      GUEST_FAVORITES_KEY
    );

    if (!raw) return [];

    return normalizeFavoriteRows(
      JSON.parse(raw)
    );
  } catch {
    return [];
  }
}

function writeGuestFavorites(
  favorites: FavoriteRow[]
) {
  try {
    localStorage.setItem(
      GUEST_FAVORITES_KEY,
      JSON.stringify(
        normalizeFavoriteRows(favorites)
      )
    );
  } catch {
    // No rompemos la aplicación si el navegador bloquea localStorage.
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

function readPendingFavorite(): number | null {
  try {
    const raw = localStorage.getItem(
      PENDING_FAVORITE_KEY
    );

    if (!raw) return null;

    const productId = Number(raw);

    return Number.isFinite(productId) &&
      productId > 0
      ? productId
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

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [favorites, setFavorites] =
    useState<FavoriteRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const favoritesRef =
    useRef<FavoriteRow[]>([]);

  const setFavoritesSafely =
    useCallback(
      (next: FavoriteRow[]) => {
        const normalized =
          normalizeFavoriteRows(next);

        favoritesRef.current =
          normalized;

        setFavorites(normalized);
      },
      []
    );

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const refreshFavorites =
    useCallback(async () => {
      setLoading(true);

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          setFavoritesSafely(
            readGuestFavorites()
          );
          return;
        }

        const { data, error } =
          await supabase
            .from("favorites")
            .select("id, product_id")
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            });

        if (error) {
          throw error;
        }

        const remoteFavorites =
          normalizeFavoriteRows(
            data ?? []
          );

        const guestFavorites =
          readGuestFavorites();

        const pendingFavoriteId =
          readPendingFavorite();

        const localProductIds = [
          ...guestFavorites.map(
            (favorite) =>
              favorite.product_id
          ),
          ...(pendingFavoriteId
            ? [pendingFavoriteId]
            : []),
        ];

        const uniqueLocalProductIds =
          Array.from(
            new Set(localProductIds)
          );

        if (
          uniqueLocalProductIds.length > 0
        ) {
          const remoteProductIds =
            new Set(
              remoteFavorites.map(
                (favorite) =>
                  favorite.product_id
              )
            );

          const missingGuestIds =
            uniqueLocalProductIds.filter(
              (productId) =>
                !remoteProductIds.has(
                  productId
                )
            );

          if (missingGuestIds.length > 0) {
            const { error: insertError } =
              await supabase
                .from("favorites")
                .upsert(
                  missingGuestIds.map(
                    (productId) => ({
                      user_id: user.id,
                      product_id:
                        productId,
                    })
                  ),
                  {
                    onConflict:
                      "user_id,product_id",
                    ignoreDuplicates:
                      true,
                  }
                );

            if (insertError) {
              throw insertError;
            }
          }

          clearGuestFavorites();
          clearPendingFavorite();

          const {
            data: refreshedData,
            error: refreshedError,
          } = await supabase
            .from("favorites")
            .select("id, product_id")
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            });

          if (refreshedError) {
            throw refreshedError;
          }

          setFavoritesSafely(
            normalizeFavoriteRows(
              refreshedData ?? []
            )
          );

          return;
        }

        setFavoritesSafely(
          remoteFavorites
        );
      } catch (error) {
        console.error(
          "Error cargando favoritos:",
          error
        );

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          setFavoritesSafely(
            readGuestFavorites()
          );
        } else {
          setFavoritesSafely([]);
        }
      } finally {
        setLoading(false);
      }
    }, [setFavoritesSafely]);

  useEffect(() => {
    void refreshFavorites();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session?.user) {
            setFavoritesSafely(
              readGuestFavorites()
            );
            setLoading(false);
            return;
          }

          void refreshFavorites();
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [
    refreshFavorites,
    setFavoritesSafely,
  ]);

  const isFavorite = useCallback(
    (productId: number) =>
      favorites.some(
        (favorite) =>
          favorite.product_id ===
          productId
      ),
    [favorites]
  );

  const addFavorite = useCallback(
    async (productId: number) => {
      const normalizedProductId =
        Number(productId);

      if (
        !Number.isFinite(
          normalizedProductId
        ) ||
        normalizedProductId <= 0
      ) {
        return;
      }

      const alreadyExists =
        favoritesRef.current.some(
          (favorite) =>
            favorite.product_id ===
            normalizedProductId
        );

      if (alreadyExists) return;

      const previousFavorites =
        favoritesRef.current;

      const temporaryFavorite: FavoriteRow =
        {
          id: -Date.now(),
          product_id:
            normalizedProductId,
        };

      const optimisticFavorites = [
        temporaryFavorite,
        ...previousFavorites,
      ];

      setFavoritesSafely(
        optimisticFavorites
      );

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          writeGuestFavorites(
            optimisticFavorites
          );
          return;
        }

        const { data, error } =
          await supabase
            .from("favorites")
            .insert({
              user_id: user.id,
              product_id:
                normalizedProductId,
            })
            .select("id, product_id")
            .single();

        if (error) {
          if (error.code === "23505") {
            await refreshFavorites();
            return;
          }

          throw error;
        }

        const updated =
          favoritesRef.current.map(
            (favorite) =>
              favorite.product_id ===
              normalizedProductId
                ? {
                    id: Number(
                      data.id
                    ),
                    product_id: Number(
                      data.product_id
                    ),
                  }
                : favorite
          );

        setFavoritesSafely(updated);
      } catch (error) {
        setFavoritesSafely(
          previousFavorites
        );

        throw error;
      }
    },
    [
      refreshFavorites,
      setFavoritesSafely,
    ]
  );

  const removeFavorite = useCallback(
    async (productId: number) => {
      const normalizedProductId =
        Number(productId);

      const previousFavorites =
        favoritesRef.current;

      const exists =
        previousFavorites.some(
          (favorite) =>
            favorite.product_id ===
            normalizedProductId
        );

      if (!exists) return;

      const optimisticFavorites =
        previousFavorites.filter(
          (favorite) =>
            favorite.product_id !==
            normalizedProductId
        );

      setFavoritesSafely(
        optimisticFavorites
      );

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          writeGuestFavorites(
            optimisticFavorites
          );
          return;
        }

        const { error } =
          await supabase
            .from("favorites")
            .delete()
            .eq(
              "product_id",
              normalizedProductId
            )
            .eq("user_id", user.id);

        if (error) {
          throw error;
        }
      } catch (error) {
        setFavoritesSafely(
          previousFavorites
        );

        throw error;
      }
    },
    [setFavoritesSafely]
  );

  const toggleFavorite =
    useCallback(
      async (productId: number) => {
        const currentlyFavorite =
          favoritesRef.current.some(
            (favorite) =>
              favorite.product_id ===
              Number(productId)
          );

        if (currentlyFavorite) {
          await removeFavorite(
            productId
          );
        } else {
          await addFavorite(productId);
        }
      },
      [addFavorite, removeFavorite]
    );

  const value = useMemo(
    () => ({
      favorites,
      loading,
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
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      refreshFavorites,
    ]
  );

  return (
    <FavoritesContext.Provider
      value={value}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context =
    useContext(FavoritesContext);

  if (!context) {
    throw new Error(
      "useFavorites debe utilizarse dentro de FavoritesProvider"
    );
  }

  return context;
}