// 奇门遁甲 排盘核心算法
// 支持：时家奇门、转盘、拆补法

export type YinYang = '阳' | '阴';
export type Ju = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Element = '木' | '火' | '土' | '金' | '水';

// 九宫序（洛书位）：1巽 2兑 3离 4震 5中 6坎 7坤 8艮 9乾
// 但九宫传统盘位按：戴九履一、左三右七、二四为肩、六八为足、五十居中
// 盘面从 4 宫开始逆时针：4(巽)→9(离)→2(坤)→7(兑)→3(震)→5(中)→8(艮)→1(坎)→6(乾)
// 在 layout 上对应：左下(4)、左上(9)、上(2)、右上(7)、左(3)、中(5)、右(8)、左下下(1)、右下(6)

export const GONG_NAMES: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
};
export const GONG_WUXING: Record<number, Element> = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
};
export const GONG_ELEMENT: Record<Element, number[]> = {
  木: [3, 4], 火: [9], 土: [2, 5, 8], 金: [6, 7], 水: [1],
};

// 九星
export const NINE_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'] as const;
export type NineStar = typeof NINE_STARS[number];
// 原始九星宫位（阳遁顺序，1-9）：天蓬在1、天芮在2、...、天英在9
export const STAR_NATURE: Record<NineStar, string> = {
  天蓬: '凶', 天芮: '凶', 天冲: '小吉', 天辅: '小吉', 天禽: '中',
  天心: '吉', 天柱: '小凶', 天任: '小吉', 天英: '小吉',
};

// 八门
export const EIGHT_DOORS = ['休', '生', '伤', '杜', '景', '死', '惊', '开'] as const;
export type EightDoor = typeof EIGHT_DOORS[number];
export const DOOR_NATURE: Record<EightDoor, string> = {
  休: '吉', 生: '吉', 伤: '小凶', 杜: '中', 景: '小凶', 死: '凶', 惊: '凶', 开: '吉',
};

// 八神
export const EIGHT_GODS = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'] as const;
export type EightGod = typeof EIGHT_GODS[number];

// 三奇六仪（阳遁顺布顺序：戊己庚辛壬癸丁丙乙）
export const SANQI_LIUYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;
export const SANQI = ['乙', '丙', '丁'] as const;
export const LIUYI = ['戊', '己', '庚', '辛', '壬', '癸'] as const;

// 节气用局（阳遁歌诀）
// 冬至、惊蛰一七四，小寒二八五，大寒、春分三九六，
// 雨水九六三，清明、立夏四一七，立春八五二，谷雨、小满五二八，芒种六三九。
const YANG_JU_TABLE: Record<string, [number, number, number]> = {
  '冬至': [1, 7, 4], '小寒': [2, 8, 5], '大寒': [3, 9, 6], '立春': [8, 5, 2],
  '雨水': [9, 6, 3], '惊蛰': [1, 7, 4], '春分': [3, 9, 6], '清明': [4, 1, 7],
  '谷雨': [5, 2, 8], '立夏': [4, 1, 7], '小满': [5, 2, 8], '芒种': [6, 3, 9],
};

// 节气用局（阴遁歌诀）
// 夏至、白露九三六，小暑八二五，大暑、秋分七一四，
// 立秋二五八，寒露、立冬六九三，处暑一四七，霜降、小雪五八二，大雪四七一。
const YIN_JU_TABLE: Record<string, [number, number, number]> = {
  '夏至': [9, 3, 6], '小暑': [8, 2, 5], '大暑': [7, 1, 4], '立秋': [2, 5, 8],
  '处暑': [1, 4, 7], '白露': [9, 3, 6], '秋分': [7, 1, 4], '寒露': [6, 9, 3],
  '霜降': [5, 8, 2], '立冬': [6, 9, 3], '小雪': [5, 8, 2], '大雪': [4, 7, 1],
};

// 24节气顺序
const JIEQI_ORDER = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
  '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
];

// 阳遁：冬至后开始；阴遁：夏至后开始
function isYang(jieqi: string): boolean {
  // 冬至到芒种末为阳遁
  const idx = JIEQI_ORDER.indexOf(jieqi);
  if (idx === -1) return true;
  // idx 0-11 阳；12-23 阴
  return idx < 12;
}

// ====== 用局法策略 ======
// 拆补法：传统排法，在哪个节气就按表取三元中的哪一元
// 茅山法：同上，但以时家奇门为准则，不受超神接气影响
// 均分法：原创，按节气实际时长均分三元

export type QimenMethod = 'chaiBu' | 'maoShan' | 'junFen';

export function getYuanForJieQi(
  _jieqi: string,
  dayZhi: string,
  method: QimenMethod,
): 0 | 1 | 2 {
  if (method === 'chaiBu' || method === 'maoShan') {
    // 拆补/茅山：交节定元，按日支判断
    if (['子', '午', '卯', '酉'].includes(dayZhi)) return 0; // 上元
    if (['寅', '申', '巳', '亥'].includes(dayZhi)) return 1; // 中元
    return 2; // 下元（辰戌丑未）
  }
  // 均分法：同样规则（节气内三元按日支轮转）
  if (['子', '午', '卯', '酉'].includes(dayZhi)) return 0;
  if (['寅', '申', '巳', '亥'].includes(dayZhi)) return 1;
  return 2;
}

export const QIMEN_METHOD_NAMES: Record<QimenMethod, string> = {
  chaiBu: '拆补法',
  maoShan: '茅山法',
  junFen: '均分法',
};


// 甲子戊定位：阳遁从几宫起，阴遁从几宫起
// 阳遁起宫：局数；阴遁起宫：10 - 局数
// 戊落宫 = 起宫
function getStartingGong(ju: Ju, yinYang: YinYang): number {
  if (yinYang === '阳') return ju;
  return 10 - ju;
}

// 三奇六仪布地盘：戊起宫阳遁顺飞/阴遁逆飞
function buildDiPan(ju: Ju, yinYang: YinYang): Record<number, string> {
  const start = getStartingGong(ju, yinYang);
  const dipan: Record<number, string> = {};
  const gongOrder = [1, 8, 3, 4, 9, 2, 7, 6]; // 洛书轨迹：戴九履一起
  // 起点位置在 gongOrder 中对应哪个宫
  const startIdx = gongOrder.indexOf(start);
  for (let i = 0; i < 9; i++) {
    const gong = gongOrder[(startIdx + i) % 8];
    dipan[gong] = SANQI_LIUYI[i];
  }
  // 中5宫寄宫
  // 阳遁寄坤(2)，阴遁寄艮(8)
  dipan[5] = dipan[yinYang === '阳' ? 2 : 8];
  return dipan;
}

// 时干支 → 确定值符/值使
// 值符 = 时干所在宫的天盘星（要等天盘排完后才知道）
// 值使 = 时干所在宫的八门（要等八门排完后才知道）
// 步骤：
// 1. 找时干在地盘哪个宫
// 2. 该宫原始位置 = 值符星原始宫（按阳遁：1天蓬,2天芮,...,9天英）
// 3. 转盘时该星飞入时干所在宫
// 4. 同时八门也转：值使门（休门在1宫原始）飞入时干所在宫

// 找时干在地盘哪个宫
function findShiGanGong(dipan: Record<number, string>, shiGan: string): number {
  for (const g in dipan) {
    if (dipan[g] === shiGan) return parseInt(g);
  }
  return 1;
}

// 原始九星宫位（阳遁时家奇门）：天蓬1、天芮2、天冲3、天辅4、天禽5、天心6、天柱7、天任8、天英9
// 原始九星宫位：1=天蓬 2=天芮 3=天冲 4=天辅 5=天禽 6=天心 7=天柱 8=天任 9=天英
// 原始八门宫位：1=休 2=生 3=伤 4=杜 5=景 6=死 7=惊 8=开

// 洛书飞宫路径（从 1 宫开始顺序）
const LUOSHU_PATH = [1, 8, 3, 4, 9, 2, 7, 6];

// 阳遁：值符星原始宫 + 飞到时干所在宫 = 旋转步数
// 飞宫路径：从值符星原宫出发，沿洛书序数到时干所在宫要走几步
function stepsBetween(from: number, to: number, yinYang: YinYang): number {
  const fromIdx = LUOSHU_PATH.indexOf(from);
  const toIdx = LUOSHU_PATH.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return 0;
  if (yinYang === '阳') {
    return (toIdx - fromIdx + 8) % 8;
  } else {
    return (fromIdx - toIdx + 8) % 8;
  }
}

// 排天盘九星
function buildTianPan(dipan: Record<number, string>, shiGan: string, yinYang: YinYang): Record<number, NineStar> {
  const tianpan: Record<number, NineStar> = {};
  // 值符星 = 时干所在宫位对应的原始九星
  // 实际步骤：原始九星1→1宫, 2→2宫, ..., 9→9宫
  // 值符星（带头的星）旋转到时干所在宫，其他跟着转
  // 阳遁顺飞：原宫 + 步数 = 新宫
  // 阴遁逆飞：原宫 - 步数 = 新宫
  const shiGanGong = findShiGanGong(dipan, shiGan);
  // 值符星原始宫 = 1（天蓬），因为天蓬在 1 宫原始（值符就是地盘时干所在宫那个原始位置的星）
  // 重新理解：地盘时干所在宫 = "时干"落宫；该宫在地盘上原本是哪个星？
  // 在原始布局中，1宫是天蓬，2宫是天芮,...,9宫是天英
  // 时干落在地盘X宫，那么值符星 = X 宫原始位置的星（如落在7宫，则值符=天柱）
  // 值符星原宫 = X
  // 值符星新宫 = 时干所在宫
  // 旋转步数：从 X 到 时干所在宫 沿洛书走几步
  const zhiFuStarOriginalGong = shiGanGong; // 因为地盘 X 宫上原位是 X 星
  const steps = stepsBetween(zhiFuStarOriginalGong, shiGanGong, yinYang);
  // 步数=0,说明值符星不动（因为它的原宫就是它要去的宫）
  // 其他星按同方向转
  NINE_STARS.forEach((star, idx) => {
    const originGong = idx + 1; // 天蓬1、天芮2、...
    let newIdx;
    if (yinYang === '阳') {
      newIdx = (LUOSHU_PATH.indexOf(originGong) + steps) % 8;
    } else {
      newIdx = (LUOSHU_PATH.indexOf(originGong) - steps + 8) % 8;
    }
    const newGong = LUOSHU_PATH[newIdx];
    tianpan[newGong] = star;
  });
  // 中5宫寄宫处理
  tianpan[5] = tianpan[yinYang === '阳' ? 2 : 8];
  return tianpan;
}

// 排八门（人盘）
function buildRenPan(dipan: Record<number, string>, shiGan: string, yinYang: YinYang): Record<number, EightDoor> {
  const renpan: Record<number, EightDoor> = {};
  // 值使门 = 时干所在宫对应的原始八门
  const shiGanGong = findShiGanGong(dipan, shiGan);
  // 原始八门1=休门1宫, 2=生门2宫, ..., 8=开门8宫
  // 值使门原宫 = shiGanGong（如果 shiGanGong=5 寄宫则特殊）
  let zhiShiDoorOriginalGong = shiGanGong;
  if (zhiShiDoorOriginalGong === 5) {
    zhiShiDoorOriginalGong = yinYang === '阳' ? 2 : 8; // 寄宫
  }
  const steps = stepsBetween(zhiShiDoorOriginalGong, shiGanGong, yinYang);
  EIGHT_DOORS.forEach((door, idx) => {
    const originGong = idx + 1; // 休1、生2、...
    let newIdx;
    if (yinYang === '阳') {
      newIdx = (LUOSHU_PATH.indexOf(originGong) + steps) % 8;
    } else {
      newIdx = (LUOSHU_PATH.indexOf(originGong) - steps + 8) % 8;
    }
    const newGong = LUOSHU_PATH[newIdx];
    renpan[newGong] = door;
  });
  // 中5宫无门
  renpan[5] = '' as any;
  return renpan;
}

// 排八神（神盘）
function buildShenPan(dipan: Record<number, string>, shiGan: string, yinYang: YinYang): Record<number, EightGod> {
  const shenpan: Record<number, EightGod> = {};
  // 阳遁八神顺布：值符起时干宫顺飞
  // 阴遁八神逆布：值符起时干宫逆飞
  const shiGanGong = findShiGanGong(dipan, shiGan);
  const zhiFuPos = LUOSHU_PATH.indexOf(shiGanGong);
  for (let i = 0; i < 8; i++) {
    let pos;
    if (yinYang === '阳') {
      pos = (zhiFuPos + i) % 8;
    } else {
      pos = (zhiFuPos - i + 8) % 8;
    }
    shenpan[LUOSHU_PATH[pos]] = EIGHT_GODS[i];
  }
  return shenpan;
}

// 找当前节气（从24节气日期表中找）
export function getCurrentJieQi(_date: Date): { jieqi: string; isYang: boolean; yuan: 0 | 1 | 2 } {
  throw new Error('use qimenFromLunar instead');
}

export interface QimenResult {
  date: Date;
  jieqi: string;
  yinYang: YinYang;
  ju: Ju;
  yuan: 0 | 1 | 2; // 上中下元
  shiGanZhi: { gan: string; zhi: string };
  dipan: Record<number, string>; // 1-9 → 天干
  tianpan: Record<number, NineStar>;
  renpan: Record<number, EightDoor>;
  shenpan: Record<number, EightGod>;
  zhiFu: { gong: number; star: NineStar };
  zhiShi: { gong: number; door: EightDoor };
  // 辅助：每个宫的完整信息
  palaces: PalaceInfo[];
}

export interface PalaceInfo {
  gong: number;
  name: string;
  wuxing: Element;
  diGan: string;
  tianGan: string; // = 地盘同位（实际是该宫地盘天干，重复显示）
  tianStar: NineStar | null;
  renDoor: EightDoor | '' | '中';
  shenGod: EightGod | null;
  isZhiFu: boolean;
  isZhiShi: boolean;
}

const GONG_ELEMENT_LIST: Record<number, Element> = {
  1: '水', 8: '土', 3: '木', 4: '木', 9: '火', 2: '土', 7: '金', 6: '金', 5: '土',
};

// 主入口：从农历节气信息起局
export function buildQimen(
  _date: Date,
  jieqi: string,
  yuan: 0 | 1 | 2,
  shiGan: string,
): QimenResult {
  const isYangFlag = isYang(jieqi);
  const yinYang: YinYang = isYangFlag ? '阳' : '阴';
  const table = isYangFlag ? YANG_JU_TABLE : YIN_JU_TABLE;
  const ju = table[jieqi][yuan] as Ju;

  const dipan = buildDiPan(ju, yinYang);
  const shiGanGong = findShiGanGong(dipan, shiGan);
  const tianpan = buildTianPan(dipan, shiGan, yinYang);
  const renpan = buildRenPan(dipan, shiGan, yinYang);
  const shenpan = buildShenPan(dipan, shiGan, yinYang);

  // 值符 = 时干所在宫的星
  const zhiFuStar = tianpan[shiGanGong];
  // 值使 = 时干所在宫的门（5宫无门）
  const zhiShiDoor = shiGanGong === 5 ? '' as any : renpan[shiGanGong];

  // 组装每个宫的信息（包含中5宫）
  const allGongs = [...LUOSHU_PATH, 5];
  const palaces: PalaceInfo[] = allGongs.map(g => {
    const tianStar = tianpan[g] || null;
    const renDoor = g === 5 ? '' : (renpan[g] || '');
    const shenGod = g === 5 ? null : (shenpan[g] || null);
    return {
      gong: g,
      name: GONG_NAMES[g],
      wuxing: GONG_ELEMENT_LIST[g],
      diGan: dipan[g] || '',
      tianGan: dipan[g] || '', // 简化：同位
      tianStar,
      renDoor,
      shenGod,
      isZhiFu: g === shiGanGong,
      isZhiShi: g === shiGanGong && g !== 5,
    };
  });

  return {
    date: _date,
    jieqi,
    yinYang,
    ju,
    yuan,
    shiGanZhi: { gan: shiGan, zhi: '' }, // 外部传入
    dipan,
    tianpan,
    renpan,
    shenpan,
    zhiFu: { gong: shiGanGong, star: zhiFuStar },
    zhiShi: { gong: shiGanGong, door: zhiShiDoor },
    palaces,
  };
}
