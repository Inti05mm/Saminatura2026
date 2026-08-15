import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
} from "react-router-dom";

const API = "/api";

export default function ShopifyAdminRoute({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [loading, setLoading] =
    useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] =
    useState(false);

  useEffect(() => {
    let alive = true;

    const checkSession =
      async () => {
        try {
          const response =
            await fetch(
              `${API}/admin/auth/me`,
              {
                /*
                 * Obligatorio para enviar
                 * la cookie HttpOnly.
                 */
                credentials:
                  "include",

                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          if (!alive) {
            return;
          }

          setAuthenticated(
            response.ok
          );
        } catch (
          error
        ) {
          console.error(
            "Admin session error:",
            error
          );

          if (alive) {
            setAuthenticated(
              false
            );
          }
        } finally {
          if (alive) {
            setLoading(
              false
            );
          }
        }
      };

    void checkSession();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1e8]">
        <p className="text-sm font-medium text-[#66715d]">
          Comprobando acceso…
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  return <>{children}</>;
}