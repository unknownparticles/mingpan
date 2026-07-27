/**
 * 人生 K 线 - 基于真实流年/大运/四化 计算
 *
 * 数据源：
 * - 紫微大限（每 10 年换一个命宫，共 10 大限）
 * - 八字大运（10 年一步，乾造/坤造 顺逆不同）
 * - 流年地支 + 流年四化（基于生年天干）
 * - 命盘 12 宫主星
 *
 * 每 5 岁一个数据点：
 * - 取该年龄段所在大限 + 该点前后 2 个流年的均值
 * - 4 维度（健康/财运/官运/姻缘）分按四化落宫、主星吉凶、宫位作用计算
 */

import { astro } from 'iztro';
import { getBazi } from './bazi';

export type Dimension = 'health' | 'wealth' | 'career' | 'marriage';

export const DIMENSION_NAMES: Record<Dimension, string> = {
  health: '健康',
  wealth: '财运',
  career: '官运',
  marriage: '姻缘',
};

export const DIMENSION_COLORS: Record<Dimension, string> = {
  health: '#7aac8a',
  wealth: '#c8a45c',
  career: '#c8392f',
  marriage: '#d8756a',
};

export interface SiHuaInfo {
  /** 4 化所在的宫位名字（如果为 null 表示该年该化未落入 12 宫） */
  luPalace: string | null;
  quanPalace: string | null;
  kePalace: string | null;
  jiPalace: string | null;
  /** 完整描述：[化名+入宫] 数组 */
  details: string[];
}

export interface DataPoint {
  age: number;
  year: number;
  health: number;
  wealth: number;
  career: number;
  marriage: number;
  // 元信息
  decadeIndex: number;       // 大限序号 0..9
  decadeName: string;         // 大限命宫所在
  ganZhi: string;             // 流年干支
  /** 四化独立信息：与 4 维分脱钩，单独展示 */
  siHua: SiHuaInfo;
  highlights: string[];       // 1-2 句简短注解
}

export interface DimensionSeries {
  dim: Dimension;
  values: number[];
  points: { age: number; value: number }[];
}

// 12 宫位对应的维度权重（宫位四化对四维度影响）
const PALACE_DIM_WEIGHT: Record<string, Partial<Record<Dimension, number>>> = {
  '命宫': { health: 1.0, career: 0.6 },
  '财帛': { wealth: 1.2 },
  '官禄': { career: 1.2 },
  '夫妻': { marriage: 1.2 },
  '疾厄': { health: 1.0 },
  '子女': { marriage: 0.5, health: 0.4 },
  '田宅': { wealth: 0.6, health: 0.4 },
  '交友': { career: 0.5, marriage: 0.4 },
  '兄弟': { health: 0.4, career: 0.5 },
  '父母': { career: 0.5, health: 0.4 },
  '福德': { health: 0.8, marriage: 0.4 },
};

// 主星吉凶对维度的默认权重
const MAJOR_STAR_BASE: Record<string, Partial<Record<Dimension, number>>> = {
  '紫微': { career: 0.4, wealth: 0.3 },
  '天府': { wealth: 0.4, health: 0.3 },
  '太阳': { career: 0.5, marriage: 0.2 },
  '太阴': { wealth: 0.4, marriage: 0.3 },
  '武曲': { wealth: 0.5, career: 0.3 },
  '天同': { health: 0.4, marriage: 0.3 },
  '廉贞': { career: 0.3, marriage: 0.3 },
  '天机': { career: 0.4, health: 0.2 },
  '贪狼': { marriage: 0.4, career: 0.3 },
  '巨门': { career: 0.2, health: -0.2 },
  '天相': { career: 0.3, marriage: 0.3 },
  '天梁': { health: 0.5, career: 0.2 },
  '七杀': { career: 0.4, health: 0.2 },
  '破军': { career: 0.3, wealth: 0.2 },
  '火星': { career: 0.2, health: -0.2 },
  '铃星': { career: 0.2, health: -0.2 },
  '擎羊': { health: -0.3, marriage: -0.2 },
  '陀罗': { career: -0.2, health: -0.2 },
  '禄存': { wealth: 0.6, health: 0.2 },
  '天魁': { career: 0.2, marriage: 0.2 },
  '天钺': { career: 0.2, marriage: 0.2 },
};

// 流年天干 → 四化
const SI_HUA: Record<string, [string, string, string, string]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
};

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getYearGanZhi(year: number): string {
  // 1984 = 甲子年
  const offset = year - 1984;
  const gan = HEAVENLY_STEMS[((offset % 10) + 10) % 10];
  const zhi = EARTHLY_BRANCHES[((offset % 12) + 12) % 12];
  return gan + zhi;
}

function getDecadeInfo(astrolabe: any, age: number, shiChenIndex: number, birthYear: number): { index: number; name: string; palaces: any[] } {
  // iztro 用 targetDate 算流年，decade 从 age 推断
  const targetDate = new Date(birthYear + age - 1, 5, 15, 12, 0, 0);
  const horoscope = astrolabe.horoscope(targetDate, shiChenIndex);
  if (!horoscope || !horoscope.decadal) return { index: 0, name: '命宫', palaces: [] };
  return {
    index: Math.floor((age - 1) / 10),
    name: horoscope.decadal.ming || '命宫',
    palaces: horoscope.decadal.palaces || [],
  };
}

/** 命盘十二宫主星吉凶基础分 */
function basePalaceScore(palaces: any[], dim: Dimension): number {
  let score = 50;  // 基础分
  for (const p of palaces) {
    if (!p) continue;
    const palaceName = p.name;
    const palaceWeight = PALACE_DIM_WEIGHT[palaceName]?.[dim] || 0;
    if (palaceWeight === 0) continue;
    for (const s of p.majorStars || []) {
      const starWeight = MAJOR_STAR_BASE[s.name]?.[dim] || 0;
      if (starWeight !== 0) {
        score += palaceWeight * starWeight * 20;
      }
    }
  }
  return score;
}

/** 紫微四化对各维度的影响 */
/** 计算流年四化：四个化各自落入哪个宫位
 *  与 4 维分脱钩，仅作为独立信息展示
 */
function computeSiHua(ganZhi: string, astrolabe: any): SiHuaInfo {
  const gan = ganZhi[0];
  const sihua = SI_HUA[gan];
  if (!sihua) return { luPalace: null, quanPalace: null, kePalace: null, jiPalace: null, details: [] };
  const [lu, quan, ke, ji] = sihua;
  const result: SiHuaInfo = { luPalace: null, quanPalace: null, kePalace: null, jiPalace: null, details: [] };
  for (const palace of astrolabe.palaces || []) {
    if (!palace.majorStars) continue;
    for (const s of palace.majorStars) {
      if (s.name === lu) { result.luPalace = palace.name; result.details.push(`${lu}化禄入${palace.name}`); }
      else if (s.name === quan) { result.quanPalace = palace.name; result.details.push(`${quan}化权入${palace.name}`); }
      else if (s.name === ke) { result.kePalace = palace.name; result.details.push(`${ke}化科入${palace.name}`); }
      else if (s.name === ji) { result.jiPalace = palace.name; result.details.push(`${ji}化忌入${palace.name}`); }
    }
  }
  return result;
}

/** 八字大运对维度的影响（基于大运天干五行与日主关系） */
function dayunScore(bazi: any, age: number, dim: Dimension): number {
  if (!bazi?.yun) return 0;
  const yun = bazi.yun as any;
  if (!yun.startAge) return 0;
  // 大运数组
  const dayunList: any[] = yun.dayunList || yun.list || [];
  if (dayunList.length === 0) return 0;
  // 找到该年龄所在大运
  const startAge = Number(yun.startAge) || 1;
  const decadeIdx = Math.max(0, Math.floor((age - startAge) / 10));
  const cur = dayunList[decadeIdx];
  if (!cur) return 0;
  const gan = cur.ganZhi?.[0] || cur.gan || '';
  // 五行生克：日主 vs 大运天干
  const dayMasterGan = bazi.day?.gan || '';
  const dayMasterEl = elementOf(dayMasterGan);
  const curEl = elementOf(gan);
  // 简单：生扶为正，克泄为负
  const relationship = relationshipOf(dayMasterEl, curEl);
  let score = 0;
  if (relationship === 'same') score = 3;
  else if (relationship === 'generate') score = 5;  // 大运生日主
  else if (relationship === 'generated') score = -2; // 日主生大运
  else if (relationship === 'control') score = -5;  // 大运克日主
  else if (relationship === 'controlled') score = 4;  // 日主克大运（财）
  // 维度映射
  const dimMap: Record<Dimension, string[]> = {
    health: ['木'],
    wealth: ['金', '土'],
    career: ['火', '土'],
    marriage: ['水', '木'],
  };
  if (dimMap[dim].includes(curEl)) score += 2;
  return score;
}

const ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
function elementOf(gan: string): string {
  return ELEMENTS[gan] || '土';
}
// 五行生克：generate = A 生 B, control = A 克 B
function relationshipOf(a: string, b: string): string {
  if (a === b) return 'same';
  const cycle = ['木', '火', '土', '金', '水'];
  const ai = cycle.indexOf(a);
  const bi = cycle.indexOf(b);
  if (ai === -1 || bi === -1) return 'same';
  // a 生 b: bi = (ai+1) % 5
  if (bi === (ai + 1) % 5) return 'generate';
  if (ai === (bi + 1) % 5) return 'generated';
  if (bi === (ai + 2) % 5) return 'control';
  if (ai === (bi + 2) % 5) return 'controlled';
  return 'same';
}

/** 综合一个年龄点位的 4 维分 */
function calcPoint(age: number, year: number, astrolabe: any, bazi: any, shiChenIndex: number, birthYear: number): DataPoint {
  const decade = getDecadeInfo(astrolabe, age, shiChenIndex, birthYear);
  if (!decade.palaces || decade.palaces.length === 0) {
    (decade as any).palaces = astrolabe.palaces || [];
  }
  // alias for inline
  const usePalaces = decade.palaces;
  void usePalaces;

  const ganZhi = getYearGanZhi(year);
  const dims: Dimension[] = ['health', 'wealth', 'career', 'marriage'];
  const siHua = computeSiHua(ganZhi, astrolabe);
  const point: DataPoint = {
    age, year,
    health: 0, wealth: 0, career: 0, marriage: 0,
    decadeIndex: decade.index,
    decadeName: decade.name,
    ganZhi,
    siHua,
    highlights: [],
  };

  // 4 维分计算 = 主星吉凶 + 大限宫位 + 八字大运
  // 注意：四化不计入总分，仅作为独立信息展示在点位卡中
  for (const dim of dims) {
    const base = basePalaceScore(decade.palaces, dim);
    const dy = dayunScore(bazi, age, dim);
    let total = base + dy;
    // 年龄加成
    if (age >= 30 && age <= 50) total += 4;
    if (age >= 60) total -= 3;
    if (age <= 12) total += 2;
    total = Math.max(2, Math.min(98, Math.round(total)));
    point[dim] = total;
  }

  // 高亮：取 4 维中最高 / 最低的方向
  const maxDim = dims.reduce((m, d) => point[d] > point[m] ? d : m, 'health' as Dimension);
  const minDim = dims.reduce((m, d) => point[d] < point[m] ? d : m, 'health' as Dimension);
  if (point[maxDim] >= 75) {
    point.highlights.push(`${year}年 ${ganZhi}：${DIMENSION_NAMES[maxDim]}较顺`);
  }
  if (point[minDim] <= 35) {
    point.highlights.push(`${year}年：${DIMENSION_NAMES[minDim]}需谨慎`);
  }

  return point;
}

export function generateKLineData(
  date: Date,
  shiChenIndex: number,
  gender: '男' | '女',
): { birthYear: number; data: DataPoint[]; series: DimensionSeries[]; astrolabe: any; bazi: any } {
  const birthYear = date.getFullYear();
  const dateStr = `${birthYear}-${date.getMonth() + 1}-${date.getDate()}`;
  const astrolabe = astro.bySolar(dateStr, shiChenIndex, gender, false, 'zh-CN');
  const bazi = getBazi(date, shiChenIndex, gender);

  // 每年一个节点 → 1..100 岁，便于缩放后逐点查看评分
  const data: DataPoint[] = [];
  for (let age = 1; age <= 100; age += 1) {
    const year = birthYear + age - 1;
    data.push(calcPoint(age, year, astrolabe, bazi, shiChenIndex, birthYear));
  }

  const dims: Dimension[] = ['health', 'wealth', 'career', 'marriage'];
  const series: DimensionSeries[] = dims.map((d) => ({
    dim: d,
    values: data.map((p) => p[d]),
    points: data.map((p) => ({ age: p.age, value: p[d] })),
  }));

  return { birthYear, data, series, astrolabe, bazi };
}

export function clampAge(age: number): number {
  return Math.max(1, Math.min(100, Math.round(age)));
}

export function findPointByAge(data: DataPoint[], age: number): DataPoint {
  const a = clampAge(age);
  return data.find((p) => p.age === a) || data[Math.max(0, Math.min(data.length - 1, a - 1))];
}

/** 分数档位文案 */
export function scoreLevel(v: number): string {
  if (v >= 85) return '极旺';
  if (v >= 70) return '偏旺';
  if (v >= 55) return '平稳';
  if (v >= 40) return '偏弱';
  return '低迷';
}

export function summarizePoint(series: DimensionSeries[], age: number) {
  // 每年一点：索引 = age - 1
  const idx = clampAge(age) - 1;
  return series.map((s) => {
    const cur = s.values[Math.min(idx, s.values.length - 1)] ?? 50;
    const prev = s.values[Math.max(0, idx - 1)] ?? cur;
    const change = cur - prev;
    return {
      dim: s.dim,
      value: cur,
      level: scoreLevel(cur),
      trend: Math.abs(change) < 2 ? 'flat' as const : change > 0 ? 'up' as const : 'down' as const,
      change,
    };
  });
}

/** 格式化点位信息给 LLM 用 */
export function pointToLLMContext(
  point: DataPoint,
  birthStr: string,
  gender: string,
): string {
  const sh = point.siHua;
  const siHuaLines: string[] = [];
  if (sh.luPalace) siHuaLines.push(`- 【化禄】${sh.details.find(d => d.includes('化禄')) || ''} → 宫位主事：${describePalace(sh.luPalace, 'lu')}`);
  if (sh.quanPalace) siHuaLines.push(`- 【化权】${sh.details.find(d => d.includes('化权')) || ''} → 宫位主事：${describePalace(sh.quanPalace, 'quan')}`);
  if (sh.kePalace) siHuaLines.push(`- 【化科】${sh.details.find(d => d.includes('化科')) || ''} → 宫位主事：${describePalace(sh.kePalace, 'ke')}`);
  if (sh.jiPalace) siHuaLines.push(`- 【化忌】${sh.details.find(d => d.includes('化忌')) || ''} → 宫位主事：${describePalace(sh.jiPalace, 'ji')}`);

  return `【生辰】${birthStr}  性别：${gender}

【点击年份】${point.year}（${point.ganZhi}年）  ${point.age} 岁

【所在大限】第 ${point.decadeIndex + 1} 大限（${point.decadeName}宫）

# 一、流年四化（独立分析，与四维分脱钩）
${siHuaLines.length > 0 ? siHuaLines.join('\n') : '- （该年四化未入 12 宫）'}

# 二、该年四维运势分（主星 + 大限宫 + 八字大运 算出）
- 健康：${point.health} 分
- 财运：${point.wealth} 分
- 官运/事业：${point.career} 分
- 姻缘/感情：${point.marriage} 分

# 三、本年提示
${point.highlights.join('；') || '（平稳）'}`;
}

/** 四化落入宫位的影响描述（独立于 4 维分） */
function describePalace(palace: string, type: 'lu' | 'quan' | 'ke' | 'ji'): string {
  const lu: Record<string, string> = {
    '命宫': '心地舒畅，做事顺心', '财帛': '财源广进，利于求财', '官禄': '事业得力，职位提升',
    '夫妻': '感情和美，婚恋顺利', '疾厄': '身体康健，少病少灾', '子女': '子女缘佳，添丁之喜',
    '田宅': '家宅安宁，置业有利', '交友': '贵人相助，人际和睦', '兄弟': '朋友助力，合作顺遂',
    '父母': '长辈庇荫，文书印星', '福德': '精神愉悦，烦恼消解',
  };
  const ji: Record<string, string> = {
    '命宫': '心绪烦乱，做事多阻', '财帛': '破财漏财，守为上', '官禄': '事业受挫，谨防失误',
    '夫妻': '感情纠葛，关系紧张', '疾厄': '注意健康，劳损暗伤', '子女': '操心子女，耗神费力',
    '田宅': '家宅不安，破耗难免', '交友': '人际失和，小人暗中', '兄弟': '手足不睦，竞争激烈',
    '父母': '长辈忧心，文书有变', '福德': '精神内耗，失眠焦虑',
  };
  const quan: Record<string, string> = {
    '命宫': '主见增强，掌舵自己', '财帛': '财运主动，进取可得', '官禄': '权力上身，事业有成',
    '夫妻': '关系主导权在握', '疾厄': '体力充沛，注意过劳', '子女': '对子女有掌控力',
    '田宅': '家宅事务主动推进', '交友': '人脉主导，组局能力强', '兄弟': '团队中当领头者',
    '父母': '对长辈/学业有决定权', '福德': '精神独立，自得其乐',
  };
  const ke: Record<string, string> = {
    '命宫': '名声渐起，贵人赏识', '财帛': '财名双收，稳健获利', '官禄': '声望远播，升迁有望',
    '夫妻': '感情有口皆碑', '疾厄': '小病即愈，恢复良好', '子女': '子女学业出色',
    '田宅': '家宅整洁，布置得体', '交友': '人脉滋润，口碑好', '兄弟': '团队合作愉快',
    '父母': '学业有成，文书顺畅', '福德': '心境平和，愉悦自然',
  };
  return (type === 'lu' ? lu : type === 'ji' ? ji : type === 'quan' ? quan : ke)[palace] || `影响${palace}相关事务`;
}
