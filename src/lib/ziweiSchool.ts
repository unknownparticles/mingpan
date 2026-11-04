import { astro } from 'iztro';
import type { LunarMonthPolicy } from '../vendor/ziwei-doushu/algorithm.ts';
import type { SchoolBrightnessKind } from '../vendor/ziwei-doushu/algorithm.ts';

export type ZiweiSchool = 'sanhe' | 'zhongzhou' | 'tianji';
export interface ZiweiRules {
  school: ZiweiSchool;
  leapMonth: LunarMonthPolicy;
  lateZishi: 'next-day' | 'current-day';
  brightness: SchoolBrightnessKind;
}
export const SCHOOL_NAMES: Record<ZiweiSchool, string> = {
  sanhe: '三合派', zhongzhou: '中州派', tianji: '天纪派',
};
export function schoolRules(school: ZiweiSchool): ZiweiRules {
  return { school, leapMonth: school === 'tianji' ? 'next-month' : 'split',
    lateZishi: school === 'tianji' ? 'current-day' : 'next-day', brightness: school === 'zhongzhou' ? 'ZZ' : 'default' };
}
export const DEFAULT_RULES = schoolRules('sanhe');
export function normalizeRules(value: unknown): ZiweiRules {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<ZiweiRules>;
  const defaults = schoolRules(['sanhe', 'zhongzhou', 'tianji'].includes(raw.school || '') ? raw.school! : 'sanhe');
  return { school: defaults.school,
    leapMonth: ['split', 'prev-month', 'next-month', 'origin-month'].includes(raw.leapMonth || '') ? raw.leapMonth! : defaults.leapMonth,
    lateZishi: ['next-day', 'current-day'].includes(raw.lateZishi || '') ? raw.lateZishi! : defaults.lateZishi,
    brightness: ['default', 'QS', 'ZZ', 'XD1', 'XD2'].includes(raw.brightness || '') ? raw.brightness! : defaults.brightness };
}
export function loadZiweiRules(): ZiweiRules {
  try { return normalizeRules(JSON.parse(localStorage.getItem('mingpan:ziwei-rules') || 'null')); }
  catch { return { ...DEFAULT_RULES }; }
}
export function saveZiweiRules(rules: ZiweiRules) {
  try { localStorage.setItem('mingpan:ziwei-rules', JSON.stringify(normalizeRules(rules))); } catch { /* 私密浏览下仍可排盘 */ }
}
export function applyZiweiSchool(school: ZiweiSchool) {
  astro.config({ algorithm: school === 'zhongzhou' ? 'zhongzhou' : 'default', yearDivide: 'normal', dayDivide: 'forward', ageDivide: 'normal' });
}
export const LEAP_LABELS = { split: '前十五日归本月，后半月归下月', 'prev-month': '整月归本月', 'next-month': '整月归下月', 'origin-month': '保留原闰月' };
export function rulesSummary(rules: ZiweiRules) {
  return `${SCHOOL_NAMES[rules.school]} · ${rules.lateZishi === 'next-day' ? '晚子时归次日' : '晚子时归当日'} · 闰月${LEAP_LABELS[rules.leapMonth]} · ${rules.brightness === 'default' ? '全书' : rules.brightness}亮度`;
}
