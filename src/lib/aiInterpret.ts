// AI 解读
// 1) 平台模式：登录后走 CF AI（ai.alunapi.top，复用登录令牌）
// 2) 自备 Key：未登录或自选厂商，直连 OpenAI 兼容 API

import { isLoggedIn } from './auth';
import { callCfAiChat, getAiBaseUrl } from './cfAi';

const STORAGE_KEY = 'mingpan:ai-config';
const PLATFORM_FAIL_KEY = 'mingpan:ai-platform-fail';

export type AIProvider =
  | 'siliconflow'
  | 'deepseek'
  | 'minimax'
  | 'glm'
  | 'openai'
  | 'qwen'
  | 'ollama'
  | 'custom';

/** platform=登录后走 CF AI；byok=自备 API Key 直连 */
export type AIAccessMode = 'platform' | 'byok';

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  provider: AIProvider;
  /** DeepSeek 系模型可选开启思考链（SiliconFlow / DeepSeek 官方） */
  enableThinking: boolean;
  /** 访问模式：平台 AI / 自备 Key */
  accessMode: AIAccessMode;
  /** 平台模型 id（如 @cf/meta/llama-3.2-3b-instruct） */
  platformModel: string;
}

export interface CallLLMOptions {
  maxTokens?: number;
  temperature?: number;
  enableThinking?: boolean;
  signal?: AbortSignal;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
}

// 运行时配置类型见 src/vite-env.d.ts 的 MingpanRuntimeConfig
type RuntimeConfig = MingpanRuntimeConfig;

export const DEFAULT_SILICONFLOW_MODEL = 'Qwen/Qwen2.5-14B-Instruct';
export const DEFAULT_PLATFORM_MODEL = '@cf/meta/llama-3.2-3b-instruct';
export const DEFAULT_MAX_TOKENS = 2200;

export const LLM_PRESETS: Record<
  AIProvider,
  { baseUrl: string; model: string; label: string; placeholder: string; hint: string }
> = {
  siliconflow: {
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: DEFAULT_SILICONFLOW_MODEL,
    placeholder: 'sk-... (硅基流动控制台)',
    hint: 'cloud.siliconflow.cn · 推荐 Qwen/Qwen2.5-14B-Instruct',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    placeholder: 'sk-... (DeepSeek 控制台)',
    hint: 'platform.deepseek.com · deepseek-chat',
  },
  minimax: {
    label: 'MiniMax',
    baseUrl: 'https://api.minimax.io/v1',
    model: 'MiniMax-M2.5',
    placeholder: 'MiniMax API Key',
    hint: 'platform.minimaxi.com · MiniMax-M2.5',
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    placeholder: '智谱 API Key (bigmodel.cn)',
    hint: 'bigmodel.cn · glm-4-flash / glm-4-plus',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    placeholder: 'sk-... (OpenAI 控制台)',
    hint: 'api.openai.com · gpt-4o-mini',
  },
  qwen: {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
    placeholder: 'sk-... (阿里云 DashScope)',
    hint: 'DashScope · qwen-turbo / qwen-plus',
  },
  ollama: {
    label: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    placeholder: '本地可不填 Key',
    hint: 'localhost:11434 · 任意本地模型名',
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    model: '',
    placeholder: 'API Key',
    hint: '任意 OpenAI 兼容端点',
  },
};

function env(name: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === 'string' ? v.trim() : '';
}

function runtime(): RuntimeConfig {
  if (typeof window === 'undefined') return {};
  return window.__MINGPAN_CONFIG__ || {};
}

function pickKey(...values: Array<string | undefined>): string {
  for (const v of values) {
    if (v && v.trim()) return v.trim();
  }
  return '';
}

function defaultProviderFromEnv(): AIProvider {
  const rt = runtime();
  if (rt.provider && LLM_PRESETS[rt.provider]) return rt.provider;

  const hasSf = !!(rt.siliconFlowApiKey || env('VITE_SILICONFLOW_API_KEY') || rt.apiKey || env('VITE_AI_API_KEY'));
  const hasDs = !!(rt.deepseekApiKey || env('VITE_DEEPSEEK_API_KEY'));
  const hasMm = !!(rt.minimaxApiKey || env('VITE_MINIMAX_API_KEY'));

  if (hasSf) return 'siliconflow';
  if (hasDs) return 'deepseek';
  if (hasMm) return 'minimax';
  return 'siliconflow';
}

function resolveEnvForProvider(provider: AIProvider): { apiKey: string; model: string; baseUrl: string } {
  const rt = runtime();
  const preset = LLM_PRESETS[provider];

  if (provider === 'siliconflow') {
    return {
      apiKey: pickKey(rt.siliconFlowApiKey, env('VITE_SILICONFLOW_API_KEY'), rt.apiKey, env('VITE_AI_API_KEY')),
      model: pickKey(rt.siliconFlowModel, env('VITE_SILICONFLOW_MODEL'), rt.model, env('VITE_AI_MODEL')) || preset.model,
      baseUrl: pickKey(rt.baseUrl, env('VITE_AI_BASE_URL')) || preset.baseUrl,
    };
  }

  if (provider === 'deepseek') {
    return {
      apiKey: pickKey(rt.deepseekApiKey, env('VITE_DEEPSEEK_API_KEY'), rt.apiKey, env('VITE_AI_API_KEY')),
      model: pickKey(rt.deepseekModel, env('VITE_DEEPSEEK_MODEL'), rt.model, env('VITE_AI_MODEL')) || preset.model,
      baseUrl: pickKey(rt.baseUrl, env('VITE_AI_BASE_URL')) || preset.baseUrl,
    };
  }

  if (provider === 'minimax') {
    return {
      apiKey: pickKey(rt.minimaxApiKey, env('VITE_MINIMAX_API_KEY'), rt.apiKey, env('VITE_AI_API_KEY')),
      model: pickKey(rt.minimaxModel, env('VITE_MINIMAX_MODEL'), rt.model, env('VITE_AI_MODEL')) || preset.model,
      baseUrl: pickKey(rt.baseUrl, env('VITE_AI_BASE_URL')) || preset.baseUrl,
    };
  }

  return {
    apiKey: pickKey(rt.apiKey, env('VITE_AI_API_KEY')),
    model: pickKey(rt.model, env('VITE_AI_MODEL')) || preset.model,
    baseUrl: pickKey(rt.baseUrl, env('VITE_AI_BASE_URL')) || preset.baseUrl,
  };
}

function normalizeConfig(raw: Partial<AIConfig> | null | undefined): AIConfig {
  const provider = (raw?.provider && LLM_PRESETS[raw.provider as AIProvider]
    ? (raw.provider as AIProvider)
    : defaultProviderFromEnv());
  const preset = LLM_PRESETS[provider];
  const envResolved = resolveEnvForProvider(provider);

  const apiKey = pickKey(raw?.apiKey, envResolved.apiKey);
  const baseUrl = pickKey(raw?.baseUrl, envResolved.baseUrl) || preset.baseUrl;
  const model = pickKey(raw?.model, envResolved.model) || preset.model;
  const enableThinking =
    typeof raw?.enableThinking === 'boolean'
      ? raw.enableThinking
      : typeof runtime().enableThinking === 'boolean'
        ? !!runtime().enableThinking
        : env('VITE_AI_ENABLE_THINKING') === 'true';

  const loggedIn = isLoggedIn();
  const accessMode: AIAccessMode =
    raw?.accessMode === 'platform' || raw?.accessMode === 'byok'
      ? raw.accessMode
      : loggedIn
        ? 'platform'
        : 'byok';

  const platformModel =
    pickKey(raw?.platformModel, (runtime() as any).aiDefaultModel) || DEFAULT_PLATFORM_MODEL;

  // 登录默认开 AI；未登录仅在有 Key / Ollama 时默认开
  const enabled =
    typeof raw?.enabled === 'boolean'
      ? raw.enabled
      : accessMode === 'platform' && loggedIn
        ? true
        : !!(apiKey || provider === 'ollama');

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    enabled,
    enableThinking,
    accessMode,
    platformModel,
  };
}

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeConfig(JSON.parse(raw));
  } catch {
    // ignore
  }
  return normalizeConfig(null);
}

export function saveAIConfig(c: AIConfig) {
  const next = normalizeConfig(c);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  // 同步到运行时，便于同页即时生效
  if (typeof window !== 'undefined') {
    window.__MINGPAN_CONFIG__ = {
      ...(window.__MINGPAN_CONFIG__ || {}),
      provider: next.provider,
      apiKey: next.apiKey,
      baseUrl: next.baseUrl,
      model: next.model,
      enableThinking: next.enableThinking,
      ...(next.provider === 'siliconflow'
        ? { siliconFlowApiKey: next.apiKey, siliconFlowModel: next.model }
        : {}),
      ...(next.provider === 'deepseek'
        ? { deepseekApiKey: next.apiKey, deepseekModel: next.model }
        : {}),
      ...(next.provider === 'minimax'
        ? { minimaxApiKey: next.apiKey, minimaxModel: next.model }
        : {}),
    };
  }
}

export function hasAIKey(config?: AIConfig): boolean {
  const c = config || loadAIConfig();
  if (c.provider === 'ollama') return true;
  return !!c.apiKey?.trim();
}

export function usesPlatformAI(config?: AIConfig): boolean {
  const c = config || loadAIConfig();
  return c.accessMode === 'platform';
}

/** 当前配置是否可发起 AI 调用 */
export function canUseAI(config?: AIConfig): boolean {
  const c = config || loadAIConfig();
  if (!c.enabled) return false;
  if (c.accessMode === 'platform') return isLoggedIn();
  return hasAIKey(c);
}

export function getAIGateMessage(config?: AIConfig): string {
  const c = config || loadAIConfig();
  if (!c.enabled) {
    return isLoggedIn()
      ? '⚠️ AI 未启用，请到「设」中开启 AI 解读。'
      : '⚠️ 未登录时需在「设」中填写 API Key 并启用 AI 解读。';
  }
  if (c.accessMode === 'platform' && !isLoggedIn()) {
    return '⚠️ 平台 AI 需先登录；也可在「设」切换为自备 API Key。';
  }
  if (c.accessMode !== 'platform' && !hasAIKey(c)) {
    return '⚠️ 请先在「设」中配置 API Key 后启用 AI 解读。';
  }
  return '⚠️ AI 暂不可用，请检查设置。';
}


export interface PlatformFailInfo {
  message: string;
  at: number;
}

export function getPlatformFailInfo(): PlatformFailInfo | null {
  try {
    const raw = localStorage.getItem(PLATFORM_FAIL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PlatformFailInfo;
    if (!data?.message) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearPlatformFailInfo() {
  try {
    localStorage.removeItem(PLATFORM_FAIL_KEY);
  } catch {
    // ignore
  }
}

function markPlatformFail(message: string) {
  try {
    localStorage.setItem(
      PLATFORM_FAIL_KEY,
      JSON.stringify({ message: message.slice(0, 300), at: Date.now() } satisfies PlatformFailInfo),
    );
  } catch {
    // ignore
  }
}

/** 平台失败后的引导文案 */
export function getPlatformFailGuide(detail?: string): string {
  const d = (detail || '').trim();
  const head = d ? `平台 AI 调用失败：${d}` : '平台 AI 调用失败';
  return `${head}。请到「设」→ 切换「自备 API Key」并填写自己的密钥后重试。`;
}

/** 登录成功后：默认开启平台 AI
 * force=true：主动登录/注册时调用
 * force=false：会话恢复时仅在当前不可用时补齐
 */
export function applyLoginAIDefaults(opts?: { force?: boolean }) {
  const c = loadAIConfig();
  const force = !!opts?.force;

  if (!force) {
    // 会话恢复：已可调用则不动；否则补齐平台默认
    if (canUseAI(c)) return;
  }

  // 登录后始终优先平台 AI（自备 Key 仅作平台失效后备）
  saveAIConfig({
    ...c,
    enabled: true,
    accessMode: 'platform',
    platformModel: c.platformModel || DEFAULT_PLATFORM_MODEL,
  });
  if (force) clearPlatformFailInfo();
}

/** 退出登录后：若无自备 Key 则关闭 AI，并切回 byok */
export function applyLogoutAIDefaults() {
  const c = loadAIConfig();
  const keepByok = hasAIKey(c);
  saveAIConfig({
    ...c,
    accessMode: 'byok',
    enabled: keepByok ? c.enabled : false,
  });
}

export function getProviderDisplayName(provider: AIProvider): string {
  return LLM_PRESETS[provider]?.label || provider;
}

function friendlyHttpError(status: number, body: string, providerLabel: string): string {
  if (status === 401) return 'API Key 校验失败 (401)，请检查 Key 是否正确。';
  if (status === 402) return '账户欠费 (402)，请前往服务商控制台充值。';
  if (status === 403) return '无权访问 (403)，请检查 Key 权限或模型白名单。';
  if (status === 429) return '请求过于频繁 (429)，请稍后重试。';
  if (status >= 500) return `${providerLabel} 服务异常 (${status})，请稍后重试。`;
  const detail = body.replace(/\s+/g, ' ').slice(0, 180);
  return `LLM 调用失败: ${status}${detail ? ` ${detail}` : ''}`;
}

function extractContent(data: any): string {
  const msg = data?.choices?.[0]?.message;
  const content = msg?.content;
  if (typeof content === 'string' && content.trim()) return content;

  // 部分思考模型把正文放在 reasoning_content
  const reasoning = msg?.reasoning_content;
  if (typeof reasoning === 'string' && reasoning.trim()) return reasoning;

  // 数组 content（少数兼容实现）
  if (Array.isArray(content)) {
    const joined = content
      .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
      .trim();
    if (joined) return joined;
  }

  return '';
}

async function callPlatformLLM(
  config: AIConfig,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options: CallLLMOptions = {},
): Promise<string> {
  if (!isLoggedIn()) {
    throw new Error(getPlatformFailGuide('未登录，无法使用平台额度'));
  }
  const model = (config.platformModel || config.model || DEFAULT_PLATFORM_MODEL).trim();
  if (!model) throw new Error(getPlatformFailGuide('未选择平台模型'));

  try {
    const result = await callCfAiChat({
      model,
      messages,
      system: systemPrompt,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      signal: options.signal,
    });
    const text = result.message?.content?.trim() || '';
    if (!text) throw new Error('平台 AI 返回空内容');
    // 成功则清除失败标记
    clearPlatformFailInfo();
    return text;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    const detail = e?.message || '未知错误';
    markPlatformFail(detail);

    // 若本地已配置自备 Key，自动回退一次，避免解读中断
    if (hasAIKey(config) || config.provider === 'ollama') {
      try {
        return await callByokLLM(
          { ...config, accessMode: 'byok' },
          messages,
          systemPrompt,
          options,
        );
      } catch (byokErr: any) {
        if (byokErr?.name === 'AbortError') throw byokErr;
        throw new Error(
          getPlatformFailGuide(`${detail}；自备 Key 也失败：${byokErr?.message || '未知错误'}`),
        );
      }
    }

    throw new Error(getPlatformFailGuide(detail));
  }
}

/** 自备 Key：OpenAI 兼容 chat 调用 */
async function callByokLLM(
  config: AIConfig,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options: CallLLMOptions = {},
): Promise<string> {
  const provider = config.provider || 'siliconflow';
  const preset = LLM_PRESETS[provider] || LLM_PRESETS.custom;
  const baseUrl = (config.baseUrl || preset.baseUrl).replace(/\/$/, '');
  const model = config.model || preset.model;
  const apiKey = config.apiKey?.trim() || (provider === 'ollama' ? 'ollama' : '');
  const providerLabel = getProviderDisplayName(provider);

  if (!baseUrl) {
    throw new Error('未配置 Base URL，请到「设」中填写 API 端点。');
  }
  if (!apiKey) {
    throw new Error(`未配置 ${providerLabel} API Key，请到「设」中填写。`);
  }
  if (!model) {
    throw new Error('未配置模型名称，请到「设」中填写 Model。');
  }

  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options.temperature ?? 0.7;
  const enableThinking =
    options.enableThinking !== undefined ? options.enableThinking : !!config.enableThinking;

  const body: Record<string, unknown> = {
    model,
    messages: msgs,
    temperature,
    max_tokens: maxTokens,
  };

  // SiliconFlow / DeepSeek 思考模型开关
  if (model.toLowerCase().includes('deepseek') || model.toLowerCase().includes('r1')) {
    body.enable_thinking = enableThinking;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    const msg = e?.message || '网络请求失败';
    if (String(msg).includes('Failed to fetch')) {
      throw new Error('网络请求失败，请检查网络、CORS 或 API 端点是否可达。');
    }
    throw new Error(msg);
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(friendlyHttpError(res.status, err, providerLabel));
  }

  const data = await res.json();
  const text = extractContent(data);
  if (!text) {
    throw new Error(`${providerLabel} 返回空内容，请检查模型是否可用。`);
  }
  return text;
}

/** 统一入口：平台 AI 或自备 Key */
export async function callLLM(
  config: AIConfig,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options: CallLLMOptions = {},
): Promise<string> {
  const c = normalizeConfig(config);
  if (c.accessMode === 'platform') {
    return callPlatformLLM(c, messages, systemPrompt, options);
  }
  return callByokLLM(c, messages, systemPrompt, options);
}

export async function testApiConnection(config?: AIConfig): Promise<ConnectionTestResult> {
  const c = config || loadAIConfig();
  const start = performance.now();
  try {
    const text = await callLLM(
      c,
      [{ role: 'user', content: 'ping' }],
      undefined,
      { maxTokens: 8, temperature: 0.1, enableThinking: false },
    );
    const latency = performance.now() - start;
    if (!text) {
      return {
        success: false,
        message: 'API 响应成功，但返回内容为空。',
        latency,
      };
    }
    const modeLabel =
      c.accessMode === 'platform' ? `平台AI(${getAiBaseUrl()})` : getProviderDisplayName(c.provider);
    return {
      success: true,
      message: `连接成功（${modeLabel}）！延迟 ${latency.toFixed(0)} ms`,
      latency,
    };
  } catch (e: any) {
    return {
      success: false,
      message: e?.message || '连接失败',
    };
  }
}

// 命盘解读系统提示词
export const SYSTEM_PROMPT_ZIWEI = `你是一位精通紫微斗数的命理师。请基于用户提供的命盘数据进行专业、温和的解读。

要求：
1. 用通俗易懂的语言解释专业术语
2. 重点分析命宫主星特质、三方四正格局、四化飞星走向
3. 给出大限/流年的关键节点
4. 涉及运势起伏时，提示积极面对，不要恐吓
5. 保持 600 字以内
6. 用"你"称呼用户，不要用"此命主"等生硬说法`;

export const SYSTEM_PROMPT_QIMEN = `你是一位精通奇门遁甲的预测师。请基于用户提供的奇门盘进行专业解读。

要求：
1. 重点分析用局阴阳遁、值符值使所在宫位
2. 解读八门吉凶、九星旺衰
3. 结合天盘/地盘天干生克关系
4. 给出具体事项的建议方向
5. 保持 500 字以内
6. 用语通俗，避免玄虚`;

export const SYSTEM_PROMPT_BAZI = `你是一位八字命理师。请基于用户提供的八字四柱进行解读。

要求：
1. 重点分析日主强弱、喜用神、忌神
2. 解读十神配置代表的六亲/事业/财运
3. 分析大运流年走向
4. 给出调候建议（方位/颜色/职业等）
5. 保持 600 字以内
6. 温和、积极的语气`;
