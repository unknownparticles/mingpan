/**
 * 人生 K 线动画绘制
 * - 4 条线（健康/财运/官运/姻缘）依次从 0% 扫到 100%
 * - 每扫一段实时绘制新点
 * - 扫完后可点击点位
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateKLineData, DIMENSION_COLORS, DIMENSION_NAMES, summarizePoint, type Dimension } from '../lib/kline';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
  onSelectPoint?: (age: number) => void;
}

const ALL_DIMS: Dimension[] = ['health', 'wealth', 'career', 'marriage'];

export function KLineAnim({ date, shiChenIndex, gender, onSelectPoint }: Props) {
  const { data, series } = useMemo(
    () => generateKLineData(date, shiChenIndex, gender),
    [date, shiChenIndex, gender]
  );
  

  // 0..1 绘制进度
  const [progress, setProgress] = useState(0);
  const [drawing, setDrawing] = useState(true);
  const [dimOrder] = useState<Dimension[]>(ALL_DIMS);

  useEffect(() => {
    if (!drawing) return;
    let frame: number;
    const start = performance.now();
    const total = 3500; // 3.5 秒画完
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / total);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else setDrawing(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [drawing]);

  // 容器
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

  const height = 240;
  const padding = { top: 24, right: 14, bottom: 28, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  function xForAge(age: number) {
    if (data.length <= 1) return padding.left;
    return padding.left + ((age - 1) / 99) * chartW;
  }
  function yForValue(v: number) {
    return padding.top + (1 - v / 100) * chartH;
  }

  // 当前点索引（0..data.length-1）
  const lastIdx = Math.floor(progress * (data.length - 1));

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (drawing) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const ratio = Math.max(0, Math.min(1, x / chartW));
    const age = Math.max(1, Math.min(100, Math.round(1 + ratio * 99)));
    onSelectPoint?.(age || 0);
  }

  // 选中点
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  // 找到最近的数据点
  const selectedPoint = selectedAge != null
    ? data.find(p => p.age === selectedAge) || data[Math.min(data.length - 1, Math.round((selectedAge - 1) / 5))]
    : null;
  const selectedSummary = selectedAge ? summarizePoint(series, selectedAge) : null;

  return (
    <div ref={containerRef}>
      {/* 绘制状态条 */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          {dimOrder.map((d) => (
            <div
              key={d}
              className="flex items-center gap-1 text-[9px] title-display tracking-widest"
              style={{ color: DIMENSION_COLORS[d] }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: DIMENSION_COLORS[d],
                  opacity: progress >= 1 ? 1 : 0.4,
                  boxShadow: progress >= 1 ? `0 0 6px ${DIMENSION_COLORS[d]}` : 'none',
                }}
              />
              {DIMENSION_NAMES[d]}
            </div>
          ))}
        </div>
        <div className="text-[9px] text-gold/70 title-display tracking-widest">
          {drawing ? '绘制中' : '已成卦'}
          <span className="ml-1 text-gold/40">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1 bg-gold/10 rounded-full overflow-hidden mb-2">
        <div
          className="h-full transition-all duration-75"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, #7aac8a 0%, #c8a45c 33%, #c8392f 66%, #d8756a 100%)`,
            boxShadow: '0 0 8px rgba(200,164,92,0.5)',
          }}
        />
      </div>

      {/* 主图 */}
      <div className="relative bg-ink-soft/40 border border-gold/20 rounded">
        <svg
          width={width}
          height={height}
          onClick={handleSvgClick}
          onMouseDown={handleSvgClick as any}
          className="block"
          style={{ cursor: drawing ? 'wait' : 'pointer', pointerEvents: drawing ? 'none' : 'auto' }}
        >
          {/* 网格 */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={padding.left} y1={yForValue(v)}
                x2={padding.left + chartW} y2={yForValue(v)}
                stroke="rgba(200,164,92,0.1)" strokeWidth="0.6" strokeDasharray="2 3"
              />
              <text x={padding.left - 4} y={yForValue(v) + 3} textAnchor="end" fontSize="8" fill="rgba(200,164,92,0.4)">
                {v}
              </text>
            </g>
          ))}

          {/* x 轴：每 10 岁 */}
          {[1, 25, 50, 75, 100].map((age) => (
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
          ))}

          {/* 各维度曲线：只画到 lastIdx */}
          {dimOrder.map((d, dimI) => {
            const s = series.find(x => x.dim === d)!;
            const visible = data.slice(0, lastIdx + 1);
            if (visible.length === 0) return null;
            const path = visible.map((p, i) => {
              const vi = Math.min(s.values.length - 1, Math.floor((p.age - 1) / 5));
              return `${i === 0 ? 'M' : 'L'} ${xForAge(p.age)} ${yForValue(s.values[vi])}`;
            }).join(' ');
            const gradId = `grad-anim-${d}`;
            const areaPath = visible.length > 1
              ? path + ` L ${xForAge(visible[visible.length - 1].age)} ${padding.top + chartH} L ${xForAge(visible[0].age)} ${padding.top + chartH} Z`
              : '';
            return (
              <g key={d}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={DIMENSION_COLORS[d]} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={DIMENSION_COLORS[d]} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
                <path
                  d={path}
                  stroke={DIMENSION_COLORS[d]}
                  strokeWidth="1.5"
                  fill="none"
                  style={{ filter: `drop-shadow(0 0 3px ${DIMENSION_COLORS[d]})` }}
                />
                {/* 节点（最后 5 个发亮） */}
                {visible.slice(-5).map((p) => {
                  const vi = Math.min(s.values.length - 1, Math.floor((p.age - 1) / 5));
                  return (
                    <circle
                      key={`${d}-${p.age}`}
                      cx={xForAge(p.age)}
                      cy={yForValue(s.values[vi])}
                      r={selectedAge === p.age ? 3 : 1.6}
                      fill={selectedAge === p.age ? DIMENSION_COLORS[d] : '#0a0606'}
                      stroke={DIMENSION_COLORS[d]}
                      strokeWidth="1"
                    />
                  );
                })}
                {/* 当前绘制点（脉冲） */}
                {drawing && (() => {
                  const last = visible[visible.length - 1];
                  const vi = Math.min(s.values.length - 1, Math.floor((last.age - 1) / 5));
                  return (
                  <circle
                    cx={xForAge(last.age)}
                    cy={yForValue(s.values[vi])}
                    r="3"
                    fill={DIMENSION_COLORS[d]}
                  >
                    <animate attributeName="r" values="2;5;2" dur="1s" repeatCount="indefinite" begin={`${dimI * 0.2}s`} />
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" begin={`${dimI * 0.2}s`} />
                  </circle>
                  );
                })()}
              </g>
            );
          })}

          {/* 选中线 */}
          {selectedAge && !drawing && (
            <line
              x1={xForAge(selectedAge)} y1={padding.top}
              x2={xForAge(selectedAge)} y2={padding.top + chartH}
              stroke="#c8a45c" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.7"
            />
          )}

          {/* 边框 */}
          <rect
            x={padding.left} y={padding.top} width={chartW} height={chartH}
            fill="none" stroke="rgba(200,164,92,0.2)" strokeWidth="0.6"
          />
        </svg>
      </div>

      {/* 选中点详情 */}
      {selectedPoint && selectedSummary && (
        <SelectedPointCard
          point={selectedPoint}
          summary={selectedSummary}
          onClose={() => setSelectedAge(null)}
          onAsk={(age) => onSelectPoint?.(age)}
        />
      )}

      {!drawing && (
        <div className="mt-1.5 text-[9px] text-gold/50 text-center title-display tracking-widest">
          {selectedAge ? '' : '点 击 图 表 查 看 任 意 年 龄 · 1-100 岁'}
        </div>
      )}
    </div>
  );
}

function SelectedPointCard({ point, summary, onClose, onAsk }: {
  point: any; summary: any[]; onClose: () => void; onAsk: (age: number) => void;
}) {
  return (
    <div
      className="mt-2 p-2.5 bg-ink-soft/80 border border-gold/40 rounded fade-in"
      style={{ boxShadow: '0 0 12px rgba(200,164,92,0.2)' }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <div className="text-[9px] text-gold/60 title-display tracking-widest">
            {point.year} 年 · {point?.ganZhi} · {point?.age} 岁
          </div>
          <div className="text-sm text-gold-bright font-bold title-display tracking-widest">
            第 {point?.decadeIndex + 1} 大限（{point?.decadeName}）
          </div>
        </div>
        <button onClick={onClose} className="text-gold/60 hover:text-gold text-xs">✕</button>
      </div>

      {/* 四化影响 */}
      {(point?.siHuaHits || []).length > 0 && (
        <div className="text-[9px] text-vermilion/80 title-display tracking-widest mb-1">
          ⚡ {(point?.siHuaHits || []).join(' · ')}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {(summary || []).map((s) => (
          <div
            key={s?.dim}
            className="flex flex-col items-center p-1.5 rounded border"
            style={{ borderColor: `${DIMENSION_COLORS[(s?.dim || "health") as Dimension]}50`, background: `${DIMENSION_COLORS[(s?.dim || "health") as Dimension]}10` }}
          >
            <div className="text-[8px] text-gold/60 title-display tracking-widest">{DIMENSION_NAMES[(s?.dim || "health") as Dimension]}</div>
            <div className="text-base font-bold title-display" style={{ color: DIMENSION_COLORS[(s?.dim || "health") as Dimension] }}>{s.value}</div>
            <div
              className="text-[8px]"
              style={{ color: s.trend === 'up' ? '#7aac8a' : s.trend === 'down' ? '#c8392f' : 'rgba(200,164,92,0.5)' }}
            >
              {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'} {Math.abs(s.change)}
            </div>
          </div>
        ))}
      </div>

      {point?.highlights || [].length > 0 && (
        <div className="text-[10px] text-gold/80 leading-relaxed mb-2">
          {point?.highlights || [].map((h: string, i: number) => <div key={i}>· {h}</div>)}
        </div>
      )}

      <button
        onClick={() => onAsk(point?.age)}
        className="w-full py-1.5 rounded bg-vermilion/80 hover:bg-vermilion text-cream text-[10px] title-display tracking-widest"
      >
        大 师 解 读 此 年
      </button>
    </div>
  );
}
