// lunar-javascript 封装：干支、节气、农历转换
import { Solar } from 'lunar-javascript';

export interface GanZhi {
  gan: string; // 甲乙丙丁戊己庚辛壬癸
  zhi: string; // 子丑寅卯辰巳午未申酉戌亥
  full: string; // 如 "甲子"
}

// 标准时辰索引：23-1 子, 1-3 丑, ..., 21-23 亥
export function hourToShiChenIndex(hour: number): number {
  // hour: 0-23
  if (hour === 23 || hour === 0) return 0; // 子
  return Math.floor((hour + 1) / 2);
}

export const SHI_CHEN = [
  { index: 0, name: '子', range: '23:00-01:00' },
  { index: 1, name: '丑', range: '01:00-03:00' },
  { index: 2, name: '寅', range: '03:00-05:00' },
  { index: 3, name: '卯', range: '05:00-07:00' },
  { index: 4, name: '辰', range: '07:00-09:00' },
  { index: 5, name: '巳', range: '09:00-11:00' },
  { index: 6, name: '午', range: '11:00-13:00' },
  { index: 7, name: '未', range: '13:00-15:00' },
  { index: 8, name: '申', range: '15:00-17:00' },
  { index: 9, name: '酉', range: '17:00-19:00' },
  { index: 10, name: '戌', range: '19:00-21:00' },
  { index: 11, name: '亥', range: '21:00-23:00' },
];

// 24节气（按时序：冬至为 0 索引）
const JIEQI_ORDER = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
  '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
];

export interface DateInfo {
  solar: Date;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  // 干支
  yearGZ: GanZhi;
  monthGZ: GanZhi;
  dayGZ: GanZhi;
  hourGZ: GanZhi;
  shiChenIndex: number;
  shiChenName: string;
  // 节气
  jieqi: string; // 当前所属节气
  prevJieqi: string;
  nextJieqi: string;
  // 元（0=上, 1=中, 2=下）—— 按"交节定元"逻辑
  yuan: 0 | 1 | 2;
  // 农历
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  lunarMonthName: string;
  lunarDayName: string;
  isLeapMonth: boolean;
  shengxiao: string; // 生肖
  xingzuo: string; // 星座
}

export function getDateInfo(date: Date, shiChenIndex?: number): DateInfo {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  // 时辰：优先用传入的，否则根据当前小时
  const hour = date.getHours();
  const idx = shiChenIndex ?? hourToShiChenIndex(hour);
  const shiChenName = SHI_CHEN[idx].name;

  const yearGZStr = lunar.getYearInGanZhi();
  const monthGZStr = lunar.getMonthInGanZhi();
  const dayGZStr = lunar.getDayInGanZhi();
  const hourGZStr = lunar.getTimeInGanZhi();

  // 当前节气判断：找上一个节气
  const prevJq = lunar.getPrevJieQi();
  const nextJq = lunar.getNextJieQi();
  const prevName = prevJq?.getName?.() ?? '';
  const nextName = nextJq?.getName?.() ?? '';
  const currentJq = prevName; // 所属节气 = 上一个节气

  // 交节定元：按日支确定
  // 上元 = 子午卯酉；中元 = 寅申巳亥；下元 = 辰戌丑未
  const dayZhi = dayGZStr[1];
  let yuan: 0 | 1 | 2 = 0;
  if (['子', '午', '卯', '酉'].includes(dayZhi)) yuan = 0;
  else if (['寅', '申', '巳', '亥'].includes(dayZhi)) yuan = 1;
  else yuan = 2;

  // 找当前节气的索引用于判断阴阳遁
  const currentIdx = JIEQI_ORDER.indexOf(currentJq);
  // 阳遁：冬至(0)到芒种(11) = idx 0-11
  // 如果当前节气 idx 找不到（极少），按夏至后为阴遁
  // 阳遁 = 冬至后开始（index 0 到 11），阴遁 = 夏至后开始（index 12 到 23）
  const isYang = currentIdx >= 0 && currentIdx < 12;

  return {
    solar: date,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    yearGZ: { gan: yearGZStr[0], zhi: yearGZStr[1], full: yearGZStr },
    monthGZ: { gan: monthGZStr[0], zhi: monthGZStr[1], full: monthGZStr },
    dayGZ: { gan: dayGZStr[0], zhi: dayGZStr[1], full: dayGZStr },
    hourGZ: { gan: hourGZStr[0], zhi: hourGZStr[1], full: hourGZStr },
    shiChenIndex: idx,
    shiChenName,
    jieqi: isYang ? '阳遁' : '阴遁',
    prevJieqi: prevName,
    nextJieqi: nextName,
    yuan,
    lunarYear: lunar.getYear(),
    lunarMonth: lunar.getMonth(),
    lunarDay: lunar.getDay(),
    lunarMonthName: lunar.getMonthInChinese(),
    lunarDayName: lunar.getDayInChinese(),
    isLeapMonth: (lunar as any).isLeap?.() ?? false,
    shengxiao: lunar.getYearShengXiao(),
    xingzuo: solar.getXingZuo(),
  };
}

// 真太阳时校正（粗略按经度差）
// 中国标准时 = 东八区 (120°E)
export function trueSolarTimeCorrection(date: Date, longitude: number = 120): Date {
  // 每度 = 4分钟，>120 为东加，<120 为西减
  const diff = (longitude - 120) * 4 * 60 * 1000;
  return new Date(date.getTime() + diff);
}
