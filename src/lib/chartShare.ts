import { resolveBirthDate, type BirthDateInput } from './birthDate.ts';
import { normalizeRules, type ZiweiRules } from './ziweiSchool.ts';

export interface SharedBirth extends BirthDateInput { name: string; cityName: string }
export interface SharedChart { v: 1; birth: SharedBirth; rules: ZiweiRules }

/** 白名单字段，不把账户、凭据、本地缓存或姓名城市写入分享链接。 */
export function createChartShareURL(baseURL: string, birth: SharedBirth, rules: ZiweiRules) {
  resolveBirthDate(birth);
  const safe = { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute,
    shiChenIndex: birth.shiChenIndex, gender: birth.gender, isLunar: birth.isLunar, lunarLeap: birth.lunarLeap,
    useTrueSolar: birth.useTrueSolar, longitude: birth.longitude, utcOffsetMinutes: birth.utcOffsetMinutes ?? 480,
    daylightSaving: !!birth.daylightSaving };
  const url = new URL(baseURL);
  url.search = '';
  url.hash = `chart=${encodeURIComponent(JSON.stringify({ v: 1, birth: safe, rules: normalizeRules(rules) }))}`;
  return url.toString();
}
export function parseChartShareURL(value: string): SharedChart | null {
  const url = new URL(value);
  if (!url.hash.startsWith('#chart=')) return null;
  if (url.hash.length > 4096) throw new Error('命盘分享链接过长');
  try {
    const data = JSON.parse(decodeURIComponent(url.hash.slice(7)));
    if (data.v !== 1 || !data.birth || !data.rules) throw new Error('版本无效');
    const b = data.birth;
    if (![b.isLunar, b.lunarLeap, b.useTrueSolar, b.daylightSaving].every(v => typeof v === 'boolean')
      || typeof b.longitude !== 'number' || typeof b.utcOffsetMinutes !== 'number') throw new Error('参数无效');
    const birth: SharedBirth = { year: b.year, month: b.month, day: b.day, hour: b.hour, minute: b.minute,
      shiChenIndex: b.shiChenIndex, gender: b.gender, isLunar: b.isLunar, lunarLeap: b.lunarLeap,
      useTrueSolar: b.useTrueSolar, longitude: b.longitude, utcOffsetMinutes: b.utcOffsetMinutes,
      daylightSaving: b.daylightSaving, name: '', cityName: '' };
    resolveBirthDate(birth);
    return { v: 1, birth, rules: normalizeRules(data.rules) };
  } catch { throw new Error('命盘分享链接无效，请重新生成'); }
}
