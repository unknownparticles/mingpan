import { Lunar } from 'lunar-javascript';
import { getDaXianIndexForYear, getChildhoodYears, getChildhoodDaXianPalace, CHILDHOOD_DAXIAN_INDEX } from '../vendor/ziwei-doushu/yunxian-context.ts';
import type { ZiweiChart } from '../vendor/ziwei-doushu/types.ts';

export function periodForYear(chart: ZiweiChart, year: number) {
  const age = year - chart.lunarInfo.lunarYear + 1;
  if (getChildhoodYears(chart).includes(year)) return { index: CHILDHOOD_DAXIAN_INDEX, age, label: '童限', palace: getChildhoodDaXianPalace(chart, year)?.name || '命宫' };
  const index = getDaXianIndexForYear(chart, year);
  const period = chart.daXians[index];
  return { index, age, label: period ? `${period.startAge}–${period.endAge}虚岁大限` : age < 1 ? '出生前' : '超出大限范围', palace: period?.palaceName || '' };
}

/** 用农历流年的年中查询，虚岁一年一个点，避免春节前出生者错位一年。 */
export function solarDateForLunarYear(year: number) {
  const solar = Lunar.fromYmd(year, 6, 1).getSolar();
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), 12);
}
