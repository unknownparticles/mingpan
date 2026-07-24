/**
 * 首页：仪式感落地页
 * - 抛硬币起卦（梅花易数）
 * - 三数起卦（数字灵卦）
 * - 当前时刻小六壬
 * - 录入完整生辰（解锁全部功能）
 */
import { useState } from 'react';
import { Divider } from './Ornament';
import { Taiji, Scroll, Coin, Bagua, Hourglass, ArrowRight } from './Icon';
import { castMeiHua, coinToNumbers } from '../lib/divination';
import type { HistoryRecord } from '../lib/store';
import { SHI_CHEN } from '../lib/lunar';

interface Props {
  records: HistoryRecord[];
  onLoadRecord: (rec: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onStartInput: () => void;
  onDivination: (result: { type: 'meiHua' | 'xiaoLiuRen'; data: any; question?: string }) => void;
}

const QUOTES = [
  '天机不可泄露，泄露者天机也已。',
  '知命者不惧，顺势者无忧。',
  '命由我作，福自己求。',
  '一命二运三风水，四积阴德五读书。',
  '大隐隐于市，大命隐于微。',
];

type Mode = 'home' | 'coin' | 'numbers' | 'xiaoLiuRen';

export function HeroLanding({ records, onLoadRecord, onDeleteRecord, onStartInput, onDivination }: Props) {
  const [mode, setMode] = useState<Mode>('home');
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [shaking, setShaking] = useState(false);
  const [coinFaces, setCoinFaces] = useState<('yin' | 'yang')[]>(['yang', 'yang', 'yang']);

  // 三数起卦
  const [nums, setNums] = useState<[string, string, string]>(['', '', '']);
  const [question, setQuestion] = useState('');

  function handleCoinShake() {
    setShaking(true);
    // 摇硬币动画
    let n = 0;
    const id = setInterval(() => {
      setCoinFaces([
        Math.random() < 0.5 ? 'yin' : 'yang',
        Math.random() < 0.5 ? 'yin' : 'yang',
        Math.random() < 0.5 ? 'yin' : 'yang',
      ] as ('yin' | 'yang')[]);
      n += 1;
      if (n >= 8) {
        clearInterval(id);
        setShaking(false);
        const final: ('yin' | 'yang')[] = [
          Math.random() < 0.5 ? 'yin' : 'yang',
          Math.random() < 0.5 ? 'yin' : 'yang',
          Math.random() < 0.5 ? 'yin' : 'yang',
        ];
        setCoinFaces(final);
        const [n1, n2, n3] = coinToNumbers(final);
        const result = castMeiHua(n1, n2, n3);
        onDivination({ type: 'meiHua', data: result, question: '随机摇卦' });
      }
    }, 80);
  }

  function handleNumbersSubmit() {
    const n1 = parseInt(nums[0]) || Math.floor(Math.random() * 999) + 1;
    const n2 = parseInt(nums[1]) || Math.floor(Math.random() * 999) + 1;
    const n3 = parseInt(nums[2]) || Math.floor(Math.random() * 999) + 1;
    setNums([String(n1), String(n2), String(n3)]);
    const result = castMeiHua(n1, n2, n3);
    onDivination({ type: 'meiHua', data: result, question: question || '三数成卦' });
  }

  function handleXiaoLiuRen(date: Date, hourIndex: number) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    // 简单小六壬
    const start = (month - 1) % 6;
    const mid = (start + (day - 1)) % 6;
    const lower = (mid + hourIndex) % 6;
    const XL = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'];
    const palace = XL[lower];
    onDivination({
      type: 'xiaoLiuRen',
      data: {
        upper: XL[start],
        middle: XL[mid],
        lower: XL[lower],
        palace,
        month, day, hour: SHI_CHEN[hourIndex]?.name,
        hourIndex,
        date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      },
      question: question || '即时小六壬',
    });
  }

  // --- Home 视图 ---
  if (mode === 'home') {
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-3 py-6">
        <div className="relative w-full max-w-sm mx-auto flex flex-col items-center">
          {/* 太极印章 */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full blur-2xl bg-gold/30 animate-pulse" />
            <div
              className="relative w-24 h-24 rounded-full border-2 border-gold/60 flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, #1a1010 0%, #0a0606 100%)',
                boxShadow: '0 0 30px rgba(200,164,92,0.5), inset 0 0 20px rgba(0,0,0,0.6)',
              }}
            >
              <Taiji size={64} style={{ color: '#c8a45c' }} />
              <div
                className="absolute inset-0 rounded-full border border-gold/20 animate-spin"
                style={{ animationDuration: '20s' }}
              />
              <div
                className="absolute -inset-2 rounded-full border border-dashed border-gold/15 animate-spin"
                style={{ animationDuration: '40s', animationDirection: 'reverse' }}
              />
            </div>
          </div>

          <h1 className="relative title-display text-3xl font-bold tracking-[0.5em] text-gold-bright text-center mb-1">
            天 机 命 盘
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="text-[9px] text-gold/70 title-display tracking-[0.4em]">紫微 · 奇门 · 八字 · 卜筮</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          <div className="relative max-w-xs text-center mb-6">
            <p className="text-[11px] text-gold/80 title-display tracking-widest leading-loose italic">
              「{quote}」
            </p>
          </div>

          {/* 三种起卦入口 */}
          <div className="w-full space-y-2.5 mb-4">
            <button
              onClick={() => setMode('coin')}
              className="w-full group flex items-center gap-3 p-3 rounded-lg border border-gold/40 bg-ink-soft/60 hover:bg-ink-soft hover:border-gold/80 transition"
            >
              <div className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center flex-shrink-0"
                style={{ background: 'radial-gradient(circle, #1a1010, #0a0606)' }}>
                <Coin size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm text-gold-bright title-display tracking-widest font-bold">抛 硬 币 起 卦</div>
                <div className="text-[9px] text-gold/60 mt-0.5">掷三枚铜钱 · 梅花易数</div>
              </div>
              <ArrowRight size={14} className="text-gold/40 group-hover:text-gold-bright group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => setMode('numbers')}
              className="w-full group flex items-center gap-3 p-3 rounded-lg border border-gold/40 bg-ink-soft/60 hover:bg-ink-soft hover:border-gold/80 transition"
            >
              <div className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center flex-shrink-0"
                style={{ background: 'radial-gradient(circle, #1a1010, #0a0606)' }}>
                <Bagua size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm text-gold-bright title-display tracking-widest font-bold">三 数 起 卦</div>
                <div className="text-[9px] text-gold/60 mt-0.5">默念三数 · 心中有问即灵</div>
              </div>
              <ArrowRight size={14} className="text-gold/40 group-hover:text-gold-bright group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => setMode('xiaoLiuRen')}
              className="w-full group flex items-center gap-3 p-3 rounded-lg border border-gold/40 bg-ink-soft/60 hover:bg-ink-soft hover:border-gold/80 transition"
            >
              <div className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center flex-shrink-0"
                style={{ background: 'radial-gradient(circle, #1a1010, #0a0606)' }}>
                <Hourglass size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm text-gold-bright title-display tracking-widest font-bold">小 六 壬 起 卦</div>
                <div className="text-[9px] text-gold/60 mt-0.5">可选月日时 · 一事一断</div>
              </div>
              <ArrowRight size={14} className="text-gold/40 group-hover:text-gold-bright group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* 录入生辰 */}
          <button
            onClick={onStartInput}
            className="group flex items-center gap-2 px-6 py-2.5 rounded-full border border-vermilion/50 bg-vermilion/10 hover:bg-vermilion/20 hover:border-vermilion text-gold-bright transition backdrop-blur"
          >
            <Scroll size={16} />
            <span className="text-sm title-display tracking-[0.3em]">录 入 完 整 生 辰</span>
            <span className="text-[9px] text-gold/60 ml-1">解 锁 全 部</span>
          </button>

          {/* 历史 */}
          {records.length > 0 && (
            <div className="w-full mt-6">
              <Divider />
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <Hourglass size={12} className="text-gold/70" />
                  <span className="text-[10px] text-gold/80 title-display tracking-[0.3em]">已 排 过 的 命 盘</span>
                </div>
                <span className="text-[9px] text-gold/40">共 {records.length} 张</span>
              </div>
              <div className="space-y-1.5">
                {records.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="group flex items-center gap-2 p-2 rounded border border-gold/10 hover:border-gold/40 bg-ink-soft/30 hover:bg-ink-soft/60 transition cursor-pointer"
                    onClick={() => onLoadRecord(r)}
                  >
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-gold-bright to-vermilion" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-rice title-display tracking-wider truncate">
                        {r.name || '匿名'} · {r.gender}
                      </div>
                      <div className="text-[9px] text-gold/60">
                        {r.birthYear}-{String(r.birthMonth).padStart(2, '0')}-{String(r.birthDay).padStart(2, '0')} · {SHI_CHEN[r.shiChenIndex]?.name || ''}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteRecord(r.id); }}
                      className="opacity-0 group-hover:opacity-100 text-vermilion/70 hover:text-vermilion text-[10px] px-2 transition"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="w-full mt-6 text-center text-[9px] text-gold/40 title-display tracking-widest leading-loose">
            占 卜 仅 供 参 考 · 修 行 在 人
          </div>
        </div>
      </div>
    );
  }

  // --- 抛硬币模式 ---
  if (mode === 'coin') {
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-3 py-6">
        <button
          onClick={() => setMode('home')}
          className="absolute top-3 left-3 text-gold/60 hover:text-gold text-xs title-display tracking-widest flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="2" y1="7" x2="12" y2="7" /><polyline points="6,3 2,7 6,11" />
          </svg>
          返回
        </button>

        <div className="text-center mb-4">
          <div className="text-base text-gold-bright title-display tracking-widest font-bold">抛 硬 币 起 卦</div>
          <div className="text-[9px] text-gold/60 mt-1 title-display tracking-widest">心 中 有 问 · 默 念 三 次 · 点 击 摇 卦</div>
        </div>

        <div className="relative mb-4">
          {/* 三枚铜钱 */}
          <div className="flex gap-3">
            {coinFaces.map((face, i) => (
              <div
                key={i}
                className="w-20 h-20 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: '#c8a45c',
                  background: face === 'yang'
                    ? 'radial-gradient(circle, #f5d96b 0%, #c8a45c 100%)'
                    : 'radial-gradient(circle, #5a3a10 0%, #2a1810 100%)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5), inset 0 0 12px rgba(0,0,0,0.4)',
                  transform: shaking
                    ? `rotate(${i * 30 - 30}deg) translateY(${(i % 2) * 6}px)`
                    : 'rotate(0deg)',
                  transition: 'transform 0.08s',
                }}
              >
                <span
                  className="title-display text-2xl font-bold"
                  style={{ color: face === 'yang' ? '#5a3a10' : '#c8a45c' }}
                >
                  {face === 'yang' ? '字' : '背'}
                </span>
              </div>
            ))}
          </div>
          {shaking && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gold/80 title-display tracking-widest animate-pulse">
              卦 气 流 转 中…
            </div>
          )}
        </div>

        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="默念心中所问（可不填）"
          className="w-full max-w-xs mb-4 bg-ink-soft/60 border border-gold/30 rounded px-3 py-2 text-xs text-rice placeholder:text-gold/30 focus:outline-none focus:border-gold-bright"
        />

        <button
          onClick={handleCoinShake}
          disabled={shaking}
          className="px-8 py-3 rounded-full bg-vermilion hover:bg-vermilion-light text-cream title-display tracking-widest text-sm disabled:opacity-50"
          style={{ boxShadow: '0 0 16px rgba(200,57,47,0.4)' }}
        >
          {shaking ? '摇 卦 中…' : '摇 卦'}
        </button>

        <div className="mt-4 text-[8px] text-gold/40 title-display tracking-widest text-center max-w-xs leading-loose">
          字 为 阳 · 背 为 阴<br />
          三 字 = 纯阳（老阳）  ·  二 字 一 背 = 少阳  ·  一 字 二 背 = 少阴  ·  三 背 = 纯阴（老阴）
        </div>
      </div>
    );
  }

  // --- 三数起卦模式 ---
  if (mode === 'numbers') {
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-3 py-6">
        <button
          onClick={() => setMode('home')}
          className="absolute top-3 left-3 text-gold/60 hover:text-gold text-xs title-display tracking-widest flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="2" y1="7" x2="12" y2="7" /><polyline points="6,3 2,7 6,11" />
          </svg>
          返回
        </button>

        <div className="text-center mb-6">
          <div className="text-base text-gold-bright title-display tracking-widest font-bold">三 数 起 卦</div>
          <div className="text-[9px] text-gold/60 mt-1 title-display tracking-widest">默 念 三 个 数 · 输 入 即 起 卦</div>
        </div>

        <div className="w-full max-w-xs space-y-3 mb-4">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="心中所问（可不填）"
            className="w-full bg-ink-soft/60 border border-gold/30 rounded px-3 py-2 text-xs text-rice placeholder:text-gold/30 focus:outline-none focus:border-gold-bright"
          />

          <div className="grid grid-cols-3 gap-2">
            {(['第 一 数', '第 二 数', '第 三 数'] as const).map((label, i) => (
              <div key={i}>
                <div className="text-[9px] text-gold/60 mb-1 title-display tracking-widest text-center">{label}</div>
                <input
                  type="number"
                  value={nums[i]}
                  onChange={e => setNums(p => { const n = [...p] as [string, string, string]; n[i] = e.target.value; return n; })}
                  placeholder="0-999"
                  className="w-full bg-ink-soft/60 border border-gold/30 rounded px-2 py-2 text-center text-base text-gold-bright font-bold focus:outline-none focus:border-gold-bright"
                />
              </div>
            ))}
          </div>
          <div className="text-[8px] text-gold/40 title-display tracking-widest text-center">
            上 卦 = 一数 % 8  ·  下 卦 = 二数 % 8  ·  动 爻 = (一+二+三) % 6
          </div>
        </div>

        <button
          onClick={handleNumbersSubmit}
          className="px-8 py-3 rounded-full bg-vermilion hover:bg-vermilion-light text-cream title-display tracking-widest text-sm"
          style={{ boxShadow: '0 0 16px rgba(200,57,47,0.4)' }}
        >
          成 卦
        </button>
      </div>
    );
  }

  // --- 小六壬模式 ---
  if (mode === 'xiaoLiuRen') {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-3 py-6">
        <button
          onClick={() => setMode('home')}
          className="absolute top-3 left-3 text-gold/60 hover:text-gold text-xs title-display tracking-widest flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="2" y1="7" x2="12" y2="7" /><polyline points="6,3 2,7 6,11" />
          </svg>
          返回
        </button>

        <div className="text-center mb-4">
          <div className="text-base text-gold-bright title-display tracking-widest font-bold">小 六 壬 起 卦</div>
          <div className="text-[9px] text-gold/60 mt-1 title-display tracking-widest">默 念 所 问 · 选 日 期 与 时 辰 · 即 时 课 卦</div>
        </div>

        <XiaoLiuRenForm
          onSubmit={(date, hourIndex) => handleXiaoLiuRen(date, hourIndex)}
          defaultDate={todayStr}
          question={question}
          setQuestion={setQuestion}
        />
      </div>
    );
  }

  return null;
}

function XiaoLiuRenForm({ onSubmit, defaultDate, question, setQuestion }: {
  onSubmit: (date: Date, hourIndex: number) => void;
  defaultDate: string;
  question: string;
  setQuestion: (q: string) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [hourIndex, setHourIndex] = useState<number>(() => {
    const h = new Date().getHours();
    return Math.floor((h + 1) / 2) % 12;
  });
  return (
    <div className="w-full max-w-xs space-y-3">
      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="心中所问（可不填）"
        className="w-full bg-ink-soft/60 border border-gold/30 rounded px-3 py-2 text-xs text-rice placeholder:text-gold/30 focus:outline-none focus:border-gold-bright"
      />
      <div>
        <div className="text-[9px] text-gold/60 mb-1 title-display tracking-widest">日 期</div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-ink-soft/60 border border-gold/30 rounded px-3 py-2 text-sm text-gold-bright focus:outline-none focus:border-gold-bright"
        />
      </div>
      <div>
        <div className="text-[9px] text-gold/60 mb-1 title-display tracking-widest">时 辰</div>
        <div className="grid grid-cols-4 gap-1.5">
          {SHI_CHEN.map((sc, i) => (
            <button
              key={i}
              onClick={() => setHourIndex(i)}
              className={`px-1 py-1.5 rounded text-[10px] title-display tracking-wider border transition ${
                hourIndex === i
                  ? 'bg-vermilion/80 border-vermilion text-cream'
                  : 'bg-ink-soft/40 border-gold/20 text-gold/70 hover:border-gold/60'
              }`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          const d = new Date(date);
          if (!isNaN(d.getTime())) onSubmit(d, hourIndex);
        }}
        className="w-full py-3 rounded-full bg-vermilion hover:bg-vermilion-light text-cream title-display tracking-widest text-sm"
        style={{ boxShadow: '0 0 16px rgba(200,57,47,0.4)' }}
      >
        起 课
      </button>
    </div>
  );
}
