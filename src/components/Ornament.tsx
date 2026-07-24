/**
 * 国风装饰底纹 / 边框 / 卷轴
 * 纯 SVG，零外部依赖
 */
import type { CSSProperties, SVGProps } from 'react';

const baseSvg = (props: SVGProps<SVGSVGElement>) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  ...props,
});

/** 全屏背景：朱红+墨黑渐变 + 祥云+回纹 + 太极水印 */
export function BackgroundLayer({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}>
      {/* 基础径向：中心米色→边缘墨黑 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #1f1410 0%, #0a0606 55%, #050303 100%)',
        }}
      />
      {/* 朱红晕（顶部 + 底部） */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,57,47,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200,57,47,0.2) 0%, transparent 60%)',
        }}
      />
      {/* 烫金噪点（极弱） */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.78  0 0 0 0 0.64  0 0 0 0 0.36  0 0 0 0.4 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* 回纹底层（重复） */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.02]"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="huiwen" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M5 5 H15 V15 H5 Z M25 5 H35 V15 H25 Z M5 25 H15 V35 H5 Z M25 25 H35 V35 H25 Z M15 15 H25 V25 H15 Z"
              stroke="#c8a45c" strokeWidth="0.6" fill="none"
            />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#huiwen)" />
      </svg>
      {/* 顶部祥云 */}
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-20"
        viewBox="0 0 600 200"
      >
        <defs>
          <linearGradient id="cloud-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8a45c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M60 80 C40 60 60 40 90 50 C100 30 140 30 150 50 C180 40 200 60 180 80 C200 100 160 110 140 90 C120 110 80 100 60 80 Z"
          fill="url(#cloud-grad)"
        />
        <path
          d="M420 100 C400 80 420 60 450 70 C460 50 500 50 510 70 C540 60 560 80 540 100 C560 120 520 130 500 110 C480 130 440 120 420 100 Z"
          fill="url(#cloud-grad)"
        />
        <path
          d="M240 40 C220 30 240 10 270 20 C280 0 320 0 330 20 C360 10 380 30 360 40 C380 60 340 70 320 50 C300 70 260 60 240 40 Z"
          fill="url(#cloud-grad)"
        />
      </svg>
      {/* 底部山影 */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-[260px] opacity-25"
        viewBox="0 0 1000 260"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="mt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0606" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0606" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path
          d="M0 260 L0 200 L80 140 L160 170 L240 110 L320 150 L400 80 L480 130 L560 100 L640 160 L720 120 L800 170 L880 130 L1000 180 L1000 260 Z"
          fill="url(#mt-grad)" stroke="#c8a45c" strokeWidth="0.6" opacity="0.5"
        />
        <path
          d="M0 260 L0 230 L100 200 L220 220 L340 180 L460 210 L580 190 L700 220 L820 200 L1000 220 L1000 260 Z"
          fill="#0a0606" opacity="0.7"
        />
      </svg>
      {/* 中心太极水印（极淡） */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.025]"
        viewBox="0 0 200 200"
      >
        <path d="M100 20 A80 80 0 0 1 100 180 A40 40 0 0 1 100 100 A40 40 0 0 0 100 20 Z" fill="#c8a45c" />
        <circle cx="100" cy="60" r="8" fill="#0a0606" />
        <circle cx="100" cy="140" r="8" fill="#c8a45c" />
      </svg>
    </div>
  );
}

/** 标题卷轴：烫金横线 + 中央印章式文字 */
export function ScrollTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center gap-2 my-4 ${className}`}>
      <svg className="flex-shrink-0" width="40" height="14" viewBox="0 0 40 14">
        <line x1="0" y1="7" x2="36" y2="7" stroke="#c8a45c" strokeWidth="0.8" />
        <circle cx="38" cy="7" r="1.6" fill="#c8a45c" />
      </svg>
      <h2 className="text-base font-serif tracking-[0.4em] text-gold title-display px-2">
        {children}
      </h2>
      <svg className="flex-shrink-0" width="40" height="14" viewBox="0 0 40 14">
        <line x1="4" y1="7" x2="40" y2="7" stroke="#c8a45c" strokeWidth="0.8" />
        <circle cx="2" cy="7" r="1.6" fill="#c8a45c" />
      </svg>
    </div>
  );
}

/** 卷轴卡片（带烫金边角） */
export function ScrollCard({
  children,
  className = '',
  accent = 'gold',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: 'gold' | 'vermilion' | 'jade';
  style?: CSSProperties;
}) {
  const color = accent === 'vermilion' ? '#c8392f' : accent === 'jade' ? '#7aac8a' : '#c8a45c';
  return (
    <div
      className={`relative bg-ink-soft/80 backdrop-blur-sm border ${className}`}
      style={{
        borderColor: `${color}40`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 0 24px rgba(0,0,0,0.6), 0 0 1px ${color}40`,
        ...style,
      }}
    >
      {/* 四角烫金装饰 */}
      <svg className="absolute top-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
        <path d="M0 8 L0 0 L8 0" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="2" cy="2" r="0.8" fill={color} />
      </svg>
      <svg className="absolute top-0 right-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
        <path d="M20 8 L20 0 L12 0" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="18" cy="2" r="0.8" fill={color} />
      </svg>
      <svg className="absolute bottom-0 left-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
        <path d="M0 12 L0 20 L8 20" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="2" cy="18" r="0.8" fill={color} />
      </svg>
      <svg className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
        <path d="M20 12 L20 20 L12 20" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="18" cy="18" r="0.8" fill={color} />
      </svg>
      {children}
    </div>
  );
}

/** 朱砂横线 + 中央水滴（分隔符） */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 my-3 ${className}`}>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-gold/60" />
      <svg width="14" height="10" viewBox="0 0 14 10">
        <path
          d="M7 0 L9 4 L7 8 L5 4 Z M0 4 L4 4 M10 4 L14 4"
          fill="#c8a45c" stroke="#c8a45c" strokeWidth="0.4"
        />
      </svg>
      <span className="flex-1 h-px bg-gradient-to-l from-transparent via-gold/40 to-gold/60" />
    </div>
  );
}

/** 印章按钮：朱砂红底烫金字 + 朱砂印角 */
export function SealButton({
  children,
  onClick,
  disabled,
  size = 'md',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-8 py-3 text-base' : 'px-5 py-2.5 text-sm';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${padding} font-serif tracking-[0.2em] transition-all
        ${disabled
          ? 'bg-ink/50 text-gold/30 border border-gold/10 cursor-not-allowed'
          : 'bg-gradient-to-b from-vermilion to-vermilion-dark text-cream border border-gold/60 hover:from-vermilion-light hover:to-vermilion active:scale-95 shadow-[0_0_16px_rgba(200,57,47,0.4)]'
        } ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {disabled ? null : (
        <span className="absolute top-0.5 right-1 text-[8px] text-gold/70">印</span>
      )}
    </button>
  );
}

/** 角落小卷云（页面四角装饰） */
export function CornerCloud({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute opacity-30 ${className}`}
      width="80" height="80" viewBox="0 0 80 80"
    >
      <defs>
        <linearGradient id="cc-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 40 C0 20 20 0 40 0 M0 20 C20 20 20 40 0 40 M20 0 C20 20 40 20 40 0"
        stroke="url(#cc-grad)" strokeWidth="0.6" fill="none"
      />
      <circle cx="6" cy="6" r="1.2" fill="#c8a45c" />
    </svg>
  );
}

/** 跑马灯粒子（极淡的烫金光点） */
export function Particle({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      width="200" height="200" viewBox="0 0 200 200"
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const x = (i * 53 + 11) % 200;
        const y = (i * 71 + 23) % 200;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="0.6"
            fill="#c8a45c"
            opacity={0.2 + (i % 3) * 0.15}
          />
        );
      })}
    </svg>
  );
}

export const _svg = baseSvg;
