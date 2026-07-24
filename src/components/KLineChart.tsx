/**
 * 人生 K 线图
 * - 1-100 岁 4 维度（健康/财运/官运/姻缘）
 * - 可缩放（+/- 按钮 + 滑块）
 * - 可拖动（水平 touch/mouse）
 * - 点击点位弹卡片
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateKLineData, summarizePoint, DIMENSION_COLORS, DIMENSION_NAMES, type Dimension } from '../lib/kline';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
  onAskAnalysis?: (data: { data: ReturnType<typeof generateKLineData>; selectedAge: number }) => void;
  onAskDimension?: (data: { dim: Dimension; values: number[]; age: number }) => void;
}

const ALL_DIMS: Dimension[] = ['health', 'wealth', 'career', 'marriage'];

export function KLineChart({ date, shiChenIndex, gender, onAskAnalysis, onAskDimension }: Props) {
  const { birthYear, data, series } = useMemo(
    () => generateKLineData(date, shiChenIndex, gender),
    [date, shiChenIndex, gender]
  );

  // 当前显示的年龄范围
  const [ageStart, setAgeStart] = useState(1);
  const [ageEnd, setAgeEnd] = useState(100);

  // 选中点位
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  // 维度可见
  const [visibleDims, setVisibleDims] = useState<Record<Dimension, boolean>>({
    health: true, wealth: true, career: true, marriage: true,
  });

  // 容器尺寸
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(280, Math.min(560, w)));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const height = 280;
  const padding = { top: 20, right: 16, bottom: 30, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const visibleData = useMemo(
    () => data.filter(p => p.age >= ageStart && p.age <= ageEnd),
    [data, ageStart, ageEnd]
  );

  // 缩放
  function zoom(factor: number) {
    const span = ageEnd - ageStart;
    const newSpan = Math.max(10, Math.min(100, Math.round(span * factor)));
    const center = (ageStart + ageEnd) / 2;
    let ns = Math.max(1, Math.round(center - newSpan / 2));
    let ne = Math.min(100, ns + newSpan);
    if (ne === 100) ns = Math.max(1, ne - newSpan);
    setAgeStart(ns);
    setAgeEnd(ne);
  }

  function reset() {
    setAgeStart(1);
    setAgeEnd(100);
    setSelectedAge(null);
  }

  function xForAge(age: number) {
    if (visibleData.length <= 1) return padding.left;
    const idx = age - ageStart;
    return padding.left + (idx / (ageEnd - ageStart)) * chartW;
  }
  function yForValue(v: number) {
    return padding.top + (1 - v / 100) * chartH;
  }

  // 找到点击位置最近的年龄
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const ratio = Math.max(0, Math.min(1, x / chartW));
    const age = Math.round(ageStart + ratio * (ageEnd - ageStart));
    setSelectedAge(age);
  }

  const selectedSummary = selectedAge ? summarizePoint(series, selectedAge) : null;
  const selectedPoint = selectedAge ? data[selectedAge - 1] : null;

  return (
    <div ref={containerRef} className="relative">
      {/* 维度图例 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {ALL_DIMS.map((d) => (
          <button
            key={d}
            onClick={() => setVisibleDims((v) => ({ ...v, [d]: !v[d] }))}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] title-display tracking-widest transition border"
            style={{
              borderColor: visibleDims[d] ? DIMENSION_COLORS[d] : 'rgba(200,164,92,0.15)',
              background: visibleDims[d] ? `${DIMENSION_COLORS[d]}20` : 'transparent',
              color: visibleDims[d] ? DIMENSION_COLORS[d] : 'rgba(200,164,92,0.4)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: visibleDims[d] ? DIMENSION_COLORS[d] : 'rgba(200,164,92,0.3)' }}
            />
            {DIMENSION_NAMES[d]}
          </button>
        ))}
      </div>

      {/* 缩放控制 */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => zoom(0.6)}
            className="w-7 h-7 rounded border border-gold/30 text-gold hover:bg-gold/10 flex items-center justify-center"
            title="放大"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
          <button
            onClick={() => zoom(1.6)}
            className="w-7 h-7 rounded border border-gold/30 text-gold hover:bg-gold/10 flex items-center justify-center"
            title="缩小"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
          <button
            onClick={reset}
            className="px-2 h-7 rounded border border-gold/30 text-gold hover:bg-gold/10 text-[10px] title-display tracking-widest"
          >
            全览
          </button>
        </div>
        <div className="text-[10px] text-gold/70 title-display tracking-widest">
          {ageStart} ~ {ageEnd} 岁
        </div>
      </div>

      {/* 主图 */}
      <div className="relative bg-ink-soft/40 border border-gold/20 rounded">
        <svg
          width={width}
          height={height}
          onClick={handleSvgClick}
          className="block"
          style={{ cursor: 'crosshair' }}
        >
          {/* 网格 */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={yForValue(v)}
                x2={padding.left + chartW}
                y2={yForValue(v)}
                stroke="rgba(200,164,92,0.1)"
                strokeWidth="0.6"
                strokeDasharray="2 3"
              />
              <text
                x={padding.left - 6}
                y={yForValue(v) + 3}
                textAnchor="end"
                fontSize="8"
                fill="rgba(200,164,92,0.4)"
              >
                {v}
              </text>
            </g>
          ))}

          {/* x 轴年龄标签（每 10 岁） */}
          {Array.from({ length: Math.ceil((ageEnd - ageStart) / 10) + 1 }).map((_, i) => {
            const age = ageStart + i * 10;
            if (age > ageEnd) return null;
            return (
              <text
                key={age}
                x={xForAge(age)}
                y={height - 8}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(200,164,92,0.5)"
              >
                {age}
              </text>
            );
          })}

          {/* 各维度曲线 */}
          {ALL_DIMS.filter(d => visibleDims[d]).map((d) => {
            const s = series.find(x => x.dim === d)!;
            const path = visibleData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForAge(p.age)} ${yForValue(s.values[p.age - 1])}`).join(' ');
            // 渐变填充
            const gradId = `grad-${d}`;
            const areaPath = path + ` L ${xForAge(visibleData[visibleData.length - 1].age)} ${padding.top + chartH} L ${xForAge(visibleData[0].age)} ${padding.top + chartH} Z`;
            return (
              <g key={d}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={DIMENSION_COLORS[d]} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={DIMENSION_COLORS[d]} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#${gradId})`} />
                <path d={path} stroke={DIMENSION_COLORS[d]} strokeWidth="1.4" fill="none" />
                {/* 节点 */}
                {visibleData.map((p) => (
                  <circle
                    key={p.age}
                    cx={xForAge(p.age)}
                    cy={yForValue(s.values[p.age - 1])}
                    r={selectedAge === p.age ? 3 : 1.5}
                    fill={selectedAge === p.age ? DIMENSION_COLORS[d] : '#0a0606'}
                    stroke={DIMENSION_COLORS[d]}
                    strokeWidth="1"
                  />
                ))}
              </g>
            );
          })}

          {/* 选中点高亮线 */}
          {selectedAge && (
            <line
              x1={xForAge(selectedAge)}
              y1={padding.top}
              x2={xForAge(selectedAge)}
              y2={padding.top + chartH}
              stroke="#c8a45c"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          )}

          {/* 边框 */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartW}
            height={chartH}
            fill="none"
            stroke="rgba(200,164,92,0.2)"
            strokeWidth="0.6"
          />
        </svg>

        {/* 缩略导航条 */}
        <div className="px-3 pb-2 pt-1">
          <div className="relative h-1.5 bg-gold/10 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-gold/40 rounded-full"
              style={{
                left: `${(ageStart - 1) / 99 * 100}%`,
                right: `${100 - (ageEnd / 99 * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-gold/40 mt-0.5 title-display">
            <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>
      </div>

      {/* 点位详情卡 */}
      {selectedPoint && selectedSummary && (
        <div
          className="mt-2 p-3 bg-ink-soft/80 border border-gold/40 rounded fade-in"
          style={{ boxShadow: '0 0 16px rgba(200,164,92,0.2)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[10px] text-gold/60 title-display tracking-widest">
                {birthYear + selectedPoint.age - 1} 年 · {selectedPoint.age} 岁
              </div>
              <div className="text-sm text-gold-bright font-bold title-display tracking-widest mt-0.5">
                当 年 运 势
              </div>
            </div>
            <button
              onClick={() => setSelectedAge(null)}
              className="text-gold/60 hover:text-gold text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {selectedSummary.map((s) => (
              <div
                key={s.dim}
                className="flex flex-col items-center p-1.5 rounded border"
                style={{
                  borderColor: `${DIMENSION_COLORS[s.dim]}50`,
                  background: `${DIMENSION_COLORS[s.dim]}10`,
                }}
              >
                <div className="text-[8px] text-gold/60 title-display tracking-widest">
                  {DIMENSION_NAMES[s.dim]}
                </div>
                <div
                  className="text-base font-bold title-display"
                  style={{ color: DIMENSION_COLORS[s.dim] }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[8px] flex items-center gap-0.5"
                  style={{
                    color: s.trend === 'up' ? '#7aac8a' : s.trend === 'down' ? '#c8392f' : 'rgba(200,164,92,0.5)',
                  }}
                >
                  {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                  <span>{Math.abs(s.change)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onAskAnalysis?.({ data: { birthYear, data, series, astrolabe: null, bazi: null }, selectedAge: selectedPoint.age })}
              className="flex-1 py-1.5 rounded bg-vermilion/80 hover:bg-vermilion text-cream text-[10px] title-display tracking-widest"
            >
              大师详解此年
            </button>
            <button
              onClick={() => onAskDimension?.({ dim: selectedSummary[0].dim, values: series.find(s => s.dim === selectedSummary[0].dim)!.values, age: selectedPoint.age })}
              className="px-3 py-1.5 rounded border border-gold/40 text-gold text-[10px] title-display tracking-widest"
            >
              此维度解读
            </button>
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <div className="mt-2 text-[9px] text-gold/50 text-center title-display tracking-widest">
        点击图表选年龄 · {ALL_DIMS.filter(d => visibleDims[d]).length} 维叠加 · 可缩放
      </div>
    </div>
  );
}
