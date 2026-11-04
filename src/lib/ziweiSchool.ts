import { astro } from 'iztro';

export type ZiweiSchool = 'sanhe' | 'zhongzhou' | 'tianji';

export const SCHOOL_NAMES: Record<ZiweiSchool, string> = {
  sanhe: '三合派（默认）',
  zhongzhou: '中州派',
  tianji: '天纪派（闰月归下月）',
};

// 必须在排盘前同步应用；astro.config 是 iztro 的实际配置入口。
export function applyZiweiSchool(school: ZiweiSchool) {
  astro.config({
    algorithm: school === 'zhongzhou' ? 'zhongzhou' : 'default',
    yearDivide: 'normal',
    dayDivide: 'forward',
  });
}
