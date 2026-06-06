import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONEX_API_BASE_URL } from '@/constants/public-config';

export const API_BASE_URL = CONEX_API_BASE_URL;
const SESSION_STORAGE_KEY = 'conex.session';
const REFRESH_EARLY_MS = 30_000;

export type ApiSession = {
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

export type SessionTokensResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
};

export type AccountResponse = {
  sub: number;
  email: string;
  created_at: number;
  subscription: {
    status: string;
    due_date: string;
    plan: {
      id: string;
      name: string;
      price: {
        amount: number;
        currency: string;
      };
      billing_period: {
        unit: string;
        count: number;
      };
      supports_renewal: boolean;
      policy: PlanPolicyResponse;
    };
  };
};

export type PlanPolicyResponse = {
  max_bytes_per_site: number;
  max_sites: number;
  max_subpaths_per_site: number;
};

export type PlanResponse = {
  id: string;
  name: string;
  price: {
    amount: number;
    currency: string;
  };
  billing_period: {
    unit: string;
    count: number;
  };
  supports_renewal: boolean;
  policy: PlanPolicyResponse;
};

export type PayPalOrderResponse = {
  id: string;
  links: Record<string, unknown>[];
  [key: string]: unknown;
};

export type CapturePaymentResponse = {
  payment: {
    order_id: string;
    sub: number;
    plan_id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: number;
    paid_at: number;
  };
  paypal: Record<string, unknown>;
};

export type SiteResponse = {
  sub: number;
  path: string;
  public: boolean;
  name: string;
  tags: string[];
  url: string;
  clicks: number;
};

export type OwnedSiteResponse = SiteResponse & {
  html: string;
};

type ApiErrorBody = {
  error?: {
    msg?: string;
  };
};

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
};

export class ConexApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ConexApiError';
    this.status = status;
  }
}

async function readStoredSession() {
  const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  return storedSession ? (JSON.parse(storedSession) as Partial<ApiSession>) : null;
}

function isStoredSession(session: Partial<ApiSession> | null): session is ApiSession {
  return (
    typeof session?.email === 'string' &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.accessTokenExpiresAt === 'number' &&
    typeof session.refreshTokenExpiresAt === 'number'
  );
}

async function storeSession(email: string, tokens: SessionTokensResponse) {
  const now = Date.now();
  const session: ApiSession = {
    email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: now + tokens.expires_in * 1000,
    refreshTokenExpiresAt: now + tokens.refresh_token_expires_in * 1000,
  };

  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  return session;
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error?.msg || response.statusText || 'Request failed.';
  } catch {
    return response.statusText || 'Request failed.';
  }
}

async function request<T>(path: string, options: RequestOptions = {}, didRefresh = false): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.authenticated) {
    const accessToken = await getAccessToken();
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && options.authenticated && !didRefresh) {
    await refreshSession();
    return request<T>(path, options, true);
  }

  if (!response.ok) {
    throw new ConexApiError(response.status, await parseError(response));
  }

  if (response.status === 204 || options.method === 'HEAD') {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getAccessToken() {
  const session = await getStoredSession();

  if (Date.now() < session.accessTokenExpiresAt - REFRESH_EARLY_MS) {
    return session.accessToken;
  }

  const refreshedSession = await refreshSession();

  return refreshedSession.accessToken;
}

export async function getStoredSession() {
  const session = await readStoredSession();

  if (!isStoredSession(session)) {
    throw new ConexApiError(401, 'Authentication required.');
  }

  return session;
}

export async function getOptionalStoredSession() {
  const session = await readStoredSession();

  return isStoredSession(session) ? session : null;
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function loginOrCreateAccount(email: string) {
  await request<void>('/api/auth/login', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyAuthenticationCode(email: string, otp: string) {
  const tokens = await request<SessionTokensResponse>('/api/auth/verify', {
    method: 'POST',
    body: { email, otp: Number(otp) },
  });

  return storeSession(email, tokens);
}

export async function refreshSession() {
  const session = await getStoredSession();

  if (Date.now() >= session.refreshTokenExpiresAt) {
    await clearStoredSession();
    throw new ConexApiError(401, 'Authentication expired.');
  }

  let tokens: SessionTokensResponse;

  try {
    tokens = await request<SessionTokensResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refresh_token: session.refreshToken },
    });
  } catch (error) {
    await clearStoredSession();
    throw error;
  }

  return storeSession(session.email, tokens);
}

export async function logout() {
  const session = await getOptionalStoredSession();

  if (!session) {
    return;
  }

  await request<void>('/api/auth/logout', {
    method: 'POST',
    body: { refresh_token: session.refreshToken },
  });
}

export async function getAccount() {
  return request<AccountResponse>('/api/account', { authenticated: true });
}

export async function listPlans() {
  return request<PlanResponse[]>('/api/plans');
}

export async function createPlanOrder(planID: string) {
  return request<PayPalOrderResponse>(`/api/plans/create/${encodeURIComponent(planID)}`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function capturePlanOrder(orderID: string) {
  return request<CapturePaymentResponse>(`/api/plans/capture/${encodeURIComponent(orderID)}`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function deleteAccount() {
  await request<void>('/api/account', {
    method: 'DELETE',
    authenticated: true,
  });
  await clearStoredSession();
}

export async function requestEmailChange(newEmail: string) {
  await request<void>('/api/account/email/change', {
    method: 'PATCH',
    authenticated: true,
    body: { new_email: newEmail },
  });
}

export async function confirmEmailChange(otp: string) {
  await request<void>('/api/account/email/change/confirm', {
    method: 'PATCH',
    authenticated: true,
    body: { otp: Number(otp) },
  });
}

export async function listSites() {
  return request<SiteResponse[]>('/api/sites', { authenticated: true });
}

export async function createSite({
  html,
  name,
  path,
  tags,
}: {
  html: string;
  name: string;
  path: string;
  tags: string[];
}) {
  return request<SiteResponse>('/api/sites', {
    method: 'POST',
    authenticated: true,
    body: { html, name, path, tags },
  });
}

export async function getOwnedSite(path: string) {
  return request<OwnedSiteResponse>(`/api/sites/${encodeURIComponent(path)}`, {
    authenticated: true,
  });
}

export async function updateSite(
  path: string,
  updates: {
    html?: string;
    name?: string;
    public?: boolean;
    tags?: string[];
  }
) {
  await request<void>(`/api/sites/${encodeURIComponent(path)}`, {
    method: 'PATCH',
    authenticated: true,
    body: updates,
  });
}

export async function deleteSite(path: string) {
  await request<void>(`/api/sites/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function sitePathAvailable(path: string) {
  try {
    await request<void>(`/api/sites/${encodeURIComponent(path)}`, { method: 'HEAD' });
    return true;
  } catch (error) {
    if (error instanceof ConexApiError && error.status === 409) {
      return false;
    }

    throw error;
  }
}
