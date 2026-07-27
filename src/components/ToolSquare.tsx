// AI 命理解读工具广场
import { useMemo, useState } from 'react';
import { astro } from 'iztro';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { buildQimen } from '../lib/qimen';
import { getBazi } from '../lib/bazi';
import { getDateInfo } from '../lib/lunar';
import { loadAIConfig, canUseAI, getAIGateMessage } from '../lib/aiInterpret';
import { callLLMWithCache } from '../lib/cache';
import { KLine, Calendar, Wave, Seal, Ingot, Talent, Lotus, Marriage, Career, Wrench } from './Icon';
import { ScrollCard } from './Ornament';
import { KLineAnim } from './KLineAnim';
import { LoadingStages } from './LoadingStages';
import { generateKLineData } from '../lib/kline';
import {
  analyzeDateSelectLocal,
  analyzeFortuneLocal,
  formatDateSelectLocalMarkdown,
  formatFortuneLocalMarkdown,
} from '../lib/almanac';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
}

type ToolId =
  | 'kline' | 'dateSelect' | 'fortune' | 'coreChart'
  | 'wealth' | 'talent' | 'antiBurnout' | 'marriage' | 'career';

interface Tool {
  id: ToolId;
  icon: React.ReactNode;
  title: string;
  short: string;
  desc: string;
  accent?: 'gold' | 'vermilion' | 'jade';
  needPartner?: boolean;
  inputFields?: { key: string; label: string; type: 'date' | 'select' | 'text'; options?: string[]; placeholder?: string }[];
  buildPrompt: (info: any) => { system: string; user: string };
}

const TOOLS: Tool[] = [
  {
    id: 'kline',
    icon: <KLine size={22} />,
    accent: 'vermilion',
    title: '人生 K 线',
    short: '1-100岁 4 维运势图谱',
    desc: '生成 1-100 岁 4 维度走势图，可缩放/点击点位，辅以大师详解',
    buildPrompt: (info) => {
      const data = generateKLineData(info.date, info.shiChenIndex, info.gender);
      const tableLines = data.data.map(p => `${p.age}|${p.health}|${p.wealth}|${p.career}|${p.marriage}`).join('\n');
      return {
        system: '你是精通紫微斗数、八字、奇门遁甲的命理大师，融合三盘交叉分析人生运势曲线。解读专业、温和、有理有据。年份必须按生年+年龄推算，并结合当前时间。',
        user: `【生辰】${info.birthStr}  性别：${info.gender}
【生年】${data.birthYear}
【当前时间】${info.nowStr}（浏览器本地时间，当前年份=${info.nowYear}）

【K 线数据表（年龄|健康|财运|官运|姻缘，满分 100）】
${tableLines}

任务：基于上述 100 年 K 线数据，结合命盘，进行**专业、详尽、模块化**的人生运势解读。要求：

# 一、运势总览
- 200 字：一生运势总评，分阶段描述少年期(1-20) / 青年期(21-40) / 中年期(41-60) / 老年期(61-100) 的走势特点

# 二、四大维度详解
- ## 健康：分 3-5 个阶段描述重点
- ## 财运：分 3-5 个阶段描述重点
- ## 官运/事业：分 3-5 个阶段描述重点
- ## 姻缘/感情：分 3-5 个阶段描述重点

# 三、关键节点
- ## 高点（顺运期）：列出 5 个具体公历年份（=生年+年龄-1），说明原因
- ## 低点（逆境期）：列出 5 个具体公历年份，说明风险
- ## 转折点：列出 3 个可能改变轨迹的关键年
- 所有年份必须与 K 线年龄对应，禁止编造与生年无关的过时年份

# 四、人生建议
- ## 事业方向：适合的行业与时机（相对当前 ${info.nowYear} 年）
- ## 财富策略：投资理财建议
- ## 婚姻时机：何时宜动婚嫁
- ## 养生重点：何时需特别关注健康

总字数 1500-2000，必须用 Markdown 多级标题。`,
      };
    },
  },
  {
    id: 'dateSelect',
    icon: <Calendar size={22} />,
    accent: 'vermilion',
    title: '择日',
    short: '筛选专属良辰吉日',
    desc: '结合黄历与八字，筛选重要事项的吉日',
    inputFields: [
      { key: 'event', label: '事项类型', type: 'select', options: ['婚嫁', '搬家', '开业', '签约', '出行', '动土', '祭祀'] },
      { key: 'range', label: '择日范围（近 N 天）', type: 'text', placeholder: '如 30' },
    ],
    buildPrompt: (info) => {
      const local = info.dateSelectLocal || analyzeDateSelectLocal({
        birthDate: info.date,
        shiChenIndex: info.shiChenIndex,
        gender: info.gender,
        event: info.event || '通用',
        rangeDays: Number.parseInt(String(info.range || '30'), 10) || 30,
        now: info.now,
      });
      return {
        system: '你是精通择日的命理大师。必须先基于本地黄历/八字解析结果再展开，不得编造列表外日期，不得使用过时年份。',
        user: `【生辰】${info.birthStr}  性别：${info.gender}
【事项】${info.event || local.event}

${local.promptBlock}

请严格按以下格式输出（推荐日必须来自本地优选列表）：

# 一、择日原则
[80字以内：基于日主与事项说明原则]

# 二、推荐吉日
## YYYY-MM-DD 星期X
- **宜**：...  **忌**：...
- **理由**：结合本地评分与命局
- **时辰**：建议 XX 时

[从本地优选日中挑 3-5 天]

# 三、避忌日期
[从本地避忌日中挑 2-3 天说明]

总字数 600-800。`,
      };
    },
  },
  {
    id: 'fortune',
    icon: <Wave size={22} />,
    accent: 'gold',
    title: '运势',
    short: '近期运势解读',
    desc: '当前年/月/日运势详批',
    inputFields: [
      { key: 'period', label: '时间粒度', type: 'select', options: ['年', '月', '日', '时'] },
    ],
    buildPrompt: (info) => {
      const local = info.fortuneLocal || analyzeFortuneLocal({
        birthDate: info.date,
        shiChenIndex: info.shiChenIndex,
        gender: info.gender,
        period: info.period || '月',
        now: info.now,
      });
      return {
        system: '你是精通紫微斗数、八字、奇门遁甲的命理大师。必须先基于本地运势解析再展开，不得改写干支与当前时间。',
        user: `【生辰】${info.birthStr}  性别：${info.gender}
【粒度】${info.period || local.period}

${local.promptBlock}

请基于**本地解析**做 ${info.period || local.period} 运势详批：

# 一、${info.period || local.period}运势总评
[200字以内：先复述本地焦点与干支，再综合判断]

# 二、五大领域
- ## 事业
- ## 财运
- ## 感情
- ## 健康
- ## 人际

# 三、吉日/吉时
[仅可使用本地给出的当前时间锚点；不要编造过时年份]

# 四、注意事项
[结合本地注意项展开]

总字数 800-1200。`,
      };
    },
  },
  {
    id: 'coreChart',
    icon: <Seal size={22} />,
    accent: 'vermilion',
    title: '核心命盘',
    short: '命格精解',
    desc: '紫微斗数 + 八字 + 奇门 三盘精解',
    buildPrompt: (info) => ({
      system: '你是精通三盘交叉的命理大师，从紫微、八字、奇门三个维度全方位解读命盘。涉及年份时必须以用户提供的当前时间为锚点。',
      user: `【生辰】${info.birthStr}  性别：${info.gender}
【当前时间】${info.nowStr}（浏览器本地时间，当前年份=${info.nowYear}）
【命盘主星】${info.mingStars}
【财星】${info.wealthStars}
【学业星】${info.studyStars}
【五行局】${info.fiveClass}
【日主】${info.dayMaster}
【奇门值符】${info.fortuneStars}

请进行核心命盘综合解读：

# 一、命格总论
[300字：综合三盘给出此命的核心特征]

# 二、紫微主星特质
[200字：根据${info.mingStars}分析性格天赋]

# 三、八字格局分析
[200字：根据${info.dayMaster}分析五行喜忌]

# 四、奇门时运
[200字：根据${info.fortuneStars}分析时运特点]

# 五、一生轨迹
[300字：分阶段描述人生重要节点；若写具体年份，须基于生辰与当前 ${info.nowYear} 年推算]

# 六、修行建议
[200字：给出命格补益的方向]

总字数 1500-2000。`,
    }),
  },
  {
    id: 'wealth',
    icon: <Ingot size={22} />,
    accent: 'gold',
    title: '财富基因',
    short: '评估财富承载力',
    desc: '从财星、偏财运、投资偏好全面评估',
    buildPrompt: (info) => ({
      system: '你是精通财富分析的命理大师，专长从命盘评估财富格局。涉及年份时必须以用户提供的当前浏览器时间为锚点。',
      user: `【生辰】${info.birthStr}  性别：${info.gender}
【当前时间】${info.nowStr}（浏览器本地时间，当前年份=${info.nowYear}）
【财星】${info.wealthStars}
【日主】${info.dayMaster}
【奇门值符】${info.fortuneStars}

请进行财富基因分析：

# 一、财富格局
[300字：分析此命的财富承载格局、偏财/正财倾向]

# 二、求财方式
[200字：最适合的求财方式（创业/职场/投资/技艺）]

# 三、关键财运年份
[200字：列出 3-5 个财运最佳的公历年份及原因；优先 ${info.nowYear} 年起未来 10 年内，禁止过时年份]

# 四、破财风险
[200字：列出 2-3 个需特别谨慎的公历年份；同样基于当前时间]

# 五、投资方向
[200字：根据五行喜忌给出具体投资建议]

# 六、理财策略
[200字：日常理财的具体建议]

总字数 1300-1500。`,
    }),
  },
  {
    id: 'talent',
    icon: <Talent size={22} />,
    accent: 'gold',
    title: '天赋解码',
    short: '洞察认知模式',
    desc: '从命盘主星、神煞格局解析天赋所在',
    buildPrompt: (info) => ({
      system: '你是天赋解读专家，从紫微主星、八字十神、奇门九星三个维度解码天赋。',
      user: `【生辰】${info.birthStr}  性别：${info.gender}
【命盘主星】${info.mingStars}
【学业星】${info.studyStars}
【日主】${info.dayMaster}

请进行天赋解码：

# 一、核心天赋
[300字：分析最突出的 3 项天赋及表现]

# 二、思维模式
[200字：分析思维方式、决策风格]

# 三、才艺倾向
[200字：最有发展潜力的才艺方向]

# 四、学习路径
[200字：最有效的学习方式]

# 五、适合领域
[200字：最适合从事的 3-5 个职业方向]

# 六、避坑指南
[200字：天赋的反面/短板]

总字数 1300-1500。`,
    }),
  },
  {
    id: 'antiBurnout',
    icon: <Lotus size={22} />,
    accent: 'jade',
    title: '反内耗指南',
    short: '追踪情绪根源',
    desc: '从命理视角分析心理内耗成因与化解',
    buildPrompt: (info) => ({
      system: '你是从命理视角做心理分析的专家，帮用户看清内耗根源并给出化解建议。',
      user: `【生辰】${info.birthStr}  性别：${info.gender}
【命盘主星】${info.mingStars}
【日主】${info.dayMaster}

请进行反内耗分析：

# 一、内耗根源
[300字：从命理角度分析此命最常见的内耗模式]

# 二、情绪触发点
[200字：哪些事最容易引发情绪内耗]

# 三、思维陷阱
[200字：常陷入的负面思维循环]

# 四、自我和解法
[300字：根据命格特点给出 3-5 条具体的自我和解方法]

# 五、能量补给
[200字：哪些活动/人/环境能补益心理能量]

# 六、长期修行
[200字：适合此命格的身心修行方向]

总字数 1400-1600。`,
    }),
  },
  {
    id: 'marriage',
    icon: <Marriage size={22} />,
    accent: 'vermilion',
    title: '姻缘解析',
    short: '八字深度匹配',
    desc: '与伴侣的命格契合度 + 关系走向',
    needPartner: true,
    buildPrompt: (info) => ({
      system: '你是姻缘匹配的命理大师，从八字用神、紫微夫妻宫、奇门值符三个维度分析两人关系。涉及时间节点必须以用户提供的当前浏览器时间为锚点。',
      user: `【你】${info.birthStr} 性别：${info.gender}
【TA】${info.partnerStr} 性别：${info.partnerGender}
【你的日主】${info.dayMaster}
【当前时间】${info.nowStr}（浏览器本地时间，当前年份=${info.nowYear}）

请进行深度姻缘解析：

# 一、命格契合度
[300字：两人日主、喜忌的契合程度]

# 二、天作之合点
[200字：两人最有共鸣的方面]

# 三、潜在摩擦点
[200字：两人容易产生矛盾的方面]

# 四、相处建议
[200字：相处模式的具体建议]

# 五、关系走向
[300字：自 ${info.nowYear} 年起未来 3-5 年两人关系的大致走向]

# 六、重要节点
[200字：两人关系的关键节点（订婚/婚期/危机等）；须写具体公历年份，禁止过时年份]

总字数 1400-1600。`,
    }),
  },
  {
    id: 'career',
    icon: <Career size={22} />,
    accent: 'gold',
    title: '事业合作',
    short: '事业伙伴匹配',
    desc: '与合作伙伴/上司/同事的相性分析',
    needPartner: true,
    inputFields: [
      { key: 'industry', label: '行业', type: 'text', placeholder: '如 互联网/金融/制造业' },
    ],
    buildPrompt: (info) => ({
      system: '你是事业合作关系的命理分析师，从命格互补、五行生克两个维度评估合作潜力。涉及时机必须以用户提供的当前浏览器时间为锚点。',
      user: `【你】${info.birthStr} 性别：${info.gender}
【TA】${info.partnerStr} 性别：${info.partnerGender}
【行业】${info.industry || '未指定'}
【你的日主】${info.dayMaster}
【当前时间】${info.nowStr}（浏览器本地时间，当前年份=${info.nowYear}）

请进行事业合作分析：

# 一、合作契合度
[300字：从命理角度分析两人合作的基础契合度]

# 二、角色分工建议
[200字：根据两人命格特点的最佳角色分工]

# 三、互补优势
[200字：两人能互补的具体方面]

# 四、潜在冲突
[200字：容易产生分歧/冲突的方面]

# 五、合作时机
[300字：最佳合作启动/扩大/收尾时机；须写 ${info.nowYear} 年及之后的具体年份/月份]

# 六、长线建议
[200字：长期合作关系的经营建议]

总字数 1400-1600。`,
    }),
  },
];

export function ToolSquare({ date, shiChenIndex, gender }: Props) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [partnerDate, setPartnerDate] = useState({ date: '1990-01-01', gender: '女' as '男' | '女' });
  const [result, setResult] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);

  const tool = useMemo(() => TOOLS.find(t => t.id === activeTool), [activeTool]);

  // 计算命盘信息（用于 buildPrompt）
  const astrolabe = useMemo(() => {
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return astro.bySolar(dateStr, shiChenIndex, gender, false, 'zh-CN');
  }, [date, shiChenIndex, gender]);

  const bazi = useMemo(() => getBazi(date, shiChenIndex, gender), [date, shiChenIndex, gender]);
  const qimen = useMemo(() => {
    const info = getDateInfo(date, shiChenIndex);
    return buildQimen(date, info.prevJieqi, info.yuan, info.hourGZ.gan);
  }, [date, shiChenIndex]);

  const mingStars = useMemo(() => {
    return (astrolabe.palaces || [])
      .map((p: any) => (p.majorStars || []).map((s: any) => s.name).join(' '))
      .filter(Boolean)
      .join(' / ');
  }, [astrolabe]);

  const wealthStars = useMemo(() => {
    const wealthPalace = (astrolabe.palaces || []).find((p: any) => p.name === '财帛');
    return wealthPalace ? (wealthPalace.majorStars || []).map((s: any) => s.name).join('、') || '空' : '空';
  }, [astrolabe]);

  const studyStars = useMemo(() => {
    const p = (astrolabe.palaces || []).find((p: any) => p.name === '官禄');
    return p ? (p.majorStars || []).map((s: any) => s.name).join('、') || '空' : '空';
  }, [astrolabe]);

  const buildInfo = (): any => {
    const dateInfo = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}时`;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const rangeDays = Math.max(1, Math.min(365, Number.parseInt(String(inputs.range || '30'), 10) || 30));
    const rangeEnd = new Date(now.getTime() + rangeDays * 24 * 60 * 60 * 1000);
    const rangeEndStr = `${rangeEnd.getFullYear()}年${rangeEnd.getMonth() + 1}月${rangeEnd.getDate()}日`;
    return {
      date,
      shiChenIndex,
      gender,
      birthStr: dateInfo,
      now,
      nowYear: now.getFullYear(),
      nowStr,
      rangeEndStr,
      fiveClass: (astrolabe as any).fiveElementsClass,
      mingStars,
      wealthStars,
      studyStars,
      caiXing: bazi.day.hideGan?.join?.(',') || '—',
      fortuneStars: qimen.zhiFu.star + ' / ' + qimen.zhiShi.door,
      dayMaster: (bazi as any).dayMaster || '—',
      partnerStr: partnerDate.date + ' ' + (partnerDate.gender === '男' ? '男' : '女'),
      partnerGender: partnerDate.gender,
      ...inputs,
    };
  };

  async function runTool() {
    if (!tool) return;
    const config = loadAIConfig();
    setLoading(true);
    setResult(null);
    setLocalResult(null);
    setLoadingStage(0);

    // 择日 / 运势：先本地解析，再决定是否调用 AI
    const info = buildInfo();
    let localMarkdown: string | null = null;
    if (tool.id === 'dateSelect') {
      const local = analyzeDateSelectLocal({
        birthDate: date,
        shiChenIndex,
        gender,
        event: info.event || '通用',
        rangeDays: Number.parseInt(String(info.range || '30'), 10) || 30,
        now: info.now,
      });
      info.dateSelectLocal = local;
      localMarkdown = formatDateSelectLocalMarkdown(local);
      setLocalResult(localMarkdown);
    } else if (tool.id === 'fortune') {
      const local = analyzeFortuneLocal({
        birthDate: date,
        shiChenIndex,
        gender,
        period: info.period || '月',
        now: info.now,
      });
      info.fortuneLocal = local;
      localMarkdown = formatFortuneLocalMarkdown(local);
      setLocalResult(localMarkdown);
    }

    if (!canUseAI(config)) {
      // 本地工具即使无 AI 也给出解析；其它工具仍提示配置
      if (localMarkdown) {
        setResult('（未配置可用 AI，以上为本地解析结果。配置平台 AI 或自备 Key 后可生成大师详解。）');
      } else {
        setResult(getAIGateMessage(config));
      }
      setLoading(false);
      setLoadingStage(0);
      return;
    }

    // 4 阶段进度动画
    const t1 = setTimeout(() => setLoadingStage(1), 600);
    const t2 = setTimeout(() => setLoadingStage(2), 1500);
    const t3 = setTimeout(() => setLoadingStage(3), 2400);
    try {
      const { system, user } = tool.buildPrompt(info);
      // 涉及“当前/未来年份”的工具，缓存键必须带上当前年（择日/运势再细到天），避免复用过时年份结果
      const daySensitive = tool.id === 'dateSelect' || tool.id === 'fortune';
      const yearSensitive = daySensitive || tool.id === 'wealth' || tool.id === 'marriage' || tool.id === 'career' || tool.id === 'coreChart' || tool.id === 'kline';
      const todayKey = `${info.now.getFullYear()}-${info.now.getMonth() + 1}-${info.now.getDate()}`;
      const yearKey = String(info.nowYear);
      const cacheKey = daySensitive
        ? `${tool.id}-${todayKey}-v2-${JSON.stringify(inputs)}-${partnerDate.date}-${partnerDate.gender}`
        : yearSensitive
          ? `${tool.id}-${yearKey}-${JSON.stringify(inputs)}-${partnerDate.date}-${partnerDate.gender}`
          : `${tool.id}-${JSON.stringify(inputs)}-${partnerDate.date}-${partnerDate.gender}`;
      const { text } = await callLLMWithCache(
        config,
        [{ role: 'user', content: user }],
        {
          date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`,
          shiChen: shiChenIndex,
          gender,
        },
        cacheKey,
        `tool-${tool.id}`,
        system,
      );
      setResult(typeof text === 'string' ? text : (text as any)?.text || String(text));
    } catch (e: any) {
      setResult(`❌ ${e.message || '请求失败'}`);
    } finally {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setLoading(false);
      setLoadingStage(0);
    }
  }

  return (
    <div className="space-y-3">
      <ScrollCard className="rounded-lg p-3" accent="gold">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Wrench size={20} className="text-gold-bright" />
            <span className="text-gold-bright font-bold tracking-[0.3em] text-base title-display">AI 命理九用</span>
          </div>
          <span className="text-[9px] text-gold/70 tracking-widest title-display border border-gold/30 px-2 py-0.5 rounded-full">
            九 大 功 能
          </span>
        </div>
        <p className="text-[10px] text-gold/70 leading-relaxed tracking-wider">
          以紫微斗数 · 八字四柱 · 奇门遁甲 三盘交叉，<br/>
          奉上场景化、个性化的命理解答。
        </p>
      </ScrollCard>

      {/* 工具网格 */}
      {!activeTool && (
        <div className="grid grid-cols-2 gap-2.5">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTool(t.id);
                setInputs({});
                setResult(null);
                setLocalResult(null);
              }}
              className="group relative text-left transition hover:scale-[1.03] active:scale-95"
            >
              <ScrollCard className="rounded-lg p-3 h-full" accent={t.accent || 'gold'}>
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center border"
                    style={{
                      background: 'linear-gradient(135deg, rgba(200,164,92,0.15) 0%, rgba(200,57,47,0.1) 100%)',
                      borderColor: t.accent === 'vermilion' ? 'rgba(200,57,47,0.5)' : t.accent === 'jade' ? 'rgba(74,122,90,0.5)' : 'rgba(200,164,92,0.5)',
                      color: t.accent === 'vermilion' ? '#e85a48' : t.accent === 'jade' ? '#7aac8a' : '#c8a45c',
                    }}
                  >
                    {t.icon}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="text-gold/30 group-hover:text-gold-bright transition">
                    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1" />
                    <polyline points="10,4 14,8 10,12" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
                <div className="text-rice font-bold title-display text-sm tracking-wider">{t.title}</div>
                <div className="text-[10px] text-gold/70 mt-1 line-clamp-2 leading-relaxed">{t.short}</div>
                {/* 底纹装饰 */}
                <svg className="absolute -bottom-1 -right-1 opacity-10 w-12 h-12 pointer-events-none" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="0.4" fill="none" />
                  <path d="M20 6 A14 14 0 0 1 20 34 A7 7 0 0 1 20 20 A7 7 0 0 0 20 6 Z" fill="currentColor" />
                </svg>
              </ScrollCard>
            </button>
          ))}
        </div>
      )}

      {/* 工具详情 */}
      {tool && (
        <ScrollCard className="rounded-lg p-4 space-y-3" accent={tool.accent || 'gold'}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center border"
                style={{
                  background: 'linear-gradient(135deg, rgba(200,164,92,0.2) 0%, rgba(200,57,47,0.15) 100%)',
                  borderColor: tool.accent === 'vermilion' ? 'rgba(200,57,47,0.6)' : tool.accent === 'jade' ? 'rgba(74,122,90,0.6)' : 'rgba(200,164,92,0.6)',
                  color: tool.accent === 'vermilion' ? '#e85a48' : tool.accent === 'jade' ? '#7aac8a' : '#c8a45c',
                }}
              >
                {tool.icon}
              </div>
              <div>
                <h3 className="text-base text-gold-bright font-bold title-display tracking-widest">{tool.title}</h3>
                <p className="text-[10px] text-gold/70 mt-1 leading-relaxed">{tool.desc}</p>
              </div>
            </div>
            <button
              onClick={() => { setActiveTool(null); setResult(null); setLocalResult(null); setInputs({}); }}
              className="text-[10px] text-gold/60 hover:text-gold-bright tracking-widest title-display px-2 py-1 border border-gold/20 rounded"
            >← 返 回</button>
          </div>

          <div className="divider-gold" />

          {/* 动态输入 */}
          <div className="space-y-2">
            {tool.needPartner && (
              <div className="space-y-2 p-2 bg-ink-soft/40 border border-gold/15 rounded">
                <div className="text-[10px] text-gold opacity-60">对方信息</div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={partnerDate.date}
                    onChange={e => setPartnerDate(p => ({ ...p, date: e.target.value }))}
                    className="flex-1 bg-ink-soft border border-gold/30 rounded px-2 py-1 text-xs text-rice focus:outline-none focus:border-gold-bright"
                  />
                  <select
                    value={partnerDate.gender}
                    onChange={e => setPartnerDate(p => ({ ...p, gender: e.target.value as '男' | '女' }))}
                    className="bg-ink-soft border border-gold/30 rounded px-2 py-1 text-xs text-rice focus:outline-none focus:border-gold-bright"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
              </div>
            )}
            {tool.inputFields?.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] text-gold opacity-70">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={inputs[f.key] || f.options?.[0] || ''}
                    onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-ink-soft border border-gold/30 rounded px-2 py-1.5 text-sm text-rice focus:outline-none focus:border-gold-bright"
                  >
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={inputs[f.key] || ''}
                    onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-ink-soft border border-gold/30 rounded px-2 py-1.5 text-sm text-rice focus:outline-none focus:border-gold-bright"
                  />
                )}
              </div>
            ))}
          </div>

          {loading && (
            <div className="mb-3">
              <LoadingStages stage={loadingStage} />
            </div>
          )}

          <button
            onClick={runTool}
            disabled={loading}
            className="w-full btn-vermilion py-3 rounded text-sm tracking-widest title-display disabled:opacity-50"
          >
            {loading ? <span className="inline-flex items-center justify-center gap-2"><span>✦</span> 大师解读中…</span> : <span className="inline-flex items-center justify-center gap-2">开始 {tool.title}</span>}
          </button>

          {/* K 线动画：仅 kline 工具且不 loading 时显示 */}
          {tool.id === 'kline' && !loading && !result && (
            <div className="mt-3">
              <KLineAnim
                date={date}
                shiChenIndex={shiChenIndex}
                gender={gender}
                onSelectPoint={async (age) => {
                  const config = loadAIConfig();
                  if (!canUseAI(config)) {
                    setResult(getAIGateMessage(config));
                    return;
                  }
                  setLoading(true);
                  setLoadingStage(0);
                  const t1 = setTimeout(() => setLoadingStage(1), 600);
                  const t2 = setTimeout(() => setLoadingStage(2), 1500);
                  const t3 = setTimeout(() => setLoadingStage(3), 2400);
                  try {
                    const { pointToLLMContext, generateKLineData } = await import('../lib/kline');
                    const data = generateKLineData(date, shiChenIndex, gender);
                    const point = data.data.find(p => p.age === age) || data.data[0];
                    const ctx = pointToLLMContext(point,
                      `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
                      gender);
                    const { text } = await callLLMWithCache(
                      config,
                      [{ role: 'user', content: ctx + `

请按以下模块进行专业解读（总字数 600-800）：

# 一、${point.year} 年（${point.ganZhi}）总评
[200字：综合该年的四化影响与四维分数]

# 二、四维详解
- ## 健康：分析该年健康运
- ## 财运：分析该年财运
- ## 官运/事业：分析该年事业
- ## 姻缘/感情：分析该年感情

# 三、关键提示
[150字：该年最需要注意的 2-3 件事]

# 四、当年开运建议
[150字：颜色、方位、活动建议]` }],
                      { date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`, shiChen: shiChenIndex, gender },
                      `kline-年解读-${point.year}-${point.ganZhi}`,
                      'kline-year',
                      '你是精通紫微斗数、八字、奇门遁甲的命理大师，针对某一年进行专业详尽解读。',
                    );
                    setResult(typeof text === 'string' ? text : (text as any)?.text || String(text));
                  } catch (e: any) {
                    setResult(`❌ ${e.message || '请求失败'}`);
                  } finally {
                    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
                    setLoading(false);
                    setLoadingStage(0);
                  }
                }}
              />
            </div>
          )}

          {/* 结果 */}
          {localResult && (
            <div className="paper p-4 bg-ink-soft/60 border border-jade/40 fade-in rounded">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-jade/30">
                <Calendar size={18} className="text-jade" />
                <div className="flex-1">
                  <div className="text-sm text-jade font-bold title-display tracking-widest">
                    本 地 解 析
                  </div>
                  <div className="text-[9px] text-gold/50 tracking-wider">先本地黄历/干支推演，再交由 AI 详批</div>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-rice/90 text-xs leading-relaxed
                [&_h1]:text-sm [&_h1]:text-gold-bright [&_h1]:title-display
                [&_h2]:text-xs [&_h2]:text-gold [&_h2]:title-display
                [&_h3]:text-xs [&_h3]:text-gold/90
                [&_strong]:text-gold-bright
                [&_li]:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{localResult}</ReactMarkdown>
              </div>
            </div>
          )}

          {result && (
            <div className="paper p-4 bg-ink-soft/60 border border-gold/30 fade-in rounded">
              {/* 大师印章头部 */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gold/20">
                <Seal size={20} className="text-vermilion" />
                <div className="flex-1">
                  <div className="text-base text-gold-bright font-bold title-display tracking-widest">
                    大 师 详 解
                  </div>
                  <div className="text-[9px] text-gold/60 title-display tracking-widest mt-0.5">
                    {tool.title} · 奉 上 解 读
                  </div>
                </div>
                <span className="text-[8px] text-gold/40 title-display tracking-widest">
                  已 存 缓 存
                </span>
              </div>

              <div className="text-sm text-rice leading-loose prose prose-invert prose-sm max-w-none
                prose-headings:text-gold-bright prose-headings:font-bold prose-headings:my-2
                prose-h1:text-lg prose-h1:tracking-widest prose-h1:border-b prose-h1:border-gold/30 prose-h1:pb-1
                prose-h2:text-base prose-h2:text-gold-bright prose-h2:tracking-wider prose-h2:mt-3
                prose-h3:text-sm prose-h3:text-gold prose-h3:tracking-wider
                prose-p:my-1.5 prose-p:leading-loose
                prose-ul:my-1 prose-li:my-0.5 prose-li:ml-3
                prose-strong:text-vermilion prose-strong:font-bold
                prose-em:text-jade prose-em:italic
                prose-blockquote:border-l-2 prose-blockquote:border-vermilion prose-blockquote:pl-3 prose-blockquote:text-gold-bright prose-blockquote:not-italic prose-blockquote:my-2
                prose-hr:border-gold/20 prose-hr:my-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </ScrollCard>
      )}
    </div>
  );
}
