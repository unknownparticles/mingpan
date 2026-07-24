/**
 * 小六壬 / 梅花易数 起卦
 * 不需生辰，纯数字或掷硬币即时起卦
 */

// ---- 小六壬 ----
// 6 宫：留连/速喜/赤口/小吉/空亡/病符
// 三爻按"大安、留连、速喜、赤口、小吉、空亡"顺序轮
const XL_NAMES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'];
const XL_MEANINGS: Record<string, { good: boolean; desc: string; career: string; wealth: string; love: string; health: string }> = {
  '大安': { good: true, desc: '安稳平静', career: '事业稳定，稳中有升', wealth: '财稳，宜守不宜攻', love: '感情和顺', health: '平安' },
  '留连': { good: false, desc: '拖延纠结', career: '进展缓慢', wealth: '财路阻滞', love: '暧昧不清', health: '小疾' },
  '速喜': { good: true, desc: '快速应喜', career: '升迁/喜讯', wealth: '财来速', love: '有喜', health: '康健' },
  '赤口': { good: false, desc: '口舌争执', career: '人际冲突', wealth: '破财口舌', love: '争吵', health: '小心外伤' },
  '小吉': { good: true, desc: '小有所成', career: '有进展', wealth: '小财', love: '小甜', health: '小安' },
  '空亡': { good: false, desc: '落空成空', career: '无功而返', wealth: '财空', love: '缘浅', health: '虚耗' },
};

export interface XiaoLiuRen {
  type: 'xiaoLiuRen';
  upper: string;
  middle: string;
  lower: string;
  palace: string;
  isYang: boolean;
  good: boolean;
  desc: string;
  career: string;
  wealth: string;
  love: string;
  health: string;
}

/** 小六壬：月份 + 日 + 时辰 取余 */
export function castXiaoLiuRen(month: number, day: number, hourIndex: number): XiaoLiuRen {
  // 月起大安，月 1 起点
  const start = (month - 1) % 6;  // 0..5
  // 每加 1 日移 1 步
  const mid = (start + (day - 1)) % 6;
  // 每加 1 时辰移 1 步
  const lower = (mid + hourIndex) % 6;
  // 上爻 = 起点
  // 用下爻 5->6 类定阴阳
  const isYang = lower % 2 === 0;

  return {
    type: 'xiaoLiuRen',
    upper: XL_NAMES[start],
    middle: XL_NAMES[mid],
    lower: XL_NAMES[lower],
    palace: XL_NAMES[lower],
    isYang,
    ...XL_MEANINGS[XL_NAMES[lower]],
  };
}

// ---- 梅花易数 ----
// 用三个数字 (1-999)，或掷硬币 (字数 6 爻)
export interface MeiHua {
  type: 'meiHua';
  numbers: [number, number, number];
  upperTrigram: { name: string; symbol: string; fiveElement: string };
  lowerTrigram: { name: string; symbol: string; fiveElement: string };
  benGua: string;          // 本卦名
  upperBinary: number[];   // 6 爻 from 下到上
  lowerBinary: number[];
  dongYao: number;         // 动爻 1-6
  huGua: string;           // 变卦名
  guaCi: string;           // 卦辞
  interpretation: {
    overall: string;
    career: string;
    wealth: string;
    love: string;
    health: string;
  };
}

const TRIGRAMS: { name: string; symbol: string; binary: number[]; fiveElement: string }[] = [
  { name: '乾', symbol: '☰', binary: [1, 1, 1], fiveElement: '金' },
  { name: '兑', symbol: '☱', binary: [1, 1, 0], fiveElement: '金' },
  { name: '离', symbol: '☲', binary: [1, 0, 1], fiveElement: '火' },
  { name: '震', symbol: '☳', binary: [1, 0, 0], fiveElement: '木' },
  { name: '巽', symbol: '☴', binary: [0, 1, 1], fiveElement: '木' },
  { name: '坎', symbol: '☵', binary: [0, 1, 0], fiveElement: '水' },
  { name: '艮', symbol: '☶', binary: [0, 0, 1], fiveElement: '土' },
  { name: '坤', symbol: '☷', binary: [0, 0, 0], fiveElement: '土' },
];

/** 三个数起卦：num1 % 8 = 上卦, num2 % 8 = 下卦, (num1+num2+num3) % 6 = 动爻 */
export function castMeiHua(n1: number, n2: number, n3: number): MeiHua {
  // n1 偶数阴 奇数阳 → 简化为 n%8
  const upperIdx = (n1 % 8 + 8) % 8 || 8;  // 8 视为 8 坤
  const lowerIdx = (n2 % 8 + 8) % 8 || 8;
  const dongYao = (((n1 + n2 + n3) % 6) || 6);  // 1-6

  const upper = TRIGRAMS[upperIdx - 1];
  const lower = TRIGRAMS[lowerIdx - 1];

  // 变卦：动爻变阴变阳
  const huUpper = { ...upper, binary: [...upper.binary] };
  const huLower = { ...lower, binary: [...lower.binary] };
  // 从下往上数爻 1-6：下卦 1-3，上卦 4-6
  if (dongYao <= 3) {
    huLower.binary[dongYao - 1] = 1 - huLower.binary[dongYao - 1];
  } else {
    huUpper.binary[dongYao - 4] = 1 - huUpper.binary[dongYao - 4];
  }
  const huUpperTrigram = TRIGRAMS.find(t => t.binary.every((b, i) => b === huUpper.binary[i]))!;
  const huLowerTrigram = TRIGRAMS.find(t => t.binary.every((b, i) => b === huLower.binary[i]))!;

  const benGua = upper.name + lower.name;
  const huGua = huUpperTrigram.name + huLowerTrigram.name;

  // 简单五行生克判定吉凶
  const cycle: Record<string, number> = { 金: 0, 木: 1, 水: 2, 火: 3, 土: 4 };
  const upperEl = upper.fiveElement;
  const lowerEl = lower.fiveElement;
  // 上克下/下生上 吉
  const upperGenerates = (cycle[upperEl] + 1) % 5 === cycle[lowerEl] || (cycle[upperEl] + 4) % 5 === cycle[lowerEl];
  const isGood = upperGenerates;

  const interp = {
    overall: isGood
      ? `本卦 ${benGua}（${upper.symbol}${lower.symbol}），${upper.fiveElement}上${lower.fiveElement}下，上生下/下生上，气机流通，所谋可成。`
      : `本卦 ${benGua}（${upper.symbol}${lower.symbol}），上下相克，所谋多有阻碍，宜守不宜进。`,
    career: isGood ? '事业有贵人扶持，可大胆推进。' : '事业受阻，宜退守观望，伺机再动。',
    wealth: isGood ? '财运亨通，投资可期。' : '财运不济，避免大额投入。',
    love: isGood ? '感情顺遂，有缘千里来相会。' : '感情多波折，需耐心经营。',
    health: isGood ? '身心康泰。' : '注意调养，避免过劳。',
  };

  return {
    type: 'meiHua',
    numbers: [n1, n2, n3],
    upperTrigram: { name: upper.name, symbol: upper.symbol, fiveElement: upper.fiveElement },
    lowerTrigram: { name: lower.name, symbol: lower.symbol, fiveElement: lower.fiveElement },
    benGua,
    upperBinary: upper.binary,
    lowerBinary: lower.binary,
    dongYao,
    huGua,
    guaCi: `${benGua}卦：${interp.overall}`,
    interpretation: interp,
  };
}

/** 掷三枚硬币自动起卦：硬币按字/背 → 0/1 → 总和 → 爻 */
export function coinToNumbers(_coins?: Array<'yin' | 'yang'>): [number, number, number] {
  // 每次掷币爻的生成：3 阳=老阳(变)9, 2阳1阴=少阳7, 2阴1阳=少阴8, 3阴=老阴(变)6
  // 但简化：每次给 1-9 的随机数让 sum % 6
  const n1 = 1 + Math.floor(Math.random() * 9);
  const n2 = 1 + Math.floor(Math.random() * 9);
  const n3 = 1 + Math.floor(Math.random() * 9);
  return [n1, n2, n3];
}
