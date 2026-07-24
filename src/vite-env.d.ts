/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_API_KEY?: string;
  readonly VITE_AI_BASE_URL?: string;
  readonly VITE_AI_MODEL?: string;
  readonly VITE_AI_ENABLE_THINKING?: string;
  readonly VITE_SILICONFLOW_API_KEY?: string;
  readonly VITE_SILICONFLOW_MODEL?: string;
  readonly VITE_DEEPSEEK_API_KEY?: string;
  readonly VITE_DEEPSEEK_MODEL?: string;
  readonly VITE_MINIMAX_API_KEY?: string;
  readonly VITE_MINIMAX_MODEL?: string;
  readonly VITE_AUTH_BASE_URL?: string;
  readonly VITE_LOGIN_BASE_URL?: string;
  readonly VITE_REGISTER_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface MingpanRuntimeConfig {
  provider?:
    | 'siliconflow'
    | 'deepseek'
    | 'minimax'
    | 'glm'
    | 'openai'
    | 'qwen'
    | 'ollama'
    | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  siliconFlowApiKey?: string;
  siliconFlowModel?: string;
  deepseekApiKey?: string;
  deepseekModel?: string;
  minimaxApiKey?: string;
  minimaxModel?: string;
  enableThinking?: boolean;
  authBaseUrl?: string;
  loginBaseUrl?: string;
  registerBaseUrl?: string;
}

interface Window {
  __MINGPAN_CONFIG__?: MingpanRuntimeConfig;
}
