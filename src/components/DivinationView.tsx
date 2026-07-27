/**
 * 占卜结果展示
 * - 梅花易数：本卦/变卦/动爻/解读
 * - 小六壬：六宫爻/宫位/解读
 * - 有可用 AI 时，基于本地起卦结果自动详批
 */
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spark, Seal } from './Icon';
import { ScrollCard, Divider } from './Ornament';
import { loadAIConfig, canUseAI, getAIGateMessage } from '../lib/aiInterpret';
import { callLLMWithCache } from '../lib/cache';
import { buildDivinationPrompt } from '../lib/almanac';
import { LoadingStages } from './LoadingStages';

interface Props {
  result: { type: 'meiHua' | 'xiaoLiuRen'; data: any; question?: string };
  onBack: () => void;
  onStartInput: () => void;
}

const XL_MEANINGS: Record<string, { color: string; desc: string; career: string; wealth: string; love: string; health: string }> = {
  '大安': { color: '#7aac8a', desc: '安稳平静', career: '事业稳定，稳中有升', wealth: '财稳，宜守不宜攻', love: '感情和顺', health: '平安' },
  '留连': { color: '#c8a45c', desc: '拖延纠结', career: '进展缓慢', wealth: '财路阻滞', love: '暧昧不清', health: '小疾' },
  '速喜': { color: '#c8392f', desc: '快速应喜', career: '升迁/喜讯', wealth: '财来速', love: '有喜', health: '康健' },
  '赤口': { color: '#c8392f', desc: '口舌争执', career: '人际冲突', wealth: '破财口舌', love: '争吵', health: '小心外伤' },
  '小吉': { color: '#7aac8a', desc: '小有所成', career: '有进展', wealth: '小财', love: '小甜', health: '小安' },
  '空亡': { color: '#c8a45c', desc: '落空成空', career: '无功而返', wealth: '财空', love: '缘浅', health: '虚耗' },
};

export function DivinationView({ result, onBack, onStartInput }: Props) {
  if (result.type === 'meiHua') {
    return <MeiHuaView data={result.data} question={result.question} onBack={onBack} onStartInput={onStartInput} />;
  }
  return <XiaoLiuRenView data={result.data} question={result.question} onBack={onBack} onStartInput={onStartInput} />;
}

function AiDivinationPanel({
  kind,
  payload,
  question,
}: {
  kind: 'meiHua' | 'xiaoLiuRen';
  payload: any;
  question?: string;
}) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [autoTried, setAutoTried] = useState(false);

  const cacheIdentity = useMemo(() => {
    if (kind === 'meiHua') {
      return `mh-${(payload.numbers || []).join('-')}-${payload.benGua}-${payload.dongYao}-${payload.huGua}-${question || ''}`;
    }
    return `xl-${payload.date || ''}-${payload.hourIndex ?? ''}-${payload.palace}-${payload.upper}-${payload.middle}-${payload.lower}-${question || ''}`;
  }, [kind, payload, question]);

  async function runAi(force = false) {
    const config = loadAIConfig();
    if (!canUseAI(config)) {
      setAiText(getAIGateMessage(config));
      return;
    }
    setLoading(true);
    setLoadingStage(0);
    const t1 = setTimeout(() => setLoadingStage(1), 500);
    const t2 = setTimeout(() => setLoadingStage(2), 1200);
    const t3 = setTimeout(() => setLoadingStage(3), 2000);
    try {
      const { system, user } = buildDivinationPrompt({ type: kind, data: payload, question });
      const now = new Date();
      const { text } = await callLLMWithCache(
        config,
        [{ role: 'user', content: user }],
        {
          date: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`,
          shiChen: Number(payload.hourIndex ?? 0),
          gender: '不分',
        },
        `${cacheIdentity}${force ? '-force' : ''}`,
        `divination-${kind}`,
        system,
      );
      setAiText(typeof text === 'string' ? text : (text as any)?.text || String(text));
    } catch (e: any) {
      setAiText(`❌ ${e.message || '请求失败'}`);
    } finally {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setLoading(false);
      setLoadingStage(0);
    }
  }

  useEffect(() => {
    setAiText(null);
    setAutoTried(false);
  }, [cacheIdentity]);

  useEffect(() => {
    if (autoTried) return;
    const config = loadAIConfig();
    if (!canUseAI(config)) {
      setAutoTried(true);
      return;
    }
    setAutoTried(true);
    void runAi(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTried, cacheIdentity]);

  return (
    <ScrollCard className="rounded-lg p-3 space-y-2" accent="vermilion">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Seal size={18} className="text-vermilion" />
          <div>
            <div className="text-sm text-gold-bright font-bold title-display tracking-widest">AI 卦 象 详 批</div>
            <div className="text-[9px] text-gold/50 tracking-wider">基于本地起卦结果展开，不改卦</div>
          </div>
        </div>
        <button
          onClick={() => void runAi(true)}
          disabled={loading}
          className="text-[10px] px-2 py-1 rounded border border-gold/30 text-gold hover:border-gold-bright hover:text-gold-bright disabled:opacity-50 title-display tracking-widest"
        >
          {loading ? '解析中' : aiText ? '重新详批' : '开始详批'}
        </button>
      </div>

      {loading && (
        <div className="py-2">
          <LoadingStages stage={loadingStage} />
        </div>
      )}

      {aiText && !loading && (
        <div className="text-sm text-rice leading-relaxed prose prose-invert prose-sm max-w-none
          prose-headings:text-gold-bright prose-headings:font-bold prose-headings:my-2
          prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
          prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5
          prose-strong:text-vermilion prose-em:text-jade">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiText}</ReactMarkdown>
        </div>
      )}

      {!aiText && !loading && (
        <div className="text-[10px] text-gold/50 leading-relaxed">
          已完成本地起卦。若已登录平台 AI 或配置自备 Key，将自动生成详批；也可点击右上角手动发起。
        </div>
      )}
    </ScrollCard>
  );
}

function MeiHuaView({ data, question, onBack, onStartInput }: any) {
  const upper = data.upperTrigram;
  const lower = data.lowerTrigram;
  const all6Lines = [...data.lowerBinary, ...data.upperBinary];

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gold/70 hover:text-gold text-xs title-display tracking-widest"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="2" y1="7" x2="12" y2="7" /><polyline points="6,3 2,7 6,11" />
        </svg>
        返回首页
      </button>

      <div className="text-center">
        <div className="text-xs text-gold/60 title-display tracking-widest">
          梅 花 易 数 · 灵 卦
        </div>
        {question && (
          <div className="text-[10px] text-gold/50 mt-1 italic">「{question}」</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScrollCard className="rounded-lg p-3" accent="gold">
          <div className="text-center">
            <div className="text-[10px] text-gold/70 title-display tracking-widest mb-1">本 卦</div>
            <div className="flex items-center justify-center gap-1 my-2">
              <BaguaGua lines={data.upperBinary} color="#c8a45c" />
              <BaguaGua lines={data.lowerBinary} color="#c8a45c" />
            </div>
            <div className="text-base text-gold-bright font-bold title-display tracking-widest">
              {upper.symbol}{lower.symbol} {data.benGua}
            </div>
            <div className="text-[10px] text-gold/60 mt-1">
              {upper.name}({upper.fiveElement})上 · {lower.name}({lower.fiveElement})下
            </div>
          </div>
        </ScrollCard>

        <ScrollCard className="rounded-lg p-3" accent="vermilion">
          <div className="text-center">
            <div className="text-[10px] text-gold/70 title-display tracking-widest mb-1">变 卦</div>
            <div className="flex items-center gap-1 justify-center my-2">
              <BaguaGua lines={all6Lines.map((l: number, i: number) => i === data.dongYao - 1 ? 1 - l : l).slice(3)} color="#c8392f" />
              <BaguaGua lines={all6Lines.map((l: number, i: number) => i === data.dongYao - 1 ? 1 - l : l).slice(0, 3)} color="#c8392f" />
            </div>
            <div className="text-base text-gold-bright font-bold title-display tracking-widest">
              {data.huGua}
            </div>
            <div className="text-[10px] text-vermilion/80 mt-1">
              动爻：第 {data.dongYao} 爻
            </div>
          </div>
        </ScrollCard>
      </div>

      <ScrollCard className="rounded-lg p-3" accent="gold">
        <div className="flex items-center justify-around">
          {data.numbers.map((n: number, i: number) => (
            <div key={i} className="text-center">
              <div className="text-[9px] text-gold/60 title-display tracking-widest">第{i + 1}数</div>
              <div className="text-2xl text-gold-bright font-bold title-display">{n}</div>
            </div>
          ))}
        </div>
      </ScrollCard>

      <ScrollCard className="rounded-lg p-3 space-y-2" accent="gold">
        <div className="flex items-center gap-2">
          <Spark size={16} className="text-gold-bright" />
          <span className="text-sm text-gold-bright font-bold title-display tracking-widest">本 地 粗 解</span>
        </div>
        <p className="text-xs text-rice/90 leading-relaxed">{data.guaCi || data.interpretation?.overall}</p>
        <Divider />
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div><span className="text-gold/60">事业</span> · {data.interpretation?.career}</div>
          <div><span className="text-gold/60">财运</span> · {data.interpretation?.wealth}</div>
          <div><span className="text-gold/60">感情</span> · {data.interpretation?.love}</div>
          <div><span className="text-gold/60">健康</span> · {data.interpretation?.health}</div>
        </div>
      </ScrollCard>

      <AiDivinationPanel kind="meiHua" payload={data} question={question} />

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-full border border-gold/30 text-gold text-xs title-display tracking-widest hover:border-gold-bright"
        >
          再 起 一 卦
        </button>
        <button
          onClick={onStartInput}
          className="flex-1 py-2.5 rounded-full bg-vermilion/90 text-cream text-xs title-display tracking-widest"
        >
          录入生辰深批
        </button>
      </div>
    </div>
  );
}

function XiaoLiuRenView({ data, question, onBack, onStartInput }: any) {
  const meaning = XL_MEANINGS[data.palace] || {
    color: '#c8a45c',
    desc: data.desc || '',
    career: data.career || '',
    wealth: data.wealth || '',
    love: data.love || '',
    health: data.health || '',
  };
  const steps = [
    { label: '初限', value: data.upper },
    { label: '中限', value: data.middle },
    { label: '末限', value: data.lower },
  ];

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gold/70 hover:text-gold text-xs title-display tracking-widest"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="2" y1="7" x2="12" y2="7" /><polyline points="6,3 2,7 6,11" />
        </svg>
        返回首页
      </button>

      <div className="text-center">
        <div className="text-xs text-gold/60 title-display tracking-widest">小 六 壬 · 即 时 课</div>
        {question && <div className="text-[10px] text-gold/50 mt-1 italic">「{question}」</div>}
        {(data.date || data.hour) && (
          <div className="text-[10px] text-gold/40 mt-1">
            {data.date || ''} {data.hour || data.shiChen || ''}时
          </div>
        )}
      </div>

      <ScrollCard className="rounded-lg p-4" accent="gold">
        <div className="text-center mb-3">
          <div className="text-[10px] text-gold/60 title-display tracking-widest">落 宫</div>
          <div className="text-3xl font-bold title-display tracking-widest mt-1" style={{ color: meaning.color }}>
            {data.palace}
          </div>
          <div className="text-xs text-rice/80 mt-1">{meaning.desc || data.desc}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {steps.map(s => (
            <div key={s.label} className="text-center p-2 rounded bg-ink-soft/50 border border-gold/20">
              <div className="text-[9px] text-gold/50 title-display tracking-widest">{s.label}</div>
              <div className="text-sm text-gold-bright font-bold title-display mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      </ScrollCard>

      <ScrollCard className="rounded-lg p-3 space-y-2" accent="gold">
        <div className="flex items-center gap-2">
          <Spark size={16} className="text-gold-bright" />
          <span className="text-sm text-gold-bright font-bold title-display tracking-widest">本 地 粗 解</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-rice/90">
          <div><span className="text-gold/60">事业</span> · {meaning.career}</div>
          <div><span className="text-gold/60">财运</span> · {meaning.wealth}</div>
          <div><span className="text-gold/60">感情</span> · {meaning.love}</div>
          <div><span className="text-gold/60">健康</span> · {meaning.health}</div>
        </div>
      </ScrollCard>

      <AiDivinationPanel kind="xiaoLiuRen" payload={data} question={question} />

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-full border border-gold/30 text-gold text-xs title-display tracking-widest hover:border-gold-bright"
        >
          再 起 一 课
        </button>
        <button
          onClick={onStartInput}
          className="flex-1 py-2.5 rounded-full bg-vermilion/90 text-cream text-xs title-display tracking-widest"
        >
          录入生辰深批
        </button>
      </div>
    </div>
  );
}

function BaguaGua({ lines, color = '#c8a45c' }: { lines: number[]; color?: string }) {
  return (
    <div className="flex flex-col-reverse gap-1 items-center">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-1">
          {l === 1 ? (
            <div className="w-10 h-1.5 rounded-sm" style={{ background: color }} />
          ) : (
            <>
              <div className="w-4 h-1.5 rounded-sm" style={{ background: color }} />
              <div className="w-4 h-1.5 rounded-sm" style={{ background: color }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
