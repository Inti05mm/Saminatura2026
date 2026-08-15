import ShopifyTest from "./ShopifyTest";

import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
} from "react";

/* ============================================================
   SUPABASE LEGACY

   Los mantenemos temporalmente porque todavía puedes tener
   páginas antiguas que usan estos contextos.

   IMPORTANTE:
   ya NO bloqueamos toda la aplicación esperando
   UserContext.initializing.
   ============================================================ */

import {
  UserProvider,
} from "./assets/containers/UserContext";

import {
  CartProvider,
} from "./assets/containers/CartContext";

/* ============================================================
   SHOPIFY CONTEXTS
   ============================================================ */

import {
  ShopifyCartProvider,
} from "./assets/containers/ShopifyCartContext";

import {
  ShopifyCustomerProvider,
} from "./assets/containers/ShopifyCustomerContext";

import {
  ShopifyFavoritesProvider,
} from "./assets/containers/ShopifyFavoritesContext";

/* ============================================================
   GENERAL
   ============================================================ */

import Header from "./assets/containers/Header";
import Footer from "./assets/containers/Footer";

/* ============================================================
   SHOPIFY - PÁGINAS PRINCIPALES
   ============================================================ */

import HomePage from "./assets/pages/ShopifyHomePage";

import ShopifyShopPage from "./assets/pages/ShopifyShopPage";

import ShopifyProductDetailPage from "./assets/pages/ShopifyProductDetailPage";

import ShopifyCartPage from "./assets/pages/ShopifyCartPage";

import ShopifyUserPage from "./assets/pages/ShopifyUserPage";

import ShopifyCustomerCallbackPage from "./assets/pages/ShopifyCustomerCallbackPage";

import ShopifyProfilePage from "./assets/pages/ShopifyProfilePage";

import ShopifyFavoritesPage from "./assets/pages/ShopifyFavoritesPage";

/* ============================================================
   TIENDA FÍSICA / COMUNIDAD
   ============================================================ */

import TiendaPage from "./assets/pages/TiendaPage";

import ComunidadPage from "./assets/pages/ComunidadPage";

/* ============================================================
   SHOPIFY ADMIN
   ============================================================ */

import ShopifyAdminPage from "./assets/pages/ShopifyAdminPage";

import ShopifyEditProductsPage from "./assets/pages/ShopifyEditProductsPage";

import ShopifyAdminLoginPage from "./assets/pages/ShopifyAdminLoginPage";

import ShopifyAdminRoute from "./assets/containers/ShopifyAdminRoute";

/* ============================================================
   LEGACY / SUPABASE
   ============================================================ */


import EditProductsPage from "./assets/pages/EditProductsPage";

import AdminOrdersPage from "./assets/pages/AdminOrderPage";

import CheckoutSuccessPage from "./assets/pages/CheckoutSuccessPage";

import ResetPasswordPage from "./assets/pages/ResetPasswordPage";

/* ============================================================
   LEGALES
   ============================================================ */

import EnviosDevolucionesPage from "./assets/pages/EnviosDevolucionesPage";

import CondicionesCompraPage from "./assets/pages/CondicionesCompraPage";

import CookiesPage from "./assets/pages/CookiesPage";

import PrivacidadPage from "./assets/pages/PrivacidadPage";

import AvisoLegalPage from "./assets/pages/AvisoLegalPage";


/* ============================================================
   SCROLL TO TOP
   ============================================================ */

function ScrollToTop() {
  const {
    pathname,
  } =
    useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [
    pathname,
  ]);

  return null;
}


/* ============================================================
   LEGAL PAGE
   ============================================================ */

function LegalPage({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex-1">
        {children}
      </div>

      <Footer />
    </div>
  );
}


/* ============================================================
   ROUTES
   ============================================================ */

function AppRoutes() {
  /*
    IMPORTANTE:

    Hemos eliminado esto:

      const { initializing } = useContext(UserContext);

      if (initializing) {
        return ...
      }

    porque pertenecía a Supabase y podía bloquear
    TODA la aplicación Shopify.
  */

  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* ================================================= */}
        {/* INICIO */}
        {/* ================================================= */}

        <Route
          path="/"
          element={
            <HomePage />
          }
        />


        {/* ================================================= */}
        {/* TIENDA SHOPIFY */}
        {/* ================================================= */}

        <Route
          path="/tienda"
          element={
            <ShopifyShopPage />
          }
        />

        <Route
          path="/tienda/:handle"
          element={
            <ShopifyProductDetailPage />
          }
        />


        {/* ================================================= */}
        {/* TIENDA FÍSICA */}
        {/* ================================================= */}

        <Route
          path="/Nuestratienda"
          element={
            <TiendaPage />
          }
        />


        {/* ================================================= */}
        {/* CESTA SHOPIFY */}
        {/* ================================================= */}

        <Route
          path="/micesta"
          element={
            <ShopifyCartPage />
          }
        />


        {/* ================================================= */}
        {/* USUARIO SHOPIFY */}
        {/* ================================================= */}

        <Route
          path="/usuario"
          element={
            <ShopifyUserPage />
          }
        />


        {/* ================================================= */}
        {/* PERFIL SHOPIFY */}
        {/* ================================================= */}

        <Route
          path="/perfil"
          element={
            <ShopifyProfilePage />
          }
        />


        {/* ================================================= */}
        {/* FAVORITOS SHOPIFY */}
        {/* ================================================= */}

        <Route
          path="/favoritos"
          element={
            <ShopifyFavoritesPage />
          }
        />


        {/* ================================================= */}
        {/* CALLBACK CUSTOMER ACCOUNT API

            NO CAMBIAR ESTA RUTA.
            Es la registrada en Shopify/ngrok.
        */}
        {/* ================================================= */}

        <Route
          path="/auth/shopify/callback"
          element={
            <ShopifyCustomerCallbackPage />
          }
        />


        {/* ================================================= */}
        {/* ADMIN SHOPIFY LOGIN */}
        {/* ================================================= */}

        <Route
          path="/admin/login"
          element={
            <ShopifyAdminLoginPage />
          }
        />


        {/* ================================================= */}
        {/* ADMIN SHOPIFY */}
        {/* ================================================= */}

        <Route
          path="/admin/shopify"
          element={
            <ShopifyAdminRoute>
              <ShopifyAdminPage />
            </ShopifyAdminRoute>
          }
        />

        <Route
          path="/admin/shopify/Productos"
          element={
            <ShopifyAdminRoute>
              <ShopifyEditProductsPage />
            </ShopifyAdminRoute>
          }
        />


        {/* ================================================= */}
        {/* COMUNIDAD */}
        {/* ================================================= */}

        <Route
          path="/comunidad"
          element={
            <ComunidadPage />
          }
        />


        <Route
          path="/modificarproductos"
          element={
            <EditProductsPage />
          }
        />

        <Route
          path="/admin/pedidos"
          element={
            <AdminOrdersPage />
          }
        />


        {/* ================================================= */}
        {/* CHECKOUT */}
        {/* ================================================= */}

        <Route
          path="/checkout/success"
          element={
            <CheckoutSuccessPage />
          }
        />


        {/* ================================================= */}
        {/* PROFILE COMPATIBILITY */}
        {/* ================================================= */}

        <Route
          path="/profile"
          element={
            <Navigate
              to="/perfil"
              replace
            />
          }
        />


        {/* ================================================= */}
        {/* LOGIN COMPATIBILITY */}
        {/* ================================================= */}

        <Route
          path="/login"
          element={
            <Navigate
              to="/usuario"
              replace
            />
          }
        />


        {/* ================================================= */}
        {/* SHOPIFY TEST */}
        {/* ================================================= */}

        <Route
          path="/shopify-test"
          element={
            <ShopifyTest />
          }
        />


        {/* ================================================= */}
        {/* RESET PASSWORD SUPABASE LEGACY */}
        {/* ================================================= */}

        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage />
          }
        />


        {/* ================================================= */}
        {/* PÁGINAS LEGALES */}
        {/* ================================================= */}

        <Route
          path="/legal/aviso-legal"
          element={
            <LegalPage>
              <AvisoLegalPage />
            </LegalPage>
          }
        />

        <Route
          path="/legal/privacidad"
          element={
            <LegalPage>
              <PrivacidadPage />
            </LegalPage>
          }
        />

        <Route
          path="/legal/cookies"
          element={
            <LegalPage>
              <CookiesPage />
            </LegalPage>
          }
        />

        <Route
          path="/legal/condiciones-compra"
          element={
            <LegalPage>
              <CondicionesCompraPage />
            </LegalPage>
          }
        />

        <Route
          path="/legal/envios-devoluciones"
          element={
            <LegalPage>
              <EnviosDevolucionesPage />
            </LegalPage>
          }
        />


        {/* ================================================= */}
        {/* DESCONOCIDA */}
        {/* ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </>
  );
}


/* ============================================================
   APP
   ============================================================ */

export default function App() {
  return (
    <Router>
      {/*
        SUPABASE LEGACY

        Se mantienen porque todavía hay páginas antiguas que
        podrían necesitarlos.

        Pero ya NO controlan el arranque de la aplicación.
      */}
      <UserProvider>
        <CartProvider>

          {/* SHOPIFY */}
          <ShopifyCartProvider>
            <ShopifyCustomerProvider>
              <ShopifyFavoritesProvider>
                <AppRoutes />
              </ShopifyFavoritesProvider>
            </ShopifyCustomerProvider>
          </ShopifyCartProvider>

        </CartProvider>
      </UserProvider>
    </Router>
  );
}