import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getShopifyCustomerAccessToken,
  isShopifyCustomerLoggedIn,
  loginWithShopifyCustomer,
  logoutShopifyCustomer,
} from "../../shopifyCustomerAuth";

type ShopifyCustomerContextType = {
  loggedIn: boolean;
  loading: boolean;

  login: () => Promise<void>;
  logout: () => Promise<void>;

  reloadCustomerSession: () => void;
};

const ShopifyCustomerContext =
  createContext<ShopifyCustomerContextType | null>(
    null
  );

export function ShopifyCustomerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] =
    useState(true);

  const [loggedIn, setLoggedIn] =
    useState(false);

  const reloadCustomerSession = () => {
    const token =
      getShopifyCustomerAccessToken();

    setLoggedIn(!!token);
  };

  useEffect(() => {
    setLoggedIn(
      isShopifyCustomerLoggedIn()
    );

    setLoading(false);
  }, []);

  const login = async () => {
    await loginWithShopifyCustomer();
  };

  const logout = async () => {
    setLoggedIn(false);

    await logoutShopifyCustomer();
  };

  const value = useMemo(
    () => ({
      loggedIn,
      loading,
      login,
      logout,
      reloadCustomerSession,
    }),
    [
      loggedIn,
      loading,
    ]
  );

  return (
    <ShopifyCustomerContext.Provider
      value={value}
    >
      {children}
    </ShopifyCustomerContext.Provider>
  );
}

export function useShopifyCustomer() {
  const context =
    useContext(
      ShopifyCustomerContext
    );

  if (!context) {
    throw new Error(
      "useShopifyCustomer debe usarse dentro de <ShopifyCustomerProvider>"
    );
  }

  return context;
}