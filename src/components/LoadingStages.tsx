/**
 * 大师解析 Loading 动画：4 阶段进度条
 * 起盘 → 排星 → 演卦 → 成文
 */
import { useEffect, useState } from 'react';
import { Taiji, Luopan, Bazi as BaziIcon, Seal } from './Icon';

const STAGES = [
  { key: '排盘', desc: '排布生辰八字', icon: <BaziIcon size={18} />, color: '#c8a45c' },
  { key: '观星', desc: '观紫微星曜', icon: <Taiji size={18} />, color: '#c8a45c' },
  { key: '演卦', desc: '演奇门遁甲', icon: <Luopan size={18} />, color: '#c8a45c' },
  { key: '成文', desc: '凝练解读', icon: <Seal size={18} />, color: '#c8392f' },
];

export function LoadingStages({ stage }: { stage: number }) {
  const safe = Math.max(0, Math.min(STAGES.length - 1, stage));
  return (
    <div className="relative p-4 bg-ink-soft/60 border border-gold/30 rounded-md overflow-hidden">
      {/* 背景跑马灯粒子 */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 400 120">
        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 37) % 400}
            cy={20 + (i * 13) % 80}
            r="0.8"
            fill="#c8a45c"
            opacity={0.3 + (i % 3) * 0.2}
          >
            <animate
              attributeName="opacity"
              values="0.1;0.6;0.1"
              dur={`${1.5 + (i % 4) * 0.5}s`}
              repeatCount="indefinite"
              begin={`${i * 0.15}s`}
            />
          </circle>
        ))}
      </svg>

      <div className="relative">
        <div className="text-center mb-3 title-display tracking-[0.3em] text-gold-bright text-sm">
          大 师 推 演 中
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-1 mb-3">
          {STAGES.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-1">
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(200,164,92,0.1)' }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: i < safe ? '100%' : i === safe ? '70%' : '0%',
                    background: i <= safe
                      ? `linear-gradient(90deg, ${s.color}, ${i === STAGES.length - 1 ? '#c8392f' : '#c8a45c'})`
                      : 'transparent',
                    boxShadow: i === safe ? `0 0 8px ${s.color}` : 'none',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 阶段步骤 */}
        <div className="grid grid-cols-4 gap-2">
          {STAGES.map((s, i) => {
            const state = i < safe ? 'done' : i === safe ? 'active' : 'pending';
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1 transition-all"
                style={{
                  opacity: state === 'pending' ? 0.4 : 1,
                  transform: state === 'active' ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <div
                  className="relative w-9 h-9 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: state === 'done' ? '#c8a45c' : state === 'active' ? s.color : 'rgba(200,164,92,0.2)',
                    background: state === 'pending' ? 'transparent' : `${s.color}22`,
                    color: state === 'pending' ? 'rgba(200,164,92,0.3)' : s.color,
                    boxShadow: state === 'active' ? `0 0 16px ${s.color}88` : 'none',
                  }}
                >
                  {state === 'done' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7 L6 11 L12 3" stroke="#c8a45c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : state === 'active' ? (
                    <span className="relative">
                      {s.icon}
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `1.5px solid ${s.color}`,
                          animation: 'ping 1.2s ease-out infinite',
                        }}
                      />
                    </span>
                  ) : (
                    <span className="text-[10px]">{i + 1}</span>
                  )}
                </div>
                <div
                  className="text-[9px] title-display tracking-widest"
                  style={{ color: state === 'pending' ? 'rgba(200,164,92,0.3)' : s.color }}
                >
                  {s.key}
                </div>
                <div
                  className="text-[8px] leading-tight text-center"
                  style={{ color: state === 'pending' ? 'rgba(200,164,92,0.25)' : 'rgba(245,236,217,0.6)' }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>

        <style>{`@keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.8); opacity: 0; } }`}</style>
      </div>
    </div>
  );
}

/** 流式打字效果（一个字一个字显示） */
export function Typewriter({
  text,
  speed = 12,
  onDone,
  className = '',
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
  className?: string;
}) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (text.length === 0) { onDone?.(); return; }
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <div className={className}>{shown}<span className="animate-pulse">▍</span></div>;
}

/** 逐块加载（渲染纯文本 + 流式光标）— 用于不想用 ReactMarkdown 的场景 */
export function StreamingText({
  text,
  speed = 6,
  className = '',
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (text.length === 0) { setShown(''); return; }
    setShown('');
    let i = 0;
    const total = text.length;
    const step = Math.max(1, Math.floor(total / 250));
    const id = setInterval(() => {
      i = Math.min(total, i + step);
      setShown(text.slice(0, i));
      if (i >= total) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <div className={className}>{shown}<span className="animate-pulse">▍</span></div>;
}

/** 兼容旧名字 */
export const StreamingMarkdown = StreamingText;
