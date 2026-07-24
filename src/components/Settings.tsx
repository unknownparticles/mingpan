import { useEffect, useState } from 'react';
import AuthPanel from './AuthPanel';
import {
  loadAIConfig,
  saveAIConfig,
  LLM_PRESETS,
  testApiConnection,
  canUseAI,
  getPlatformFailInfo,
  clearPlatformFailInfo,
  type AIConfig,
  type AIProvider,
  type AIAccessMode,
} from '../lib/aiInterpret';
import { isLoggedIn } from '../lib/auth';
import { fetchCfAiConfig, fetchCfAiMe, getAiBaseUrl, type CfAiModel, type CfAiMe } from '../lib/cfAi';

interface Props {
  onClose: () => void;
  onAuthChange?: (user: import('../lib/auth').AuthUser | null) => void;
}

export default function Settings({ onClose, onAuthChange }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [platformModels, setPlatformModels] = useState<CfAiModel[]>([]);
  const [platformDefault, setPlatformDefault] = useState('');
  const [platformMe, setPlatformMe] = useState<CfAiMe | null>(null);
  const [platformHint, setPlatformHint] = useState('');
  const [platformFail, setPlatformFail] = useState(getPlatformFailInfo());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchCfAiConfig();
        if (cancelled) return;
        setPlatformModels(cfg.models || []);
        setPlatformDefault(cfg.defaultModel || '');
        setPlatformHint(
          cfg.authenticated
            ? `平台已鉴权 · 日限 ${cfg.dailyLimit || '不限'}`
            : '未登录：平台模型需登录后可用',
        );
        if (!config.platformModel && cfg.defaultModel) {
          setConfig(prev => ({ ...prev, platformModel: cfg.defaultModel }));
        }
      } catch (e: any) {
        if (!cancelled) setPlatformHint(e?.message || '无法连接平台 AI');
      }

      if (isLoggedIn()) {
        try {
          const me = await fetchCfAiMe();
          if (!cancelled) setPlatformMe(me);
        } catch {
          if (!cancelled) setPlatformMe(null);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  function update<K extends keyof AIConfig>(k: K, v: AIConfig[K]) {
    setConfig(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  function setAccessMode(mode: AIAccessMode) {
    setConfig(prev => ({
      ...prev,
      accessMode: mode,
      // 切到平台且已登录时默认开启
      enabled: mode === 'platform' && loggedIn ? true : prev.enabled,
    }));
    setSaved(false);
    setTestResult('');
    if (mode === 'byok') {
      // 用户已按引导切到自备 Key，保留失败提示直至保存成功连接
      setPlatformFail(getPlatformFailInfo());
    }
  }

  function selectProvider(key: AIProvider) {
    const preset = LLM_PRESETS[key];
    setConfig(prev => ({
      ...prev,
      provider: key,
      baseUrl: preset.baseUrl || prev.baseUrl,
      model: preset.model || prev.model,
      apiKey: prev.provider === key ? prev.apiKey : (prev.apiKey || ''),
    }));
    setSaved(false);
    setTestResult('');
  }

  function save() {
    saveAIConfig(config);
    if (config.accessMode === 'byok' && config.apiKey?.trim()) {
      // 用户已填写自备 Key，可收起失败引导
      // 真正连通成功后再清；这里先保留提示
    }
    setSaved(true);
    setPlatformFail(getPlatformFailInfo());
    setTimeout(() => setSaved(false), 1500);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult('');
    try {
      const result = await testApiConnection(config);
      setTestResult(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      if (result.success && config.accessMode === 'byok') {
        clearPlatformFailInfo();
        setPlatformFail(null);
      } else {
        setPlatformFail(getPlatformFailInfo());
      }
    } catch (e: any) {
      setTestResult(`❌ ${e.message || '连接失败'}`);
    } finally {
      setTesting(false);
    }
  }

  const currentHint = LLM_PRESETS[config.provider]?.hint || '';
  const needsKey = config.provider !== 'ollama';
  const isPlatform = config.accessMode === 'platform';
  const availablePlatform = platformModels.filter(m => m.available !== false);

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
          <AuthPanel
            onAuthChange={(u) => {
              setLoggedIn(!!u);
              onAuthChange?.(u);
              setConfig(loadAIConfig());
            }}
          />
        </section>

        <div className="text-xs text-gold opacity-60 leading-relaxed">
          登录后默认使用 <b>平台 AI 额度</b>（{getAiBaseUrl()}）。
          平台调用失败后再填写 <b>自备 API Key</b> 作为后备；未登录则必须自备 Key。
        </div>

        {platformFail && (
          <div className="rounded border border-vermilion/40 bg-vermilion/10 p-3 text-xs text-rice leading-relaxed space-y-2">
            <div className="text-vermilion font-medium">平台 AI 最近调用失败</div>
            <div className="opacity-90 break-words">{platformFail.message}</div>
            <div className="text-gold/70">
              登录默认使用平台额度；失效后请点下方按钮切换到「自备 API Key」，填写 SiliconFlow / DeepSeek 等密钥后保存并测试连接。
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-vermilion text-[11px] px-2.5 py-1 rounded"
                onClick={() => setAccessMode('byok')}
              >
                去填写自备 Key
              </button>
              <button
                type="button"
                className="btn-ghost text-[11px] px-2.5 py-1 rounded"
                onClick={() => {
                  clearPlatformFailInfo();
                  setPlatformFail(null);
                }}
              >
                忽略
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-rice text-sm">启用 AI 解读</span>
          <button
            className={`text-sm px-3 py-1 rounded ${config.enabled ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => update('enabled', !config.enabled)}
          >
            {config.enabled ? '已启用' : '未启用'}
          </button>
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-2">AI 通道</label>
          <div className="flex flex-wrap gap-2">
            <button
              className={`text-xs px-2.5 py-1 rounded ${isPlatform ? 'btn-vermilion' : 'btn-ghost'}`}
              onClick={() => setAccessMode('platform')}
              disabled={!loggedIn}
              title={loggedIn ? '使用登录态调用平台 AI' : '需先登录'}
            >
              平台 AI{loggedIn ? '' : '（需登录）'}
            </button>
            <button
              className={`text-xs px-2.5 py-1 rounded ${!isPlatform ? 'btn-vermilion' : 'btn-ghost'}`}
              onClick={() => setAccessMode('byok')}
            >
              自备 API Key
            </button>
          </div>
          <div className="mt-2 text-[10px] text-gold opacity-50">
            {isPlatform
              ? (platformHint || '登录后使用 Cloudflare / 硅基流动平台额度')
              : '未登录或想用自己的 Key 时选择此项'}
          </div>
          {platformMe && isPlatform && (
            <div className="mt-2 text-[10px] text-gold/60">
              今日调用 {platformMe.usage?.dailyUsed ?? 0}
              {platformMe.usage?.dailyLimit ? ` / ${platformMe.usage.dailyLimit}` : ''}
              {' · '}积分 {platformMe.user?.points ?? 0}
              {' · '}{platformMe.user?.membership?.name || '会员'}
            </div>
          )}
        </div>

        {isPlatform ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gold opacity-70 mb-1">平台模型</label>
              <select
                className="w-full bg-ink-soft/60 border border-gold/30 text-rice py-2 px-2 rounded text-sm focus:outline-none focus:border-gold-bright"
                value={config.platformModel || platformDefault}
                onChange={e => update('platformModel', e.target.value)}
              >
                {(availablePlatform.length ? availablePlatform : platformModels).map(m => (
                  <option key={m.id} value={m.id} disabled={m.available === false}>
                    {m.name} · {m.provider} · 消耗{m.cost}
                    {m.available === false ? '（不可用）' : ''}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[10px] text-gold/40">
                {platformModels.find(m => m.id === (config.platformModel || platformDefault))?.description || ''}
              </div>
            </div>
          </div>
        ) : (
          <>
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
                placeholder={LLM_PRESETS[config.provider]?.placeholder || 'API Key'}
              />
              {!loggedIn && (
                <div className="mt-1 text-[10px] text-vermilion/80">未登录必须填写 Key 才能启用 AI</div>
              )}
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
          </>
        )}

        <div>
          <button
            onClick={testConnection}
            disabled={
              testing ||
              (isPlatform ? !loggedIn : (!config.baseUrl || (needsKey && !config.apiKey)))
            }
            className="w-full btn-ghost py-2 rounded text-sm disabled:opacity-30"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          {testResult && (
            <div className="mt-2 text-xs text-rice whitespace-pre-wrap">{testResult}</div>
          )}
          <div className="mt-2 text-[10px] text-gold/40">
            当前状态：{canUseAI(config) ? '可调用 AI' : '不可用（需登录或填写 Key）'}
          </div>
        </div>

        <div className="text-[10px] text-gold opacity-50 leading-relaxed space-y-1.5 border-t border-gold/10 pt-3">
          <div>· <b>平台 AI</b>：{getAiBaseUrl()} · 登录令牌鉴权 · Workers AI / 硅基流动</div>
          <div>· <b>自备 Key</b>：SiliconFlow / DeepSeek / MiniMax / 智谱 / 通义 / OpenAI / Ollama</div>
          <div>· 环境变量：<code>VITE_AI_SERVICE_BASE_URL</code> / <code>VITE_SILICONFLOW_API_KEY</code></div>
        </div>

        <button onClick={save} className="btn-vermilion w-full py-3 rounded text-base font-bold tracking-widest title-display">
          {saved ? '已保存' : '保 存'}
        </button>
      </div>
    </div>
  );
}
