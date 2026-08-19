// 接入 CF Auth 登录器（/Users/alun/code/login）
// 跨域场景用 Bearer Token（localStorage），同域 Cookie 也可自动携带

const TOKEN_KEY = 'mingpan:auth-token';
const USER_KEY = 'mingpan:auth-user';

export interface MembershipView {
  tier: string;
  name: string;
  level: number;
  description?: string;
  benefits: string[];
  expiresAt: string | null;
  active: boolean;
  sourceTier: string;
  expired: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  membership: MembershipView;
  points: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthProviderInfo {
  name: string;
  type: string;
  displayName: string;
  loginUrl: string | null;
}

export interface AuthPublicConfig {
  appName: string;
  appBaseUrl: string;
  loginBaseUrl: string;
  registerBaseUrl: string;
  currentBaseUrl?: string;
  siteMode?: string;
  allowPublicRegister: boolean;
  requireRegisterCode: boolean;
  enablePasswordAuth: boolean;
  enableEmailMagicLink: boolean;
  defaultMembershipTier: string;
  defaultRegisterPoints: number;
  membershipTiers: MembershipView[] | Array<Record<string, unknown>>;
  providers: AuthProviderInfo[];
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresIn?: number;
}

type RuntimeAuthConfig = {
  authBaseUrl?: string;
  loginBaseUrl?: string;
  registerBaseUrl?: string;
};

function runtime(): RuntimeAuthConfig {
  if (typeof window === 'undefined') return {};
  return (window.__MINGPAN_CONFIG__ || {}) as RuntimeAuthConfig;
}

export function getAuthBaseUrl(): string {
  const fromRuntime = runtime().authBaseUrl || runtime().loginBaseUrl;
  const fromEnv = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_LOGIN_BASE_URL || '').trim();
  return (fromRuntime || fromEnv || 'https://login.alunapi.top').replace(/\/$/, '');
}

export function getLoginBaseUrl(): string {
  const fromRuntime = runtime().loginBaseUrl;
  const fromEnv = (import.meta.env.VITE_LOGIN_BASE_URL || '').trim();
  return (fromRuntime || fromEnv || getAuthBaseUrl()).replace(/\/$/, '');
}

export function getRegisterBaseUrl(): string {
  const fromRuntime = runtime().registerBaseUrl;
  const fromEnv = (import.meta.env.VITE_REGISTER_BASE_URL || '').trim();
  return (fromRuntime || fromEnv || 'https://register.alunapi.top').replace(/\/$/, '');
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(session: { token: string; user: AuthUser }) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function api<T>(
  path: string,
  init: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (withAuth) {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${getAuthBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`认证服务响应异常 (${res.status})`);
  }

  if (!data?.ok) {
    const msg = data?.error?.message || `请求失败 (${res.status})`;
    const err = new Error(msg) as Error & { code?: string; status?: number };
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }
  return data.data as T;
}

export async function fetchAuthConfig(): Promise<AuthPublicConfig> {
  return api<AuthPublicConfig>('/api/auth/config');
}

export async function loginWithPassword(account: string, password: string): Promise<AuthSession> {
  const session = await api<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
  saveSession(session);
  return session;
}

export async function registerWithPassword(input: {
  username: string;
  email: string;
  password: string;
  registerCode?: string;
  displayName?: string;
}): Promise<AuthSession> {
  const session = await api<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  saveSession(session);
  return session;
}

export async function completeWatchaLogin(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  registerCode?: string;
}): Promise<AuthSession> {
  const session = await api<AuthSession>('/api/auth/external/watcha', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  saveSession(session);
  return session;
}

export async function fetchMe(): Promise<{ user: AuthUser; identities: unknown[] } | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const data = await api<{ user: AuthUser; identities: unknown[] }>('/api/auth/me', {}, true);
    saveSession({ token, user: data.user });
    return data;
  } catch (e: any) {
    if (e?.status === 401 || e?.code === 'unauthorized') {
      clearSession();
      return null;
    }
    throw e;
  }
}

export async function logout(): Promise<void> {
  try {
    await api('/api/auth/logout', { method: 'POST' }, true);
  } catch {
    // ignore network errors on logout
  } finally {
    clearSession();
  }
}

/** 消费 OAuth/登录站回跳携带的 #cf_auth_token=... */
export function consumeAuthCallbackToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('cf_auth_token');
    if (!token) return null;
    hash.delete('cf_auth_token');
    const nextHash = hash.toString();
    const url = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
    window.history.replaceState(null, '', url);
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getStoredToken();
}
