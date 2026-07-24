import { useMemo, useState, useRef } from 'react';
import { buildQimen, GONG_NAMES, QIMEN_METHOD_NAMES, type QimenMethod } from '../lib/qimen';
import type { QimenResult, PalaceInfo } from '../lib/qimen';
import { getDateInfo } from '../lib/lunar';
import { loadAIConfig, SYSTEM_PROMPT_QIMEN, canUseAI, getAIGateMessage } from '../lib/aiInterpret';
import { callLLMWithCache } from '../lib/cache';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InfoPopover from './InfoPopover';

interface Props {
  date: Date;
  shiChenIndex: number;
}

const STAR_NATURE: Record<string, string> = {
  天蓬: '凶星 · 主盗贼、阴谋',
  天芮: '病符星 · 主疾病、孤独',
  天冲: '小吉 · 武将、冲动',
  天辅: '文昌 · 文化、教育',
  天禽: '中和 · 中央寄宫',
  天心: '大吉 · 医药、谋略',
  天柱: '小凶 · 破财、争端',
  天任: '小吉 · 富足、敦厚',
  天英: '小吉 · 文采、秀丽',
};

const DOOR_NATURE: Record<string, string> = {
  休: '大吉 · 休养、贵人',
  生: '大吉 · 生机、财运',
  伤: '小凶 · 损伤、竞争',
  杜: '中 · 闭塞、保密',
  景: '小凶 · 血光、文书',
  死: '凶 · 死亡、终结',
  惊: '凶 · 惊恐、口舌',
  开: '大吉 · 开创、顺利',
};

const GONG_DESC: Record<string, string> = {
  '坎': '坎宫（北方）· 属水 · 主智慧、险难、中男',
  '坤': '坤宫（西南）· 属土 · 主柔顺、母性、众民',
  '震': '震宫（东方）· 属木 · 主行动、长男、雷声',
  '巽': '巽宫（东南）· 属木 · 主文教、长女、风',
  '中': '中宫 · 属土 · 主中央、枢纽、寄宫（阳遁寄坤、阴遁寄艮）',
  '乾': '乾宫（西北）· 属金 · 主刚健、父、首领',
  '兑': '兑宫（西方）· 属金 · 主喜悦、少女、言语',
  '艮': '艮宫（东北）· 属土 · 主停止、少男、山',
  '离': '离宫（南方）· 属火 · 主文明、中女、光亮',
};

const GOD_DESC: Record<string, string> = {
  '值符': '值符星神 · 大吉 · 万事皆宜',
  '腾蛇': '腾蛇 · 主惊恐、怪异、变化',
  '太阴': '太阴 · 主阴柔、谋略、阴私',
  '六合': '六合 · 大吉 · 婚嫁、合作',
  '白虎': '白虎 · 凶 · 血光、争斗',
  '玄武': '玄武 · 凶 · 盗贼、欺诈',
  '九地': '九地 · 坤德 · 守成、收藏',
  '九天': '九天 · 乾德 · 开创、扬名',
};

export default function QimenChart({ date, shiChenIndex }: Props) {
  const [selectedGong, setSelectedGong] = useState<number | null>(null);
  const [method, setMethod] = useState<QimenMethod>('chaiBu');
  const [aiText, setAiText] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const qimen: QimenResult = useMemo(() => {
    const info = getDateInfo(date, shiChenIndex);
    return buildQimen(date, info.prevJieqi, info.yuan, info.hourGZ.gan);
  }, [date, shiChenIndex, method]);

  // 九宫格布局（戴九履一）
  // 巽(4) 离(9) 坤(2)
  // 震(3) 中(5) 兑(7)
  // 艮(8) 坎(1) 乾(6)
  const gridLayout: { gong: number; row: number; col: number }[] = [
    { gong: 4, row: 0, col: 0 }, { gong: 9, row: 0, col: 1 }, { gong: 2, row: 0, col: 2 },
    { gong: 3, row: 1, col: 0 }, { gong: 5, row: 1, col: 1 }, { gong: 7, row: 1, col: 2 },
    { gong: 8, row: 2, col: 0 }, { gong: 1, row: 2, col: 1 }, { gong: 6, row: 2, col: 2 },
  ];

  const selectedPalace = qimen.palaces.find(p => p.gong === selectedGong);
  const dateInfo = getDateInfo(date, shiChenIndex);

  // 当前选中的宫位坐标 (用于 SVG 叠加)
  const selectedPos = useMemo(() => {
    if (!selectedGong) return null;
    const g = gridLayout.find(x => x.gong === selectedGong);
    return g ? { row: g.row, col: g.col, pos: qimen.palaces.find(p => p.gong === selectedGong) } : null;
  }, [selectedGong, qimen]);

  // 八宫与中宫的连接
  void qimen.palaces.filter(p => p.gong !== 5);

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
      const summary = qimen.palaces.map(p =>
        `${GONG_NAMES[p.gong]}宫[${p.wuxing}]：天盘${p.tianGan}/地盘${p.diGan} | ${p.tianStar || '-'} | ${p.renDoor || '中'}门 | ${p.shenGod || '-'}神`
      ).join('\n');
      const target = selectedPalace
        ? `\n重点解读宫位：${GONG_NAMES[selectedPalace.gong]}宫
  天盘${selectedPalace.tianGan}/地盘${selectedPalace.diGan}
  九星：${selectedPalace.tianStar || '-'}(${STAR_NATURE[selectedPalace.tianStar || ''] || ''})
  八门：${selectedPalace.renDoor || '中'}(${DOOR_NATURE[selectedPalace.renDoor || ''] || ''})
  八神：${selectedPalace.shenGod || '-'}`
        : '';
      const prompt = `${qimen.yinYang}遁${qimen.ju}局 ${QIMEN_METHOD_NAMES[method]} 上元${qimen.yuan}
值符：${qimen.zhiFu.star} 落${GONG_NAMES[qimen.zhiFu.gong]}宫
值使：${qimen.zhiShi.door} 落${GONG_NAMES[qimen.zhiShi.gong]}宫${target}

九宫盘：
${summary}

【输出格式】严格按以下 4 段，每段用 ==== 分隔，首行 # 标题：

====

# 一、整体格局
[300字以内：分析阴阳遁、用局、九星八门总体格局的吉凶倾向]

====

# 二、值符值使分析
[200字以内：值符星和值使门所在宫位代表的核心信息]

====

# 三、${selectedPalace ? `${GONG_NAMES[selectedPalace.gong]}宫详解` : '用神宫位'}
[250字以内：${selectedPalace ? '该宫' : '重点宫位'}的天盘/地盘生克、九星旺衰、八门吉凶、八神属性的综合判断]

====

# 四、行动建议
[200字以内：根据盘面给出具体可执行的建议方向]

请严格按上述4段输出，段间用 ==== 分隔。`;

      const text = await callLLMWithCache(
        config,
        [{ role: 'user', content: prompt }],
        { date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`, shiChen: shiChenIndex, gender: '不分' },
        `奇门解读|${selectedPalace?.gong || 'all'}|${QIMEN_METHOD_NAMES[method]}`,
        'qimen',
        SYSTEM_PROMPT_QIMEN,
      );
      const textStr = typeof text === 'string' ? text : (text as any)?.text || String(text);
      const segments = textStr.split('====').map((s: string) => s.trim()).filter((s: string) => s);
      setAiText(segments);

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

  return (
    <div className="space-y-3">
      {/* 头部信息 */}
      <div className="paper p-3 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-gold-bright font-bold tracking-widest text-base title-display">
            {qimen.yinYang}遁 · {qimen.ju}局
          </span>
          <span className="text-gold opacity-60">
            {['上元', '中元', '下元'][qimen.yuan]} · {qimen.jieqi}
          </span>
        </div>
        <div className="divider-gold my-1" />
        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <div>
            <div className="text-gold opacity-50">年</div>
            <div className="text-rice">{dateInfo.yearGZ.full}</div>
          </div>
          <div>
            <div className="text-gold opacity-50">月</div>
            <div className="text-rice">{dateInfo.monthGZ.full}</div>
          </div>
          <div>
            <div className="text-gold opacity-50">日</div>
            <div className="text-rice">{dateInfo.dayGZ.full}</div>
          </div>
          <div>
            <div className="text-gold opacity-50">时</div>
            <div className="text-rice">{dateInfo.hourGZ.full}</div>
          </div>
        </div>
      </div>

      {/* 用局 + 说明 */}
      <div className="paper p-2 flex items-center gap-2 text-xs">
        <span className="text-gold opacity-60">用局：</span>
        {(Object.keys(QIMEN_METHOD_NAMES) as QimenMethod[]).map(m => (
          <button
            key={m}
            className={`px-2 py-0.5 rounded ${method === m ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => setMethod(m)}
          >
            {QIMEN_METHOD_NAMES[m]}
          </button>
        ))}
        <InfoPopover
          title="奇门遁甲是什么？"
          content={`奇门遁甲是中国古代最高层次的预测术，分"奇"、"门"、"遁甲"三层：
• **奇**：乙丙丁三奇（日奇、月奇、星奇）
• **门**：休生伤杜景死惊开八门
• **遁甲**：六甲隐于戊己庚辛壬癸六仪之下

奇门盘由天盘（九星）、地盘（三奇六仪）、人盘（八门）、神盘（八神）四层叠加组成。**用局法**决定时家奇门取哪一元：
• **拆补法**（最常用）：按日支和上中下元表对照取局
• **茅山法**：与拆补法类似但更强调时辰起始
• **均分法**：按节气实际时长均分三元

应用范围：择吉、预测、运筹。`}
          position="bottom"
        />
      </div>

      {/* 九宫盘 */}
      <div className="paper p-2">
        <div className="relative" ref={chartRef}>
          <div className="grid grid-cols-3 grid-rows-3 gap-0.5" style={{ aspectRatio: '1/1' }}>
            {gridLayout.map(item => {
              const p = qimen.palaces.find(x => x.gong === item.gong)!;
              return (
                <div key={item.gong} className="min-h-0">
                  {renderQimenCell(p, selectedGong === item.gong, () => setSelectedGong(item.gong))}
                </div>
              );
            })}
          </div>
          {/* SVG 八方连线（围绕中宫） */}
          <svg
            className="absolute inset-0 pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <linearGradient id="q-gold" x1="0" y1="0" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c8a45c" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#e6c878" stopOpacity="1" />
                <stop offset="100%" stopColor="#c8a45c" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="q-vermilion" x1="0" y1="0" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b1a13" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#d63a30" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b1a13" stopOpacity="0.2" />
              </linearGradient>
              <filter id="q-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 中宫到各宫的辐射线 */}
            {[1, 8, 3, 4, 9, 2, 7, 6].map((g) => {
              const cellPos = gridLayout.find(x => x.gong === g);
              if (!cellPos) return null;
              const cx = 50, cy = 50;
              const x = (cellPos.col + 0.5) * (100 / 3);
              const y = (cellPos.row + 0.5) * (100 / 3);
              const isSelected = selectedGong === g;
              const isZhiFu = qimen.zhiFu.gong === g;
              const isZhiShi = qimen.zhiShi.gong === g;
              const stroke = isZhiFu || isZhiShi ? 'url(#q-vermilion)' : 'url(#q-gold)';
              return (
                <g key={g}>
                  {/* 基础辐射线 */}
                  <line
                    x1={cx} y1={cy} x2={x} y2={y}
                    stroke="#c8a45c"
                    strokeWidth="0.15"
                    strokeOpacity={selectedGong ? 0.3 : 0.2}
                    strokeDasharray="0.5 0.5"
                  />
                  {/* 选中时连线变实 */}
                  {isSelected && (
                    <line
                      x1={cx} y1={cy} x2={x} y2={y}
                      stroke={stroke}
                      strokeWidth="0.6"
                      filter="url(#q-glow)"
                      className="qimen-line-active"
                      strokeDasharray="2 1"
                    />
                  )}
                  {/* 值符/值使特殊高亮 */}
                  {(isZhiFu || isZhiShi) && (
                    <line
                      x1={cx} y1={cy} x2={x} y2={y}
                      stroke="#d63a30"
                      strokeWidth="0.25"
                      strokeOpacity="0.5"
                    />
                  )}
                </g>
              );
            })}

            {/* 选中宫位的外环脉冲 */}
            {selectedPos && (
              <g>
                <circle
                  cx={(selectedPos.col + 0.5) * (100 / 3)}
                  cy={(selectedPos.row + 0.5) * (100 / 3)}
                  r="5"
                  fill="none"
                  stroke="#e6c878"
                  strokeWidth="0.2"
                  className="qimen-pulse-ring"
                />
                <circle
                  cx={(selectedPos.col + 0.5) * (100 / 3)}
                  cy={(selectedPos.row + 0.5) * (100 / 3)}
                  r="2"
                  fill="none"
                  stroke="#d63a30"
                  strokeWidth="0.3"
                  className="qimen-pulse-dot"
                />
              </g>
            )}

            {/* 中宫旋转光环 */}
            <circle cx="50" cy="50" r="3" fill="none" stroke="#c8a45c" strokeWidth="0.15" className="qimen-center-ring" />
            <circle cx="50" cy="50" r="5" fill="none" stroke="#c8a45c" strokeWidth="0.1" strokeOpacity="0.4" className="qimen-center-ring-outer" />
          </svg>
        </div>
        <div className="mt-2 text-[10px] text-gold opacity-50 text-center">
          戴九履一 · 左三右七 · 二四为肩 · 六八为足
        </div>
      </div>

      {/* 选中宫位详情 */}
      {selectedPalace && (
        <div className="paper p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base text-gold-bright tracking-widest title-display">
              {selectedPalace.name}宫 · {selectedPalace.wuxing}
            </h3>
            {selectedPalace.gong === 5 ? (
              <span className="text-xs text-vermilion">中宫寄</span>
            ) : (
              <span className="text-xs text-gold opacity-60">#{selectedPalace.gong}</span>
            )}
          </div>
          <div className="text-[10px] text-gold opacity-50 -mt-2">
            {GONG_DESC[selectedPalace.name] || ''}
          </div>
          <div className="divider-gold" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gold opacity-60 flex items-center gap-1">
                地盘天干
                <InfoPopover
                  title="地盘天干"
                  content={`地盘是奇门遁甲的基础盘面，承载"三奇六仪"。
• **三奇**：乙(日奇)、丙(月奇)、丁(星奇)，主大吉
• **六仪**：戊己庚辛壬癸，承载六甲

地盘天干固定不动，揭示该宫的本质能量。`}
                  position="top"
                />
              </div>
              <div className={`text-2xl font-bold ${['甲','乙','丙','丁'].includes(selectedPalace.diGan) ? 'text-jade' : 'text-rice'}`}>
                {selectedPalace.diGan}
              </div>
              {(['甲', '乙', '丙', '丁'].includes(selectedPalace.diGan)) && (
                <div className="text-[10px] text-jade">奇 · 大吉</div>
              )}
            </div>
            <div>
              <div className="text-xs text-gold opacity-60 flex items-center gap-1">
                天盘天干
                <InfoPopover
                  title="天盘天干"
                  content={`天盘是值符星所在宫的天干，叠加在地盘之上。
天盘天干代表"天时"、"外部环境"对该宫的影响。
天盘 + 地盘的生克关系是判断吉凶的关键。`}
                  position="top"
                />
              </div>
              <div className="text-2xl text-rice font-bold">{selectedPalace.tianGan}</div>
            </div>
            <div>
              <div className="text-xs text-gold opacity-60 flex items-center gap-1">
                九星
                <InfoPopover
                  title="奇门九星"
                  content={`九星是奇门遁甲的核心要素：
• **天蓬**：盗贼、阴谋（凶）
• **天芮**：病符（凶）
• **天冲**：武贵（小吉）
• **天辅**：文昌（小吉）
• **天禽**：中和（中央）
• **天心**：医药（大吉）
• **天柱**：破财（小凶）
• **天任**：富足（小吉）
• **天英**：文秀（小吉）`}
                  position="top"
                />
              </div>
              <div className="text-rice font-bold">{selectedPalace.tianStar || '—'}</div>
              {selectedPalace.tianStar && (
                <div className="text-[10px] text-gold opacity-60">
                  {STAR_NATURE[selectedPalace.tianStar]}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gold opacity-60 flex items-center gap-1">
                八门
                <InfoPopover
                  title="奇门八门"
                  content={`八门代表"人事"——具体事件的吉凶：
• **休门**：休养、贵人（大吉）
• **生门**：生机、财运（大吉）
• **伤门**：损伤、竞争（小凶）
• **杜门**：闭塞、保密（中）
• **景门**：血光、文书（小凶）
• **死门**：终结、死亡（凶）
• **惊门**：惊恐、口舌（凶）
• **开门**：开创、顺利（大吉）`}
                  position="top"
                />
              </div>
              <div className={`font-bold ${
                ['开', '休', '生'].includes(selectedPalace.renDoor as string) ? 'text-jade' :
                ['死', '惊', '伤'].includes(selectedPalace.renDoor as string) ? 'text-vermilion' : 'text-rice'
              }`}>
                {selectedPalace.gong === 5 ? '中宫无门' : (selectedPalace.renDoor || '—')}
              </div>
              {selectedPalace.renDoor && (
                <div className="text-[10px] text-gold opacity-60">
                  {DOOR_NATURE[selectedPalace.renDoor]}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gold opacity-60 flex items-center gap-1">
                八神
                <InfoPopover
                  title="奇门八神"
                  content={`八神代表"神煞"——超自然力量和外部环境：
• **值符**：大吉，万事皆宜
• **腾蛇**：惊恐、怪异
• **太阴**：谋略、阴柔
• **六合**：婚嫁、合作（大吉）
• **白虎**：血光、争斗（凶）
• **玄武**：盗贼、欺诈（凶）
• **九地**：守成、收藏
• **九天**：开创、扬名`}
                  position="top"
                />
              </div>
              <div className="text-rice">{selectedPalace.shenGod || '—'}</div>
              {selectedPalace.shenGod && (
                <div className="text-[10px] text-gold opacity-60">
                  {GOD_DESC[selectedPalace.shenGod]}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gold opacity-60">标识</div>
              <div className="flex flex-wrap gap-1">
                {selectedPalace.isZhiFu && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-vermilion/20 border border-vermilion/40 text-vermilion rounded title-display">★ 值符</span>
                )}
                {selectedPalace.isZhiShi && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 border border-gold/40 text-gold-bright rounded title-display">值使</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gold/15">
            <button
              onClick={askAI}
              disabled={aiLoading}
              className="w-full btn-vermilion py-2 rounded text-sm tracking-widest title-display disabled:opacity-50"
            >
              {aiLoading ? '✦ 解读中...' : `🤖 AI 解说奇门盘（${selectedPalace.name}宫）`}
            </button>

            {Array.isArray(aiText) && (
              <div className="mt-3 space-y-2">
                {aiText.map((seg, idx) => {
                  const isActive = highlightIndex === idx;
                  const isPast = highlightIndex !== null && idx < highlightIndex;
                  const segLabels = ['整体格局', '值符值使', `${selectedPalace.name}宫详解`, '行动建议'];
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border-l-2 transition-all duration-700 ${
                        isActive ? 'border-gold-bright bg-gold/10 scale-[1.01] shadow-[0_0_20px_rgba(230,200,120,0.2)]' :
                        isPast ? 'border-gold/20 bg-ink-soft/40 opacity-50' :
                        'border-gold/10 bg-ink-soft/60'
                      }`}
                    >
                      {isActive && (
                        <div className="text-[10px] text-gold-bright tracking-widest mb-1.5 title-display flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-bright ssfz-dot" />
                          {segLabels[idx] || '总结'} · 正在播放
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

      {!selectedPalace && (
        <div className="paper p-4 text-center text-xs text-gold opacity-60">
          <div className="title-display tracking-widest text-gold-bright mb-1">👆 点九宫任一格开始解读</div>
          <div>点击上方九宫盘中的任一宫位，查看该宫详细解读与 AI 三方四正分析</div>
        </div>
      )}
    </div>
  );
}

function renderQimenCell(p: PalaceInfo, isSelected: boolean, onClick: () => void) {
  const isCenter = p.gong === 5;
  const isGoodDoor = ['开', '休', '生'].includes(p.renDoor as string);
  const isBadDoor = ['死', '惊', '伤'].includes(p.renDoor as string);
  const isZhiFu = p.isZhiFu;
  const isZhiShi = p.isZhiShi;

  return (
    <button
      onClick={onClick}
      className={`w-full h-full p-1 text-left transition border relative ${
        isSelected ? 'border-gold-bright bg-gold/10' :
        isZhiFu || isZhiShi ? 'border-vermilion/60 bg-vermilion/5 pulse-gold' :
        'border-gold/15 bg-ink-soft/40'
      } ${isCenter ? 'bg-gradient-to-br from-vermilion-deep/30 to-ink-soft' : ''}`}
    >
      <div className="flex items-center justify-between text-[9px] leading-tight">
        <span className="text-gold opacity-70">{p.name}宫</span>
        <span className="text-gold opacity-50">{p.wuxing}</span>
      </div>
      {/* 八神 */}
      {p.shenGod && (
        <div className="text-[8px] text-jade opacity-80 leading-tight">{p.shenGod}</div>
      )}
      {/* 天盘/地盘天干 */}
      <div className="flex items-baseline gap-0.5 mt-0.5 leading-tight">
        <span className={`text-lg font-bold ${['甲','乙','丙','丁'].includes(p.tianGan) ? 'text-jade' : 'text-rice'}`}>
          {p.tianGan}
        </span>
        <span className="text-[8px] text-gold opacity-50">天</span>
        <span className="text-[10px] text-gold opacity-70 ml-0.5">{p.diGan}</span>
        <span className="text-[8px] text-gold opacity-50">地</span>
      </div>
      {/* 九星 */}
      {p.tianStar && (
        <div className="text-[9px] text-rice opacity-90 leading-tight truncate">{p.tianStar}</div>
      )}
      {/* 八门（角标） */}
      {p.renDoor && p.gong !== 5 && (
        <div className={`absolute right-1 bottom-0.5 text-[10px] font-bold ${
          isGoodDoor ? 'text-jade' : isBadDoor ? 'text-vermilion' : 'text-rice'
        }`}>
          {p.renDoor}门
        </div>
      )}
      {/* 值符/值使标记 */}
      {isZhiFu && (
        <div className="absolute top-0.5 right-1 text-[8px] text-vermilion font-bold title-display">★值符</div>
      )}
      {isZhiShi && !isZhiFu && (
        <div className="absolute top-0.5 right-1 text-[8px] text-gold-bright font-bold title-display">值使</div>
      )}
    </button>
  );
}
