// 紫微斗数流派配置
// 三合派（默认）：传统飞星，四化表：甲廉破武阳、乙机梁紫阴、丙同巨贪狼...
// 中州派：算法切换 algorithm='zhongzhou'
// 飞星派：四化口诀不同

import * as iztroModule from 'iztro';

export type ZiweiSchool = 'sanhe' | 'zhongzhou' | 'feixing';

export const SCHOOL_NAMES: Record<ZiweiSchool, string> = {
  sanhe: '三合派（默认）',
  zhongzhou: '中州派',
  feixing: '飞星派',
};

// 飞星派与三合派四化差异：仅甲干不同
// 三合：甲 廉贞化禄 破军化权 武曲化科 太阳化忌
// 飞星：甲 破军化禄 巨门化权 太阳化科 文昌化忌（部分派别）
// 这里做简化对比展示
const FEIXING_SIHUA_DIFF: Record<string, string> = {
  '甲干': '三合：廉贞禄破军权武曲科太阳忌 / 飞星：破军禄巨门权太阳科文昌忌',
};

export function applyZiweiSchool(school: ZiweiSchool) {
  try {
    const configFn = (iztroModule as any).config;
    if (typeof configFn === 'function') {
      configFn({
        algorithm: school === 'zhongzhou' ? 'zhongzhou' : 'default',
      });
    }
  } catch (e) {
    // ignore
  }
}

export function getSchoolSihuaDiff(): string {
  return FEIXING_SIHUA_DIFF['甲干'] || '';
}

