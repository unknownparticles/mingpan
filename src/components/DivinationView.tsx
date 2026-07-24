/**
 * 占卜结果展示
 * - 梅花易数：本卦/变卦/动爻/解读
 * - 小六壬：六宫爻/宫位/解读
 */
import { Spark } from './Icon';
import { ScrollCard, Divider } from './Ornament';

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
  if (result.type === 'meiHua') return <MeiHuaView data={result.data} question={result.question} onBack={onBack} onStartInput={onStartInput} />;
  return <XiaoLiuRenView data={result.data} question={result.question} onBack={onBack} onStartInput={onStartInput} />;
}

function MeiHuaView({ data, question, onBack, onStartInput }: any) {
  const upper = data.upperTrigram;
  const lower = data.lowerTrigram;
      // 6 爻：上卦[0..2] + 下卦[3..5]（下到上）
  const all6Lines = [...data.lowerBinary, ...data.upperBinary]; // 下->上
  
  return (
    <div className="space-y-3">
      {/* 返回 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gold/70 hover:text-gold text-xs title-display tracking-widest"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="2" y1="7" x2="12" y2="7" /><polyline points="6,3 2,7 6,11" />
        </svg>
        返回首页
      </button>

      {/* 标题 */}
      <div className="text-center">
        <div className="text-xs text-gold/60 title-display tracking-widest">
          梅 花 易 数 · 灵 卦
        </div>
        {question && (
          <div className="text-[10px] text-gold/50 mt-1 italic">「{question}」</div>
        )}
      </div>

      {/* 本卦 + 变卦 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 本卦 */}
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

        {/* 变卦 */}
        <ScrollCard className="rounded-lg p-3" accent="vermilion">
          <div className="text-center">
            <div className="text-[10px] text-gold/70 title-display tracking-widest mb-1">变 卦</div>
            <div className="flex items-center justify-center gap-1 my-2">
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

      {/* 三个数字 */}
      <ScrollCard className="rounded-lg p-3" accent="gold">
        <div className="flex items-center justify-around">
          {data.numbers.map((n: number, i: number) => (
            <div key={i} className="text-center">
              <div className="text-[9px] text-gold/60 title-display tracking-widest">第{i + 1}数</div>
              <div className="text-2xl text-gold-bright font-bold title-display mt-1">{n}</div>
            </div>
          ))}
        </div>
      </ScrollCard>

      {/* 解读 */}
      <ScrollCard className="rounded-lg p-4" accent="gold">
        <div className="flex items-center gap-2 mb-2">
          <Spark size={20} className="text-vermilion" />
          <div className="text-base text-gold-bright font-bold title-display tracking-widest">卦 象 解 读</div>
        </div>
        <Divider />
        <p className="text-sm text-rice leading-loose mb-3">{data.interpretation.overall}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Domain label="事 业" content={data.interpretation.career} />
          <Domain label="财 运" content={data.interpretation.wealth} />
          <Domain label="感 情" content={data.interpretation.love} />
          <Domain label="健 康" content={data.interpretation.health} />
        </div>
      </ScrollCard>

      {/* 引导录入 */}
      <div className="p-3 bg-ink-soft/40 border border-gold/20 rounded text-center">
        <div className="text-[10px] text-gold/70 mb-2 title-display tracking-widest">
          录 入 完 整 生 辰  ·  解 锁 紫 微 · 奇 门 · 八 字
        </div>
        <button
          onClick={onStartInput}
          className="px-5 py-2 rounded-full bg-vermilion/80 hover:bg-vermilion text-cream text-xs title-display tracking-widest"
        >
          录 入 生 辰
        </button>
      </div>
    </div>
  );
}

function XiaoLiuRenView({ data, question, onBack, onStartInput }: any) {
  const m = XL_MEANINGS[data.palace];
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
          小 六 壬 · 即 时 课
        </div>
        {question && <div className="text-[10px] text-gold/50 mt-1 italic">「{question}」</div>}
        <div className="text-[9px] text-gold/40 mt-1 title-display tracking-widest">
          {data.month}月{data.day}日 · {data.hour}时
        </div>
      </div>

      {/* 宫位大字 */}
      <div className="text-center py-4">
        <div
          className="inline-block px-8 py-3 rounded-lg border-2"
          style={{
            borderColor: m.color,
            background: `linear-gradient(180deg, ${m.color}33 0%, ${m.color}11 100%)`,
            boxShadow: `0 0 24px ${m.color}66`,
          }}
        >
          <div className="text-3xl text-cream font-bold title-display tracking-[0.3em]" style={{ color: m.color }}>
            {data.palace}
          </div>
          <div className="text-[10px] text-gold/70 mt-1 title-display tracking-widest">{m.desc}</div>
        </div>
      </div>

      {/* 三爻展示 */}
      <ScrollCard className="rounded-lg p-3" accent="gold">
        <div className="text-[10px] text-gold/70 title-display tracking-widest text-center mb-2">
          上 爻 / 中 爻 / 下 爻
        </div>
        <div className="space-y-2">
          {[
            { name: '上 爻（起始）', value: data.upper },
            { name: '中 爻（加日）', value: data.middle },
            { name: '下 爻（加时辰）', value: data.lower, current: true },
          ].map((row, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded ${row.current ? 'bg-vermilion/10 border border-vermilion/40' : 'border border-gold/10'}`}>
              <span className={`text-xs title-display tracking-widest ${row.current ? 'text-vermilion' : 'text-gold/70'}`}>
                {row.name}
              </span>
              <span className="flex-1" />
              <span className={`text-sm font-bold title-display tracking-widest ${row.current ? 'text-vermilion' : 'text-gold-bright'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </ScrollCard>

      {/* 解读 */}
      <ScrollCard className="rounded-lg p-4" accent="gold">
        <div className="flex items-center gap-2 mb-2">
          <Spark size={20} className="text-vermilion" />
          <div className="text-base text-gold-bright font-bold title-display tracking-widest">课 象 解 读</div>
        </div>
        <Divider />
        <p className="text-sm text-rice leading-loose mb-3">{m.desc}，{data.palace}主事。</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Domain label="事 业" content={m.career} color={m.color} />
          <Domain label="财 运" content={m.wealth} color={m.color} />
          <Domain label="感 情" content={m.love} color={m.color} />
          <Domain label="健 康" content={m.health} color={m.color} />
        </div>
      </ScrollCard>

      <div className="p-3 bg-ink-soft/40 border border-gold/20 rounded text-center">
        <div className="text-[10px] text-gold/70 mb-2 title-display tracking-widest">
          录 入 完 整 生 辰  ·  解 锁 三 盘 详 批
        </div>
        <button
          onClick={onStartInput}
          className="px-5 py-2 rounded-full bg-vermilion/80 hover:bg-vermilion text-cream text-xs title-display tracking-widest"
        >
          录 入 生 辰
        </button>
      </div>
    </div>
  );
}

function Domain({ label, content, color }: { label: string; content: string; color?: string }) {
  return (
    <div className="p-2 rounded border" style={{ borderColor: (color || '#c8a45c') + '40', background: (color || '#c8a45c') + '10' }}>
      <div className="text-[9px] text-gold/70 title-display tracking-widest mb-1" style={{ color: color }}>{label}</div>
      <div className="text-[11px] text-rice leading-relaxed">{content}</div>
    </div>
  );
}

/** 卦象三爻（从下到上） */
function BaguaGua({ lines, color = '#c8a45c' }: { lines: number[]; color?: string }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      {[0, 1, 2].map((i) => {
        const isYang = lines[i] === 1;
        return (
          <div key={i} className="w-8 h-1.5" style={{ background: color, opacity: 0.85, boxShadow: `0 0 4px ${color}88` }}>
            {isYang ? null : <div className="w-full h-full flex"><div className="w-1/3 bg-ink" /></div>}
          </div>
        );
      })}
    </div>
  );
}
