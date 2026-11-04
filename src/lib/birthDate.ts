import { Lunar, LunarMonth } from 'lunar-javascript';
import { calculateTrueSolarTime, shiftGregorianDate } from '../vendor/ziwei-doushu/true-solar-time.ts';

export interface BirthDateInput {
  year: number; month: number; day: number; hour: number; minute: number;
  gender: '男' | '女'; shiChenIndex: number;
  utcOffsetMinutes?: number; daylightSaving?: boolean;
  isLunar: boolean; lunarLeap: boolean; useTrueSolar: boolean; longitude: number;
}

/** 输入历法只在此转换一次，所有排盘组件接收公历和校正后的时辰。 */
export function resolveBirthDate(input: BirthDateInput) {
  const { year, month, day, hour, minute } = input;
  if (![year, month, day, hour, minute, input.shiChenIndex].every(Number.isInteger)
    || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31
    || hour < 0 || hour > 23 || minute < 0 || minute > 59 || input.shiChenIndex < 0 || input.shiChenIndex > 11
    || !['男', '女'].includes(input.gender)) throw new RangeError('请输入有效的出生日期、时间和性别');
  let date: Date;
  if (input.isLunar) {
    const lunarMonth = input.lunarLeap ? -month : month;
    const info = LunarMonth.fromYm(year, lunarMonth);
    if (!info || day > info.getDayCount()) throw new RangeError('该农历月份或日期不存在，请检查闰月选项');
    const solar = Lunar.fromYmd(year, lunarMonth, day).getSolar();
    date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), hour, minute);
  } else {
    date = new Date(year, month - 1, day, hour, minute);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
      throw new RangeError('该公历日期不存在，请检查月份和天数');
  }
  const utcOffsetMinutes = input.utcOffsetMinutes ?? 480;
  if (!Number.isInteger(utcOffsetMinutes) || utcOffsetMinutes < -720 || utcOffsetMinutes > 840)
    throw new RangeError('标准时区偏移应在负十二至正十四小时之间');
  if (input.useTrueSolar && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180))
    throw new RangeError('请输入有效的出生地经度');
  const originalDate = new Date(date);
  // 以 UTC 数字运算处理当地钟表读数，不让浏览器所在时区或历史夏令时改写输入。
  const standard = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute - (input.daylightSaving ? 60 : 0)));
  const solar = calculateTrueSolarTime({ year: standard.getUTCFullYear(), month: standard.getUTCMonth() + 1, day: standard.getUTCDate(),
    clockHour: standard.getUTCHours(), clockMinute: standard.getUTCMinutes(),
    longitude: input.useTrueSolar ? input.longitude : undefined, utcOffsetMinutes });
  const shifted = shiftGregorianDate({ year: standard.getUTCFullYear(), month: standard.getUTCMonth() + 1, day: standard.getUTCDate() }, solar.dayOffset);
  date = new Date(shifted.year, shifted.month - 1, shifted.day, solar.hour, solar.minute, solar.second);
  return { date, originalDate, shiChenIndex: solar.branch, correction: solar, daylightSaving: !!input.daylightSaving, utcOffsetMinutes };
}
