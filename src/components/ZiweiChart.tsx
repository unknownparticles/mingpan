import { useMemo, useState, useEffect, useRef } from 'react';
import { astro } from 'iztro';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { applyZiweiSchool, SCHOOL_NAMES, type ZiweiSchool } from '../lib/ziweiSchool';
import { loadAIConfig, SYSTEM_PROMPT_ZIWEI, canUseAI, getAIGateMessage } from '../lib/aiInterpret';
import { callLLMWithCache } from '../lib/cache';
// 调用 cache 用 lib/cache
import InfoPopover from './InfoPopover';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
  isLunar: boolean;
  lunarLeap: boolean;
}

type AnyPalace = any;

// 12 地支固定位置（紫微盘标准布局，4×4 中心为中宫 2×2）
// 行0(顶): 巳 午 未 申
// 行1:     辰 [中]    酉
// 行2:     卯 [中]    戌
// 行3(底): 寅 丑 子 亥
// 格子位置 (row, col)：命宫根据生辰落入对应地支位
const DIZHI_POS: Record<string, [number, number]> = {
  '寅': [3, 0], '丑': [3, 1], '子': [3, 2], '亥': [3, 3],
  '卯': [2, 0],                     '戌': [2, 3],
  '辰': [1, 0],                     '酉': [1, 3],
  '巳': [0, 0], '午': [0, 1], '未': [0, 2], '申': [0, 3],
};

const DIZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const PALACE_MEANING: Record<string, string> = {
  '命宫': '先天性格、命格高低',
  '兄弟': '兄弟姐妹、朋友',
  '夫妻': '婚姻、配偶',
  '子女': '子女、晚辈',
  '财帛': '理财方式、财运',
  '疾厄': '健康、身心',
  '迁移': '外出、际遇',
  '仆役': '人际关系、下属',
  '官禄': '事业、功名',
  '田宅': '家宅、不动产',
  '福德': '精神、内心',
  '父母': '父母、长辈',
};

export default function ZiweiChart({ date, shiChenIndex, gender, lunarLeap }: Props) {
  const [selectedPalace, setSelectedPalace] = useState<string>('命宫');
  const [horoScope, setHoroScope] = useState<'natal' | 'decade' | 'yearly' | 'monthly'>('natal');
  // 指定运势年/月（默认现在）
  const [horoYear, setHoroYear] = useState<number>(new Date().getFullYear());
  const [horoMonth, setHoroMonth] = useState<number>(new Date().getMonth() + 1);
  // 整体解读状态
  const [overallReading, setOverallReading] = useState<string | null>(null);
  const [overallLoading, setOverallLoading] = useState(false);
  const [school, setSchool] = useState<ZiweiSchool>('sanhe');
  const [aiText, setAiText] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyZiweiSchool(school);
  }, [school]);

  const astrolabe = useMemo(() => {
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return astro.bySolar(dateStr, shiChenIndex, gender, lunarLeap, 'zh-CN');
  }, [date, shiChenIndex, gender, lunarLeap, school]);

  const allPalaces: AnyPalace[] = astrolabe.palaces;
  const palaceMap = new Map<string, AnyPalace>(allPalaces.map((p: any) => [p.name, p]));

  // 计算四化汇总
  const sihuaStars = useMemo(() => {
    const list: { name: string; type: string; palace: string; star: string }[] = [];
    astrolabe.palaces.forEach((p: any) => {
      (p.majorStars || []).forEach((s: any) => {
        if (s.mutagen && ['禄', '权', '科', '忌'].includes(s.mutagen)) {
          list.push({ name: s.name, type: s.mutagen, palace: p.name, star: s.name });
        }
      });
    });
    return list;
  }, [astrolabe]);

  // 计算运限（本年本月）
  const horoscope = useMemo(() => {
    if (horoScope === 'natal') return null;
    try {
      // 构造指定年月的日期
      const yr = horoYear;
      const mo = horoMonth;
      // 使用该年该月 15 号中午 12 点作代表（避免跨时区问题）
      const targetDate = new Date(yr, mo - 1, 15, 12, 0, 0);
      return (astrolabe as any).horoscope(targetDate, shiChenIndex);
    } catch {
      return null;
    }
  }, [astrolabe, date, shiChenIndex, horoScope, horoYear, horoMonth]);

  // 当前运势档位（用于盘面叠加）
  const currentHoro = useMemo(() => {
    if (!horoscope) return null;
    if (horoScope === 'decade') return horoscope.decadal;
    if (horoScope === 'yearly') return horoscope.yearly;
    if (horoScope === 'monthly') return horoscope.monthly;
    return null;
  }, [horoscope, horoScope]);

  // 合并宫位：本命宫位 + 运限流耀
  const mergedPalaces = useMemo(() => {
    if (!currentHoro) return allPalaces;
    return allPalaces.map((p: any, idx: number) => {
      const flowStars = currentHoro.stars?.[idx] || [];
      return {
        ...p,
        flowStars: flowStars.map((s: any) => ({
          name: s.name,
          type: s.type,
          scope: s.scope,
        })),
        flowMutagens: currentHoro.mutagen || [],
        flowName: currentHoro.name,
        flowStem: currentHoro.heavenlyStem,
        flowBranch: currentHoro.earthlyBranch,
      };
    });
  }, [allPalaces, currentHoro]);

  // 找到命宫所在的地支 → 它在盘面上的格子
  void palaceMap.get('命宫')?.earthlyBranch;

  // 当前选中宫位的三方四正（4 个宫位）
  const ssfz = useMemo(() => {
    if (!selectedPalace) return null;
    try {
      return (astrolabe as any).surroundedPalaces(selectedPalace as any);
    } catch {
      return null;
    }
  }, [astrolabe, selectedPalace]);

  // 三方四正宫位名 → 地支位坐标
  const ssfzCoords = useMemo(() => {
    if (!ssfz) return [];
    const targets = [
      { label: '本宫', name: ssfz.target.name, role: 'target' },
      { label: '对宫', name: ssfz.opposite.name, role: 'opposite' },
      { label: '财帛', name: ssfz.wealth.name, role: 'wealth' },
      { label: '官禄', name: ssfz.career.name, role: 'career' },
    ];
    return targets.map(t => {
      const zhi = palaceMap.get(t.name)?.earthlyBranch;
      const pos = zhi ? DIZHI_POS[zhi] : null;
      return { ...t, zhi, pos };
    });
  }, [ssfz, palaceMap]);

  // 渲染一个宫位格子
  function renderCell(zhi: string, ri: number, ci: number) {
    // 找到该地支位对应的宫位（使用合并后的盘面）
    const palace = mergedPalaces.find((p: any) => p.earthlyBranch === zhi);
    if (!palace) {
      // 中宫区域
      if (ri >= 1 && ri <= 2 && ci >= 1 && ci <= 2) {
        if (ri === 1 && ci === 1) {
          return (
            <div className="paper flex flex-col items-center justify-center p-1 text-center h-full bg-gradient-to-br from-vermilion-deep/20 to-ink-soft">
              <div className="text-[10px] text-gold-bright title-display">身宫</div>
              <div className="divider-gold w-6 my-0.5" />
              <div className="text-[9px] text-gold opacity-60">{(astrolabe as any).fiveElementsClass}</div>
            </div>
          );
        }
        if (ri === 1 && ci === 2) {
          return (
            <div className="paper flex flex-col items-center justify-center p-1 text-center h-full">
              <div className="text-[10px] text-gold-bright title-display">命主</div>
              <div className="text-[9px] text-gold opacity-60">{(astrolabe as any).soulPalace || '—'}</div>
            </div>
          );
        }
        if (ri === 2 && ci === 1) {
          return (
            <div className="paper flex flex-col items-center justify-center p-1 text-center h-full">
              <div className="text-[10px] text-gold-bright title-display">身主</div>
              <div className="text-[9px] text-gold opacity-60">{(astrolabe as any).bodyPalace || '—'}</div>
            </div>
          );
        }
        if (ri === 2 && ci === 2) {
          return (
            <div className="paper flex flex-col items-center justify-center p-1 text-center h-full bg-gradient-to-br from-ink-soft to-vermilion-deep/20">
              <div className="text-[10px] text-gold-bright title-display">五行局</div>
              <div className="text-sm text-rice font-bold">{(astrolabe as any).fiveElementsClass}</div>
            </div>
          );
        }
      }
      return <div className="h-full" />;
    }

    const isSel = selectedPalace === palace.name;
    const isSsfz = ssfz?.target.name === palace.name || ssfz?.opposite.name === palace.name || ssfz?.wealth.name === palace.name || ssfz?.career.name === palace.name;
    const isMing = palace.name === '命宫';
    const ssfzRole = ssfzCoords.find(c => c.name === palace.name)?.role;

    const majorStars: any[] = palace.majorStars || [];
    const minorStars: any[] = palace.minorStars || [];
    const adjStars: any[] = palace.adjectiveStars || [];
    const flowStars: any[] = palace.flowStars || [];
    const flowMutagens: string[] = palace.flowMutagens || [];
    const hasFlow = flowStars.length > 0 || flowMutagens.length > 0;

    // 三方四正高亮样式
    const roleColors: Record<string, string> = {
      target: 'border-gold-bright shadow-[0_0_12px_rgba(230,200,120,0.6)]',
      opposite: 'border-jade shadow-[0_0_10px_rgba(74,122,90,0.6)]',
      wealth: 'border-vermilion shadow-[0_0_10px_rgba(200,57,47,0.6)]',
      career: 'border-blue-300 shadow-[0_0_10px_rgba(147,197,253,0.6)]',
    };

    return (
      <button
        onClick={() => setSelectedPalace(palace.name)}
        className={`relative p-1 text-left transition border w-full h-full overflow-hidden ${
          isSel ? 'border-gold-bright bg-gold/10' :
          ssfzRole ? roleColors[ssfzRole] :
          isSsfz ? 'border-gold/40' :
          'border-gold/15'
        } ${isMing ? 'bg-vermilion/10' : 'bg-ink-soft/40'}`}
      >
        <div className="flex items-center justify-between text-[10px] leading-tight">
          <span className={`${isMing ? 'text-vermilion font-bold' : isSsfz ? 'text-gold-bright' : 'text-gold'}`}>
            {palace.name}
          </span>
          <span className="text-gold opacity-60">
            {palace.heavenlyStem}{palace.earthlyBranch}
          </span>
        </div>
        <div className="divider-gold my-0.5" />
        <div className="space-y-0">
          {majorStars.slice(0, 2).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[11px] leading-tight">
              <span className="text-rice font-bold">{s.name}</span>
              {s.mutagen && (
                <span className={`text-[8px] ${
                  s.mutagen === '禄' ? 'text-jade' :
                  s.mutagen === '权' ? 'text-vermilion' :
                  s.mutagen === '科' ? 'text-gold-bright' :
                  'text-red-500'
                }`}>化{s.mutagen}</span>
              )}
            </div>
          ))}
          {majorStars.length === 0 && (
            <div className="text-[9px] text-gold opacity-30 italic">空宫</div>
          )}
        </div>
        {/* 运限流耀叠加 */}
        {hasFlow && (
          <div className="mt-0.5 pt-0.5 border-t border-gold/10">
            {flowMutagens.slice(0, 2).map((m, i) => (
              <span key={`m${i}`} className="text-[8px] text-blue-300 mr-1" title={`${currentHoro?.name || '运限'}化`}>
                {m}化
              </span>
            ))}
            {flowStars.slice(0, 2).map((s: any, i: number) => (
              <span key={`f${i}`} className="text-[8px] text-jade opacity-80 mr-1" title={`${currentHoro?.name || '运限'}流耀`}>
                {s.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {[...minorStars, ...adjStars].slice(0, 3).map((s: any, i: number) => (
            <span key={i} className="text-[8px] text-gold opacity-60">{s.name}</span>
          ))}
        </div>
        {/* 三方四正标识 */}
        {ssfzRole && (
          <div className="absolute top-0.5 right-1 text-[8px] text-gold-bright font-bold">
            {ssfzRole === 'target' ? '本' : ssfzRole === 'opposite' ? '对' : ssfzRole === 'wealth' ? '财' : '官'}
          </div>
        )}
        {isMing && (
          <div className="absolute top-0.5 right-1 text-[8px] text-vermilion font-bold">命</div>
        )}
      </button>
    );
  }

  // 选中的宫位详情
  const selectedP = palaceMap.get(selectedPalace);
  const selectedZhi = selectedP?.earthlyBranch;
  const selectedPos = selectedZhi ? DIZHI_POS[selectedZhi] : null;

  // AI 解读：基于选中的宫位做三方四正
  async function askAI() {
    const config = loadAIConfig();
    if (!canUseAI(config)) {
      setAiText([getAIGateMessage(config)]);
      return;
    }
    setAiLoading(true);
    setAiText(null);
    setHighlightIndex(null);
    try {
      const ssfzInfo = ssfz ? `
本宫(${ssfz.target.name})：${(ssfz.target.majorStars || []).map((s:any)=>s.name).join('、') || '空'}
对宫(${ssfz.opposite.name})：${(ssfz.opposite.majorStars || []).map((s:any)=>s.name).join('、') || '空'}
财帛(${ssfz.wealth.name})：${(ssfz.wealth.majorStars || []).map((s:any)=>s.name).join('、') || '空'}
官禄(${ssfz.career.name})：${(ssfz.career.majorStars || []).map((s:any)=>s.name).join('、') || '空'}` : '';

      // 本命/运势四化抽取
      const scopeSource: any = currentHoro || astrolabe;
      let muList: string[] = scopeSource.mutagen || [];
      if (muList.length === 0 && scopeSource.palaces) {
        for (const p of scopeSource.palaces) {
          for (const s of (p.majorStars || [])) {
            if (s.mutagen) muList.push(`${s.name}化${s.mutagen}`);
          }
        }
      }
      const findPalaceIn = (star: string, source: any) => {
        for (const p of source.palaces || []) {
          if ((p.majorStars || []).some((s: any) => s.name === star)) return p.name;
        }
        return '（未入 12 宫）';
      };
      const luName = (muList.find((x: string) => x?.endsWith?.('禄')) || '').replace('化禄', '');
      const quanName = (muList.find((x: string) => x?.endsWith?.('权')) || '').replace('化权', '');
      const keName = (muList.find((x: string) => x?.endsWith?.('科')) || '').replace('化科', '');
      const jiName = (muList.find((x: string) => x?.endsWith?.('忌')) || '').replace('化忌', '');

      const prompt = `出生：${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${shiChenIndex}时 性别${gender} 流派：${SCHOOL_NAMES[school]}
五行局：${(astrolabe as any).fiveElementsClass}
运势档位：${horoScope === 'natal' ? '本命' : horoScope === 'decade' ? '大限' : horoScope === 'yearly' ? '流年' : '流月'}
当前解读宫位：${selectedPalace}宫（${PALACE_MEANING[selectedPalace] || ''}）

【三方四正】
${ssfzInfo}

【${horoScope === 'natal' ? '本命' : '运势'}四化】
- 化禄：${luName || '无'} → 落宫：${luName ? findPalaceIn(luName, scopeSource) : ''}
- 化权：${quanName || '无'} → 落宫：${quanName ? findPalaceIn(quanName, scopeSource) : ''}
- 化科：${keName || '无'} → 落宫：${keName ? findPalaceIn(keName, scopeSource) : ''}
- 化忌：${jiName || '无'} → 落宫：${jiName ? findPalaceIn(jiName, scopeSource) : ''}

【四化核心含义（你必须按这个解释去写，不能偏离）】
- 化禄 = 加强、增加资源、让事情更容易得到。
- 化权 = 产生力量、掌控与影响，偏向能作用于外界。
- 化科 = 拥有优势、获得认可，偏向被看见、被认可。
- 化忌 = 需面对/调整/补足的课题，不单是负面。

【输出格式要求】必须严格按以下 6 段输出，每段用 ==== 单独分隔：

====

# 一、${selectedPalace}宫本宫解读
[300字以内：分析${selectedPalace}宫主星特质，${PALACE_MEANING[selectedPalace] || ''}方面的特点]

====

# 二、对宫（${ssfz?.opposite.name}）联动
[200字以内：对宫的辅助影响，${selectedPalace}宫在外部环境的投射]

====

# 三、财帛宫（${ssfz?.wealth.name}）财缘
[200字以内：财帛宫对${selectedPalace}宫的物质层面影响]

====

# 四、官禄宫（${ssfz?.career.name}）事业
[200字以内：官禄宫对${selectedPalace}宫的事业层面影响]

====

# 五、${horoScope === 'natal' ? '本命' : '运势'}四化对${selectedPalace}宫的独立影响
## 化禄（${luName || '无'}）入${luName ? findPalaceIn(luName, scopeSource) : ''}
[150字：体现“资源增强”。如果该化落宫与本${selectedPalace}宫形成三合/对照关系，说明对该${selectedPalace}宫所主事务的增益]

## 化权（${quanName || '无'}）入${quanName ? findPalaceIn(quanName, scopeSource) : ''}
[150字：体现“掌控与推动”。说明该化赋予本${selectedPalace}宫主人的主动权/行动力]

## 化科（${keName || '无'}）入${keName ? findPalaceIn(keName, scopeSource) : ''}
[150字：体现“被看见与被认可”。说明该化为本${selectedPalace}宫主人带来的名声/贵人/化解]

## 化忌（${jiName || '无'}）入${jiName ? findPalaceIn(jiName, scopeSource) : ''}
[200字：体现“课题/缺口/需调整”。说明该化为本${selectedPalace}宫带来的压力/执着/需补足之处]

====

# 六、综合建议
[150字以内：给出具体可行的行动建议]

# 四、官禄宫（${ssfz?.career.name}）事业
[200字以内：官禄宫对${selectedPalace}宫的事业层面影响]

请严格按上述4段输出，段间用 ==== 分隔。`;

      // 缓存 key：生辰 + 宫位 + 运限档位
      const birthKey = {
        date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        shiChen: shiChenIndex,
        gender,
      };
      const cacheQ = `紫微三方四正|${selectedPalace}|${horoScope}|${horoYear}-${horoMonth}|${school}`;
      const { text } = await callLLMWithCache(
        config,
        [{ role: 'user', content: prompt }],
        birthKey,
        cacheQ,
        'ziwei-ssfz',
        SYSTEM_PROMPT_ZIWEI,
      );
      const textStr = typeof text === 'string' ? text : (text as any)?.text || JSON.stringify(text);

      const segments = textStr.split('====').map((s: string) => s.trim()).filter((s: string) => s);
      setAiText(segments);

      // 逐段高亮（命盘 + 解读区）
      for (let i = 0; i < segments.length; i++) {
        setHighlightIndex(i);
        await new Promise(r => setTimeout(r, Math.max(3000, segments[i].length * 35)));
      }
      setHighlightIndex(null);
    } catch (e: any) {
      setAiText([`❌ ${e.message || '请求失败'}`]);
    } finally {
      setAiLoading(false);
    }
  }

  // 当前高亮段对应的连线
  const activeLineIndex = highlightIndex; // 0/1/2/3 对应 本/对/财/官

  return (
    <div className="space-y-3">
      {/* 顶部信息条 */}
      <div className="paper p-3 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gold opacity-60 title-display tracking-widest">运势视图</span>
          <span className="text-gold opacity-50">{horoYear}年 {horoMonth}月</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {([
            { v: 'natal' as const, label: '本命', sub: '先天命盘' },
            { v: 'decade' as const, label: '大限', sub: '10年大运' },
            { v: 'yearly' as const, label: '流年', sub: '该年运势' },
            { v: 'monthly' as const, label: '流月', sub: '该月运势' },
          ]).map(t => (
            <button
              key={t.v}
              onClick={() => {
                setHoroScope(t.v);
                // 运势档位变化时，让选中宫位跳到该档"命宫"对应的本命宫位
                if (t.v !== 'natal') {
                  try {
                    const yr = t.v === 'yearly' || t.v === 'monthly' ? horoYear : new Date().getFullYear();
                    const mo = t.v === 'monthly' ? horoMonth : 6;
                    const targetDate = new Date(yr, mo - 1, 15, 12, 0, 0);
                    const h = (astrolabe as any).horoscope(targetDate, shiChenIndex);
                    const slot = t.v === 'decade' ? h.decadal : t.v === 'yearly' ? h.yearly : h.monthly;
                    // 查找该档位"命宫"在 palaceNames 里的索引
                    const idx = slot.palaceNames.indexOf('命宫');
                    if (idx >= 0) {
                      const target = allPalaces[idx];
                      if (target?.name) setSelectedPalace(target.name);
                    }
                  } catch {}
                } else {
                  setSelectedPalace('命宫');
                }
              }}
              className={`py-1.5 rounded text-center transition ${
                horoScope === t.v ? 'btn-vermilion' : 'btn-ghost'
              }`}
            >
              <div className="text-sm font-bold title-display">{t.label}</div>
              <div className="text-[9px] opacity-70 mt-0.5">{t.sub}</div>
            </button>
          ))}
        </div>
        {/* 年月选择器 + 快捷按钮 */}
        {horoScope !== 'natal' && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-gold opacity-60">查询：</span>
            <select
              value={horoYear}
              onChange={e => setHoroYear(parseInt(e.target.value))}
              className="bg-ink-soft border border-gold/30 rounded px-1.5 py-0.5 text-rice focus:outline-none focus:border-gold-bright"
            >
              {Array.from({ length: 81 }, (_, i) => 2020 + i).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            {horoScope === 'monthly' && (
              <select
                value={horoMonth}
                onChange={e => setHoroMonth(parseInt(e.target.value))}
                className="bg-ink-soft border border-gold/30 rounded px-1.5 py-0.5 text-rice focus:outline-none focus:border-gold-bright"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { setHoroYear(new Date().getFullYear()); setHoroMonth(new Date().getMonth() + 1); }}
              className="text-[10px] px-2 py-0.5 btn-ghost"
            >今天</button>
            <button
              onClick={() => setHoroYear(y => y - 1)}
              className="text-[10px] px-2 py-0.5 btn-ghost"
            >◀ 上年</button>
            <button
              onClick={() => setHoroYear(y => y + 1)}
              className="text-[10px] px-2 py-0.5 btn-ghost"
            >下年 ▶</button>
          </div>
        )}
      </div>

      <div className="paper p-2 flex items-center gap-2 text-xs">
        <span className="text-gold opacity-60">流派:</span>
        {(Object.keys(SCHOOL_NAMES) as ZiweiSchool[]).map(s => (
          <button
            key={s}
            className={`px-2 py-0.5 rounded ${school === s ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => setSchool(s)}
          >
            {SCHOOL_NAMES[s].replace(/（.+）/, '')}
          </button>
        ))}
      </div>

      {/* 命盘 + 三方四正连线层 */}
      <div className="paper p-2">
        <div className="relative" ref={chartRef}>
          <div className="grid grid-cols-4 grid-rows-4 gap-0.5" style={{ aspectRatio: '1/1' }}>
            {[0, 1, 2, 3].map(ri =>
              [0, 1, 2, 3].map(ci => {
                const zhi = DIZHI_LIST.find(z => {
                  const p = DIZHI_POS[z];
                  return p && p[0] === ri && p[1] === ci;
                });
                if (zhi) {
                  return <div key={`${ri}-${ci}`} className="min-h-0">{renderCell(zhi, ri, ci)}</div>;
                }
                // 中宫区域
                return <div key={`${ri}-${ci}`} className="min-h-0">{renderCell('', ri, ci)}</div>;
              })
            )}
          </div>

          {/* SVG 三方四正连线 + 炫酷动画 */}
          <svg
            className="absolute inset-0 pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              {/* 多色光晕滤镜 */}
              <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* 五行渐变 */}
              <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c8a45c" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#e6c878" stopOpacity="1" />
                <stop offset="100%" stopColor="#c8a45c" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="grad-jade" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4a7a5a" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#7ab88a" stopOpacity="1" />
                <stop offset="100%" stopColor="#4a7a5a" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="grad-vermilion" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b1a13" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#d63a30" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b1a13" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b5f7a" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#7eb5d6" stopOpacity="1" />
                <stop offset="100%" stopColor="#3b5f7a" stopOpacity="0.2" />
              </linearGradient>
              {/* 径向光晕（中心→宫位）*/}
              <radialGradient id="ray" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e6c878" stopOpacity="0" />
                <stop offset="70%" stopColor="#e6c878" stopOpacity="0" />
                <stop offset="100%" stopColor="#e6c878" stopOpacity="0.6" />
              </radialGradient>
            </defs>

            {/* 三方四正"罗盘圈"——以选中宫位为中心画一个发光圆 */}
            {selectedPos && (
              <g>
                <circle
                  cx={(selectedPos[1] + 0.5) * 25}
                  cy={(selectedPos[0] + 0.5) * 25}
                  r="3"
                  fill="none"
                  stroke="#e6c878"
                  strokeWidth="0.15"
                  strokeOpacity="0.4"
                  className="ssfz-ring"
                />
                <circle
                  cx={(selectedPos[1] + 0.5) * 25}
                  cy={(selectedPos[0] + 0.5) * 25}
                  r="6"
                  fill="none"
                  stroke="#e6c878"
                  strokeWidth="0.1"
                  strokeOpacity="0.2"
                  className="ssfz-ring-outer"
                />
              </g>
            )}

            {/* 4 条三方四正连线 */}
            {ssfzCoords.map((coord, i) => {
              if (!selectedPos || !coord.pos) return null;
              const fromX = (selectedPos[1] + 0.5) * 25;
              const fromY = (selectedPos[0] + 0.5) * 25;
              const toX = (coord.pos[1] + 0.5) * 25;
              const toY = (coord.pos[0] + 0.5) * 25;
              const isActive = activeLineIndex === i;
              const isPast = activeLineIndex !== null && i < activeLineIndex;
              const colors = ['#c8a45c', '#7ab88a', '#d63a30', '#7eb5d6']; // 本/对/财/官
              const gradIds = ['grad-gold', 'grad-jade', 'grad-vermilion', 'grad-blue'];
              const roleNames = ['本宫', '对宫', '财帛', '官禄'];
              return (
                <g key={i}>
                  {/* 基础细线（背景）*/}
                  <line
                    x1={fromX} y1={fromY} x2={toX} y2={toY}
                    stroke={colors[i]}
                    strokeWidth="0.15"
                    strokeOpacity="0.3"
                  />
                  {/* 激活态流动线 */}
                  {isActive && (
                    <>
                      <line
                        x1={fromX} y1={fromY} x2={toX} y2={toY}
                        stroke={`url(#${gradIds[i]})`}
                        strokeWidth="0.6"
                        filter="url(#glow-strong)"
                        className="ssfz-line-active"
                        strokeDasharray="1.5 1"
                      />
                      {/* 终点脉冲圆 */}
                      <circle cx={toX} cy={toY} r="0.8" fill={colors[i]} className="ssfz-dot" filter="url(#glow-soft)" />
                      <circle cx={toX} cy={toY} r="1.5" fill={colors[i]} fillOpacity="0.3" className="ssfz-dot-pulse" />
                      {/* 光芒外环 */}
                      <circle cx={toX} cy={toY} r="2.5" fill="none" stroke={colors[i]} strokeWidth="0.2" className="ssfz-ray" />
                      {/* 文字标签 */}
                      <text
                        x={(fromX + toX) / 2}
                        y={(fromY + toY) / 2 - 1.5}
                        fontSize="1.5"
                        fill={colors[i]}
                        textAnchor="middle"
                        className="title-display"
                        style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }}
                      >
                        {roleNames[i]}
                      </text>
                    </>
                  )}
                  {isPast && (
                    <line
                      x1={fromX} y1={fromY} x2={toX} y2={toY}
                      stroke={colors[i]}
                      strokeWidth="0.3"
                      strokeOpacity="0.5"
                    />
                  )}
                </g>
              );
            })}

            {/* 中心向所有三方四正发散的能量线（激活态时） */}
            {activeLineIndex !== null && selectedPos && ssfzCoords.map((coord, i) => {
              if (!coord.pos || i === activeLineIndex) return null;
              const fromX = (selectedPos[1] + 0.5) * 25;
              const fromY = (selectedPos[0] + 0.5) * 25;
              const toX = (coord.pos[1] + 0.5) * 25;
              const toY = (coord.pos[0] + 0.5) * 25;
              return (
                <line
                  key={`bg-${i}`}
                  x1={fromX} y1={fromY} x2={toX} y2={toY}
                  stroke="#c8a45c"
                  strokeWidth="0.1"
                  strokeOpacity="0.15"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* 选中宫位详情 */}
      {selectedP && (
        <div className="paper p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base text-gold-bright tracking-widest title-display">
              {selectedPalace}宫 · {selectedP.heavenlyStem}{selectedP.earthlyBranch}
            </h3>
            <div className="text-xs text-gold opacity-60">
              {selectedP.changsheng12}
            </div>
          </div>
          <div className="text-[10px] text-gold opacity-50 -mt-2">
            {PALACE_MEANING[selectedPalace] || ''}
          </div>
          <div className="divider-gold" />

          {/* 四化总览 */}
          {sihuaStars.length > 0 && (
            <div>
              <div className="text-xs text-gold opacity-60 mb-1.5 flex items-center gap-1">
                <span>四化总览（禄权科忌）</span>
                <InfoPopover
                  title="什么是四化？"
                  content={`紫微斗数的"四化"是命盘上四个最重要的动态变化标记：

• **化禄**：财禄、缘分、顺利
• **化权**：权力、掌控、积极
• **化科**：名声、贵人、文雅
• **化忌**：执念、阻碍、困扰

四化反映主星的动态属性，会随天干变化。当一颗主星化禄进某宫，该宫领域会变得顺遂；化忌进某宫则代表该领域有需要克服的阻碍。

四化飞星的轨迹是紫微论命的重要依据。`}
                  position="top"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['禄', '权', '科', '忌'] as const).map(t => {
                  const hit = sihuaStars.find(s => s.type === t);
                  const colors: Record<string, string> = {
                    '禄': 'border-jade text-jade bg-jade/10',
                    '权': 'border-vermilion text-vermilion bg-vermilion/10',
                    '科': 'border-gold-bright text-gold-bright bg-gold/10',
                    '忌': 'border-red-500 text-red-400 bg-red-500/10',
                  };
                  return (
                    <button
                      key={t}
                      onClick={() => hit && setSelectedPalace(hit.palace)}
                      disabled={!hit}
                      className={`p-1.5 border rounded text-center transition ${
                        hit ? `${colors[t]} hover:scale-105 active:scale-95 cursor-pointer` : 'border-gold/10 opacity-30 cursor-default'
                      }`}
                      title={hit ? `点跳转${hit.palace}宫` : '未化此位'}
                    >
                      <div className="text-[10px] opacity-70">化{t}</div>
                      {hit ? (
                        <>
                          <div className="text-xs font-bold mt-0.5">{hit.star}</div>
                          <div className="text-[9px] opacity-60 mt-0.5">落 {hit.palace}</div>
                        </>
                      ) : (
                        <div className="text-[10px] opacity-40">—</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 综合评分（本地计算） */}
          {horoscope && currentHoro && (
            <OverallScorePanel
              horo={currentHoro}
              horoScope={horoScope}
              astrolabe={astrolabe}
              year={horoYear}
              month={horoMonth}
            />
          )}

          {/* 整体解读按钮 */}
          {(
            <OverallReadingButton
              loading={overallLoading}
              result={overallReading}
              onRead={async () => {
                const config = loadAIConfig();
                if (!canUseAI(config)) {
                  setOverallReading(getAIGateMessage(config));
                  return;
                }
                setOverallLoading(true);
                setOverallReading(null);
                try {
                  const text = await callLLMWithCache(
                    config,
                    [{ role: 'user', content: buildOverallPrompt(currentHoro || astrolabe, horoScope, horoYear, horoMonth) }],
                    {
                      date: `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`,
                      shiChen: shiChenIndex,
                      gender,
                    },
                    `overall-${horoScope}-${horoYear}-${horoMonth}`,
                    'ziwei-overall',
                    '你是精通紫微斗数的命理师，融合大限、流年、流月四化、三方四正进行整体运势综合评估。',
                  );
                  setOverallReading(typeof text === 'string' ? text : (text as any)?.text || String(text));
                } catch (e: any) {
                  setOverallReading(`❌ ${e.message || '请求失败'}`);
                } finally {
                  setOverallLoading(false);
                }
              }}
            />
          )}

          {/* 运限信息 */}
          {horoscope && (
            <div>
              <div className="text-xs text-gold opacity-60 mb-1.5 flex items-center gap-1">
                <span>
                  {horoScope === 'decade' ? '当前大限' : horoScope === 'yearly' ? '当前流年' : '当前流月'}
                </span>
                <InfoPopover
                  title="什么是大限/流年/流月？"
                  content={`紫微斗数的"运限"是后天运势的层次：

• **大限**：每 10 年一换，主导该 10 年整体运势
• **流年**：每年变化，主导该年具体事件
• **流月**：每月变化，主导该月细微运势
• **流日/流时**：日/时辰级别（精细择时）

运限盘中各宫主星会叠加飞星，四化也按流年干重排。运限三方四正是论断流年吉凶的核心。`}
                  position="top"
                />
              </div>
              <div className="text-xs text-rice space-y-1">
                <div>
                  <span className="text-gold opacity-60">
                    {horoScope === 'decade' ? '大限：' : horoScope === 'yearly' ? '流年：' : '流月：'}
                  </span>
                  <span className="text-rice font-bold">
                    {horoScope === 'decade' ? horoscope.decadal?.heavenlyStem + horoscope.decadal?.earthlyBranch :
                     horoScope === 'yearly' ? horoscope.yearly?.heavenlyStem + horoscope.yearly?.earthlyBranch :
                     horoscope.monthly?.heavenlyStem + horoscope.monthly?.earthlyBranch}
                  </span>
                  <span className="text-gold opacity-60 ml-2">
                    （命宫在{horoScope === 'decade' ? horoscope.decadal?.palaceNames?.[1] : horoScope === 'yearly' ? horoscope.yearly?.palaceNames?.[3] : horoscope.monthly?.palaceNames?.[10]}）
                  </span>
                </div>
                {(() => {
                  const h = horoScope === 'decade' ? horoscope.decadal :
                            horoScope === 'yearly' ? horoscope.yearly : horoscope.monthly;
                  if (h?.mutagen?.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {h.mutagen.map((m: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 text-[10px] rounded bg-gold/10 border border-gold/30 text-gold-bright">
                            {m}化
                          </span>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          <div className="divider-gold" />

          <div>
            <div className="text-xs text-gold opacity-60 mb-1">主星</div>
            <div className="space-y-1">
              {selectedP.majorStars?.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-rice font-bold">{s.name}</span>
                  <span className="text-xs text-gold opacity-60">{s.brightness}</span>
                  {s.mutagen && <span className="text-xs text-vermilion">化{s.mutagen}</span>}
                </div>
              ))}
              {(!selectedP.majorStars || selectedP.majorStars.length === 0) && (
                <div className="text-sm text-gold opacity-40 italic">空宫 — 借对宫星曜</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-gold opacity-60 mb-1">三方四正</div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {ssfzCoords.map((coord, i) => {
                const isActive = activeLineIndex === i;
                const isPast = activeLineIndex !== null && i < activeLineIndex;
                const colors = ['border-gold-bright text-gold-bright', 'border-jade text-jade', 'border-vermilion text-vermilion', 'border-blue-300 text-blue-300'];
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPalace(coord.name)}
                    className={`p-1.5 border rounded transition ${
                      isActive ? `${colors[i]} bg-gold/10 scale-105` :
                      isPast ? `${colors[i]} opacity-50` :
                      'border-gold/15 text-rice hover:border-gold/30'
                    }`}
                  >
                    <div className={`text-[10px] opacity-60 ${isActive ? '' : 'text-gold'}`}>
                      {['本宫', '对宫', '财帛', '官禄'][i]}
                    </div>
                    <div className="text-rice text-xs">{coord.name}</div>
                    <div className="text-[9px] text-gold opacity-50">{coord.zhi}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedP?.mutagedPlaces && Object.keys(selectedP.mutagedPlaces).length > 0 && (
            <div>
              <div className="text-xs text-gold opacity-60 mb-1">四化飞星</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(selectedP.mutagedPlaces).map(([k, v]: [string, any]) => (
                  <span key={k} className="px-2 py-0.5 bg-vermilion/10 border border-vermilion/30 text-vermilion rounded">
                    化{k}→{String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI 解读按钮 */}
          <div className="pt-2 border-t border-gold/15">
            <button
              onClick={askAI}
              disabled={aiLoading}
              className="w-full btn-vermilion py-2 rounded text-sm tracking-widest title-display disabled:opacity-50"
            >
              {aiLoading ? '✦ 解读中...' : `AI 三方四正解说（${selectedPalace}）`}
            </button>

            {Array.isArray(aiText) && (
              <div className="mt-3 space-y-2">
                {aiText.map((seg, i) => {
                  const isActive = highlightIndex === i;
                  const isPast = highlightIndex !== null && i < highlightIndex;
                  const colors = ['border-gold-bright', 'border-jade', 'border-vermilion', 'border-blue-300'];
                  const lineLabels = ['本宫', '对宫', '财帛', '官禄'];
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded border-l-2 transition-all duration-700 ${
                        isActive ? `${colors[i]} bg-gold/10 scale-[1.01] shadow-[0_0_20px_rgba(230,200,120,0.2)]` :
                        isPast ? `${colors[i]} bg-ink-soft/40 opacity-50` :
                        'border-gold/10 bg-ink-soft/60'
                      }`}
                    >
                      {isActive && (
                        <div className="text-[10px] text-gold-bright tracking-widest mb-1.5 title-display flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-bright ssfz-dot" />
                          {lineLabels[i] || '总结'} · 正在播放
                        </div>
                      )}
                      <div className="text-sm text-rice leading-relaxed prose prose-invert prose-sm max-w-none prose-headings:text-gold-bright prose-headings:font-bold prose-headings:mb-1.5 prose-h1:text-base prose-h2:text-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-vermilion prose-em:text-jade">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {seg}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= 综合评分组件 =============
function OverallScorePanel({ horo, horoScope, astrolabe, year, month }: { horo: any; horoScope: string; astrolabe: any; year: number; month: number }) {
  // 评分维度
  const scores = useMemo(() => {
    const res: { key: string; label: string; score: number; reason: string }[] = [];

    // 1. 四化因素（运限自带四化按吉凶加权）
    const mu = horo.mutagen || [];
    const muMap: Record<string, number> = { '禄': 8, '权': 7, '科': 6, '忌': 3 };
    const muReason: string[] = [];
    mu.forEach((m: string) => {
      const known = ['禄', '权', '科', '忌'].find(k => m.includes(k));
      if (known && muMap[known]) {
        muReason.push(`${m}化${known}`);
      }
    });
    const muScore = mu.length > 0 ? Math.round(mu.reduce((s: number, m: string) => {
      const k = ['禄', '权', '科', '忌'].find(x => m.includes(x));
      return s + (k ? muMap[k] : 5);
    }, 0) / mu.length) : 6;
    res.push({ key: 'mutagen', label: '运限四化', score: muScore, reason: muReason.join('、') || '无明显四化' });

    // 2. 本命四化（基于本命主星四化落宫）
    const natalSiHua: string[] = [];
    astrolabe.palaces.forEach((p: any) => {
      (p.majorStars || []).forEach((s: any) => {
        if (s.mutagen) natalSiHua.push(`${s.name}化${s.mutagen}在${p.name}`);
      });
    });
    res.push({
      key: 'natal', label: '本命四化', score: natalSiHua.length > 0 ? 7 : 5,
      reason: natalSiHua.length > 0 ? natalSiHua.join('、') : '本命四化以命盘宫位为主'
    });
    void natalSiHua;

    // 3. 命宫主星（吉星+凶星权值）
    const mingZhu = astrolabe.palaces.find((p: any) => p.name === '命宫');
    const mingStars = mingZhu?.majorStars || [];
    const auspicious = ['紫微', '天府', '太阳', '太阴', '天相', '天梁', '天同'];
    const inauspicious = ['擎羊', '铃星', '地劫', '地空', '火星'];
    let mingScore = 5;
    const mingReason: string[] = [];
    mingStars.forEach((s: any) => {
      if (auspicious.includes(s.name)) { mingScore += 1.5; mingReason.push(s.name); }
      if (inauspicious.includes(s.name)) { mingScore -= 1.5; mingReason.push(s.name); }
    });
    mingScore = Math.max(1, Math.min(10, Math.round(mingScore)));
    res.push({ key: 'ming', label: '命宫主星', score: mingScore, reason: mingReason.join('、') || '空宫' });

    // 4. 运限命宫位置（落本宫哪宫位）
    const mingPalaceIdx = horo.palaceNames?.indexOf('命宫') ?? 1;
    const mingPalaceName = astrolabe.palaces[mingPalaceIdx]?.name || '命宫';
    const goodPalaces = ['命宫', '财帛', '官禄', '迁移'];
    const badPalaces = ['疾厄', '仆役'];
    const positionScore = goodPalaces.includes(mingPalaceName) ? 8 :
                          badPalaces.includes(mingPalaceName) ? 4 : 6;
    res.push({
      key: 'position', label: '运限命宫落位',
      score: positionScore,
      reason: `${horoScope === 'decade' ? '大限' : horoScope === 'yearly' ? '流年' : '流月'}命宫落在${mingPalaceName}宫`,
    });

    return res;
  }, [horo, horoScope, astrolabe]);

  const totalScore = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  const scoreColor = totalScore >= 7 ? 'text-jade' : totalScore >= 5 ? 'text-gold-bright' : 'text-vermilion';
  const scoreLabel = totalScore >= 8 ? '大吉' : totalScore >= 7 ? '吉' : totalScore >= 5 ? '平' : '需谨慎';

  return (
    <div>
      <div className="text-xs text-gold opacity-60 mb-1.5 flex items-center gap-1">
        <span>{horoScope === 'decade' ? `${year || ''}大限` : horoScope === 'yearly' ? `${year}年` : `${year}年${month}月`} 综合评分</span>
        <InfoPopover
          title="综合评分怎么算？"
          content={`综合评分根据 4 个维度加权平均（10 分制）：

• **运限四化**（大限/流年/流月自带的化禄权科忌，吉则高分、忌则低分）
• **本命四化**（命盘上的化星落宫位置）
• **命宫主星**（紫微/天府等吉星加分，擎羊/铃星等凶星减分）
• **运限命宫落位**（运限命宫落在本命哪宫，落在命/财/官/迁为吉，落在疾厄/仆役需注意）

总分 8+ 大吉，7+ 吉，5-6 平，5 以下需谨慎。AI 整体解读会进一步细化。`}
          position="top"
        />
      </div>
      <div className="bg-ink-soft/40 border border-gold/20 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${scoreColor}`}>{totalScore}</span>
            <span className="text-[10px] text-gold opacity-50">/ 10</span>
            <span className={`text-sm ${scoreColor} title-display`}>·  {scoreLabel}</span>
          </div>
          <div className="text-[10px] text-gold opacity-50 text-right">
            {horo.heavenlyStem}{horo.earthlyBranch} 运
          </div>
        </div>
        <div className="space-y-1.5">
          {scores.map(s => (
            <div key={s.key} className="flex items-center gap-2 text-[10px]">
              <span className="text-gold opacity-70 w-16 flex-shrink-0">{s.label}</span>
              <div className="flex-1 h-1.5 bg-ink-soft rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    s.score >= 7 ? 'bg-jade' : s.score >= 5 ? 'bg-gold' : 'bg-vermilion'
                  }`}
                  style={{ width: `${s.score * 10}%` }}
                />
              </div>
              <span className={`w-6 text-right font-bold ${
                s.score >= 7 ? 'text-jade' : s.score >= 5 ? 'text-gold-bright' : 'text-vermilion'
              }`}>{s.score}</span>
              <span className="text-gold opacity-50 w-20 truncate" title={s.reason}>{s.reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= 整体解读按钮 + 答案 =============
function OverallReadingButton({ loading, result, onRead }: { loading: boolean; result: string | null; onRead: () => void }) {
  return (
    <div>
      <button
        onClick={onRead}
        disabled={loading}
        className="w-full btn-vermilion py-2.5 rounded text-sm tracking-widest title-display disabled:opacity-50"
      >
        {loading ? '✦ 整体解读中...' : '整体运势解读（综合评估）'}
      </button>
      {result && (
        <div className="mt-2 p-3 bg-ink-soft/60 border border-gold/20 rounded fade-in">
          <div className="text-sm text-rice leading-relaxed prose prose-invert prose-sm max-w-none
            prose-headings:text-gold-bright prose-headings:font-bold prose-headings:mb-1.5
            prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
            prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-li:ml-3
            prose-strong:text-vermilion prose-em:text-jade
            prose-blockquote:border-l-vermilion prose-blockquote:pl-3 prose-blockquote:text-gold-bright prose-blockquote:not-italic">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= 整体解读 prompt 构造 =============
function buildOverallPrompt(horo: any, horoScope: string, year: number, month: number): string {
  // 适配本命：horo.mutagen 不存在时，从 astrolabe 12 宫主星取本命四化
  let mu: string[] = horo.mutagen || [];
  if (mu.length === 0 && horo.palaces) {
    // 本命四化：遍历 12 宫主星取 mutagen 字段
    for (const p of horo.palaces) {
      for (const s of (p.majorStars || [])) {
        if (s.mutagen) mu.push(`${s.name}化${s.mutagen}`);
      }
    }
  }
  const isNatal = horoScope === 'natal' || !horoScope;
  const scopeLabel = isNatal ? '本命' : (horoScope === 'decade' ? '大限' : horoScope === 'yearly' ? '流年' : '流月');
  const periodLabel = isNatal ? '本命命盘' :
                      horoScope === 'decade' ? `${year || ''}大限` :
                      horoScope === 'yearly' ? `${year}年` :
                      `${year}年${month}月`;

  // 划分四化（禄权科忌顺序）
  const lu = mu.find((x: string) => x?.endsWith?.('禄')) || '';
  const quan = mu.find((x: string) => x?.endsWith?.('权')) || '';
  const ke = mu.find((x: string) => x?.endsWith?.('科')) || '';
  const ji = mu.find((x: string) => x?.endsWith?.('忌')) || '';

  // 查找本宫位置（不信任 LLM 自行推断，直接从数据中捞）
  const findInHoro = (star: string) => {
    for (const p of horo.palaces || []) {
      if (p.majorStars?.some((s: any) => s.name === star)) return p.name;
    }
    return '（未入 12 宫）';
  };

  const luPalace = lu ? findInHoro(lu.replace('化禄', '')) : '';
  const quanPalace = quan ? findInHoro(quan.replace('化权', '')) : '';
  const kePalace = ke ? findInHoro(ke.replace('化科', '')) : '';
  const jiPalace = ji ? findInHoro(ji.replace('化忌', '')) : '';

  return `你是一位精通紫微斗数${scopeLabel}运势的命理师。

【查询时间】${periodLabel}
【${scopeLabel}干支】${horo.heavenlyStem}${horo.earthlyBranch}

【${scopeLabel}四化（禄权科忌，独立分析）】
- 化禄：${lu || '无'} → 落宫：${luPalace}
- 化权：${quan || '无'} → 落宫：${quanPalace}
- 化科：${ke || '无'} → 落宫：${kePalace}
- 化忌：${ji || '无'} → 落宫：${jiPalace}

【四化核心含义（你必须按这个解释去写，不能偏离）】
- **化禄**：代表能量的增加、资源的累积和享受。某星化禄，表示这颗星代表的特质被加强，可能资源、机会、欲望、表现力增强。化禄 = “加强、增加资源、让事情更容易得到”。
- **化权**：代表权力、掌控力、推动力和影响力。某星化权，表示个人能作用于外界，获得主动权、话语权、推动事态发展。化权 = “产生力量、掌控与影响，偏向能作用于外界”。不等于拥有/享受成果。
- **化科**：代表名声、认可、资格与显化。某星化科，表示拥有该条件或特质，容易被看见、被认可、获得资质。化科 = “拥有优势、获得认可，偏向被看见、被认可”。不一定转为实际权力或利益。
- **化忌**：不单纯代表“不好”。含义双重：(1) 对该星所代表的内容需避讳，容易在这个领域产生阻碍、执着、压力；(2) 也可能代表自身缺少这颗星的特质，需后天学习、补充、调整。化忌 = “需要面对、调整或补足，代表一种课题或缺口”。

四化并无绝对好坏，关键看落在哪颗星、哪个宫、命盘整体结构如何配合。

请按以下 7 段输出，段间用 ==== 分隔，**每段独立**，不要混着说：

====

# 一、${periodLabel}运势总评
[200字以内：综合${scopeLabel}四化、干支、命盘结构判断该期整体运势好坏、吉凶倾向]

====

# 二、四化独立分析
## 化禄（${lu || '无'}）入${luPalace}
[150字：体现“资源增强、事情更易得”。说明这颗星被强化后在${luPalace}宫带来的具体增益/机会。不涉及其它化。]

## 化权（${quan || '无'}）入${quanPalace}
[150字：体现“掌控与推动”。说明在${quanPalace}宫获得的主动权/影响力/推动力。不等于已享受成果。]

## 化科（${ke || '无'}）入${kePalace}
[150字：体现“被看见与被认可”。说明在${kePalace}宫获得的名声/资质/贵人/化解。不等于实际权力。]

## 化忌（${ji || '无'}）入${jiPalace}
[200字：体现“课题/缺口/需调整”。说明在${jiPalace}宫可能产生的执着/压力/缺什么补什么。单点详说。]

====

# 三、五大领域分析
[300字以内：分别分析该期在 事业/财运/感情/健康/人际 五个领域的吉凶情况，每个领域 50-60 字]

====

# 四、关键月份/事件
[150字以内：列出该期需要重点关注的 2-3 个月份或时间节点]

====

# 五、综合建议
[150字以内：给出可执行的趋吉避凶建议（行动/方位/心态）]

要求：
- 全文 1200-1600 字
- **四化必须独立分析**，不要混到“疾厄宫主事”这种笼统描述里
- 化禄/化权/化科/化忌 严格按上面“核心含义”写，不能跳出该含义框架
- 化忌段要写详细（这是最需注意的）
- 给出明确判断（吉/平/凶），避免模糊措辞
- 用 Markdown 多级标题（# / ##）`;
}
