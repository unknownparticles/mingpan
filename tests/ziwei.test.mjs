import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createZiweiAstrolabe, getZiweiTransforms, palaceStars } from '../src/lib/ziwei.ts';
import { resolveBirthDate } from '../src/lib/birthDate.ts';
import { generateChart } from '../src/vendor/ziwei-doushu/algorithm.ts';
import { BRANCHES } from '../src/vendor/ziwei-doushu/constants.ts';

const base = { year: 2024, month: 2, day: 10, hour: 10, minute: 0, shiChenIndex: 5,
  gender: '男', isLunar: false, lunarLeap: false, useTrueSolar: false, longitude: 120 };
const ymd = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()];
const snapshot = chart => chart.palaces.map(p => [p.name, p.earthlyBranch, palaceStars(p).map(s => [s.name, s.brightness, s.mutagen])]);

test('公历农历同一出生日期得到相同排盘', () => {
  const solar = resolveBirthDate(base);
  const lunar = resolveBirthDate({ ...base, isLunar: true, month: 1, day: 1 });
  assert.deepEqual(ymd(lunar.date), [2024, 2, 10]);
  assert.deepEqual(snapshot(createZiweiAstrolabe(solar.date, 5, '男')), snapshot(createZiweiAstrolabe(lunar.date, 5, '男')));
});

test('拒绝不存在的公历日期、闰月与时辰', () => {
  for (const input of [{ month: 2, day: 30 }, { year: 2023, month: 2, day: 29 },
    { isLunar: true, lunarLeap: true, year: 2024, month: 1 }, { shiChenIndex: 12 }]) {
    assert.throws(() => resolveBirthDate({ ...base, ...input }), RangeError);
  }
  for (const hour of [-1, 12, 0.5]) assert.throws(() => createZiweiAstrolabe(new Date(2000, 0, 31), hour, '男'), RangeError);
});

test('经度校正同步跨日与时辰', () => {
  const result = resolveBirthDate({ ...base, hour: 0, shiChenIndex: 0, longitude: 90, useTrueSolar: true });
  assert.deepEqual(ymd(result.date), [2024, 2, 9]);
  assert.equal(result.date.getHours(), 21);
  assert.equal(result.date.getMinutes(), 45); // 二月均时差约负十四分钟
  assert.equal(result.shiChenIndex, 11);
});

test('辛年四化包含文昌文曲，运限四化使用有序星名查真实落宫', () => {
  const chart = createZiweiAstrolabe(new Date(1991, 5, 15), 5, '男');
  assert.deepEqual(getZiweiTransforms(chart.palaces).map(t => [t.name, t.type]),
    [['巨门', '禄'], ['太阳', '权'], ['文曲', '科'], ['文昌', '忌']]);
  const scope = chart.horoscope(new Date(2026, 10, 15)).yearly;
  const transforms = getZiweiTransforms(chart.palaces, scope);
  assert.equal(transforms.length, 4);
  for (const [i, transform] of transforms.entries()) {
    assert.equal(transform.name, scope.mutagen[i]);
    assert.ok(palaceStars(chart.palaces.find(p => p.name === transform.palace)).some(s => s.name === transform.name));
  }
  assert.equal(chart.star('天魁').palace().earthlyBranch, '寅');
  assert.equal(chart.star('天钺').palace().earthlyBranch, '午');
});

test('立春后春节前仍采用农历上一年', () => {
  const chart = createZiweiAstrolabe(new Date(1999, 1, 11), 5, '男');
  assert.deepEqual(getZiweiTransforms(chart.palaces).map(t => t.name), ['贪狼', '太阴', '右弼', '天机']);
});

test('十二时辰、闰月及男女的星曜与亮度完整保留上游结果', () => {
  for (const [year, month, day] of [[1991, 6, 15], [2023, 3, 25], [2023, 4, 12]]) {
    for (const gender of ['男', '女']) for (let hour = 0; hour < 12; hour++) {
      const chart = createZiweiAstrolabe(new Date(year, month - 1, day), hour, gender);
      const expected = generateChart({ year, month, day, hour, gender: gender === '男' ? 'male' : 'female' });
      assert.equal(chart.palaces.length, 12);
      assert.equal(new Set(chart.palaces.map(p => p.name)).size, 12);
      for (const palace of chart.palaces) {
        const source = expected.palaces.find(p => BRANCHES[p.branch] === palace.earthlyBranch);
        const normalize = stars => stars.sort((a, b) => a[0].localeCompare(b[0]));
        assert.deepEqual(normalize(palaceStars(palace).map(s => [s.name, s.brightness, s.mutagen])),
          normalize(source.stars.map(s => [s.name, s.brightnessRaw, s.siHua])));
      }
      assert.ok(chart.surroundedPalaces('命宫').target);
      assert.equal(chart.horoscope(new Date(2026, 10, 15)).yearly.palaceNames.length, 12);
    }
  }
});

test('流派切换生效，切回默认还原，已有命盘的运限不受其他盘污染', () => {
  const date = new Date(2023, 2, 25);
  const first = createZiweiAstrolabe(date, 5, '男');
  const before = snapshot(first);
  const future = new Date(2026, 10, 15);
  const transforms = [...first.horoscope(future).yearly.mutagen];
  const tianji = createZiweiAstrolabe(date, 5, '男', 'tianji');
  assert.notDeepEqual(snapshot(tianji), before);
  const zhongzhou = createZiweiAstrolabe(date, 5, '男', 'zhongzhou');
  assert.notDeepEqual(snapshot(zhongzhou), before);
  assert.deepEqual(first.horoscope(future).yearly.mutagen, transforms);
  assert.deepEqual(snapshot(createZiweiAstrolabe(date, 5, '男')), before);
});

test('晚子时三合归次日，天纪保留当日', () => {
  const late = new Date(2024, 11, 31, 23, 30);
  assert.equal(createZiweiAstrolabe(late, 0, '男').solarDate, '2025-1-1');
  assert.equal(createZiweiAstrolabe(late, 0, '男', 'tianji').solarDate, '2024-12-31');
});
