import { SCHOOL_NAMES, schoolRules, LEAP_LABELS, rulesSummary, type ZiweiRules, type ZiweiSchool } from '../lib/ziweiSchool';

export default function ZiweiRulesPanel({ rules, onChange }: { rules: ZiweiRules; onChange: (rules: ZiweiRules) => void }) {
  return <details className="paper p-3 text-xs">
    <summary className="cursor-pointer text-gold-bright leading-relaxed">排盘规则 <span className="block mt-1 text-gold">{rulesSummary(rules)}</span></summary>
    <div className="space-y-3 mt-3">
      <div className="flex flex-wrap gap-2">{(Object.keys(SCHOOL_NAMES) as ZiweiSchool[]).map(school => <button key={school}
        aria-pressed={rules.school === school} className={`px-3 py-2 rounded ${rules.school === school ? 'btn-vermilion' : 'btn-ghost'}`}
        onClick={() => onChange(schoolRules(school))}>{SCHOOL_NAMES[school]}预设</button>)}</div>
      <p className="text-gold leading-relaxed">预设会重置下方选项；也可独立调整。所有规则按农历正月初一换年，自动保存在本机。起盘时的规则写入新记录；查看记录后调整只影响当前命盘。</p>
      <label className="block text-rice">闰月归属<select aria-label="闰月归属" className="birth-clock" value={rules.leapMonth} onChange={e => onChange({ ...rules, leapMonth: e.target.value as ZiweiRules['leapMonth'] })}>
        {Object.entries(LEAP_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label className="block text-rice">晚子时（23:00–23:59）<select aria-label="晚子时规则" className="birth-clock" value={rules.lateZishi} onChange={e => onChange({ ...rules, lateZishi: e.target.value as ZiweiRules['lateZishi'] })}>
        <option value="next-day">按次日排盘</option><option value="current-day">按当日排盘</option>
      </select></label>
      <label className="block text-rice">星曜亮度表<select aria-label="星曜亮度表" className="birth-clock" value={rules.brightness} onChange={e => onChange({ ...rules, brightness: e.target.value as ZiweiRules['brightness'] })}>
        <option value="default">全书（默认）</option><option value="QS">全书（显式表）</option><option value="ZZ">中州</option><option value="XD1">现代修订一</option><option value="XD2">现代修订二</option>
      </select></label>
    </div>
  </details>;
}
