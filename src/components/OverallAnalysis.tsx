// 全局综合分析：紫微 + 奇门 + 八字 + 分段动画 + 缓存 + 历史
import { useMemo, useState, useEffect } from 'react';
import { astro } from 'iztro';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { applyZiweiSchool, SCHOOL_NAMES, type ZiweiSchool } from '../lib/ziweiSchool';
import { buildQimen } from '../lib/qimen';
import { getBazi } from '../lib/bazi';
import { getDateInfo } from '../lib/lunar';
import { loadAIConfig } from '../lib/aiInterpret';
import { callLLMWithCache, listRecentCache, deleteCache } from '../lib/cache';
import QueryLoader from './QueryLoader';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
}

const SUGGESTED_QUESTIONS = [
  { icon: '财', text: '我什么时候能发财？哪些年份财运最好？' },
  { icon: '缘', text: '我什么时候会遇到对象？适合什么样的人？' },
  { icon: '势', text: '我今年运势怎么样？事业上要注意什么？' },
  { icon: '健', text: '我的健康要注意什么？什么时候要特别留意？' },
  { icon: '业', text: '我适合从事什么行业？什么方向最适合我？' },
  { icon: '宅', text: '我什么时候适合买房置业？' },
  { icon: '路', text: '我今年适合跳槽/创业/变动吗？' },
  { icon: '亲', text: '我和家人的关系未来几年怎么发展？' },
];

type Stage = 'init' | 'analyze' | 'verify' | 'summary';
type Mode = 'general' | 'custom';

interface ParsedSection {
  id: string;
  type: 'stage' | 'summary';
  title: string;
  body: string;
  // 每段第一行作为小标题，解析为阶段名
  stageName?: string;
}

export default function OverallAnalysis({ date, shiChenIndex, gender }: Props) {
  const [school, setSchool] = useState<ZiweiSchool>('sanhe');
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<ParsedSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<Stage>('init');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playedAll, setPlayedAll] = useState(false);
  const [mode, setMode] = useState<Mode>('general');
  const [cacheHit, setCacheHit] = useState(false);
  const [history, setHistory] = useState<ReturnType<typeof listRecentCache>>([]);

  useEffect(() => {
    setHistory(listRecentCache(10));
  }, [analysis]);

  const data = useMemo(() => {
    applyZiweiSchool(school);
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const astrolabe = astro.bySolar(dateStr, shiChenIndex, gender, true, 'zh-CN');
    const info = getDateInfo(date, shiChenIndex);
    const qimen = buildQimen(date, info.prevJieqi, info.yuan, info.hourGZ.gan);
    const bazi = getBazi(date, shiChenIndex, gender);
    return { astrolabe, qimen, bazi, info };
  }, [date, shiChenIndex, gender, school]);

  const currentYear = new Date().getFullYear();

  // 出生 key for cache
  const birthKey = {
    date: `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`,
    shiChen: shiChenIndex,
    gender,
  };

  function buildPrompt(userQ?: string): { system: string; user: string } {
    const sp = (data.astrolabe as any).surroundedPalaces('命宫');
    const mingZhu = data.astrolabe.palaces.find((p: any) => p.name === '命宫');
    const mingStars = mingZhu?.majorStars?.map((s: any) => `${s.name}${s.mutagen ? `(化${s.mutagen})` : ''}`).join('、') || '空';
    const wealStars = data.astrolabe.palaces.find((p: any) => p.name === '财帛')?.majorStars?.map((s: any) => s.name).join('、') || '空';
    const careerStars = data.astrolabe.palaces.find((p: any) => p.name === '官禄')?.majorStars?.map((s: any) => s.name).join('、') || '空';
    const marryStars = data.astrolabe.palaces.find((p: any) => p.name === '夫妻')?.majorStars?.map((s: any) => s.name).join('、') || '空';
    const daYunStr = data.bazi.daYunList.slice(0, 5).map(dy => `${dy.startAge}岁${dy.ganZhi}(${dy.startYear}年起)`).join(' → ');

    return {
      system: `你是精通紫微斗数、奇门遁甲、八字四柱的命理大师，回答专业、温和、有理有据。必须用 Markdown 格式。`,
      user: `【出生信息】
公历：${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}时
${data.info.yearGZ.full}年 ${data.info.monthGZ.full}月 ${data.info.dayGZ.full}日 ${data.info.hourGZ.full}时
性别：${gender}  流派：${SCHOOL_NAMES[school]}  五行局：${(data.astrolabe as any).fiveElementsClass}
当前年份：${currentYear}年

【紫微盘】命宫主星：${mingStars}
财帛宫：${wealStars}  官禄宫：${careerStars}  夫妻宫：${marryStars}
三方四正（本/对/财/官）：${sp.target.name}/${sp.opposite.name}/${sp.wealth.name}/${sp.career.name}

【奇门盘】${data.qimen.yinYang}遁${data.qimen.ju}局
值符：${data.qimen.zhiFu.star} 落${data.qimen.zhiFu.gong}宫
值使：${data.qimen.zhiShi.door} 落${data.qimen.zhiShi.gong}宫

【八字】${data.bazi.year.full} ${data.bazi.month.full} ${data.bazi.day.full} ${data.bazi.time.full}
日主：${data.bazi.dayMaster}  起运：${data.bazi.startAge}岁
大运：${daYunStr}

${userQ ? `【用户问题】\n${userQ}\n` : ''}
【输出格式】严格按以下 5 段，每段用 ==== 分隔，首行 # 标题：

====

# 一、命格总论（先看盘）
[200字以内：综合三盘判断命主核心特质、整体格局高低]

====

# 二、流年大势（时运分析）
[200字以内：${currentYear}年及未来 3-5 年大运流年走势，分年份给出吉凶]

====

# 三、专题问答
${userQ ? `[350字以内：直接回答用户问题，要给具体年份/时间窗口，结合三盘证据]` : `[300字以内：分析事业财运/感情婚姻/健康/家庭四大主题，分别给出 1-2 个关键年份]`}

====

# 四、趋吉避凶建议
[150字以内：具体的行动指南、适合的方向/颜色/职业、需规避的风险]

====

# 五、综合总结
[150字以内：把前 4 段要点浓缩成 3-5 条金句结论，每条独立成行]

要求：
- 全文 1000-1300 字
- 流年分析必须给具体年份（不要"未来几年可能"）
- 总结用 - 列表形式`,
    };
  }

  // 解析 AI 输出为分段
  function parseOutput(text: string): ParsedSection[] {
    const blocks = text.split('====').map(s => s.trim()).filter(s => s);

    // 提取块信息
    const raw = blocks.map((blk, i) => {
      const lines = blk.split('\n');
      let title = '';
      let body = blk;
      if (lines[0]?.startsWith('#')) {
        title = lines[0].replace(/^#+\s*/, '').trim();
        body = lines.slice(1).join('\n').trim();
      }
      return {
        title: title || `第 ${i + 1} 段`,
        body,
        // 总结特征：标题包含总结/结论/金句/要点，且是最后 1-2 段
        looksSummary: title.includes('总结') || title.includes('结论') || title.includes('金句') || title.includes('要点'),
      };
    });

    // 去重：基于 body 前 80 字符 hash，相同的合并
    const seen = new Set<string>();
    const deduped = raw.filter(r => {
      const key = r.body.replace(/\s+/g, '').slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 限制最多 6 段（5 阶段 + 1 总结）
    const limited = deduped.slice(0, 6);

    // 只保留最后一个总结段：倒数第一个看起来像总结的当作 summary，前面同名的标为 stage
    const sections: ParsedSection[] = [];
    let summaryIdx = -1;
    for (let i = limited.length - 1; i >= 0; i--) {
      if (limited[i].looksSummary) {
        summaryIdx = i;
        break;
      }
    }
    // 前面所有 "总结" 标题的也强制改成普通段
    limited.forEach((r, i) => {
      if (r.looksSummary && i !== summaryIdx) {
        r.looksSummary = false;
        // 改一下标题避免重复
        r.title = r.title.replace(/[总结结论金句要点]/g, '') || `第 ${i + 1} 段`;
      }
    });
    // 如果没有找到 summary 段，把最后一段标记为 summary
    if (summaryIdx === -1 && limited.length > 0) {
      summaryIdx = limited.length - 1;
    }

    limited.forEach((r, i) => {
      sections.push({
        id: `s${i}`,
        type: i === summaryIdx ? 'summary' : 'stage',
        title: r.title,
        body: r.body,
        stageName: r.title,
      });
    });
    return sections;
  }

  async function runAnalysis(userQ?: string) {
    const config = loadAIConfig();
    if (!config.enabled || !config.apiKey) {
      setAnalysis([{
        id: 'err', type: 'stage', title: '配置缺失',
        body: '⚠️ 请先在「设」中配置 API Key 后启用 AI 解读。', stageName: '错误',
      }]);
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setActiveIndex(null);
    setPlayedAll(false);
    setCacheHit(false);

    // 阶段动画推进
    const stages: Stage[] = ['init', 'analyze', 'verify', 'summary'];
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length;
      setLoadingStage(stages[stageIdx]);
    }, 1500);

    try {
      const { system, user } = buildPrompt(userQ);
      const q = userQ?.trim() || '综合解读';
      const { text, cached } = await callLLMWithCache(
        config,
        [{ role: 'user', content: user }],
        birthKey,
        q,
        mode,
        system,
      );
      setCacheHit(cached);
      const sections = parseOutput(text);
      setAnalysis(sections);
      clearInterval(stageTimer);
      setLoadingStage('summary');

      // 逐段播放动画
      for (let i = 0; i < sections.length; i++) {
        setActiveIndex(i);
        await new Promise(r => setTimeout(r, Math.max(3500, sections[i].body.length * 25)));
      }
      // 动画结束：保留 playedAll 状态，不清空 activeIndex（避免视觉回退）
      setPlayedAll(true);
    } catch (e: any) {
      clearInterval(stageTimer);
      setAnalysis([{
        id: 'err', type: 'stage', title: '请求失败',
        body: `❌ ${e.message || '请求失败'}`, stageName: '错误',
      }]);
    } finally {
      clearInterval(stageTimer);
      setLoading(false);
    }
  }

  function useSuggestedQuestion(text: string) {
    setMode('custom');
    setQuestion(text);
  }

  function loadFromHistory(entry: ReturnType<typeof listRecentCache>[number]) {
    const sections = parseOutput(entry.answer);
    setAnalysis(sections);
    setQuestion(entry.question);
    setMode(entry.mode as Mode);
    setActiveIndex(null);
    setPlayedAll(true);
    setCacheHit(true);
  }

  function renderStageAnim(section: ParsedSection, i: number) {
    const isActive = activeIndex === i;
    // isPast：动画播放中（activeIndex 非 null 且 i<activeIndex），或全部播完（playedAll）
    const isPast = (activeIndex !== null && i < activeIndex) || (playedAll && activeIndex === null);
    const isSummary = section.type === 'summary';

    // 解析 body 为标题+列表项
    const lines = section.body.split('\n');
    const elements: { type: 'h' | 'p' | 'li' | 'code' | 'quote'; text: string }[] = [];
    lines.forEach(line => {
      const t = line.trim();
      if (!t) return;
      if (t.startsWith('## ')) elements.push({ type: 'h', text: t.slice(3) });
      else if (t.startsWith('> ')) elements.push({ type: 'quote', text: t.slice(2) });
      else if (t.startsWith('- ') || t.startsWith('* ')) elements.push({ type: 'li', text: t.slice(2) });
      else if (t.startsWith('`')) elements.push({ type: 'code', text: t });
      else elements.push({ type: 'p', text: t });
    });

    return (
      <div
        key={section.id}
        className={`paper p-4 transition-all duration-700 ${
          isSummary
            ? `border-2 ${isActive ? 'border-gold-bright summary-glow scale-[1.01]' : isPast ? 'border-gold/30 opacity-60' : 'border-gold/15'}`
            : `border-l-2 ${
                isActive ? 'border-gold-bright bg-gold/10 scale-[1.005] shadow-[0_0_24px_rgba(230,200,120,0.25)]' :
                isPast ? 'border-gold/20 bg-ink-soft/40 opacity-50' :
                'border-gold/10 bg-ink-soft/60'
              }`
        }`}
      >
        {/* 段标题 + 阶段标签 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isSummary ? (
              <span className={`text-[10px] px-2 py-0.5 rounded title-display tracking-widest ${
                isActive ? 'bg-gold-bright text-ink' : 'bg-gold/20 text-gold-bright border border-gold/30'
              }`}>
                ⑤ 总 结
              </span>
            ) : (
              <span className={`text-[10px] px-2 py-0.5 rounded title-display ${
                isActive ? 'bg-vermilion text-rice' :
                isPast ? 'bg-gold/20 text-gold opacity-60' :
                'bg-gold/10 text-gold opacity-70 border border-gold/20'
              }`}>
                {`${'一二三四五'[i] || (i+1)}`} · 第 {i + 1} 阶段
              </span>
            )}
          </div>
          {isActive && (
            <span className="text-[10px] text-gold-bright title-display tracking-widest flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-bright ssfz-dot" />
              正在播放
            </span>
          )}
        </div>

        <h3 className={`text-base text-gold-bright font-bold mb-2 ${isActive ? 'stage-title-anim' : ''}`}>
          {section.title}
        </h3>

        {/* 内容渲染（分段动画） */}
        <div className="text-sm text-rice leading-relaxed prose prose-invert prose-sm max-w-none
          prose-headings:text-gold-bright prose-headings:font-bold
          prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-1
          prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-1 prose-li:ml-3
          prose-strong:text-vermilion prose-em:text-jade
          prose-blockquote:border-l-vermilion prose-blockquote:pl-3 prose-blockquote:text-gold-bright prose-blockquote:not-italic
          prose-code:text-gold-bright prose-code:bg-ink/40 prose-code:px-1 prose-code:rounded
          ${isSummary ? 'prose-strong:text-gold-bright' : ''}"
        >
          {elements.length > 0 ? (
            elements.map((el, j) => {
              if (!isActive) {
                // 未激活：直接渲染完整 MD
                return (
                  <ReactMarkdown key={j} remarkPlugins={[remarkGfm]}>
                    {section.body}
                  </ReactMarkdown>
                );
              }
              // 激活：逐元素动画
              const delay = j * 200;
              return (
                <div
                  key={j}
                  className="stage-item-anim"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {el.type === 'h' ? <h2>{el.text}</h2> :
                   el.type === 'li' ? <li>{el.text}</li> :
                   el.type === 'p' ? <p>{el.text}</p> :
                   el.type === 'quote' ? <blockquote>{el.text}</blockquote> :
                   <code>{el.text}</code>}
                </div>
              );
            })
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.body}
            </ReactMarkdown>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="paper p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gold-bright font-bold tracking-widest text-base title-display">综合分析</span>
          <span className="text-gold opacity-60">{currentYear}年运势</span>
        </div>
        <div className="divider-gold my-1" />
        <div className="text-[10px] text-gold opacity-70 leading-relaxed">
          融合 <span className="text-gold-bright">紫微</span> · <span className="text-gold-bright">奇门</span> · <span className="text-gold-bright">八字</span> 三盘交叉分析，
          分 <span className="text-gold-bright">5 段</span>（起卦→推演→校验→答疑→总结）动画输出。
        </div>
      </div>

      <div className="paper p-2 flex items-center gap-2 text-xs">
        <span className="text-gold opacity-60">流派：</span>
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

      <div className="paper p-2 flex gap-2 text-xs">
        <button
          className={`flex-1 py-2 rounded ${mode === 'general' ? 'btn-vermilion' : 'btn-ghost'}`}
          onClick={() => setMode('general')}
        >
          <span className="inline-flex items-center justify-center gap-1.5 title-display">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="13" width="3" height="8" rx="0.5" /><rect x="8" y="9" width="3" height="12" rx="0.5" /><rect x="13" y="5" width="3" height="16" rx="0.5" /><rect x="18" y="11" width="3" height="10" rx="0.5" /></svg>
            综合解读
          </span>
        </button>
        <button
          className={`flex-1 py-2 rounded ${mode === 'custom' ? 'btn-vermilion' : 'btn-ghost'}`}
          onClick={() => setMode('custom')}
        >
          <span className="inline-flex items-center justify-center gap-1.5 title-display">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4 H20 V16 H10 L6 20 V16 H4 Z" /><circle cx="9" cy="10" r="0.8" fill="currentColor" /><circle cx="13" cy="10" r="0.8" fill="currentColor" /><circle cx="11" cy="13" r="0.8" fill="currentColor" /></svg>
            提问
          </span>
        </button>
      </div>

      {mode === 'general' && (
        <div className="paper p-3 space-y-3">
          <div className="text-sm text-rice leading-relaxed">
            综合紫微、奇门、八字三盘，按 5 段式（命格→流年→答疑→建议→总结）做系统性分析。
          </div>
          <button
            onClick={() => runAnalysis()}
            disabled={loading}
            className="w-full btn-vermilion py-3 rounded text-base font-bold tracking-widest title-display disabled:opacity-50"
          >
            {loading ? '✦ 推演中...' : '开始综合分析'}
          </button>
        </div>
      )}

      {mode === 'custom' && (
        <div className="paper p-3 space-y-3">
          <div className="text-xs text-gold opacity-70">您想问什么？</div>
          <textarea
            className="w-full bg-ink-soft/60 border border-gold/20 rounded p-2 text-sm text-rice focus:outline-none focus:border-gold-bright resize-none"
            rows={3}
            placeholder="请输入您的问题..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                runAnalysis(question);
              }
            }}
          />
          <button
            onClick={() => runAnalysis(question)}
            disabled={loading || !question.trim()}
            className="w-full btn-vermilion py-2 rounded text-sm tracking-widest title-display disabled:opacity-50"
          >
            {loading ? '✦ 推演中...' : '提问（Cmd+Enter 快捷）'}
          </button>

          <div>
            <div className="text-xs text-gold opacity-60 mb-2">常见问题：</div>
            <div className="space-y-1.5">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => useSuggestedQuestion(q.text)}
                  className="w-full text-left px-2 py-1.5 bg-ink-soft/40 hover:bg-gold/10 border border-gold/15 rounded text-xs text-rice transition"
                >
                  <span className="mr-1">{q.icon}</span>{q.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 缓存命中提示 */}
      {cacheHit && analysis && (
        <div className="paper p-2 text-[10px] text-jade flex items-center gap-2 border border-jade/30">
          <span></span>
          <span>来自本地缓存（30 天内问过同样的问题）</span>
        </div>
      )}

      {/* 历史记录 */}
      {history.length > 0 && !analysis && (
        <div className="paper p-3">
          <div className="text-xs text-gold opacity-60 mb-2 title-display tracking-widest">🕘 历 史 问 答</div>
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2 bg-ink-soft/40 rounded border border-gold/10">
                <button
                  onClick={() => loadFromHistory(h)}
                  className="flex-1 text-left text-xs text-rice"
                >
                  <div className="line-clamp-1">{h.question}</div>
                  <div className="text-[9px] text-gold opacity-50">
                    {new Date(h.createdAt).toLocaleString('zh-CN', { hour12: false })} · {h.mode === 'general' ? '综合' : '提问'}
                  </div>
                </button>
                <button
                  onClick={() => { deleteCache(h.key); setHistory(listRecentCache(10)); }}
                  className="text-vermilion opacity-70 text-xs"
                >删</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 解读结果 */}
      {analysis && analysis.length > 0 && (
        <div className="space-y-3 fade-in">
          <div className="text-[10px] text-gold opacity-60 text-center title-display tracking-widest">
            ✦ 解 读 完 整 流 程 ✦
          </div>
          {analysis.map((s, i) => renderStageAnim(s, i))}
        </div>
      )}

      {/* 加载动画 */}
      <QueryLoader show={loading} stage={loadingStage} />
    </div>
  );
}
