import { useState } from 'react';
import { createChartShareURL, type SharedBirth } from '../lib/chartShare';
import { createChartImage } from '../lib/chartImage';
import type { ZiweiChart } from '../vendor/ziwei-doushu/types';
import type { ZiweiRules } from '../lib/ziweiSchool';

export default function ZiweiShare({ birth, rules, chart }: { birth: SharedBirth; rules: ZiweiRules; chart: ZiweiChart }) {
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const validLink = link === createChartShareURL(window.location.href, birth, rules) ? link : '';
  async function copy() {
    const url = createChartShareURL(window.location.href, birth, rules);
    setLink(url);
    try { await navigator.clipboard.writeText(url); setMessage('分享链接已复制'); }
    catch { setMessage('自动复制不可用，请选择下方链接手动复制'); }
  }
  async function download() {
    setBusy(true); setMessage('');
    try {
      const blob = await createChartImage(chart, rules);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = '天机命盘.png'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage('命盘图片已生成');
    } catch (error) { setMessage(error instanceof Error ? error.message : '生成失败，请重试'); }
    finally { setBusy(false); }
  }
  return <details className="paper p-3 text-xs">
    <summary className="learning-summary">保存与分享命盘</summary>
    <p className="learning-note">链接包含出生日期、时间、性别、经度、时间校正和排盘规则。姓名与城市名称不包含在内；请确认后自行分享。</p>
    <div className="flex flex-wrap gap-2 mt-3">
      <button className="btn-ghost px-3 py-2" onClick={copy}>生成并复制链接</button>
      <button className="btn-ghost px-3 py-2" onClick={download} disabled={busy}>{busy ? '正在生成…' : '下载本命盘图片'}</button>
    </div>
    {validLink && <label className="block mt-3 text-gold">分享链接<textarea aria-label="命盘分享链接" readOnly className="birth-clock break-all" value={validLink} onFocus={e => e.target.select()} rows={3} /></label>}
    {message && <p role="status" className="mt-2 text-gold-bright">{message}</p>}
  </details>;
}
