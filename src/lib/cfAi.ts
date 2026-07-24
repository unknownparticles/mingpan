// CF AI 平台客户端（/Users/alun/code/login/ai → ai.alunapi.top）
// 登录后用 Bearer Token 调用平台模型；未登录不可走此通道

import { getStoredToken, isLoggedIn } from './auth';

export interface CfAiModel {
  id: string;
  name: string;
  description?: string;
  provider: string;
  upstreamId?: string;
  minLevel: number;
  cost: number;
  maxTokens?: number;
  available?: boolean;
  unavailableReason?: string | null;
}

export interface CfAiPublicConfig {
  appName: string;
  appBaseUrl: string;
  loginBaseUrl: string;
  loginUrl: string;
  defaultModel: string;
  requirePoints: boolean;
  dailyLimit: number;
  authenticated: boolean;
  siliconflowEnabled: boolean;
  providers: Record<string, { enabled: boolean; name: string }>;
  models: CfAiModel[];
}

export interface CfAiUsage {
  dailyUsed: number;
  dailyLimit: number;
}

export interface CfAiMe {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    points?: number;
    membership?: { name?: string; tier?: string; level?: number };
  };
  usage: CfAiUsage;
}

export interface CfAiChatResult {
  id: string;
  model: string;
  modelName?: string;
  provider?: string;
  message: { role: string; content: string };
  usage?: {
    promptChars?: number;
    completionChars?: number;
    costPoints?: number;
    pointsLeft?: number;
    dailyUsed?: number;
    dailyLimit?: number;
  };
}

type RuntimeCfg = { aiBaseUrl?: string };

function runtime(): RuntimeCfg {
  if (typeof window === 'undefined') return {};
  return (window.__MINGPAN_CONFIG__ || {}) as RuntimeCfg;
}

export function getAiBaseUrl(): string {
  const fromRuntime = runtime().aiBaseUrl;
  const fromEnv = (import.meta.env.VITE_AI_SERVICE_BASE_URL || '').trim();
  return (fromRuntime || fromEnv || 'https://ai.alunapi.top').replace(/\/$/, '');
}

async function api<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (withAuth) {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${getAiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    signal: init.signal,
  });

  // 非 JSON（如 SSE）由上层处理
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/event-stream')) {
    throw new Error('流式响应请使用专用接口');
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`AI 服务响应异常 (${res.status})`);
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

export async function fetchCfAiConfig(): Promise<CfAiPublicConfig> {
  // 若已登录则附带 token，便于服务端返回 available 状态
  return api<CfAiPublicConfig>('/api/config', {}, isLoggedIn());
}

export async function fetchCfAiMe(): Promise<CfAiMe> {
  return api<CfAiMe>('/api/me', {}, true);
}

export async function callCfAiChat(input: {
  model: string;
  messages: { role: string; content: string }[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<CfAiChatResult> {
  if (!isLoggedIn() && !getStoredToken()) {
    throw new Error('平台 AI 需要登录后使用');
  }
  return api<CfAiChatResult>(
    '/api/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        system: input.system,
        stream: false,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      }),
      signal: input.signal,
    },
    true,
  );
}
