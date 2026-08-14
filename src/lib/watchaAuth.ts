// 观猹(Watcha) OAuth2 客户端
// 公开客户端模式：纯前端 Authorization Code + PKCE，无需 client_secret

const WATCHA_AUTH_BASE = 'https://watcha.cn/oauth';
const TOKEN_KEY = 'mingpan:watcha-token';
const USER_KEY = 'mingpan:watcha-user';

export interface WatchaToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface WatchaUserInfo {
  user_id: number;
  nickname: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
}

export interface WatchaSession {
  token: WatchaToken;
  user: WatchaUserInfo;
}

function randomString(len = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

async function sha256Base64(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(43);
  const challenge = await sha256Base64(verifier);
  return { verifier, challenge };
}

function generateState(): string {
  return randomString(16);
}

export function buildWatchaAuthorizeUrl(
  redirectUri: string,
  scope = 'read',
): string {
  // client_id 公开安全，无需保密
  const encodedClientId = encodeURIComponent('fgGwggSbhaawNJaZ');
  const url = new URL(`${WATCHA_AUTH_BASE}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', encodedClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function api<T>(
  path: string,
  init: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
  }
  if (withAuth) {
    const token = getStoredAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${WATCHA_AUTH_BASE}${path}`, {
    ...init,
    headers,
  });

  const ct = res.headers.get('content-type') || '';
  let data: any = null;
  try {
    data = ct.includes('application/json') ? await res.json() : null;
  } catch {
    // ignore
  }

  if (!res.ok || !data?.ok) {
    const msg = data?.error_description || data?.message || `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return data.data as T;
}

export async function startWatchaLogin(redirectUri: string): Promise<void> {
  const { verifier, challenge } = await generatePKCE();
  const state = generateState();

  sessionStorage.setItem('watcha:pkce_verifier', verifier);
  sessionStorage.setItem('watcha:oauth_state', state);

  const url = buildWatchaAuthorizeUrl(redirectUri);
  const u = new URL(url);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('state', state);

  window.location.href = u.toString();
}

export async function handleWatchaCallback(
  code: string,
  state: string,
  redirectUri: string,
): Promise<WatchaSession> {
  const savedState = sessionStorage.getItem('watcha:oauth_state');
  if (!savedState || savedState !== state) {
    throw new Error('OAuth state 不匹配，可能存在 CSRF 攻击');
  }

  const verifier = sessionStorage.getItem('watcha:pkce_verifier');
  if (!verifier) {
    throw new Error('PKCE verifier 丢失，请重新登录');
  }

  // 公开客户端：不传 client_secret，仅用 PKCE 验证身份
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: 'fgGwggSbhaawNJaZ',
    code_verifier: verifier,
  });

  const tokenData = await api<WatchaToken>('/api/token', {
    method: 'POST',
    body: body.toString(),
  });

  sessionStorage.removeItem('watcha:pkce_verifier');
  sessionStorage.removeItem('watcha:oauth_state');

  const userInfo = await fetchWatchaUserInfo(tokenData.access_token);

  saveSession({ token: tokenData, user: userInfo });
  return { token: tokenData, user: userInfo };
}

export async function fetchWatchaUserInfo(accessToken: string): Promise<WatchaUserInfo> {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${WATCHA_AUTH_BASE}/api/userinfo`, {
    headers,
    credentials: 'include',
  });

  const data = await res.json();
  if (!data?.ok) {
    throw new Error(data?.message || data?.error_description || '获取用户信息失败');
  }
  return data.data as WatchaUserInfo;
}

function saveSession(session: WatchaSession) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session.token));
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  } catch {
    // ignore
  }
}

function getStoredToken(): WatchaToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return getStoredToken()?.access_token || null;
}

export function getStoredWatchaUser(): WatchaUserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isWatchaLoggedIn(): boolean {
  return !!getStoredAccessToken();
}

export function clearWatchaSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export async function logoutWatcha(): Promise<void> {
  // 公开客户端无 refresh_token 注销端点，清理本地数据即可
  clearWatchaSession();
}
