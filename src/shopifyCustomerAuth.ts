const SHOP_DOMAIN =
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();

const CLIENT_ID =
  import.meta.env.VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();

const PUBLIC_URL =
  import.meta.env
    .VITE_PUBLIC_URL
    ?.trim()
    .replace(/\/+$/, "");

const REDIRECT_URI =
  PUBLIC_URL
    ? `${PUBLIC_URL}/auth/shopify/callback`
    : undefined;

const VERIFIER_KEY =
  "shopify_customer_pkce_verifier";

const STATE_KEY =
  "shopify_customer_oauth_state";

const NONCE_KEY =
  "shopify_customer_oauth_nonce";

const ACCESS_TOKEN_KEY =
  "shopify_customer_access_token";

const ID_TOKEN_KEY =
  "shopify_customer_id_token";

const REFRESH_TOKEN_KEY =
  "shopify_customer_refresh_token";

const TOKEN_EXPIRES_AT_KEY =
  "shopify_customer_token_expires_at";

type OpenIdConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  issuer?: string;
};

export type ShopifyCustomerTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  refresh_token?: string;
};

let callbackPromise:
  | Promise<ShopifyCustomerTokenResponse>
  | null = null;

let refreshPromise:
  | Promise<string | null>
  | null = null;

function ensureConfig() {
  if (!SHOP_DOMAIN) {
    throw new Error(
      "Falta VITE_SHOPIFY_STORE_DOMAIN."
    );
  }

  if (!CLIENT_ID) {
    throw new Error(
      "Falta VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID."
    );
  }

  if (!PUBLIC_URL) {
    throw new Error(
      "Falta VITE_PUBLIC_URL."
    );
  }

  if (!REDIRECT_URI) {
    throw new Error(
      "No se pudo construir REDIRECT_URI."
    );
  }
}

function bytesToBase64Url(
  bytes: Uint8Array
) {
  let binary = "";

  for (
    let i = 0;
    i < bytes.length;
    i++
  ) {
    binary +=
      String.fromCharCode(
        bytes[i]
      );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomBytes(
  length: number
) {
  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return bytes;
}

function generateCodeVerifier() {
  return bytesToBase64Url(
    randomBytes(32)
  );
}

async function createCodeChallenge(
  verifier: string
) {
  const encoded =
    new TextEncoder().encode(
      verifier
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoded
    );

  return bytesToBase64Url(
    new Uint8Array(
      digest
    )
  );
}

function generateSecureValue() {
  return bytesToBase64Url(
    randomBytes(32)
  );
}

export async function getCustomerAuthConfig(): Promise<OpenIdConfig> {
  ensureConfig();

  const response =
    await fetch(
      `https://${SHOP_DOMAIN}/.well-known/openid-configuration`
    );

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener la configuración OAuth de Shopify (${response.status}).`
    );
  }

  return response.json();
}

function clearPkceStorage() {
  sessionStorage.removeItem(
    VERIFIER_KEY
  );

  sessionStorage.removeItem(
    STATE_KEY
  );

  sessionStorage.removeItem(
    NONCE_KEY
  );
}

function cleanCallbackUrl() {
  const url =
    new URL(
      window.location.href
    );

  url.searchParams.delete(
    "code"
  );

  url.searchParams.delete(
    "state"
  );

  url.searchParams.delete(
    "error"
  );

  url.searchParams.delete(
    "error_description"
  );

  window.history.replaceState(
    {},
    document.title,
    url.pathname +
      url.search +
      url.hash
  );
}

function saveShopifyCustomerTokens(
  data:
    ShopifyCustomerTokenResponse
) {
  if (!data.access_token) {
    throw new Error(
      "Shopify no devolvió access_token."
    );
  }

  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    data.access_token
  );

  if (data.id_token) {
    localStorage.setItem(
      ID_TOKEN_KEY,
      data.id_token
    );
  }

  if (data.refresh_token) {
    localStorage.setItem(
      REFRESH_TOKEN_KEY,
      data.refresh_token
    );
  }

  if (data.expires_in) {
    const expiresAt =
      Date.now() +
      data.expires_in *
        1000;

    localStorage.setItem(
      TOKEN_EXPIRES_AT_KEY,
      String(
        expiresAt
      )
    );
  } else {
    localStorage.removeItem(
      TOKEN_EXPIRES_AT_KEY
    );
  }
}

export function getShopifyCustomerAccessToken() {
  return (
    localStorage.getItem(
      ACCESS_TOKEN_KEY
    ) || null
  );
}

export function getShopifyCustomerRefreshToken() {
  return (
    localStorage.getItem(
      REFRESH_TOKEN_KEY
    ) || null
  );
}

function getTokenExpiresAt() {
  const raw =
    localStorage.getItem(
      TOKEN_EXPIRES_AT_KEY
    );

  if (!raw) {
    return null;
  }

  const value =
    Number(raw);

  return Number.isFinite(
    value
  )
    ? value
    : null;
}

function isAccessTokenExpired(
  safetyWindowMs =
    30_000
) {
  const expiresAt =
    getTokenExpiresAt();

  if (expiresAt === null) {
    return false;
  }

  return (
    Date.now() +
      safetyWindowMs >=
    expiresAt
  );
}

export function clearShopifyCustomerSession() {
  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    ID_TOKEN_KEY
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY
  );

  localStorage.removeItem(
    TOKEN_EXPIRES_AT_KEY
  );

  clearPkceStorage();

  callbackPromise =
    null;

  refreshPromise =
    null;
}

async function doRefreshShopifyCustomerAccessToken(): Promise<string | null> {
  ensureConfig();

  const refreshToken =
    getShopifyCustomerRefreshToken();

  if (!refreshToken) {
    clearShopifyCustomerSession();
    return null;
  }

  const config =
    await getCustomerAuthConfig();

  const body =
    new URLSearchParams({
      grant_type:
        "refresh_token",
      client_id:
        CLIENT_ID!,
      refresh_token:
        refreshToken,
    });

  const response =
    await fetch(
      config.token_endpoint,
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      }
    );

  const raw =
    await response.text();

  if (!response.ok) {
    console.error(
      "[Shopify Auth] Error refrescando token:",
      response.status,
      raw
    );

    clearShopifyCustomerSession();
    return null;
  }

  let data:
    ShopifyCustomerTokenResponse;

  try {
    data =
      JSON.parse(
        raw
      );
  } catch {
    clearShopifyCustomerSession();

    throw new Error(
      "Shopify devolvió una respuesta de refresh no válida."
    );
  }

  if (!data.access_token) {
    clearShopifyCustomerSession();
    return null;
  }

  saveShopifyCustomerTokens(
    data
  );

  console.log(
    "[Shopify Auth] Access token renovado correctamente."
  );

  return data.access_token;
}

export function refreshShopifyCustomerAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise =
    doRefreshShopifyCustomerAccessToken()
      .finally(
        () => {
          refreshPromise =
            null;
        }
      );

  return refreshPromise;
}

export async function getValidShopifyCustomerAccessToken(): Promise<string | null> {
  const accessToken =
    getShopifyCustomerAccessToken();

  if (!accessToken) {
    return null;
  }

  if (
    !isAccessTokenExpired()
  ) {
    return accessToken;
  }

  return refreshShopifyCustomerAccessToken();
}

export async function loginWithShopifyCustomer() {
  ensureConfig();

  const existingToken =
    await getValidShopifyCustomerAccessToken();

  if (existingToken) {
    console.log(
      "[Shopify Auth] Ya existe una sesión activa."
    );
    return;
  }

  const config =
    await getCustomerAuthConfig();

  const verifier =
    generateCodeVerifier();

  const challenge =
    await createCodeChallenge(
      verifier
    );

  const state =
    generateSecureValue();

  const nonce =
    generateSecureValue();

  sessionStorage.setItem(
    VERIFIER_KEY,
    verifier
  );

  sessionStorage.setItem(
    STATE_KEY,
    state
  );

  sessionStorage.setItem(
    NONCE_KEY,
    nonce
  );

  const url =
    new URL(
      config.authorization_endpoint
    );

  url.searchParams.set(
    "client_id",
    CLIENT_ID!
  );

  url.searchParams.set(
    "response_type",
    "code"
  );

  url.searchParams.set(
    "redirect_uri",
    REDIRECT_URI!
  );

  url.searchParams.set(
    "scope",
    "openid email customer-account-api:full"
  );

  url.searchParams.set(
    "state",
    state
  );

  url.searchParams.set(
    "nonce",
    nonce
  );

  url.searchParams.set(
    "code_challenge",
    challenge
  );

  url.searchParams.set(
    "code_challenge_method",
    "S256"
  );

  url.searchParams.set(
    "locale",
    "es"
  );

  url.searchParams.set(
    "region_country",
    "ES"
  );

  window.location.assign(
    url.toString()
  );
}

async function exchangeShopifyCustomerCode(): Promise<ShopifyCustomerTokenResponse> {
  ensureConfig();

  const params =
    new URLSearchParams(
      window.location.search
    );

  const oauthError =
    params.get(
      "error"
    );

  if (oauthError) {
    const description =
      params.get(
        "error_description"
      );

    throw new Error(
      description ??
        oauthError
    );
  }

  const code =
    params.get(
      "code"
    );

  const returnedState =
    params.get(
      "state"
    );

  if (!code) {
    const existingToken =
      await getValidShopifyCustomerAccessToken();

    if (existingToken) {
      cleanCallbackUrl();
      clearPkceStorage();

      return {
        access_token:
          existingToken,
        token_type:
          "Bearer",
      };
    }

    throw new Error(
      "Shopify no devolvió un código de autorización."
    );
  }

  const storedState =
    sessionStorage.getItem(
      STATE_KEY
    );

  if (!storedState) {
    throw new Error(
      "No se encontró el estado OAuth guardado."
    );
  }

  if (
    storedState !==
    returnedState
  ) {
    throw new Error(
      "El estado OAuth no coincide."
    );
  }

  const verifier =
    sessionStorage.getItem(
      VERIFIER_KEY
    );

  if (!verifier) {
    throw new Error(
      "No se encontró el code_verifier de PKCE."
    );
  }

  const config =
    await getCustomerAuthConfig();

  const body =
    new URLSearchParams({
      grant_type:
        "authorization_code",
      client_id:
        CLIENT_ID!,
      redirect_uri:
        REDIRECT_URI!,
      code,
      code_verifier:
        verifier,
    });

  console.log(
    "=== SHOPIFY TOKEN DEBUG ==="
  );

  console.log(
    "CLIENT_ID:",
    CLIENT_ID
  );

  console.log(
    "REDIRECT_URI:",
    REDIRECT_URI
  );

  console.log(
    "TOKEN_ENDPOINT:",
    config.token_endpoint
  );

  console.log(
    "STATE_MATCH:",
    storedState ===
      returnedState
  );

  console.log(
    "CODE_PRESENT:",
    !!code
  );

  console.log(
    "CODE_LENGTH:",
    code.length
  );

  console.log(
    "VERIFIER_PRESENT:",
    !!verifier
  );

  console.log(
    "VERIFIER_LENGTH:",
    verifier.length
  );

  const response =
    await fetch(
      config.token_endpoint,
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      }
    );

  const raw =
    await response.text();

  if (!response.ok) {
    console.error(
      "[Shopify Auth] Token exchange error:",
      response.status,
      raw
    );

    throw new Error(
      `Error obteniendo token Shopify (${response.status}): ${raw}`
    );
  }

  let data:
    ShopifyCustomerTokenResponse;

  try {
    data =
      JSON.parse(
        raw
      );
  } catch {
    throw new Error(
      "Shopify devolvió una respuesta de token no válida."
    );
  }

  saveShopifyCustomerTokens(
    data
  );

  sessionStorage.setItem(
    "shopify_login_just_completed",
    "1"
  );

  cleanCallbackUrl();
  clearPkceStorage();

  console.log(
    "[Shopify Auth] Login completado correctamente."
  );

  return data;
}

export function handleShopifyCustomerCallback(): Promise<ShopifyCustomerTokenResponse> {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const code =
    params.get(
      "code"
    );

  if (!code) {
    const existingToken =
      getShopifyCustomerAccessToken();

    if (
      existingToken &&
      !isAccessTokenExpired()
    ) {
      cleanCallbackUrl();
      clearPkceStorage();

      return Promise.resolve({
        access_token:
          existingToken,
        token_type:
          "Bearer",
      });
    }
  }

  if (callbackPromise) {
    console.log(
      "[Shopify Callback] Callback ya en proceso. Reutilizando Promise."
    );

    return callbackPromise;
  }

  callbackPromise =
    exchangeShopifyCustomerCode();

  return callbackPromise;
}

export function isShopifyCustomerLoggedIn() {
  const accessToken =
    getShopifyCustomerAccessToken();

  const refreshToken =
    getShopifyCustomerRefreshToken();

  if (
    !accessToken &&
    !refreshToken
  ) {
    return false;
  }

  if (refreshToken) {
    return true;
  }

  return Boolean(
    accessToken &&
    !isAccessTokenExpired(
      0
    )
  );
}

export async function logoutShopifyCustomer() {
  ensureConfig();

  const config =
    await getCustomerAuthConfig();

  const idToken =
    localStorage.getItem(
      ID_TOKEN_KEY
    );

  const postLogoutUri =
  `${PUBLIC_URL}/`;

  clearShopifyCustomerSession();

  if (
    config.end_session_endpoint
  ) {
    const logoutUrl =
      new URL(
        config.end_session_endpoint
      );

    if (idToken) {
      logoutUrl.searchParams.set(
        "id_token_hint",
        idToken
      );
    }

    logoutUrl.searchParams.set(
      "post_logout_redirect_uri",
      postLogoutUri
    );

    window.location.assign(
      logoutUrl.toString()
    );

    return;
  }

  window.location.assign(
    "/"
  );
}