import { useState } from 'react';
import AuthPanel from './AuthPanel';
import {
  loadAIConfig,
  saveAIConfig,
  LLM_PRESETS,
  testApiConnection,
  type AIConfig,
  type AIProvider,
} from '../lib/aiInterpret';

interface Props {
  onClose: () => void;
  onAuthChange?: (user: import('../lib/auth').AuthUser | null) => void;
}

export default function Settings({ onClose, onAuthChange }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  function update<K extends keyof AIConfig>(k: K, v: AIConfig[K]) {
    setConfig(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  function selectProvider(key: AIProvider) {
    const preset = LLM_PRESETS[key];
    setConfig(prev => ({
      ...prev,
      provider: key,
      // 切厂商时用预设填入；用户已填 Key 时保留
      baseUrl: preset.baseUrl || prev.baseUrl,
      model: preset.model || prev.model,
      apiKey: prev.provider === key ? prev.apiKey : (prev.apiKey || ''),
    }));
    setSaved(false);
    setTestResult('');
  }

  function save() {
    saveAIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult('');
    try {
      const result = await testApiConnection(config);
      setTestResult(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    } catch (e: any) {
      setTestResult(`❌ ${e.message || '连接失败'}`);
    } finally {
      setTesting(false);
    }
  }

  const currentHint = LLM_PRESETS[config.provider]?.hint || '';
  const needsKey = config.provider !== 'ollama';

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl title-display text-gold-bright tracking-widest">设 置</h2>
        <button onClick={onClose} className="btn-ghost text-sm px-3 py-1 rounded">返回</button>
      </div>

      <div className="space-y-5">
        <section className="rounded border border-gold/20 bg-ink-soft/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gold-bright title-display tracking-widest">账 号</h3>
            <span className="text-[10px] text-gold/40">CF Auth · alunapi.top</span>
          </div>
          <AuthPanel onAuthChange={onAuthChange} />
        </section>

        <div className="text-xs text-gold opacity-60 leading-relaxed">
          启用 AI 解读需配置 LLM API（兼容 OpenAI Chat Completions）。
          默认推荐 <b>SiliconFlow 硅基流动</b>（与 one_min_ceo 同款接入）。
          Key 仅存在本地浏览器，也可通过 <code>.env</code> / <code>runtime-config.js</code> 注入。
        </div>

        <div className="flex items-center justify-between">
          <span className="text-rice text-sm">启用 AI 解读</span>
          <button
            className={`text-sm px-3 py-1 rounded ${config.enabled ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => update('enabled', !config.enabled)}
          >
            {config.enabled ? '已启用' : '未启用'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-rice text-sm">思考模式</span>
            <div className="text-[10px] text-gold opacity-50 mt-0.5">DeepSeek / R1 类模型生效</div>
          </div>
          <button
            className={`text-sm px-3 py-1 rounded ${config.enableThinking ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => update('enableThinking', !config.enableThinking)}
          >
            {config.enableThinking ? '开启' : '关闭'}
          </button>
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-2">LLM 厂商</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(LLM_PRESETS) as AIProvider[]).map(key => {
              const preset = LLM_PRESETS[key];
              return (
                <button
                  key={key}
                  className={`text-xs px-2.5 py-1 rounded ${
                    config.provider === key ? 'btn-vermilion' : 'btn-ghost'
                  }`}
                  onClick={() => selectProvider(key)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {currentHint && (
            <div className="mt-2 text-[10px] text-gold opacity-50">{currentHint}</div>
          )}
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-1">Base URL</label>
          <input
            className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
            value={config.baseUrl}
            onChange={e => update('baseUrl', e.target.value)}
            placeholder="https://api.siliconflow.cn/v1"
          />
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-1">API Key</label>
          <input
            type="password"
            className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
            value={config.apiKey}
            onChange={e => update('apiKey', e.target.value)}
            placeholder={LLM_PRESETS[config.provider]?.placeholder || 'sk-...'}
          />
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-1">Model</label>
          <input
            className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
            value={config.model}
            onChange={e => update('model', e.target.value)}
            placeholder="Qwen/Qwen2.5-14B-Instruct"
          />
        </div>

        <div>
          <button
            onClick={testConnection}
            disabled={testing || !config.baseUrl || (needsKey && !config.apiKey)}
            className="w-full btn-ghost py-2 rounded text-sm disabled:opacity-30"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          {testResult && (
            <div className="mt-2 text-xs text-rice whitespace-pre-wrap">{testResult}</div>
          )}
        </div>

        <div className="text-[10px] text-gold opacity-50 leading-relaxed space-y-1.5 border-t border-gold/10 pt-3">
          <div>· <b>SiliconFlow</b>：<b>cloud.siliconflow.cn</b> · 模型 <code>Qwen/Qwen2.5-14B-Instruct</code></div>
          <div>· <b>DeepSeek</b>：<b>platform.deepseek.com</b> · 模型 <code>deepseek-chat</code></div>
          <div>· <b>MiniMax</b>：<b>platform.minimaxi.com</b> · 模型 <code>MiniMax-M2.5</code></div>
          <div>· <b>智谱 / 通义 / OpenAI / Ollama</b>：OpenAI 兼容协议均可</div>
          <div>· 环境变量：<code>VITE_SILICONFLOW_API_KEY</code> 或 <code>VITE_AI_API_KEY</code></div>
        </div>

        <button onClick={save} className="btn-vermilion w-full py-3 rounded text-base font-bold tracking-widest title-display">
          {saved ? '已保存' : '保 存'}
        </button>
      </div>
    </div>
  );
}
