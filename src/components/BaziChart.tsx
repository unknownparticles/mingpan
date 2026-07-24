import { useMemo, useState } from 'react';
import { getBazi } from '../lib/bazi';
import { loadAIConfig, SYSTEM_PROMPT_BAZI, canUseAI, getAIGateMessage } from '../lib/aiInterpret';
import { callLLMWithCache } from '../lib/cache';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InfoPopover from './InfoPopover';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
}

const GAN_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const WUXING_COLOR: Record<string, string> = {
  木: 'text-jade', 火: 'text-vermilion', 土: 'text-gold-bright',
  金: 'text-gold', 水: 'text-blue-300',
};
const SHISHEN_DESC: Record<string, string> = {
  '比肩': '比肩：同性同我，代表兄弟姐妹、朋友、竞争者',
  '劫财': '劫财：异性同我，代表争夺、合伙人、破财',
  '食神': '食神：同性我生，代表才华、享受、子女',
  '伤官': '伤官：异性我生，代表叛逆、创造力、伤灾',
  '偏财': '偏财：异性我克，代表投资、偏财运、父亲',
  '正财': '正财：同性我克，代表稳定收入、妻子、勤俭',
  '七杀': '七杀：异性克我，代表压力、权力、军警',
  '正官': '正官：同性克我，代表事业、官位、上级',
  '偏印': '偏印：异性生我，代表继母、特殊技能、孤独',
  '正印': '正印：同性生我，代表母亲、庇护、学习',
};
const DISHI_DESC: Record<string, string> = {
  '长生': '长生：生命初生，活力充沛',
  '沐浴': '沐浴：桃花旺盛，感情丰富',
  '冠带': '冠带：成年，自立自强',
  '临官': '临官：得位，事业起步',
  '帝旺': '帝旺：极盛，力量巅峰',
  '衰': '衰：开始走下坡',
  '病': '病：身体欠佳',
  '死': '死：终结、低谷',
  '墓': '墓：收藏、潜伏',
  '绝': '绝：断绝、困顿',
  '胎': '胎：萌芽、新开始',
  '养': '养：孕育、准备',
};
const NAYIN_DESC: Record<string, string> = {
  '海中金': '海中金 · 深藏不露',
  '炉中火': '炉中火 · 光明热烈',
  '大林木': '大林木 · 栋梁之材',
  '路旁土': '路旁土 · 承载万物',
  '剑锋金': '剑锋金 · 刚毅决断',
  '山头火': '山头火 · 照耀四方',
  '涧下水': '涧下水 · 流动清澈',
  '城头土': '城头土 · 稳固厚实',
  '白蜡金': '白蜡金 · 温润柔和',
  '杨柳木': '杨柳木 · 柔韧生机',
  '泉中水': '泉中水 · 源源不断',
  '大海水': '大海水 · 浩瀚包容',
  '天上火': '天上火 · 光明普照',
  '沙中金': '沙中金 · 散而精纯',
  '山下火': '山下火 · 内蕴温和',
  '覆灯火': '覆灯火 · 照耀暗处',
  '砂中土': '砂中土 · 厚德载物',
  '佛灯火': '佛灯火 · 宁静光明',
  '天上水': '天上水 · 润泽万物',
  '大驿土': '大驿土 · 通达四方',
  '平地木': '平地木 · 平凡生发',
  '壁上土': '壁上土 · 依附发展',
  '金箔金': '金箔金 · 表面辉煌',
  '天河水': '天河水 · 清冷高远',
  '大溪水': '大溪水 · 顺势而行',
};

export default function BaziChart({ date, shiChenIndex, gender }: Props) {
  const [showDayun, setShowDayun] = useState(true);
  const [aiText, setAiText] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const bz = useMemo(() => getBazi(date, shiChenIndex, gender), [date, shiChenIndex, gender]);

  const pillars = [
    { p: bz.year, title: '年柱', desc: '代表祖上、父母、童年（出生至 15 岁）', index: 0 },
    { p: bz.month, title: '月柱', desc: '代表父母、兄弟、青年（15-30 岁）', index: 1 },
    { p: bz.day, title: '日柱', desc: '代表自己、配偶、中年（30-45 岁）', index: 2 },
    { p: bz.time, title: '时柱', desc: '代表子女、晚年（45 岁后）', index: 3 },
  ];

  // 计算日主五行
  const dayMasterWuxing = GAN_WUXING[bz.dayMaster];

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
      const pillarsStr = pillars.map(({ p, title }) =>
        `${title}：${p.full}（${p.naYin}）| 十神 ${p.shiShenGan}/${p.shiShenZhi} | 藏干 ${p.hideGan.join('、')} | 十二长生 ${p.diShi}`
      ).join('\n');
      const daYunStr = bz.daYunList.map(dy => `${dy.startAge}岁 ${dy.ganZhi}`).join(' / ');
      const prompt = `八字：${bz.year.full} ${bz.month.full} ${bz.day.full} ${bz.time.full}
日主：${bz.dayMaster}（${dayMasterWuxing}）
${pillarsStr}
起运：${bz.startAge}岁（${bz.direction}排）${bz.startYear}年
大运：${daYunStr}
神煞：${bz.shenSha.join('、')}

【输出格式】严格按以下 4 段，每段用 ==== 分隔，首行 # 标题：

====

# 一、日主强弱与格局
[300字以内：分析日主${bz.dayMaster}的旺衰、得月令否、整体格局高低]

====

# 二、四柱十神配置
[250字以内：分析四柱十神对六亲、事业、财运、性格的影响]

====

# 三、大运流年走势
[250字以内：根据${bz.startAge}岁起运和前几步大运，解读人生各阶段走势]

====

# 四、调候与用神建议
[200字以内：建议喜用神、忌神、适合的方位/颜色/职业]

请严格按上述4段输出，段间用 ==== 分隔。`;

      const text = await callLLMWithCache(
        config,
        [{ role: 'user', content: prompt }],
        { date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`, shiChen: shiChenIndex, gender },
        'bazi-整体解读',
        'bazi',
        SYSTEM_PROMPT_BAZI,
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
      <div className="paper p-3 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gold-bright font-bold tracking-widest text-base title-display">
            八字 · {bz.dayMaster}({dayMasterWuxing})日主
          </span>
          <span className="text-gold opacity-60">
            {bz.direction}排 · {bz.startAge}岁起运
          </span>
        </div>
        <div className="divider-gold my-1" />
        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <div>
            <div className="text-gold opacity-50">胎元</div>
            <div className="text-rice">{bz.taiYuan}</div>
          </div>
          <div>
            <div className="text-gold opacity-50">命宫</div>
            <div className="text-rice">{bz.mingGong}</div>
          </div>
          <div>
            <div className="text-gold opacity-50">身宫</div>
            <div className="text-rice">{bz.shenGong}</div>
          </div>
          <div>
            <div className="text-gold opacity-50">起运</div>
            <div className="text-rice">{bz.startYear}年</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gold opacity-60">
          <span>什么是八字？</span>
          <InfoPopover
            title="八字是什么？"
            content={`八字（四柱）是中国传统命理学的核心。
- **年柱**：祖上、父母、童年时期
- **月柱**：父母、兄弟、青年时期（15-30岁）
- **日柱**：自己、配偶、中年时期（30-45岁）——**日主天干代表命主本人**
- **时柱**：子女、晚年（45岁后）

每柱由天干 + 地支组成，合称"四柱八字"。

八字分析的核心：
- **日主强弱**：看月令、得生得克
- **十神配置**：六亲关系、事业财运
- **大运流年**：人生各阶段走势
- **神煞**：吉凶补充参考`}
            position="bottom"
          />
        </div>
      </div>

      {/* 四柱 */}
      <div className="paper p-2">
        <div className="grid grid-cols-4 gap-1">
          {pillars.map(({ p, title, desc }, i) => (
            <div key={i} className="border border-gold/20 p-1.5 text-center bg-ink-soft/40 relative">
              <div className="flex items-center justify-center gap-1 text-xs text-gold opacity-80 mb-1">
                <span>{title}</span>
                <InfoPopover
                  title={title}
                  content={desc}
                  position={i === 0 ? 'bottom' : i === 3 ? 'bottom' : 'top'}
                />
              </div>
              {/* 天干 */}
              <div className={`text-2xl font-bold ${WUXING_COLOR[GAN_WUXING[p.gan]] || 'text-rice'}`}>
                {p.gan}
                <div className="text-[8px] opacity-50 font-normal">{GAN_WUXING[p.gan]}</div>
              </div>
              {/* 地支 */}
              <div className={`text-xl font-bold ${WUXING_COLOR[GAN_WUXING[p.zhi]] || 'text-rice'}`}>
                {p.zhi}
                <div className="text-[8px] opacity-50 font-normal">{GAN_WUXING[p.zhi]}</div>
              </div>
              <div className="divider-gold my-1" />
              {/* 纳音 */}
              <div className="text-[9px] text-gold opacity-70" title={NAYIN_DESC[p.naYin] || p.naYin}>
                {p.naYin}
              </div>
              {/* 十神 */}
              <div className="text-[10px] text-vermilion mt-0.5" title={SHISHEN_DESC[p.shiShenGan] || p.shiShenGan}>
                {p.shiShenGan}
              </div>
              <div className="text-[9px] text-rice opacity-50 mt-0.5" title={SHISHEN_DESC[p.shiShenZhi] || p.shiShenZhi}>
                {p.shiShenZhi}
              </div>
              {/* 十二长生 */}
              <div className="text-[9px] text-gold opacity-50 mt-0.5" title={DISHI_DESC[p.diShi] || p.diShi}>
                {p.diShi}
              </div>
              {p.xunKong && (
                <div className="text-[9px] text-gold opacity-40 mt-0.5">空:{p.xunKong}</div>
              )}
              {/* 藏干 */}
              <div className="mt-1 pt-1 border-t border-gold/10">
                <div className="text-[8px] text-gold opacity-50">藏干</div>
                <div className="text-[9px] text-rice opacity-80">
                  {p.hideGan.join(' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 神煞 */}
      {bz.shenSha.length > 0 && (
        <div className="paper p-3 text-xs">
          <div className="flex items-center gap-1 text-gold opacity-60 mb-1">
            <span>日主神煞</span>
            <InfoPopover
              title="神煞是什么？"
              content={`神煞是八字中的特殊星曜，影响吉凶。
常见神煞：
- **驿马**：主出行、搬迁、调动
- **桃花**：主感情、异性缘
- **日禄**：主财运、福气
- **天乙贵人**：主贵人相助
- **华盖**：主艺术、孤独、佛道缘
- **文昌**：主学业、功名
- **将星**：主权力、领导力

神煞仅作参考，不宜过分依赖。`}
              position="top"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bz.shenSha.map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-vermilion/10 border border-vermilion/30 text-vermilion rounded text-[10px]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 大运 */}
      <div className="paper p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1 text-gold-bright tracking-widest text-sm title-display">
            大 运
            <InfoPopover
              title="大运是什么？"
              content={`大运是人生每 10 年一换的运势。
- 男命阳年生/女命阴年生：顺排
- 男命阴年生/女命阳年生：逆排
- 顺排：从月柱往后推
- 逆排：从月柱往前推
- 起运岁数：从出生到下一个节气的天数 ÷ 3

大运的每一步影响该 10 年的整体运势。`}
              position="top"
            />
          </span>
          <button
            className={`text-xs px-2 py-0.5 rounded ${showDayun ? 'btn-vermilion' : 'btn-ghost'}`}
            onClick={() => setShowDayun(!showDayun)}
          >
            {showDayun ? '收起' : '展开'}
          </button>
        </div>
        {showDayun && (
          <div className="grid grid-cols-5 gap-1 text-center text-xs">
            {bz.daYunList.map((dy, i) => (
              <div key={i} className="border border-gold/15 p-1.5">
                <div className="text-[10px] text-gold opacity-60">
                  {dy.startAge}岁 · {dy.startYear}
                </div>
                <div className="text-rice font-bold mt-0.5">{dy.ganZhi}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 解读 */}
      <div className="paper p-3">
        <button
          onClick={askAI}
          disabled={aiLoading}
          className="w-full btn-vermilion py-2 rounded text-sm tracking-widest title-display disabled:opacity-50"
        >
          {aiLoading ? '✦ 解读中...' : 'AI 解读八字'}
        </button>

        {Array.isArray(aiText) && (
          <div className="mt-3 space-y-2">
            {aiText.map((seg, i) => {
              const isActive = highlightIndex === i;
              const isPast = highlightIndex !== null && i < highlightIndex;
              const segLabels = ['日主强弱', '十神配置', '大运走势', '调候用神'];
              return (
                <div
                  key={i}
                  className={`p-3 rounded border-l-2 transition-all duration-700 ${
                    isActive ? 'border-gold-bright bg-gold/10 scale-[1.01] shadow-[0_0_20px_rgba(230,200,120,0.2)]' :
                    isPast ? 'border-gold/20 bg-ink-soft/40 opacity-50' :
                    'border-gold/10 bg-ink-soft/60'
                  }`}
                >
                  {isActive && (
                    <div className="text-[10px] text-gold-bright tracking-widest mb-1.5 title-display flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-bright ssfz-dot" />
                      {segLabels[i] || '总结'} · 正在播放
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
  );
}
