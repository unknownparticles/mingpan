// 观猹授权在浏览器完成，CF Auth API 负责建立统一平台会话。

import { completeWatchaLogin, type AuthSession } from './auth';
import { createPKCEChallenge, randomString } from './pkce';

const WATCHA_AUTH_BASE = 'https://watcha.cn/oauth';

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(43);
  const challenge = await createPKCEChallenge(verifier);
  return { verifier, challenge };
}

function generateState(): string {
  return randomString(16);
}

export function buildWatchaAuthorizeUrl(
  redirectUri: string,
  scope = 'read',
): string {
  const url = new URL(`${WATCHA_AUTH_BASE}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', 'fgGwggSbhaawNJaZ');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function startWatchaLogin(redirectUri: string): Promise<void> {
  const { verifier, challenge } = await generatePKCE();
  const state = generateState();

  sessionStorage.setItem('watcha:pkce_verifier', verifier);
  sessionStorage.setItem('watcha:oauth_state', state);
  sessionStorage.setItem('watcha:redirect_uri', redirectUri);

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
  registerCode?: string,
): Promise<AuthSession> {
  const savedState = sessionStorage.getItem('watcha:oauth_state');
  if (!savedState || savedState !== state) {
    throw new Error('OAuth state 不匹配，可能存在 CSRF 攻击');
  }

  const verifier = sessionStorage.getItem('watcha:pkce_verifier');
  if (!verifier) {
    throw new Error('PKCE verifier 丢失，请重新登录');
  }

  sessionStorage.removeItem('watcha:pkce_verifier');
  sessionStorage.removeItem('watcha:oauth_state');
  return completeWatchaLogin({ code, codeVerifier: verifier, redirectUri, registerCode });
}

export function clearWatchaSession() {
  try {
    sessionStorage.removeItem('watcha:pkce_verifier');
    sessionStorage.removeItem('watcha:oauth_state');
    sessionStorage.removeItem('watcha:redirect_uri');
  } catch {
    // ignore
  }
}
