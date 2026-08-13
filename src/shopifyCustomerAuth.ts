const SHOP_DOMAIN =
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();

const CLIENT_ID =
  import.meta.env.VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();

const REDIRECT_URI =
  import.meta.env.VITE_SHOPIFY_CUSTOMER_REDIRECT_URI?.trim();

const VERIFIER_KEY = "shopify_customer_pkce_verifier";
const STATE_KEY = "shopify_customer_oauth_state";
const NONCE_KEY = "shopify_customer_oauth_nonce";

const ACCESS_TOKEN_KEY = "shopify_customer_access_token";
const ID_TOKEN_KEY = "shopify_customer_id_token";

type OpenIdConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  issuer?: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  refresh_token?: string;
};

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

  if (!REDIRECT_URI) {
    throw new Error(
      "Falta VITE_SHOPIFY_CUSTOMER_REDIRECT_URI."
    );
  }
}

function base64UrlEncode(
  bytes: Uint8Array
) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(
  length = 64
) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const random =
    crypto.getRandomValues(
      new Uint8Array(length)
    );

  let result = "";

  for (
    let i = 0;
    i < random.length;
    i++
  ) {
    result +=
      charset[
        random[i] %
          charset.length
      ];
  }

  return result;
}

async function sha256(
  value: string
) {
  const data =
    new TextEncoder().encode(
      value
    );

  return crypto.subtle.digest(
    "SHA-256",
    data
  );
}

async function createCodeChallenge(
  verifier: string
) {
  const digest =
    await sha256(verifier);

  return base64UrlEncode(
    new Uint8Array(digest)
  );
}

export async function getCustomerAuthConfig(): Promise<OpenIdConfig> {
  ensureConfig();

  const response = await fetch(
    `https://${SHOP_DOMAIN}/.well-known/openid-configuration`
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener la configuración OAuth de Shopify (${response.status}).`
    );
  }

  return response.json();
}

export async function loginWithShopifyCustomer() {
  ensureConfig();

  const config =
    await getCustomerAuthConfig();

  const verifier =
    randomString(96);

  const challenge =
    await createCodeChallenge(
      verifier
    );

  const state =
    randomString(48);

  const nonce =
    randomString(48);

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

  window.location.href =
    url.toString();
}

export async function handleShopifyCustomerCallback() {
  ensureConfig();

  const params =
    new URLSearchParams(
      window.location.search
    );

  const code =
    params.get("code");

  const returnedState =
    params.get("state");

  const oauthError =
    params.get("error");

  if (oauthError) {
    throw new Error(
      params.get(
        "error_description"
      ) ??
        oauthError
    );
  }

  if (!code) {
    throw new Error(
      "Shopify no devolvió un código de autorización."
    );
  }

  const storedState =
    sessionStorage.getItem(
      STATE_KEY
    );

  if (
    !storedState ||
    storedState !== returnedState
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
    new URLSearchParams();

  body.set(
    "grant_type",
    "authorization_code"
  );

  body.set(
    "client_id",
    CLIENT_ID!
  );

  body.set(
    "redirect_uri",
    REDIRECT_URI!
  );

  body.set(
    "code",
    code
  );

  body.set(
    "code_verifier",
    verifier
  );

  const response = await fetch(
    config.token_endpoint,
    {
      method: "POST",

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
    throw new Error(
      `Error obteniendo token Shopify (${response.status}): ${raw}`
    );
  }

  const data =
    JSON.parse(
      raw
    ) as TokenResponse;

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

  sessionStorage.removeItem(
    VERIFIER_KEY
  );

  sessionStorage.removeItem(
    STATE_KEY
  );

  sessionStorage.removeItem(
    NONCE_KEY
  );

  return data;
}

export function getShopifyCustomerAccessToken() {
  return localStorage.getItem(
    ACCESS_TOKEN_KEY
  );
}

export function isShopifyCustomerLoggedIn() {
  return !!getShopifyCustomerAccessToken();
}

export async function logoutShopifyCustomer() {
  const config =
    await getCustomerAuthConfig();

  const idToken =
    localStorage.getItem(
      ID_TOKEN_KEY
    );

  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    ID_TOKEN_KEY
  );

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
      `${window.location.origin}/`
    );

    window.location.href =
      logoutUrl.toString();

    return;
  }

  window.location.href = "/";
}