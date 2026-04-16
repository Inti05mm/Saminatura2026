import { useEffect, useState, createContext } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabaseClient";

type SupaUser = any;

interface UserContextType {
  user: SupaUser | null;
  setUser: (user: SupaUser | null) => void;
  initializing: boolean; // 👈 para saber si ya cargó la sesión
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  initializing: true,
});

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!ignore) setUser(data.session?.user ?? null);
      } catch {
        // Si hay token roto en localStorage, resetea
        await supabase.auth.signOut().catch(() => {});
        clearSupabaseStorage();
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setInitializing(false);
      }
    };

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, initializing }}>
      {children}
    </UserContext.Provider>
  );
};
