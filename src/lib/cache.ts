// AI 回答本地缓存：以 (birthKey + question) 为 key，结果存 localStorage
import { callLLM, type AIConfig, type CallLLMOptions } from './aiInterpret';

const CACHE_KEY = 'mingpan:ai-cache';
const MAX_ENTRIES = 100;
const TTL_DAYS = 30;

interface CacheEntry {
  key: string;
  question: string;
  mode: string;
  answer: string;
  provider: string;
  model: string;
  createdAt: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

function loadStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    // 清理过期
    const now = Date.now();
    const valid: CacheStore = {};
    for (const k in data) {
      if (now - data[k].createdAt < TTL_DAYS * 86400 * 1000) {
        valid[k] = data[k];
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function saveStore(store: CacheStore) {
  try {
    // LRU：超出最大保留前 MAX_ENTRIES 个
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      keys
        .map(k => ({ k, t: store[k].createdAt }))
        .sort((a, b) => a.t - b.t)
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach(x => delete store[x.k]);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {}
}

// 用生辰 + 问题生成稳定 key
export function buildCacheKey(birth: { date: string; shiChen: number; gender: string }, question: string, mode: string): string {
  const norm = (birth.date + '|' + birth.shiChen + '|' + birth.gender + '|' + mode + '|' + question).trim();
  // 简单 hash
  let h = 0;
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) - h) + norm.charCodeAt(i);
    h |= 0;
  }
  return 'k' + Math.abs(h).toString(36);
}

export function getCached(key: string): CacheEntry | null {
  const store = loadStore();
  return store[key] || null;
}

export function setCached(key: string, entry: Omit<CacheEntry, 'key' | 'createdAt'>) {
  const store = loadStore();
  store[key] = { ...entry, key, createdAt: Date.now() };
  saveStore(store);
}

// 列出最近 N 条缓存（按时间倒序）
export function listRecentCache(limit: number = 20): CacheEntry[] {
  const store = loadStore();
  return Object.values(store)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

// 删除某条
export function deleteCache(key: string) {
  const store = loadStore();
  delete store[key];
  saveStore(store);
}

// 清空
export function clearAllCache() {
  localStorage.removeItem(CACHE_KEY);
}

// 带缓存的 LLM 调用
export async function callLLMWithCache(
  config: AIConfig,
  messages: { role: string; content: string }[],
  birth: { date: string; shiChen: number; gender: string },
  question: string,
  mode: string,
  systemPrompt?: string,
  useCache: boolean = true,
  options?: CallLLMOptions,
): Promise<{ text: string; cached: boolean; cacheKey: string }> {
  const cacheKey = buildCacheKey(birth, question, mode);

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      return { text: cached.answer, cached: true, cacheKey };
    }
  }

  const text = await callLLM(config, messages, systemPrompt, options);
  setCached(cacheKey, {
    question,
    mode,
    answer: text,
    provider: config.accessMode === 'platform' ? 'platform' : config.provider,
    model: config.accessMode === 'platform' ? (config.platformModel || config.model) : config.model,
  });
  return { text, cached: false, cacheKey };
}
