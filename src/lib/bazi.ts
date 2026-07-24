// 八字四柱 排盘（基于 lunar-javascript）
import { Solar } from 'lunar-javascript';

export interface Pillar {
  gan: string;
  zhi: string;
  full: string; // 如 "甲子"
  ganWuxing: string;
  zhiWuxing: string;
  naYin: string;
  // 藏干
  hideGan: string[];
  // 十神
  shiShenGan: string;
  shiShenZhi: string;
  // 地势（十二长生）
  diShi: string;
  // 旬空
  xunKong: string;
}

export interface DaYun {
  startAge: number;
  startYear: number;
  ganZhi: string;
}

export interface BaziResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  time: Pillar;
  dayMaster: string; // 日主天干
  dayMasterWuxing: string;
  // 胎元/命宫/身宫
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  // 起运
  startAge: number;
  startYear: number;
  direction: '顺' | '逆';
  // 大运列表
  daYunList: DaYun[];
  // 神煞（日支相关）
  shenSha: string[];
}

function makePillar(bz: any, type: 'Year' | 'Month' | 'Day' | 'Time'): Pillar {
  const gan = bz[`get${type}Gan`]();
  const zhi = bz[`get${type}Zhi`]();
  return {
    gan,
    zhi,
    full: bz[type === 'Time' ? 'getTime' : `get${type}`](),
    ganWuxing: bz[`get${type}WuXing`]?.()?.split('.')?.[0] || '',
    zhiWuxing: '',
    naYin: bz[`get${type}NaYin`]?.() || '',
    hideGan: bz[`get${type}HideGan`]?.() || [],
    shiShenGan: bz[`get${type}ShiShenGan`]?.() || '',
    shiShenZhi: bz[`get${type}ShiShenZhi`]?.() || '',
    diShi: bz[`get${type}DiShi`]?.() || '',
    xunKong: bz[`get${type}XunKong`]?.() || '',
  };
}

export function getBazi(date: Date, _shiChenIndex: number, gender: '男' | '女'): BaziResult {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const bz = lunar.getEightChar();

  // lunar-javascript 的 getYun 性别参数：1=男 0=女
  const yun = bz.getYun(gender === '男' ? 1 : 0);
  const daYunRaw = yun.getDaYun() || [];
  const daYunList: DaYun[] = daYunRaw
    .filter((dy: any) => (dy.ganZhi ?? dy.getGanZhi?.() ?? '') !== '')
    .slice(0, 10)
    .map((dy: any) => ({
      startAge: dy.startAge ?? dy.getStartAge?.() ?? 0,
      startYear: dy.startYear ?? dy.getStartYear?.() ?? 0,
      ganZhi: dy.ganZhi ?? dy.getGanZhi?.() ?? '',
    }));

  // 神煞（取常见的几个）
  const shenSha: string[] = [];
  const dayZhi = bz.getDayZhi();
  // 简化的神煞判断
  const dayGan = bz.getDayGan();
  const dayZhiIdx = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(dayZhi);
  const dayGanIdx = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(dayGan);
  void dayGanIdx;
  // 驿马：日支 申子辰马在寅, 寅午戌马在申, 巳酉丑马在亥, 亥卯未马在巳
  const maGroups = [[2,0,4],[0,6,10],[5,9,1],[11,3,7]]; // 地支索引
  for (const g of maGroups) {
    if (g.includes(dayZhiIdx)) {
      const maZhi = ['寅','申','亥','巳'][['申子辰','寅午戌','巳酉丑','亥卯未'].findIndex(p => p.split('').some(z => ['申','子','辰','寅','午','戌','巳','酉','丑','亥','卯','未'].indexOf(z) === dayZhiIdx))];
      shenSha.push(`驿马${maZhi}`);
      break;
    }
  }
  // 桃花：日支 申子辰桃在酉, 寅午戌桃在卯, 巳酉丑桃在午, 亥卯未桃在子
  const taoHuaMap: Record<string, string> = {
    '申子辰': '酉', '寅午戌': '卯', '巳酉丑': '午', '亥卯未': '子',
  };
  const sanHe = ['申子辰','寅午戌','巳酉丑','亥卯未'];
  for (const sh of sanHe) {
    if (sh.split('').includes(dayZhi)) {
      shenSha.push(`桃花${taoHuaMap[sh]}`);
      break;
    }
  }
  // 日禄
  const luMap: Record<string, string> = {甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
  shenSha.push(`禄${luMap[dayGan] || ''}`);

  return {
    year: makePillar(bz, 'Year'),
    month: makePillar(bz, 'Month'),
    day: makePillar(bz, 'Day'),
    time: makePillar(bz, 'Time'),
    dayMaster: dayGan,
    dayMasterWuxing: bz.getDayWuXing?.()?.split('.')?.[0] || '',
    taiYuan: bz.getTaiYuan?.() || '',
    mingGong: bz.getMingGong?.() || '',
    shenGong: bz.getShenGong?.() || '',
    startAge: yun.startAge ?? yun.getStartAge?.() ?? 0,
    startYear: yun.startYear ?? yun.getStartYear?.() ?? 0,
    direction: (yun.isForward ?? yun.isForward?.()) ? '顺' : '逆',
    daYunList,
    shenSha,
  };
}
