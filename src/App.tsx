import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  useContext,
  useEffect,
} from "react";

import {
  UserContext,
  UserProvider,
} from "./assets/containers/UserContext";

import { CartProvider } from "./assets/containers/CartContext";
import { FavoritesProvider } from "./assets/containers/FavoritesContext";

import Header from "./assets/containers/Header";
import Footer from "./assets/containers/Footer";

import HomePage from "./assets/pages/HomePage";
import TiendaPage from "./assets/pages/TiendaPage";
import ComunidadPage from "./assets/pages/ComunidadPage";
import UserPage from "./assets/pages/UserPage";
import ProdDetPage from "./assets/pages/ProdDetailPage";
import ShopPage from "./assets/pages/ShopPage";
import EditProductsPage from "./assets/pages/EditProductsPage";
import CartPage from "./assets/pages/CartPage";
import CheckoutSuccessPage from "./assets/pages/CheckoutSuccessPage";
import AdminOrdersPage from "./assets/pages/AdminOrderPage";
import PerfilPage from "./assets/pages/PerfilPage";
import ResetPasswordPage from "./assets/pages/ResetPasswordPage";
import FavoritesPage from "./assets/pages/FavoritesPage";

import EnviosDevolucionesPage from "./assets/pages/EnviosDevolucionesPage";
import CondicionesCompraPage from "./assets/pages/CondicionesCompraPage";
import CookiesPage from "./assets/pages/CookiesPage";
import PrivacidadPage from "./assets/pages/PrivacidadPage";
import AvisoLegalPage from "./assets/pages/AvisoLegalPage";


/*
  Cada vez que cambia la ruta,
  lleva automáticamente al usuario
  al principio de la nueva página.
*/
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}


/*
  Layout exclusivo para páginas legales.

  De esta forma TODAS tienen:

  Header
  ↓
  Documento legal
  ↓
  Footer

  sin tener que repetir Header/Footer
  dentro de cada página.
*/
function LegalPage({
  children,
}: {
  children: React.ReactNode;
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


function AppRoutes() {
  const { initializing } =
    useContext(UserContext);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1e8]">
        <p className="text-lg text-[#66715d]">
          Cargando aplicación…
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/tienda"
          element={<TiendaPage />}
        />

        <Route
          path="/comunidad"
          element={<ComunidadPage />}
        />

        <Route
          path="/usuario"
          element={<UserPage />}
        />

        <Route
          path="/shopping/:slug"
          element={<ProdDetPage />}
        />

        <Route
          path="/shopping"
          element={<ShopPage />}
        />

        <Route
          path="/modificarproductos"
          element={<EditProductsPage />}
        />

        <Route
          path="/micesta"
          element={<CartPage />}
        />

        <Route
          path="/favoritos"
          element={<FavoritesPage />}
        />

        <Route
          path="/checkout/success"
          element={<CheckoutSuccessPage />}
        />

        <Route
          path="/admin/pedidos"
          element={<AdminOrdersPage />}
        />

        <Route
          path="/perfil"
          element={<PerfilPage />}
        />

        <Route
          path="/profile"
          element={
            <Navigate
              to="/perfil"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={
            <Navigate
              to="/usuario"
              replace
            />
          }
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />


        {/* ========================= */}
        {/* PÁGINAS LEGALES */}
        {/* ========================= */}

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


        {/* Cualquier ruta desconocida */}
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


export default function App() {
  return (
    <Router>
      <UserProvider>
        <CartProvider>
          <FavoritesProvider>
            <AppRoutes />
          </FavoritesProvider>
        </CartProvider>
      </UserProvider>
    </Router>
  );
}