// src/App.tsx

import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import { useContext } from "react";

import {
  UserProvider,
  UserContext,
} from "./assets/containers/UserContext";

import { CartProvider } from "./assets/containers/CartContext";
import { FavoritesProvider } from "./assets/containers/FavoritesContext";

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

function AppRoutes() {
  const { initializing } = useContext(UserContext);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">
          Cargando aplicación…
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/tienda" element={<TiendaPage />} />

      <Route
        path="/comunidad"
        element={<ComunidadPage />}
      />

      <Route path="/usuario" element={<UserPage />} />

      <Route
        path="/shopping/:slug"
        element={<ProdDetPage />}
      />

      <Route path="/shopping" element={<ShopPage />} />

      <Route
        path="/modificarproductos"
        element={<EditProductsPage />}
      />

      <Route path="/micesta" element={<CartPage />} />

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

      <Route path="/perfil" element={<PerfilPage />} />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />
    </Routes>
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