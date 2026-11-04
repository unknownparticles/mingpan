import type { ZiweiChart } from '../vendor/ziwei-doushu/types';
import { BRANCHES, STEMS } from '../vendor/ziwei-doushu/constants';
import { rulesSummary, type ZiweiRules } from './ziweiSchool';

/** 本地 Canvas 绘制，无远程图片依赖；文字直接写入画布，避免截图跨域失败。 */
export async function createChartImage(chart: ZiweiChart, rules: ZiweiRules): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1340;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法生成图片，请使用系统截图');
  ctx.fillStyle = '#171b20'; ctx.fillRect(0, 0, 1080, 1340);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e6c878'; ctx.font = '38px serif'; ctx.fillText('天 机 命 盘', 540, 65);
  ctx.font = '20px sans-serif'; ctx.fillText(`${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日 ${BRANCHES[chart.birthInfo.hour]}时 · ${chart.birthInfo.gender === 'male' ? '男' : '女'} · 排盘日`, 540, 110);
  const positions = [[3,2],[3,1],[3,0],[2,0],[1,0],[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3]];
  for (const palace of chart.palaces) {
    const [row, col] = positions[palace.branch];
    const x = 40 + col * 250, y = 155 + row * 250;
    ctx.strokeStyle = '#796844'; ctx.strokeRect(x, y, 250, 250);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e6c878'; ctx.font = '23px serif'; ctx.fillText(`${palace.name} ${STEMS[palace.stem]}${BRANCHES[palace.branch]}${palace.isShenGong ? ' 身' : ''}`, x + 12, y + 32);
    const major = palace.stars.filter(s => s.type === 'major');
    ctx.fillStyle = '#eee4d1'; ctx.font = '22px serif';
    if (!major.length) ctx.fillText('空宫', x + 12, y + 69);
    major.forEach((s, i) => ctx.fillText(`${s.name} ${s.brightnessRaw || ''}${s.siHua ? ` 化${s.siHua}` : ''}`, x + 12, y + 69 + i * 30));
    const minor = palace.stars.filter(s => s.type !== 'major');
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#c8b681';
    minor.slice(0, 15).forEach((s, i) => ctx.fillText(`${s.name}${s.siHua ? `化${s.siHua}` : ''}`, x + 12 + (i % 3) * 77, y + 137 + Math.floor(i / 3) * 22));
    ctx.font = '16px sans-serif'; ctx.fillText(palace.daXianAge ? `${palace.daXianAge[0]}–${palace.daXianAge[1]} 虚岁` : '', x + 12, y + 237);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#e6c878'; ctx.font = '32px serif'; ctx.fillText(chart.wuxingJuName, 540, 540);
  ctx.font = '22px sans-serif'; ctx.fillText(`命主 ${chart.mingZhu} · 身主 ${chart.shenZhu}`, 540, 590);
  ctx.fillText('本命十二宫', 540, 640);
  ctx.font = '17px sans-serif';
  const words = rulesSummary(rules);
  const chars = [...words]; let line = ''; let y = 1200;
  for (const ch of chars) { if (ctx.measureText(line + ch).width > 980) { ctx.fillText(line, 540, y); line = ''; y += 28; } line += ch; }
  ctx.fillText(line, 540, y);
  ctx.fillStyle = '#b8aa91'; ctx.fillText('排盘核心：Renhuai123/ziwei-doushu · 传统术数仅供参考', 540, 1300);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片编码失败，请重试')), 'image/png'));
}
