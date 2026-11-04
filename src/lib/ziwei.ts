import { astro } from 'iztro';
import { generateChart, setBrightnessSchool, resolveEffectiveLunarDate } from '../vendor/ziwei-doushu/algorithm.ts';
import { BRANCHES } from '../vendor/ziwei-doushu/constants.ts';
import { applyZiweiSchool, type ZiweiSchool } from './ziweiSchool.ts';

/** 接入上游的星曜校正，同时保留现有界面使用的运限与三方四正接口。 */
export function createZiweiAstrolabe(date: Date, hour: number, gender: '男' | '女', school: ZiweiSchool = 'sanhe') {
  if (gender !== '男' && gender !== '女') throw new RangeError('请选择有效的性别');
  const chartDate = new Date(date);
  if (hour === 0 && date.getHours() === 23 && school !== 'tianji') chartDate.setDate(chartDate.getDate() + 1);
  applyZiweiSchool(school);
  setBrightnessSchool(school === 'zhongzhou' ? 'ZZ' : 'default');
  const birth = { year: chartDate.getFullYear(), month: chartDate.getMonth() + 1, day: chartDate.getDate(), hour,
    gender: gender === '男' ? 'male' as const : 'female' as const };
  const leapMonth = school === 'tianji' ? 'next-month' : 'split';
  const chart = generateChart(birth, { leapMonth });
  const effective = resolveEffectiveLunarDate(birth.year, birth.month, birth.day, leapMonth);
  const astrolabe = leapMonth !== 'split' && effective.rawLunarMonth < 0
    ? astro.byLunar(`${effective.lunarYear}-${effective.lunarMonth}-${effective.lunarDay}`, hour, gender, effective.isLeapMonth, false, 'zh-CN')
    : astro.bySolar(`${birth.year}-${birth.month}-${birth.day}`, hour, gender, true, 'zh-CN');

  // 保留星曜实例及其分析方法，移动星曜时按上游校正后的地支重新分组。
  const starPool = new Map(astrolabe.palaces.flatMap(p => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]).map(s => [s.name as string, s]));
  const majorNames = new Set(astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name as string)));
  const minorNames = new Set(astrolabe.palaces.flatMap(p => p.minorStars.map(s => s.name as string)));
  const template = astrolabe.palaces[0].majorStars[0] || astrolabe.palaces.flatMap(p => p.minorStars)[0];
  for (const palace of astrolabe.palaces) {
    const corrected = chart.palaces.find(p => BRANCHES[p.branch] === palace.earthlyBranch)!;
    const stars = corrected.stars.map(s => {
      const instance = starPool.get(s.name) || new (template.constructor as new (data: object) => typeof template)({ name: s.name, type: s.type, scope: 'origin' });
      Object.assign(instance, { brightness: s.brightnessRaw, mutagen: s.siHua });
      instance.setPalace(palace);
      instance.setAstrolabe(astrolabe);
      return instance;
    });
    Object.assign(palace, {
      majorStars: stars.filter(s => majorNames.has(s.name)),
      minorStars: stars.filter(s => minorNames.has(s.name)),
      adjectiveStars: stars.filter(s => !majorNames.has(s.name) && !minorNames.has(s.name)),
    });
  }
  const horoscope = astrolabe.horoscope;
  astrolabe.horoscope = (targetDate, timeIndex) => {
    // iztro 运限仍会读取全局配置；旧命盘不能被后来创建的其他流派污染。
    applyZiweiSchool(school);
    return horoscope(targetDate, timeIndex);
  };
  return Object.assign(astrolabe, { soul: chart.mingZhu, body: chart.shenZhu });
}

interface StarLike { name: string; mutagen?: string }
interface PalaceLike { name: string; majorStars?: StarLike[]; minorStars?: StarLike[]; adjectiveStars?: StarLike[] }
interface ScopeLike { mutagen?: string[] }
export function palaceStars(palace: PalaceLike): StarLike[] {
  return [...(palace.majorStars || []), ...(palace.minorStars || []), ...(palace.adjectiveStars || [])];
}

/** iztro 运限 mutagen 是按禄权科忌排列的四颗星名，不带“化禄”等后缀。 */
export function getZiweiTransforms(palaces: PalaceLike[], scope?: ScopeLike | null) {
  return ['禄', '权', '科', '忌'].flatMap((type, index) => {
    const name = scope ? scope.mutagen?.[index] : palaces.flatMap(palaceStars).find(s => s.mutagen === type)?.name;
    if (!name) return [];
    const palace = palaces.find(p => palaceStars(p).some(s => s.name === name));
    return [{ name, type, palace: palace?.name || '未找到落宫', star: name }];
  });
}
