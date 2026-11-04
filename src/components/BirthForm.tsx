import { useState, useEffect, useMemo, useRef } from 'react';
import { SHI_CHEN, hourToShiChenIndex } from '../lib/lunar';
import { resolveBirthDate } from '../lib/birthDate';
import { isChinaDST } from '../vendor/ziwei-doushu/dst-cn';
import { CITIES, searchCities } from '../lib/cities';
import type { HistoryRecord } from '../lib/store';

interface Props {
  onSubmit: (data: BirthInput) => void;
  records: HistoryRecord[];
  onLoadRecord: (rec: HistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onBack?: () => void;
}

// 通用数字输入框：受控、可空、满 N 位自动跳下一格、失焦时校验
interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  autoNextTo?: string;
  id?: string;
}
function NumberInput({ value, onChange, min = 1, max = 9999, maxLength, placeholder, autoNextTo, id }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setDraft(raw);
    if (raw === '') return;
    const n = parseInt(raw, 10);
    if (!isNaN(n)) onChange(n);
    if (maxLength && raw.length >= maxLength && autoNextTo) {
      const next = document.getElementById(autoNextTo);
      if (next) {
        (next as HTMLInputElement).focus();
        (next as HTMLInputElement).select?.();
      }
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // 关键：从 DOM 读最新值，不用闭包里的 draft（React 18 批处理时 draft 可能滞后）
    const current = e.target.value.replace(/[^\d]/g, '');
    if (current === '') {
      setDraft(String(value));
      return;
    }
    const n = parseInt(current, 10);
    if (isNaN(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    if (clamped !== n) {
      onChange(clamped);
      setDraft(String(clamped));
    }
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={maxLength}
      className="w-full bg-transparent border-b border-gold/30 text-rice py-1 focus:outline-none focus:border-gold-bright"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
    />
  );
}

export interface BirthInput {
  name: string;
  gender: '男' | '女';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  shiChenIndex: number;
  longitude: number;
  useTrueSolar: boolean;
  utcOffsetMinutes?: number;
  daylightSaving?: boolean;
  isLunar: boolean;
  lunarLeap: boolean;
  cityName: string;
}

export default function BirthForm({ onSubmit, records, onLoadRecord, onDeleteRecord, onBack }: Props) {
  const [form, setForm] = useState<BirthInput>({
    name: '',
    gender: '男',
    year: 1990,
    month: 5,
    day: 20,
    hour: 9,
    minute: 0,
    shiChenIndex: 5,
    longitude: 116.41,
    useTrueSolar: false,
    isLunar: false,
    lunarLeap: false,
    cityName: '北京',
  });

  const [error, setError] = useState('');

  // 城市搜索
  const [cityQuery, setCityQuery] = useState('');
  const [showCityList, setShowCityList] = useState(false);
  const cityResults = useMemo(() => searchCities(cityQuery), [cityQuery]);

  const preview = useMemo(() => {
    try { return resolveBirthDate(form); } catch { return null; }
  }, [form]);
  const dstHint = preview && (form.utcOffsetMinutes ?? 480) === 480
    && isChinaDST(preview.originalDate.getFullYear(), preview.originalDate.getMonth() + 1, preview.originalDate.getDate());

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function selectCity(name: string, longitude: number) {
    update('cityName', name);
    update('longitude', longitude);
    setCityQuery('');
    setShowCityList(false);
  }

  function handleSubmit() {
    try {
      resolveBirthDate(form);
      setError('');
      onSubmit({ ...form });
    } catch (error) {
      setError(error instanceof Error ? error.message : '出生日期无效');
    }
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-vermilion">{error}</p>}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gold/70 hover:text-gold text-xs title-display tracking-widest"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="2" y1="7" x2="12" y2="7" />
            <polyline points="6,3 2,7 6,11" />
          </svg>
          返回首页
        </button>
      )}
      <div className="paper p-5 space-y-4">
        <div>
          <h2 className="text-xl text-gold-bright font-bold tracking-widest mb-1 title-display">问 命</h2>
          <p className="text-xs text-gold opacity-60">录入生辰，方可起卦排盘</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs text-gold opacity-70 mb-1">尊姓</label>
            <input
              className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="可不填"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gold opacity-70 mb-1">性别</label>
            <div className="flex gap-2">
              {(['男', '女'] as const).map(g => (
                <button
                  key={g}
                  className={`flex-1 py-1.5 text-sm rounded transition ${
                    form.gender === g ? 'btn-vermilion' : 'btn-ghost'
                  }`}
                  onClick={() => update('gender', g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-1">历法</label>
          <div className="flex gap-2">
            {(['solar', 'lunar'] as const).map(t => (
              <button
                key={t}
                className={`flex-1 py-1.5 text-sm rounded transition ${
                  (t === 'solar' && !form.isLunar) || (t === 'lunar' && form.isLunar)
                    ? 'btn-vermilion' : 'btn-ghost'
                }`}
                onClick={() => update('isLunar', t === 'lunar')}
              >
                {t === 'solar' ? '阳历' : '农历'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">年</label>
            <NumberInput
              id="input-year"
              value={form.year}
              onChange={v => update('year', v)}
              min={1900}
              max={2100}
              maxLength={4}
              placeholder="1990"
              autoNextTo="input-month"
            />
          </div>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">月</label>
            <NumberInput
              id="input-month"
              value={form.month}
              onChange={v => update('month', v)}
              min={1}
              max={12}
              maxLength={2}
              placeholder="5"
              autoNextTo="input-day"
            />
          </div>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">日</label>
            <NumberInput
              id="input-day"
              value={form.day}
              onChange={v => update('day', v)}
              min={1}
              max={31}
              maxLength={2}
              placeholder="20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gold opacity-70 mb-1">时辰</label>
          <div className="grid grid-cols-6 gap-1.5">
            {SHI_CHEN.map(sc => (
              <button
                key={sc.index}
                className={`py-1.5 text-xs rounded transition ${
                  form.shiChenIndex === sc.index ? 'btn-vermilion' : 'btn-ghost'
                }`}
                onClick={() => setForm(f => ({ ...f, shiChenIndex: sc.index, hour: sc.index * 2, minute: 0 }))}
                title={sc.range}
              >
                {sc.name}时
              </button>
            ))}
          </div>
          <p className="text-xs text-gold opacity-50 mt-1">
            {SHI_CHEN[form.shiChenIndex].range}（{form.hour}:{String(form.minute).padStart(2, '0')}）
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gold">出生小时（当地钟表）
            <input aria-label="出生小时" type="number" min="0" max="23" value={form.hour} className="birth-clock"
              onChange={e => { const hour = Number(e.target.value); setForm(f => ({ ...f, hour, shiChenIndex: hourToShiChenIndex(hour) })); }} />
          </label>
          <label className="text-xs text-gold">出生分钟
            <input aria-label="出生分钟" type="number" min="0" max="59" value={form.minute} className="birth-clock" onChange={e => update('minute', Number(e.target.value))} />
          </label>
        </div>
        <label className="block text-xs text-gold">出生地标准时区
          <select aria-label="出生地标准时区" className="birth-clock" value={form.utcOffsetMinutes ?? 480} onChange={e => update('utcOffsetMinutes', Number(e.target.value))}>
            {Array.from({ length: 105 }, (_, i) => -720 + i * 15).map(offset => <option key={offset} value={offset}>UTC{offset >= 0 ? '+' : '−'}{Math.floor(Math.abs(offset) / 60)}:{String(Math.abs(offset) % 60).padStart(2, '0')}</option>)}
          </select>
        </label>
        <div className="space-y-2 text-xs text-rice">
          {dstHint && <p className="text-gold-bright">该日期在参考夏令时表内。请核实出生地当年的实际制度；已换算为标准时的时间无需再减。</p>}
          <label className="flex items-start gap-2"><input type="checkbox" checked={!!form.daylightSaving} onChange={e => update('daylightSaving', e.target.checked)} />
            出生钟表使用夏令时，减去一小时（取消即可撤销）</label>
        </div>
        {/* 真太阳时 + 城市选择 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gold opacity-70">真太阳时校正</label>
            <button
              className={`text-xs px-2 py-0.5 rounded ${form.useTrueSolar ? 'btn-vermilion' : 'btn-ghost'}`}
              onClick={() => update('useTrueSolar', !form.useTrueSolar)}
            >
              {form.useTrueSolar ? '已启用' : '未启用'}
            </button>
          </div>
          {form.useTrueSolar && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gold opacity-70">出生城市</span>
                <input
                  className="flex-1 bg-transparent border-b border-gold/30 text-rice py-1 focus:outline-none focus:border-gold-bright text-sm"
                  value={form.cityName}
                  onChange={e => {
                    update('cityName', e.target.value);
                    setCityQuery(e.target.value);
                    setShowCityList(true);
                  }}
                  onFocus={() => setShowCityList(true)}
                  onBlur={() => setTimeout(() => setShowCityList(false), 150)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && cityResults.length > 0) {
                      const first = cityResults[0];
                      selectCity(first.name, first.longitude);
                    }
                    if (e.key === 'Escape') {
                      setShowCityList(false);
                    }
                  }}
                  placeholder="输入城市名·回车选首个"
                />
              </div>
              {showCityList && cityResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gold/20 rounded bg-ink-soft/90">
                  {cityResults.map(c => (
                    <button
                      key={c.name}
                      className="block w-full text-left px-2 py-1 text-sm text-rice hover:bg-gold/10"
                      onClick={() => selectCity(c.name, c.longitude)}
                    >
                      <span className="text-rice">{c.name}</span>
                      <span className="text-gold opacity-50 text-xs ml-2">{c.province} · {c.longitude.toFixed(2)}°E</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-gold opacity-50">
                <span>共收录 {CITIES.length} 个城市</span>
                <span>·</span>
                <span>经度：{form.longitude.toFixed(2)}°E</span>
              </div>
            </div>
          )}
        </div>

        {form.useTrueSolar && <label className="block text-xs text-gold">出生地经度（东经为正，西经为负）
          <input aria-label="出生地经度" className="birth-clock" type="number" min="-180" max="180" step="0.01" value={form.longitude} onChange={e => update('longitude', Number(e.target.value))} />
        </label>}
        {preview && <div className="border-l-2 border-gold/40 pl-3 text-xs text-rice leading-relaxed" aria-live="polite">
          <p>校正后：{preview.date.getFullYear()}年{preview.date.getMonth() + 1}月{preview.date.getDate()}日 {String(preview.date.getHours()).padStart(2, '0')}:{String(preview.date.getMinutes()).padStart(2, '0')} · {SHI_CHEN[preview.shiChenIndex].name}时</p>
          {form.useTrueSolar && <p className="text-gold">经度 {preview.correction.longitudeCorrectionMinutes.toFixed(1)} 分钟 + 均时差 {preview.correction.equationOfTimeMinutes.toFixed(1)} 分钟</p>}
          <p className="text-gold">晚子时的排盘日期以命盘中的独立规则为准。</p>
        </div>}
        <button
          onClick={handleSubmit}
          className="btn-vermilion w-full py-3 rounded text-base font-bold tracking-widest title-display"
        >
          起 盘
        </button>
      </div>

      {records.length > 0 && (
        <div className="paper p-5">
          <h3 className="text-sm text-gold-bright tracking-widest mb-3">案 牍</h3>
          <div className="space-y-2">
            {records.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 px-3 border-b border-gold/10 last:border-0"
              >
                <button className="flex-1 text-left" onClick={() => onLoadRecord(r)}>
                  <div className="text-rice text-sm">
                    {r.name || '匿名'} · {r.gender} · {r.cityName || `${r.longitude.toFixed(1)}°E`}
                  </div>
                  <div className="text-xs text-gold opacity-60">
                    {r.birthYear}-{String(r.birthMonth).padStart(2,'0')}-{String(r.birthDay).padStart(2,'0')} {SHI_CHEN[r.shiChenIndex]?.name}时
                  </div>
                </button>
                <button className="text-xs text-vermilion opacity-70 px-2" onClick={() => onDeleteRecord(r.id)}>删</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
