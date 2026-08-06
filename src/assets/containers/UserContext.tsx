import {
  createContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  initializing: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  initializing: true,
});

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // No hacemos nada si localStorage no está disponible.
  }
}

export function UserProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!ignore) {
          setUser(data.session?.user ?? null);
        }
      } catch {
        await supabase.auth.signOut().catch(() => {});
        clearSupabaseStorage();

        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setInitializing(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setInitializing(false);
      }
    );

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        initializing,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}