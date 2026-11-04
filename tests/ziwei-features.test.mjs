import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveBirthDate } from '../src/lib/birthDate.ts';
import { createZiweiAstrolabe } from '../src/lib/ziwei.ts';
import { normalizeRules, schoolRules, loadZiweiRules, saveZiweiRules } from '../src/lib/ziweiSchool.ts';
import { createChartShareURL, parseChartShareURL } from '../src/lib/chartShare.ts';
import { periodForYear, solarDateForLunarYear } from '../src/lib/ziweiPeriods.ts';
import { detectPatterns } from '../src/vendor/ziwei-doushu/patterns.ts';
import { searchClassics, ALL_BOOKS } from '../src/vendor/ziwei-doushu/classics/index.ts';
import { generateKLineData } from '../src/lib/kline.ts';
import { isChinaDST } from '../src/vendor/ziwei-doushu/dst-cn.ts';

const base = { year: 2024, month: 2, day: 10, hour: 0, minute: 0, shiChenIndex: 0,
  gender: '男', isLunar: false, lunarLeap: false, useTrueSolar: false, longitude: 120,
  utcOffsetMinutes: 480, daylightSaving: false, name: '测试姓名', cityName: '测试城市', token: '不得分享的凭据' };
const ymd = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

test('均时差参与跨时辰计算，标准时区中央经线参与经度校正', () => {
  const china = resolveBirthDate({ ...base, hour: 1, shiChenIndex: 1, useTrueSolar: true });
  assert.equal(china.shiChenIndex, 0); // 01:00 经均时差后仍在子时
  assert.ok(china.correction.equationOfTimeMinutes < -13);
  const overseas = resolveBirthDate({ ...base, hour: 12, shiChenIndex: 6, useTrueSolar: true, longitude: -75, utcOffsetMinutes: -300 });
  assert.equal(overseas.correction.longitudeCorrectionMinutes, 0);
  assert.equal(overseas.date.getHours(), 11);
  assert.throws(() => resolveBirthDate({ ...base, utcOffsetMinutes: 1000 }), RangeError);
});

test('夏令时由用户开启，跨日可撤销，输入始终保持原钟表值', () => {
  const corrected = resolveBirthDate({ ...base, daylightSaving: true });
  assert.deepEqual(ymd(corrected.date), [2024, 2, 9]);
  assert.equal(corrected.date.getHours(), 23);
  assert.equal(corrected.shiChenIndex, 0);
  assert.deepEqual(ymd(corrected.originalDate), [2024, 2, 10]);
  assert.equal(resolveBirthDate(base).date.getHours(), 0);
  assert.ok(isChinaDST(1990, 5, 20));
  assert.ok(!isChinaDST(1992, 5, 20));
});

test('规则持久化校验并独立覆盖预设，禁止存储时仍有默认值', t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) } });
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'localStorage', descriptor) : delete globalThis.localStorage);
  const custom = { ...schoolRules('tianji'), lateZishi: 'next-day', brightness: 'XD2' };
  saveZiweiRules(custom);
  assert.deepEqual(loadZiweiRules(), custom);
  assert.deepEqual(normalizeRules({ school: 'bad', leapMonth: 'bad', brightness: 'bad' }), schoolRules('sanhe'));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('禁止存储'); } });
  assert.deepEqual(loadZiweiRules(), schoolRules('sanhe'));
  assert.doesNotThrow(() => saveZiweiRules(custom));
});

test('晚子时规则可脱离流派单独调整', () => {
  const date = new Date(2024, 11, 31, 23, 30);
  const current = createZiweiAstrolabe(date, 0, '男', { ...schoolRules('sanhe'), lateZishi: 'current-day' });
  const next = createZiweiAstrolabe(date, 0, '男', { ...schoolRules('tianji'), lateZishi: 'next-day' });
  assert.equal(current.solarDate, '2024-12-31');
  assert.equal(next.solarDate, '2025-1-1');
});

test('分享完整复现历法时间校正和自定义规则，不包含姓名城市或凭据', () => {
  const birth = { ...base, year: 2023, month: 2, day: 10, isLunar: true, lunarLeap: true,
    hour: 23, minute: 59, useTrueSolar: true, longitude: 116.41, daylightSaving: true };
  const rules = { ...schoolRules('tianji'), leapMonth: 'origin-month', brightness: 'XD1' };
  const url = createChartShareURL('https://example.com/mingpan/?token=private#cf_auth_token=private', birth, rules);
  assert.equal(new URL(url).search, '');
  assert.ok(!decodeURIComponent(url).includes('private'));
  const shared = parseChartShareURL(url);
  assert.deepEqual(shared.rules, rules);
  assert.equal(shared.birth.name, '');
  assert.equal(shared.birth.cityName, '');
  assert.equal(shared.birth.token, undefined);
  assert.equal(resolveBirthDate(shared.birth).date.getTime(), resolveBirthDate(birth).date.getTime());
  const original = createZiweiAstrolabe(resolveBirthDate(birth).date, resolveBirthDate(birth).shiChenIndex, birth.gender, rules);
  const restored = createZiweiAstrolabe(resolveBirthDate(shared.birth).date, resolveBirthDate(shared.birth).shiChenIndex, shared.birth.gender, shared.rules);
  assert.deepEqual(original.ziweiChart.palaces, restored.ziweiChart.palaces);
  assert.equal(parseChartShareURL('https://example.com/#other'), null);
  for (const hash of ['#chart=%xx', '#chart={}', '#chart=' + 'x'.repeat(5000)]) assert.throws(() => parseChartShareURL('https://example.com/' + hash));
  const invalid = new URL(url); const data = JSON.parse(decodeURIComponent(invalid.hash.slice(7))); data.birth.day = 50;
  invalid.hash = 'chart=' + encodeURIComponent(JSON.stringify(data));
  assert.throws(() => parseChartShareURL(invalid.toString()));
});

test('春节前出生的虚岁与大限采用农历生年，童限不误套第一大限', () => {
  const astro = createZiweiAstrolabe(new Date(1999, 1, 11), 5, '男', 'sanhe');
  const chart = astro.ziweiChart;
  assert.equal(chart.lunarInfo.lunarYear, 1998);
  const start = chart.daXians[0].startAge;
  assert.equal(periodForYear(chart, 1998).index, -2);
  assert.equal(astro.horoscope(solarDateForLunarYear(1998)).decadal.name, '童限');
  assert.deepEqual(astro.horoscope(solarDateForLunarYear(1998)).decadal.mutagen, []);
  assert.equal(periodForYear(chart, 1998 + start - 1).index, 0);
  assert.equal(periodForYear(chart, 1998 + start + 8).index, 0);
  assert.equal(periodForYear(chart, 1998 + start + 9).index, 1);
  assert.equal(periodForYear(chart, 1997).index, -1);
  assert.equal(periodForYear(chart, 1997).label, '出生前');
  for (const dx of chart.daXians) {
    const year = chart.lunarInfo.lunarYear + dx.startAge - 1;
    const h = astro.horoscope(solarDateForLunarYear(year));
    assert.equal(astro.palaces[h.decadal.palaceNames.indexOf('命宫')].name, dx.palaceName);
  }
});

test('人生曲线使用真实大限起始年龄与童限序号', () => {
  const result = generateKLineData(new Date(1999, 1, 11), 5, '男');
  assert.equal(result.birthYear, 1998);
  assert.equal(result.data[0].decadeIndex, -2);
  assert.equal(result.data[0].decadeName, '童限');
  for (const dx of result.astrolabe.ziweiChart.daXians) {
    if (dx.startAge > 100) continue;
    const point = result.data[dx.startAge - 1];
    assert.equal(point.year, 1998 + dx.startAge - 1);
    assert.equal(point.decadeName, dx.palaceName);
  }
  assert.ok(result.data.every(p => [p.health, p.wealth, p.career, p.marriage].every(Number.isFinite)));
});

test('格局按四化字段匹配并保留成立依据与出处', () => {
  const chart = createZiweiAstrolabe(new Date(1990, 4, 20), 5, '男', 'sanhe').ziweiChart;
  const copy = structuredClone(chart);
  const sanfang = [chart.mingGongBranch, (chart.mingGongBranch + 4) % 12, (chart.mingGongBranch + 8) % 12, (chart.mingGongBranch + 6) % 12];
  const stars = chart.palaces.filter(p => sanfang.includes(p.branch)).flatMap(p => p.stars);
  for (const star of chart.palaces.flatMap(p => p.stars)) delete star.siHua;
  ['禄', '权', '科'].forEach((hua, i) => { stars[i].siHua = hua; });
  let pattern = detectPatterns(chart).find(p => p.name === '三奇加会');
  assert.ok(pattern);
  assert.ok(pattern.conditions.required.length);
  assert.ok(pattern.source.includes('全书'));
  delete stars[2].siHua;
  assert.ok(!detectPatterns(chart).some(p => p.name === '三奇加会'));
  assert.doesNotThrow(() => detectPatterns(copy));
});

test('三部古籍可离线浏览检索，空输入不返回结果', () => {
  assert.equal(ALL_BOOKS.length, 3);
  assert.ok(ALL_BOOKS.every(b => b.chapters.length && b.chapters.every(c => c.paragraphs.length)));
  assert.ok(searchClassics('紫微').length > 0);
  assert.equal(searchClassics('完全不存在的关键字').length, 0);
  assert.equal(searchClassics('').length, 0);
  assert.ok(searchClassics('星', 2).length <= 2);
});
