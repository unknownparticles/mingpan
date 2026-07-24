import { useState } from 'react';
import { loadAIConfig, saveAIConfig, LLM_PRESETS, type AIConfig } from '../lib/aiInterpret';

interface Props {
  onClose: () => void;
}

export default function Settings({ onClose }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function update<K extends keyof AIConfig>(k: K, v: AIConfig[K]) {
    setConfig(c => ({ ...c, [k]: v }));
  }

  function selectProvider(key: string) {
    const preset = LLM_PRESETS[key];
    if (!preset) return;
    setConfig(c => ({
      ...c,
      provider: key,
      baseUrl: preset.baseUrl,
      model: preset.model,
    }));
  }

  function save() {
    saveAIConfig(config);
    alert('已保存');
    onClose();
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: '你好，简短回复' }],
          max_tokens: 50,
        }),
      });
      if (!res.ok) {
        setTestResult(`❌ HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
      } else {
        setTestResult('✅ 连接成功');
      }
    } catch (e: any) {
      setTestResult(`❌ ${e.message || '连接失败'}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="paper p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-gold-bright font-bold tracking-widest title-display">设 置</h2>
          <button onClick={onClose} className="text-gold opacity-70 text-sm">关闭</button>
        </div>

        <div className="text-xs text-gold opacity-70 leading-relaxed">
          启用 AI 解读需配置 LLM API。Key 仅存在本地浏览器，不上传任何服务器。
        </div>

        <div className="flex items-center justify-between py-2 border-y border-gold/15">
          <span className="text-rice text-sm">启用 AI 解读</span>
          <button
            className={`text-sm px-3 py-1 rounded ${config.enabled ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => update('enabled', !config.enabled)}
          >
            {config.enabled ? '已启用' : '未启用'}
          </button>
        </div>

        {/* 厂商预设 */}
        <div>
          <label className="block text-xs text-gold opacity-70 mb-2">LLM 厂商</label>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(LLM_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className={`py-1.5 text-xs rounded transition ${
                  config.provider === key ? 'btn-vermilion' : 'btn-ghost'
                }`}
                onClick={() => selectProvider(key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-1">Base URL</label>
          <input
            className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
            value={config.baseUrl}
            onChange={e => update('baseUrl', e.target.value)}
            placeholder="https://api.deepseek.com/v1"
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
            placeholder="deepseek-chat / glm-4-flash / gpt-4o-mini"
          />
        </div>

        <div>
          <button
            onClick={testConnection}
            disabled={testing || !config.baseUrl || !config.apiKey}
            className="w-full btn-ghost py-2 rounded text-sm disabled:opacity-30"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          {testResult && (
            <div className="mt-2 text-xs text-rice">{testResult}</div>
          )}
        </div>

        {/* 厂商指引 */}
        <div className="text-[10px] text-gold opacity-50 leading-relaxed space-y-1.5 border-t border-gold/10 pt-3">
          <div>· <b>DeepSeek</b>：<b>platform.deepseek.com</b> · 模型 <code>deepseek-chat</code></div>
          <div>· <b>智谱 GLM</b>：<b>bigmodel.cn</b> · 模型 <code>glm-4-flash</code>（便宜）或 <code>glm-4-plus</code></div>
          <div>· <b>通义千问</b>：阿里云 <b>DashScope</b> · 模型 <code>qwen-turbo</code></div>
          <div>· <b>OpenAI</b>：官方 <code>api.openai.com</code></div>
          <div>· <b>Ollama</b>：本地 <code>http://localhost:11434/v1</code>，Key 随便填</div>
        </div>

        <button onClick={save} className="btn-vermilion w-full py-3 rounded text-base font-bold tracking-widest title-display">
          保 存
        </button>
      </div>
    </div>
  );
}
