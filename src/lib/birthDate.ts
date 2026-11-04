import { Lunar, LunarMonth } from 'lunar-javascript';
import { hourToShiChenIndex, trueSolarTimeCorrection } from './lunar.ts';

interface BirthDateInput {
  year: number; month: number; day: number; hour: number; minute: number;
  gender: '男' | '女'; shiChenIndex: number;
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
  if (input.useTrueSolar) {
    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)
      throw new RangeError('请输入有效的出生地经度');
    date = trueSolarTimeCorrection(date, input.longitude);
  }
  return { date, shiChenIndex: hourToShiChenIndex(date.getHours()) };
}
