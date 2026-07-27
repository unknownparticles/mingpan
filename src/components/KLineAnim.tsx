/**
 * 人生 K 线
 * - 首绘动画
 * - 缩放 / 平移
 * - 点击节点查看四维评分
 * - 可对当前节点发起 AI 解析
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateKLineData,
  DIMENSION_COLORS,
  DIMENSION_NAMES,
  summarizePoint,
  findPointByAge,
  clampAge,
  scoreLevel,
  type Dimension,
} from '../lib/kline';

interface Props {
  date: Date;
  shiChenIndex: number;
  gender: '男' | '女';
  /** 对当前选中年龄发起解析（由外部接 AI） */
  onAnalyzePoint?: (age: number) => void;
  /** 兼容旧回调：选中节点时通知 */
  onSelectPoint?: (age: number) => void;
  analyzing?: boolean;
}

const ALL_DIMS: Dimension[] = ['health', 'wealth', 'career', 'marriage'];
const MIN_SPAN = 8; // 最小可视年龄跨度
const MAX_SPAN = 99;

export function KLineAnim({
  date,
  shiChenIndex,
  gender,
  onAnalyzePoint,
  onSelectPoint,
  analyzing = false,
}: Props) {
  const { data, series } = useMemo(
    () => generateKLineData(date, shiChenIndex, gender),
    [date, shiChenIndex, gender],
  );

  const [progress, setProgress] = useState(0);
  const [drawing, setDrawing] = useState(true);
  const [visibleDims, setVisibleDims] = useState<Record<Dimension, boolean>>({
    health: true,
    wealth: true,
    career: true,
    marriage: true,
  });

  // 可视窗口：年龄区间
  const [ageStart, setAgeStart] = useState(1);
  const [ageEnd, setAgeEnd] = useState(100);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  // 拖拽平移
  const dragRef = useRef<{ x: number; start: number; end: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!drawing) return;
    let frame = 0;
    const start = performance.now();
    const total = 2800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / total);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else setDrawing(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [drawing]);

  // 出生/数据变化时重置
  useEffect(() => {
    setProgress(0);
    setDrawing(true);
    setAgeStart(1);
    setAgeEnd(100);
    setSelectedAge(null);
  }, [date, shiChenIndex, gender]);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(280, Math.min(640, w)));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const height = 260;
  const padding = { top: 22, right: 12, bottom: 30, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const span = Math.max(1, ageEnd - ageStart);

  const xForAge = useCallback(
    (age: number) => padding.left + ((age - ageStart) / span) * chartW,
    [ageStart, span, chartW, padding.left],
  );
  const yForValue = useCallback(
    (v: number) => padding.top + (1 - Math.max(0, Math.min(100, v)) / 100) * chartH,
    [padding.top, chartH],
  );

  const ageFromClientX = useCallback(
    (clientX: number, svg: SVGSVGElement) => {
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left - padding.left;
      const ratio = Math.max(0, Math.min(1, x / chartW));
      return clampAge(ageStart + ratio * span);
    },
    [ageStart, span, chartW, padding.left],
  );

  function setWindow(start: number, end: number) {
    let s = Math.max(1, Math.min(100, Math.round(start)));
    let e = Math.max(1, Math.min(100, Math.round(end)));
    if (e - s < MIN_SPAN) {
      const mid = (s + e) / 2;
      s = clampAge(mid - MIN_SPAN / 2);
      e = clampAge(s + MIN_SPAN);
      if (e - s < MIN_SPAN) s = clampAge(e - MIN_SPAN);
    }
    if (e - s > MAX_SPAN) {
      e = s + MAX_SPAN;
    }
    setAgeStart(s);
    setAgeEnd(e);
  }

  function zoomAt(factor: number, centerAge?: number) {
    if (drawing) return;
    const center = centerAge ?? selectedAge ?? (ageStart + ageEnd) / 2;
    const curSpan = ageEnd - ageStart;
    const nextSpan = Math.max(MIN_SPAN, Math.min(MAX_SPAN, curSpan * factor));
    let nextStart = center - nextSpan / 2;
    let nextEnd = center + nextSpan / 2;
    if (nextStart < 1) {
      nextEnd += 1 - nextStart;
      nextStart = 1;
    }
    if (nextEnd > 100) {
      nextStart -= nextEnd - 100;
      nextEnd = 100;
    }
    setWindow(nextStart, nextEnd);
  }

  // 非 passive 滚轮，避免页面跟着滚
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      if (drawing) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - padding.left;
      const ratio = Math.max(0, Math.min(1, x / chartW));
      const age = clampAge(ageStart + ratio * span);
      const factor = e.deltaY > 0 ? 1.18 : 0.85;
      // 直接计算窗口，避免闭包陈旧
      const center = age;
      const curSpan = ageEnd - ageStart;
      const nextSpan = Math.max(MIN_SPAN, Math.min(MAX_SPAN, curSpan * factor));
      let nextStart = center - nextSpan / 2;
      let nextEnd = center + nextSpan / 2;
      if (nextStart < 1) {
        nextEnd += 1 - nextStart;
        nextStart = 1;
      }
      if (nextEnd > 100) {
        nextStart -= nextEnd - 100;
        nextEnd = 100;
      }
      setAgeStart(Math.max(1, Math.round(nextStart)));
      setAgeEnd(Math.min(100, Math.round(nextEnd)));
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [drawing, ageStart, ageEnd, span, chartW, padding.left]);

  function selectAge(age: number) {
    if (drawing) return;
    const a = clampAge(age);
    setSelectedAge(a);
    onSelectPoint?.(a);
    // 若点在窗口外，平移窗口使其居中
    if (a < ageStart || a > ageEnd) {
      const half = span / 2;
      setWindow(a - half, a + half);
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (drawing) return;
    // 仅主键
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, start: ageStart, end: ageEnd };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current || drawing) return;
    const dx = e.clientX - dragRef.current.x;
    if (Math.abs(dx) < 3) return;
    const agePerPx = span / chartW;
    const deltaAges = -dx * agePerPx;
    let s = dragRef.current.start + deltaAges;
    let en = dragRef.current.end + deltaAges;
    if (s < 1) {
      en += 1 - s;
      s = 1;
    }
    if (en > 100) {
      s -= en - 100;
      en = 100;
    }
    setAgeStart(Math.round(s));
    setAgeEnd(Math.round(en));
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const started = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!started || drawing) return;
    const moved = Math.abs(e.clientX - started.x);
    // 位移小视为点击选点
    if (moved < 5) {
      const age = ageFromClientX(e.clientX, e.currentTarget);
      selectAge(age);
    }
  }

  const lastIdx = Math.floor(progress * (data.length - 1));
  const drawnData = drawing ? data.slice(0, lastIdx + 1) : data;
  const windowPoints = drawnData.filter((p) => p.age >= ageStart && p.age <= ageEnd);

  // 节点显示密度：可视跨度越小，节点越全
  const nodeStep = span <= 20 ? 1 : span <= 40 ? 2 : span <= 70 ? 5 : 10;

  const selectedPoint = selectedAge != null ? findPointByAge(data, selectedAge) : null;
  const selectedSummary = selectedAge != null ? summarizePoint(series, selectedAge) : null;
  const overallAvg = selectedPoint
    ? Math.round(
        (selectedPoint.health + selectedPoint.wealth + selectedPoint.career + selectedPoint.marriage) / 4,
      )
    : 0;

  // x 轴刻度
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = span <= 15 ? 2 : span <= 30 ? 5 : span <= 60 ? 10 : 20;
    const first = Math.ceil(ageStart / step) * step;
    for (let a = first; a <= ageEnd; a += step) ticks.push(a);
    if (!ticks.includes(ageStart)) ticks.unshift(ageStart);
    if (!ticks.includes(ageEnd)) ticks.push(ageEnd);
    return ticks;
  }, [ageStart, ageEnd, span]);

  return (
    <div ref={containerRef} className="space-y-2">
      {/* 顶部：维度 + 缩放控件 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_DIMS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setVisibleDims((v) => ({ ...v, [d]: !v[d] }))}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] title-display tracking-widest border transition"
              style={{
                borderColor: visibleDims[d] ? DIMENSION_COLORS[d] : 'rgba(200,164,92,0.15)',
                background: visibleDims[d] ? `${DIMENSION_COLORS[d]}18` : 'transparent',
                color: visibleDims[d] ? DIMENSION_COLORS[d] : 'rgba(200,164,92,0.4)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: visibleDims[d] ? DIMENSION_COLORS[d] : 'rgba(200,164,92,0.25)' }}
              />
              {DIMENSION_NAMES[d]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={drawing}
            onClick={() => zoomAt(0.7)}
            className="w-7 h-7 rounded border border-gold/30 text-gold text-sm hover:border-gold-bright hover:text-gold-bright disabled:opacity-40"
            title="放大"
          >
            +
          </button>
          <button
            type="button"
            disabled={drawing}
            onClick={() => zoomAt(1.35)}
            className="w-7 h-7 rounded border border-gold/30 text-gold text-sm hover:border-gold-bright hover:text-gold-bright disabled:opacity-40"
            title="缩小"
          >
            −
          </button>
          <button
            type="button"
            disabled={drawing}
            onClick={() => setWindow(1, 100)}
            className="px-2 h-7 rounded border border-gold/30 text-gold text-[9px] title-display tracking-widest hover:border-gold-bright disabled:opacity-40"
          >
            全览
          </button>
          <div className="text-[9px] text-gold/60 title-display tracking-widest ml-1 min-w-[64px] text-right">
            {drawing ? `绘制 ${Math.round(progress * 100)}%` : `${ageStart}-${ageEnd}岁`}
          </div>
        </div>
      </div>

      {/* 进度条（仅绘制时） */}
      {drawing && (
        <div className="h-1 bg-gold/10 rounded-full overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #7aac8a 0%, #c8a45c 33%, #c8392f 66%, #d8756a 100%)',
            }}
          />
        </div>
      )}

      {/* 主图 */}
      <div className="relative bg-ink-soft/40 border border-gold/20 rounded overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block touch-none select-none"
          style={{
            cursor: drawing ? 'wait' : dragging ? 'grabbing' : 'crosshair',
            pointerEvents: drawing ? 'none' : 'auto',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
            setDragging(false);
          }}
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
                x={padding.left - 4}
                y={yForValue(v) + 3}
                textAnchor="end"
                fontSize="8"
                fill="rgba(200,164,92,0.45)"
              >
                {v}
              </text>
            </g>
          ))}

          {/* x 轴 */}
          {xTicks.map((age) => (
            <text
              key={age}
              x={xForAge(age)}
              y={height - 8}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(200,164,92,0.55)"
            >
              {age}
            </text>
          ))}

          {/* 曲线 */}
          {ALL_DIMS.filter((d) => visibleDims[d]).map((d) => {
            const pts = windowPoints;
            if (pts.length === 0) return null;
            const path = pts
              .map((p, i) => {
                const v = p[d];
                return `${i === 0 ? 'M' : 'L'} ${xForAge(p.age)} ${yForValue(v)}`;
              })
              .join(' ');
            const gradId = `kline-grad-${d}`;
            const area =
              pts.length > 1
                ? `${path} L ${xForAge(pts[pts.length - 1].age)} ${padding.top + chartH} L ${xForAge(pts[0].age)} ${padding.top + chartH} Z`
                : '';
            return (
              <g key={d}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={DIMENSION_COLORS[d]} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={DIMENSION_COLORS[d]} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {area && <path d={area} fill={`url(#${gradId})`} />}
                <path
                  d={path}
                  stroke={DIMENSION_COLORS[d]}
                  strokeWidth="1.6"
                  fill="none"
                  style={{ filter: `drop-shadow(0 0 2px ${DIMENSION_COLORS[d]})` }}
                />
                {/* 节点 */}
                {pts
                  .filter((p) => p.age % nodeStep === 0 || p.age === selectedAge || p.age === 1 || p.age === 100)
                  .map((p) => {
                    const active = selectedAge === p.age;
                    return (
                      <circle
                        key={`${d}-${p.age}`}
                        cx={xForAge(p.age)}
                        cy={yForValue(p[d])}
                        r={active ? 3.4 : span <= 25 ? 2.2 : 1.5}
                        fill={active ? DIMENSION_COLORS[d] : '#0a0606'}
                        stroke={DIMENSION_COLORS[d]}
                        strokeWidth={active ? 1.4 : 1}
                        opacity={active ? 1 : 0.85}
                      />
                    );
                  })}
              </g>
            );
          })}

          {/* 选中竖线 + 年龄标签 */}
          {selectedAge != null && selectedAge >= ageStart && selectedAge <= ageEnd && !drawing && (
            <g>
              <line
                x1={xForAge(selectedAge)}
                y1={padding.top}
                x2={xForAge(selectedAge)}
                y2={padding.top + chartH}
                stroke="#c8a45c"
                strokeWidth="0.9"
                strokeDasharray="3 2"
                opacity="0.85"
              />
              <rect
                x={xForAge(selectedAge) - 18}
                y={padding.top - 14}
                width="36"
                height="12"
                rx="2"
                fill="rgba(200,164,92,0.2)"
                stroke="rgba(200,164,92,0.5)"
                strokeWidth="0.6"
              />
              <text
                x={xForAge(selectedAge)}
                y={padding.top - 5}
                textAnchor="middle"
                fontSize="8"
                fill="#e6c878"
              >
                {selectedAge}岁
              </text>
            </g>
          )}

          <rect
            x={padding.left}
            y={padding.top}
            width={chartW}
            height={chartH}
            fill="none"
            stroke="rgba(200,164,92,0.22)"
            strokeWidth="0.6"
          />
        </svg>

        {/* 缩略导航 + 拖动窗口 */}
        <div className="px-3 pb-2 pt-1">
          <div
            className="relative h-2 bg-gold/10 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (drawing) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const center = 1 + ratio * 99;
              setWindow(center - span / 2, center + span / 2);
            }}
          >
            <div
              className="absolute top-0 bottom-0 bg-gold/45 rounded-full"
              style={{
                left: `${((ageStart - 1) / 99) * 100}%`,
                width: `${(span / 99) * 100}%`,
              }}
            />
            {selectedAge != null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-vermilion"
                style={{ left: `${((selectedAge - 1) / 99) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[8px] text-gold/40 mt-0.5 title-display">
            <span>1</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* 节点评分卡 */}
      {selectedPoint && selectedSummary && !drawing && (
        <div
          className="p-3 bg-ink-soft/80 border border-gold/40 rounded fade-in space-y-2"
          style={{ boxShadow: '0 0 16px rgba(200,164,92,0.18)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] text-gold/60 title-display tracking-widest">
                {selectedPoint.year} 年 · {selectedPoint.ganZhi} · {selectedPoint.age} 岁
              </div>
              <div className="text-sm text-gold-bright font-bold title-display tracking-widest mt-0.5">
                节 点 评 分
                <span className="ml-2 text-[11px] text-gold/70 font-normal">
                  综合 {overallAvg} · {scoreLevel(overallAvg)}
                </span>
              </div>
              <div className="text-[9px] text-gold/50 mt-0.5">
                大限：第 {selectedPoint.decadeIndex + 1} 步 · {selectedPoint.decadeName}宫
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => selectAge((selectedAge || selectedPoint.age) - 1)}
                className="w-7 h-7 rounded border border-gold/30 text-gold text-xs hover:border-gold-bright"
                title="上一年"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => selectAge((selectedAge || selectedPoint.age) + 1)}
                className="w-7 h-7 rounded border border-gold/30 text-gold text-xs hover:border-gold-bright"
                title="下一年"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setSelectedAge(null)}
                className="w-7 h-7 rounded border border-gold/20 text-gold/60 text-xs hover:text-gold"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {selectedSummary.map((s) => (
              <div
                key={s.dim}
                className="flex flex-col items-center p-1.5 rounded border"
                style={{
                  borderColor: `${DIMENSION_COLORS[s.dim]}55`,
                  background: `${DIMENSION_COLORS[s.dim]}12`,
                }}
              >
                <div className="text-[8px] text-gold/60 title-display tracking-widest">
                  {DIMENSION_NAMES[s.dim]}
                </div>
                <div className="text-base font-bold title-display" style={{ color: DIMENSION_COLORS[s.dim] }}>
                  {s.value}
                </div>
                <div className="text-[8px]" style={{ color: DIMENSION_COLORS[s.dim] }}>
                  {s.level}
                </div>
                <div
                  className="text-[8px] flex items-center gap-0.5 mt-0.5"
                  style={{
                    color:
                      s.trend === 'up' ? '#7aac8a' : s.trend === 'down' ? '#c8392f' : 'rgba(200,164,92,0.5)',
                  }}
                >
                  {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                  <span>{Math.abs(s.change)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 四化 / 提示 */}
          {(selectedPoint.siHua?.details?.length > 0 || selectedPoint.highlights?.length > 0) && (
            <div className="text-[10px] text-rice/80 leading-relaxed space-y-1 border-t border-gold/15 pt-2">
              {selectedPoint.siHua?.details?.length > 0 && (
                <div>
                  <span className="text-gold/60">四化：</span>
                  {selectedPoint.siHua.details.join('；')}
                </div>
              )}
              {selectedPoint.highlights?.length > 0 && (
                <div>
                  <span className="text-gold/60">提示：</span>
                  {selectedPoint.highlights.join('；')}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={analyzing || (!onAnalyzePoint && !onSelectPoint)}
              onClick={() => {
                const age = selectedPoint.age;
                if (onAnalyzePoint) onAnalyzePoint(age);
                else onSelectPoint?.(age);
              }}
              className="flex-1 py-2 rounded bg-vermilion/85 hover:bg-vermilion text-cream text-[11px] title-display tracking-widest disabled:opacity-50"
            >
              {analyzing ? '解析中…' : `解析此年（${selectedPoint.year}）`}
            </button>
            <button
              type="button"
              disabled={drawing}
              onClick={() => zoomAt(0.5, selectedPoint.age)}
              className="px-3 py-2 rounded border border-gold/40 text-gold text-[10px] title-display tracking-widest hover:border-gold-bright"
            >
              放大此处
            </button>
          </div>
        </div>
      )}

      {!selectedPoint && !drawing && (
        <div className="text-[9px] text-gold/50 text-center title-display tracking-widest leading-relaxed">
          点击节点查看评分 · 滚轮/± 缩放 · 拖拽平移 · 可解析每一年
        </div>
      )}
    </div>
  );
}
