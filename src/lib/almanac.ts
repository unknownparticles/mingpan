/**
 * 本地黄历 / 择日 / 运势解析
 * 先算后 AI，避免模型凭空编日期与年份
 */
import { Solar } from 'lunar-javascript';
import { getBazi } from './bazi';
import { getDateInfo, SHI_CHEN } from './lunar';

export type DateSelectEvent = '婚嫁' | '搬家' | '开业' | '签约' | '出行' | '动土' | '祭祀' | string;
export type FortunePeriod = '年' | '月' | '日' | '时' | string;

export interface DayAlmanac {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  weekDay: string;
  yearGZ: string;
  monthGZ: string;
  dayGZ: string;
  dayGan: string;
  dayZhi: string;
  naYin: string;
  shengxiao: string;
  yi: string[];
  ji: string[];
  jiShen: string[];
  xiongSha: string[];
  chong: string;
  chongDesc: string;
  sha: string;
  tianShen: string;
  tianShenType: string; // 黄道/黑道
  tianShenLuck: string; // 吉/凶
  pengZu: string;
  lunarText: string;
}

export interface DayScoreBreakdown {
  eventMatch: number;
  tianShen: number;
  dayMaster: number;
  chong: number;
  xiongSha: number;
  total: number;
  reasons: string[];
  flags: string[];
}

export interface RankedDay {
  almanac: DayAlmanac;
  score: DayScoreBreakdown;
  rank: number;
}

export interface DateSelectLocalResult {
  nowStr: string;
  nowYear: number;
  event: string;
  rangeDays: number;
  rangeEndStr: string;
  birthDayMaster: string;
  birthDayMasterWx: string;
  birthDayZhi: string;
  candidates: RankedDay[];
  avoid: RankedDay[];
  summary: string;
  promptBlock: string;
}

export interface FortuneLocalResult {
  period: FortunePeriod;
  nowStr: string;
  nowYear: number;
  focusLabel: string;
  focusGZ: string;
  dayMaster: string;
  dayMasterWx: string;
  currentDaYun?: string;
  currentDaYunYears?: string;
  almanac?: DayAlmanac;
  timeYi?: string[];
  timeJi?: string[];
  highlights: string[];
  cautions: string[];
  summary: string;
  promptBlock: string;
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const GAN_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const ZHI_WX: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// 六冲
const CHONG_PAIR: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

// 日主喜生/同我偏助，克我偏忌（简化）
const WX_SHENG: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }; // 生我
const WX_WO_SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WX_KE: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }; // 克我
const WX_WO_KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

const EVENT_YI_KEYS: Record<string, string[]> = {
  婚嫁: ['嫁娶', '订婚', '纳采', '冠笄', '合婚'],
  搬家: ['移徙', '入宅', '安床', '安门', '修造'],
  开业: ['开市', '开业', '立券', '交易', '纳财'],
  签约: ['立券', '交易', '签约', '纳财', '会亲友'],
  出行: ['出行', '移徙', '远行', '会亲友'],
  动土: ['动土', '破土', '修造', '竖柱', '上梁', '开池'],
  祭祀: ['祭祀', '祈福', '求嗣', '开光', '酬神'],
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatNowStr(d = new Date()): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function arr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [String(v)].filter(Boolean);
}

/** 单日黄历本地解析 */
export function getDayAlmanac(date: Date): DayAlmanac {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lunar = solar.getLunar();
  const dayGZ = lunar.getDayInGanZhi();
  return {
    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    dateStr: formatDateStr(date),
    weekDay: WEEK[date.getDay()],
    yearGZ: lunar.getYearInGanZhi(),
    monthGZ: lunar.getMonthInGanZhi(),
    dayGZ,
    dayGan: dayGZ[0],
    dayZhi: dayGZ[1],
    naYin: lunar.getDayNaYin?.() || '',
    shengxiao: lunar.getDayShengXiao?.() || '',
    yi: arr(lunar.getDayYi?.()),
    ji: arr(lunar.getDayJi?.()),
    jiShen: arr(lunar.getDayJiShen?.()),
    xiongSha: arr(lunar.getDayXiongSha?.()),
    chong: lunar.getDayChong?.() || '',
    chongDesc: lunar.getDayChongDesc?.() || '',
    sha: lunar.getDaySha?.() || '',
    tianShen: lunar.getDayTianShen?.() || '',
    tianShenType: lunar.getDayTianShenType?.() || '',
    tianShenLuck: lunar.getDayTianShenLuck?.() || '',
    pengZu: [lunar.getPengZuGan?.(), lunar.getPengZuZhi?.()].filter(Boolean).join('；'),
    lunarText: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
  };
}

function eventKeys(event: string): string[] {
  return EVENT_YI_KEYS[event] || [event];
}

function matchAny(list: string[], keys: string[]): string[] {
  return list.filter(item => keys.some(k => item.includes(k) || k.includes(item)));
}

function scoreDayVsBirth(
  almanac: DayAlmanac,
  birthDayMaster: string,
  birthDayZhi: string,
  event: string,
): DayScoreBreakdown {
  const reasons: string[] = [];
  const flags: string[] = [];
  let eventMatch = 0;
  let tianShen = 0;
  let dayMaster = 0;
  let chong = 0;
  let xiongSha = 0;

  const keys = eventKeys(event);
  const yiHit = matchAny(almanac.yi, keys);
  const jiHit = matchAny(almanac.ji, keys);
  if (yiHit.length) {
    eventMatch += 28;
    reasons.push(`黄历宜：${yiHit.slice(0, 3).join('、')}`);
    flags.push('宜事');
  }
  if (jiHit.length) {
    eventMatch -= 32;
    reasons.push(`黄历忌：${jiHit.slice(0, 3).join('、')}`);
    flags.push('忌事');
  }
  if (!yiHit.length && !jiHit.length) {
    eventMatch += 4;
    reasons.push('黄历对该事项无明确宜忌');
  }

  if (almanac.tianShenLuck === '吉' || almanac.tianShenType === '黄道') {
    tianShen += 18;
    reasons.push(`${almanac.tianShenType || '天神'}${almanac.tianShen}（${almanac.tianShenLuck || '偏吉'}）`);
    flags.push('黄道');
  } else if (almanac.tianShenLuck === '凶' || almanac.tianShenType === '黑道') {
    tianShen -= 14;
    reasons.push(`${almanac.tianShenType || '天神'}${almanac.tianShen}（${almanac.tianShenLuck || '偏凶'}）`);
    flags.push('黑道');
  }

  const dmWx = GAN_WX[birthDayMaster] || '';
  const dayGanWx = GAN_WX[almanac.dayGan] || '';
  const dayZhiWx = ZHI_WX[almanac.dayZhi] || '';
  if (dmWx && dayGanWx) {
    if (dayGanWx === dmWx || dayGanWx === WX_SHENG[dmWx]) {
      dayMaster += 16;
      reasons.push(`日干${almanac.dayGan}(${dayGanWx}) 助日主${birthDayMaster}(${dmWx})`);
      flags.push('助身');
    } else if (dayGanWx === WX_KE[dmWx]) {
      dayMaster -= 14;
      reasons.push(`日干${almanac.dayGan}(${dayGanWx}) 克日主${birthDayMaster}(${dmWx})`);
      flags.push('克身');
    } else if (dayGanWx === WX_WO_KE[dmWx] || dayGanWx === WX_WO_SHENG[dmWx]) {
      dayMaster += 6;
      reasons.push(`日干${almanac.dayGan} 与日主关系平和`);
    }
  }
  if (dmWx && dayZhiWx) {
    if (dayZhiWx === dmWx || dayZhiWx === WX_SHENG[dmWx]) dayMaster += 6;
    if (dayZhiWx === WX_KE[dmWx]) dayMaster -= 6;
  }

  if (birthDayZhi && (CHONG_PAIR[birthDayZhi] === almanac.dayZhi || almanac.chong === birthDayZhi)) {
    chong -= 22;
    reasons.push(`冲日支：生辰日支${birthDayZhi} 与当日${almanac.dayZhi}相冲（${almanac.chongDesc || almanac.chong}）`);
    flags.push('冲日');
  }

  if (almanac.xiongSha.length) {
    xiongSha -= Math.min(18, almanac.xiongSha.length * 6);
    reasons.push(`凶煞：${almanac.xiongSha.slice(0, 3).join('、')}`);
    flags.push('凶煞');
  }
  if (almanac.jiShen.length) {
    xiongSha += Math.min(10, almanac.jiShen.length * 2);
    reasons.push(`吉神：${almanac.jiShen.slice(0, 3).join('、')}`);
  }

  const total = eventMatch + tianShen + dayMaster + chong + xiongSha;
  return { eventMatch, tianShen, dayMaster, chong, xiongSha, total, reasons, flags };
}

/** 本地择日：扫描未来 N 天并打分排序 */
export function analyzeDateSelectLocal(opts: {
  birthDate: Date;
  shiChenIndex: number;
  gender: '男' | '女';
  event?: string;
  rangeDays?: number;
  now?: Date;
}): DateSelectLocalResult {
  const now = opts.now ?? new Date();
  const rangeDays = Math.max(1, Math.min(365, Number(opts.rangeDays) || 30));
  const event = opts.event || '通用';
  const bazi = getBazi(opts.birthDate, opts.shiChenIndex, opts.gender);
  const birthDayMaster = bazi.dayMaster;
  const birthDayMasterWx = bazi.dayMasterWuxing || GAN_WX[birthDayMaster] || '';
  const birthDayZhi = bazi.day.zhi;

  const ranked: RankedDay[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const almanac = getDayAlmanac(d);
    const score = scoreDayVsBirth(almanac, birthDayMaster, birthDayZhi, event);
    ranked.push({ almanac, score, rank: 0 });
  }
  ranked.sort((a, b) => b.score.total - a.score.total);
  ranked.forEach((r, i) => { r.rank = i + 1; });

  const candidates = ranked.filter(r => r.score.total >= 8).slice(0, 8);
  const top = candidates.length ? candidates : ranked.slice(0, 5);
  const avoid = [...ranked].sort((a, b) => a.score.total - b.score.total).slice(0, 5);

  const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + rangeDays - 1);
  const summary = `本地已扫描 ${rangeDays} 天（${formatDateStr(now)} ~ ${formatDateStr(rangeEnd)}），事项「${event}」，日主${birthDayMaster}(${birthDayMasterWx})。优选 ${top.length} 日，避忌 ${avoid.length} 日。`;

  const candLines = top.map((r, i) => {
    const a = r.almanac;
    return `${i + 1}. ${a.dateStr} 周${a.weekDay} ${a.dayGZ} 分${r.score.total} [${r.score.flags.join('/')||'平'}]
   宜:${a.yi.slice(0,6).join('、')||'—'} | 忌:${a.ji.slice(0,4).join('、')||'—'}
   天神:${a.tianShenType}${a.tianShen}(${a.tianShenLuck}) 冲:${a.chongDesc||a.chong||'—'}
   理由:${r.score.reasons.slice(0,3).join('；')}`;
  }).join('\n');

  const avoidLines = avoid.map((r, i) => {
    const a = r.almanac;
    return `${i + 1}. ${a.dateStr} 周${a.weekDay} ${a.dayGZ} 分${r.score.total} [${r.score.flags.join('/')||'平'}] 原因:${r.score.reasons.slice(0,2).join('；')}`;
  }).join('\n');

  const promptBlock = `【本地择日解析（必须以此为唯一日期依据，禁止编造未列出的日期）】
当前时间：${formatNowStr(now)}  当前年：${now.getFullYear()}
事项：${event}
扫描范围：未来 ${rangeDays} 天（${formatDateStr(now)} 至 ${formatDateStr(rangeEnd)}）
命主日主：${birthDayMaster}（${birthDayMasterWx}） 日支：${birthDayZhi}
${summary}

【本地优选日（已按评分排序）】
${candLines}

【本地避忌日】
${avoidLines}

要求：AI 只能从以上本地日期中挑选并解释，不得新增列表外日期，不得改用过时年份。`;

  return {
    nowStr: formatNowStr(now),
    nowYear: now.getFullYear(),
    event,
    rangeDays,
    rangeEndStr: formatDateStr(rangeEnd),
    birthDayMaster,
    birthDayMasterWx,
    birthDayZhi,
    candidates: top,
    avoid,
    summary,
    promptBlock,
  };
}

function findCurrentDaYun(bazi: ReturnType<typeof getBazi>, year: number) {
  const list = bazi.daYunList || [];
  if (!list.length) return undefined;
  let cur = list[0];
  for (const dy of list) {
    if (dy.startYear <= year) cur = dy;
    else break;
  }
  const next = list.find(d => d.startYear > cur.startYear);
  return {
    ganZhi: cur.ganZhi,
    startYear: cur.startYear,
    endYear: next ? next.startYear - 1 : cur.startYear + 9,
    startAge: cur.startAge,
  };
}

/** 本地运势：按年/月/日/时解析 */
export function analyzeFortuneLocal(opts: {
  birthDate: Date;
  shiChenIndex: number;
  gender: '男' | '女';
  period?: FortunePeriod;
  now?: Date;
}): FortuneLocalResult {
  const now = opts.now ?? new Date();
  const period = (opts.period || '月') as FortunePeriod;
  const bazi = getBazi(opts.birthDate, opts.shiChenIndex, opts.gender);
  const info = getDateInfo(now);
  const dayAl = getDayAlmanac(now);
  const daYun = findCurrentDaYun(bazi, now.getFullYear());
  const highlights: string[] = [];
  const cautions: string[] = [];

  let focusLabel = '';
  let focusGZ = '';
  let timeYi: string[] | undefined;
  let timeJi: string[] | undefined;

  if (period === '年') {
    focusLabel = `${now.getFullYear()}年`;
    focusGZ = info.yearGZ.full;
    highlights.push(`流年干支 ${focusGZ}`);
    if (daYun) {
      highlights.push(`当前大运 ${daYun.ganZhi}（${daYun.startYear}-${daYun.endYear}，约${daYun.startAge}岁起）`);
    }
    const yWx = GAN_WX[info.yearGZ.gan] || '';
    const dmWx = bazi.dayMasterWuxing || GAN_WX[bazi.dayMaster] || '';
    if (yWx && dmWx) {
      if (yWx === dmWx || yWx === WX_SHENG[dmWx]) highlights.push(`流年天干${info.yearGZ.gan}(${yWx}) 助日主`);
      if (yWx === WX_KE[dmWx]) cautions.push(`流年天干${info.yearGZ.gan}(${yWx}) 克日主，宜稳守`);
    }
    if (CHONG_PAIR[bazi.day.zhi] === info.yearGZ.zhi) {
      cautions.push(`流年地支${info.yearGZ.zhi} 冲日支${bazi.day.zhi}`);
    }
  } else if (period === '月') {
    focusLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    focusGZ = info.monthGZ.full;
    highlights.push(`流月干支 ${focusGZ}`);
    if (daYun) highlights.push(`仍行大运 ${daYun.ganZhi}`);
    const mWx = GAN_WX[info.monthGZ.gan] || '';
    const dmWx = bazi.dayMasterWuxing || GAN_WX[bazi.dayMaster] || '';
    if (mWx && dmWx) {
      if (mWx === dmWx || mWx === WX_SHENG[dmWx]) highlights.push(`月干助身`);
      if (mWx === WX_KE[dmWx]) cautions.push(`月干克身，事务宜缓`);
    }
  } else if (period === '时') {
    focusLabel = `${formatDateStr(now)} ${info.shiChenName}时`;
    focusGZ = info.hourGZ.full;
    const solar = Solar.fromDate(now);
    const lunar = solar.getLunar();
    timeYi = arr(lunar.getTimeYi?.());
    timeJi = arr(lunar.getTimeJi?.());
    highlights.push(`时柱 ${focusGZ}（${info.shiChenName}时 ${SHI_CHEN[info.shiChenIndex].range}）`);
    if (timeYi?.length) highlights.push(`时宜：${timeYi.slice(0, 5).join('、')}`);
    if (timeJi?.length) cautions.push(`时忌：${timeJi.slice(0, 5).join('、')}`);
  } else {
    // 日
    focusLabel = dayAl.dateStr;
    focusGZ = dayAl.dayGZ;
    highlights.push(`日柱 ${dayAl.dayGZ} · ${dayAl.lunarText} · 周${dayAl.weekDay}`);
    highlights.push(`天神 ${dayAl.tianShenType}${dayAl.tianShen}（${dayAl.tianShenLuck}）`);
    if (dayAl.yi.length) highlights.push(`宜：${dayAl.yi.slice(0, 6).join('、')}`);
    if (dayAl.ji.length) cautions.push(`忌：${dayAl.ji.slice(0, 5).join('、')}`);
    if (dayAl.xiongSha.length) cautions.push(`凶煞：${dayAl.xiongSha.join('、')}`);
    if (CHONG_PAIR[bazi.day.zhi] === dayAl.dayZhi) cautions.push(`日支冲动：生辰${bazi.day.zhi} 冲今日${dayAl.dayZhi}`);
    const score = scoreDayVsBirth(dayAl, bazi.dayMaster, bazi.day.zhi, '通用');
    highlights.push(`本地综合分 ${score.total}（${score.flags.join('/') || '平'}）`);
  }

  const summary = `本地${period}运势锚点：${focusLabel}（${focusGZ}），日主${bazi.dayMaster}。亮点${highlights.length}条，注意${cautions.length}条。`;

  const promptBlock = `【本地运势解析（必须以此为时间与事实依据，禁止编造未给出的干支/日期）】
当前时间：${formatNowStr(now)}  当前年：${now.getFullYear()}
粒度：${period}
焦点：${focusLabel}  干支：${focusGZ}
命主日主：${bazi.dayMaster}（${bazi.dayMasterWuxing || GAN_WX[bazi.dayMaster] || ''}）
四柱：${bazi.year.full} ${bazi.month.full} ${bazi.day.full} ${bazi.time.full}
${daYun ? `当前大运：${daYun.ganZhi}（${daYun.startYear}-${daYun.endYear}）` : ''}
${period === '日' || period === '时' ? `当日黄历：${dayAl.dayGZ} 宜[${dayAl.yi.slice(0,8).join('、')}] 忌[${dayAl.ji.slice(0,6).join('、')}] 天神${dayAl.tianShenType}${dayAl.tianShen}` : ''}
${period === '时' ? `时宜[${(timeYi||[]).join('、')||'—'}] 时忌[${(timeJi||[]).join('、')||'—'}]` : ''}

【本地亮点】
${highlights.map((h, i) => `${i + 1}. ${h}`).join('\n') || '1. 暂无特显'}

【本地注意】
${cautions.map((h, i) => `${i + 1}. ${h}`).join('\n') || '1. 暂无特显风险'}

${summary}
要求：AI 只能基于以上本地解析做展开说明，年份/月份/日期必须与当前时间一致，不得改写干支。`;

  return {
    period,
    nowStr: formatNowStr(now),
    nowYear: now.getFullYear(),
    focusLabel,
    focusGZ,
    dayMaster: bazi.dayMaster,
    dayMasterWx: bazi.dayMasterWuxing || GAN_WX[bazi.dayMaster] || '',
    currentDaYun: daYun?.ganZhi,
    currentDaYunYears: daYun ? `${daYun.startYear}-${daYun.endYear}` : undefined,
    almanac: period === '日' || period === '时' ? dayAl : undefined,
    timeYi,
    timeJi,
    highlights,
    cautions,
    summary,
    promptBlock,
  };
}

/** 把本地结果压成可读短文（UI） */
export function formatDateSelectLocalMarkdown(r: DateSelectLocalResult): string {
  const lines = [
    `### 本地择日结果`,
    r.summary,
    '',
    `#### 优选日`,
    ...r.candidates.map((c, i) => {
      const a = c.almanac;
      return `${i + 1}. **${a.dateStr}（周${a.weekDay} ${a.dayGZ}）** 评分 ${c.score.total}\n   - 标志：${c.score.flags.join('、') || '平'}\n   - 宜：${a.yi.slice(0, 6).join('、') || '—'}\n   - 忌：${a.ji.slice(0, 4).join('、') || '—'}\n   - 理由：${c.score.reasons.slice(0, 3).join('；')}`;
    }),
    '',
    `#### 避忌日`,
    ...r.avoid.map((c, i) => ` ${i + 1}. ${c.almanac.dateStr} ${c.almanac.dayGZ}（${c.score.total}分）— ${c.score.reasons.slice(0, 2).join('；')}`),
  ];
  return lines.join('\n');
}

export function formatFortuneLocalMarkdown(r: FortuneLocalResult): string {
  return [
    `### 本地${r.period}运势`,
    r.summary,
    '',
    `**焦点**：${r.focusLabel}（${r.focusGZ}）`,
    r.currentDaYun ? `**大运**：${r.currentDaYun}（${r.currentDaYunYears}）` : '',
    '',
    '#### 亮点',
    ...r.highlights.map((h, i) => `${i + 1}. ${h}`),
    '',
    '#### 注意',
    ...r.cautions.map((h, i) => `${i + 1}. ${h}`),
  ].filter(Boolean).join('\n');
}

export function buildDivinationPrompt(result: {
  type: 'meiHua' | 'xiaoLiuRen';
  data: any;
  question?: string;
}): { system: string; user: string } {
  const now = new Date();
  const nowStr = formatNowStr(now);
  if (result.type === 'meiHua') {
    const d = result.data;
    return {
      system: '你是精通梅花易数的易学老师。只能基于用户提供的本地起卦结果解读，不得改卦、不得另起卦。语气专业温和。',
      user: `【当前时间】${nowStr}
【所问】${result.question || '未题所问，作整体趋势看'}
【本地起卦（已成卦，禁止改动）】
起卦数：${(d.numbers || []).join('、')}
本卦：${d.benGua}（上${d.upperTrigram?.name}${d.upperTrigram?.symbol}/${d.upperTrigram?.fiveElement}，下${d.lowerTrigram?.name}${d.lowerTrigram?.symbol}/${d.lowerTrigram?.fiveElement}）
动爻：第 ${d.dongYao} 爻
变卦：${d.huGua}
本地粗解：${d.guaCi || d.interpretation?.overall || ''}
本地分项：事=${d.interpretation?.career || ''}；财=${d.interpretation?.wealth || ''}；情=${d.interpretation?.love || ''}；健=${d.interpretation?.health || ''}

请按以下结构输出：
# 一、卦象总断
# 二、本卦与动爻
# 三、变卦指向
# 四、所问专断（若无所问则给行动建议）
# 五、注意事项
总字数 600-900，用 Markdown。`,
    };
  }

  const d = result.data;
  return {
    system: '你是精通小六壬的术数老师。只能基于用户提供的本地起课结果解读，不得改宫位。语气专业温和。',
    user: `【当前时间】${nowStr}
【所问】${result.question || '未题所问，作整体趋势看'}
【本地起课（已成课，禁止改动）】
初限/月：${d.upper}
中限/日：${d.middle}
末限/时：${d.lower}
落宫：${d.palace}（${d.good ? '偏吉' : '偏凶'} · ${d.desc || ''}）
分项：事=${d.career || ''}；财=${d.wealth || ''}；情=${d.love || ''}；健=${d.health || ''}
时辰：${d.hour != null ? d.hour : d.month != null ? `月${d.month} 日${d.day}` : ''} ${d.shiChen || ''}

请按以下结构输出：
# 一、课体总断
# 二、三传（初中末）含义
# 三、落宫专论
# 四、所问专断（若无所问则给行动建议）
# 五、趋吉建议
总字数 500-800，用 Markdown。`,
  };
}
