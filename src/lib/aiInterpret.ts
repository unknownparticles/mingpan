// AI 解读 — 客户端调用 LLM（兼容 OpenAI / Anthropic 格式）
// 用户需在设置中填入自己的 API Key + Base URL + Model

const STORAGE_KEY = 'mingpan:ai-config';

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  provider: string; // openai | deepseek | glm | custom
}

export const LLM_PRESETS: Record<string, { baseUrl: string; model: string; label: string; placeholder: string }> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    placeholder: 'sk-... (DeepSeek 控制台获取)',
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    placeholder: '智谱 API Key (bigmodel.cn)',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    placeholder: 'sk-... (OpenAI 控制台获取)',
  },
  qwen: {
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
    placeholder: 'sk-... (阿里云 DashScope)',
  },
  ollama: {
    label: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    placeholder: '本地不需要 Key',
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    model: '',
    placeholder: 'API Key',
  },
};

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: false,
    provider: 'deepseek',
  };
}

export function saveAIConfig(c: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

// 通用 OpenAI 兼容 chat 调用
export async function callLLM(
  config: AIConfig,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
): Promise<string> {
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: msgs,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM 调用失败: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '（无返回）';
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
