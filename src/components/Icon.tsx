import type { SVGProps } from 'react';

/**
 * 国风手绘 SVG 图标库
 * 全部 stroke 风格，配色 currentColor；可缩放、可换色
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** 太极图 */
export function Taiji({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <radialGradient id="tj-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5ecd9" />
          <stop offset="100%" stopColor="#c8a45c" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" stroke="url(#tj-g)" strokeWidth="1.2" fill="#0a0606" />
      <path d="M32 4 A28 28 0 0 1 32 60 A14 14 0 0 1 32 32 A14 14 0 0 0 32 4 Z" fill="currentColor" opacity="0.9" />
      <circle cx="32" cy="18" r="2.4" fill="#0a0606" />
      <circle cx="32" cy="46" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** 八卦 - 后天八卦（4 爻示意） */
export function Bagua({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <radialGradient id="bg-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5ecd9" />
          <stop offset="100%" stopColor="#c8a45c" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" stroke="url(#bg-g)" strokeWidth="1.2" />
      {/* 8 根爻（实线 1 / 虚线 0 表示卦象）— 简化为放射状纹饰 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 32 32)`}>
          <line x1="32" y1="6" x2="32" y2="58" stroke="url(#bg-g)" strokeWidth="0.8" />
          <line x1="29" y1="14" x2="35" y2="14" stroke="url(#bg-g)" strokeWidth="0.8" />
          <line x1="29" y1="32" x2="35" y2="32" stroke="url(#bg-g)" strokeWidth="0.8" />
          <line x1="29" y1="50" x2="35" y2="50" stroke="url(#bg-g)" strokeWidth="0.8" />
        </g>
      ))}
      <circle cx="32" cy="32" r="10" stroke="url(#bg-g)" strokeWidth="1" fill="#0a0606" />
      <Taiji size={16} x={24} y={24} />
    </svg>
  );
}

/** 罗盘（奇门遁甲） */
export function Luopan({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <radialGradient id="lp-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c8a45c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="0.6" />
      <line x1="32" y1="4" x2="32" y2="60" stroke="currentColor" strokeWidth="0.6" />
      <line x1="4" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="0.6" />
      <line x1="13" y1="13" x2="51" y2="51" stroke="currentColor" strokeWidth="0.4" />
      <line x1="51" y1="13" x2="13" y2="51" stroke="currentColor" strokeWidth="0.4" />
      {/* 八卦方位文字用 dot 标 */}
      <circle cx="32" cy="9" r="1.4" fill="currentColor" />
      <circle cx="55" cy="32" r="1.4" fill="currentColor" />
      <circle cx="32" cy="55" r="1.4" fill="currentColor" />
      <circle cx="9" cy="32" r="1.4" fill="currentColor" />
      {/* 中心指针 */}
      <polygon points="32,16 28,30 36,30" fill="currentColor" />
      <polygon points="32,48 28,34 36,34" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** 八字四柱 */
export function Bazi({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="bz-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#7a5a2a" />
        </linearGradient>
      </defs>
      {/* 4 根柱子 */}
      <rect x="6" y="14" width="11" height="36" stroke="url(#bz-g)" strokeWidth="0.8" fill="#1a1010" />
      <rect x="19" y="14" width="11" height="36" stroke="url(#bz-g)" strokeWidth="0.8" fill="#1a1010" />
      <rect x="32" y="14" width="11" height="36" stroke="url(#bz-g)" strokeWidth="0.8" fill="#1a1010" />
      <rect x="45" y="14" width="11" height="36" stroke="url(#bz-g)" strokeWidth="0.8" fill="#1a1010" />
      <line x1="11.5" y1="18" x2="11.5" y2="26" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="11.5" y1="30" x2="11.5" y2="38" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="11.5" y1="42" x2="11.5" y2="46" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="24.5" y1="18" x2="24.5" y2="22" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="24.5" y1="26" x2="24.5" y2="34" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="24.5" y1="38" x2="24.5" y2="46" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="37.5" y1="18" x2="37.5" y2="26" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="37.5" y1="30" x2="37.5" y2="34" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="37.5" y1="38" x2="37.5" y2="46" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="50.5" y1="18" x2="50.5" y2="22" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="50.5" y1="26" x2="50.5" y2="38" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="50.5" y1="42" x2="50.5" y2="46" stroke="url(#bz-g)" strokeWidth="1.4" />
      <line x1="2" y1="14" x2="62" y2="14" stroke="url(#bz-g)" strokeWidth="1.2" />
      <line x1="2" y1="50" x2="62" y2="50" stroke="url(#bz-g)" strokeWidth="1.2" />
    </svg>
  );
}

/** 朱砂方印 */
export function Seal({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="se-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d44a3a" />
          <stop offset="100%" stopColor="#8a1e1a" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="48" height="48" rx="3" fill="url(#se-g)" opacity="0.95" />
      <rect x="10" y="12" width="44" height="44" rx="2" fill="none" stroke="#f5ecd9" strokeWidth="1.6" />
      <text x="32" y="38" textAnchor="middle" fill="#f5ecd9" fontSize="22" fontFamily="serif" fontWeight="700">命</text>
      <text x="32" y="54" textAnchor="middle" fill="#f5ecd9" fontSize="6" fontFamily="serif" letterSpacing="1">之 印</text>
    </svg>
  );
}

/** 卷轴（卷起） */
export function Scroll({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="sc-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a5a2a" />
          <stop offset="50%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#7a5a2a" />
        </linearGradient>
      </defs>
      <rect x="14" y="10" width="36" height="44" fill="#f5ecd9" opacity="0.12" stroke="url(#sc-g)" strokeWidth="0.8" />
      <ellipse cx="14" cy="32" rx="4" ry="22" fill="url(#sc-g)" />
      <ellipse cx="14" cy="32" rx="2" ry="20" fill="#3a2410" />
      <ellipse cx="50" cy="32" rx="4" ry="22" fill="url(#sc-g)" />
      <ellipse cx="50" cy="32" rx="2" ry="20" fill="#3a2410" />
      <line x1="22" y1="20" x2="42" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="28" x2="42" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="36" x2="42" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="44" x2="42" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/** 祥云 */
export function Cloud({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="cl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5ecd9" />
          <stop offset="100%" stopColor="#c8a45c" />
        </linearGradient>
      </defs>
      <path
        d="M12 40 C6 40 4 32 10 30 C8 22 18 18 22 24 C26 18 36 18 38 26 C44 24 52 28 50 36 C56 38 56 46 48 46 L14 46 C8 46 8 40 12 40 Z"
        stroke="url(#cl-g)" strokeWidth="1.2" fill="#1a1010" fillOpacity="0.6"
      />
      <path
        d="M22 24 C26 18 36 18 38 26 C44 24 52 28 50 36"
        stroke="url(#cl-g)" strokeWidth="0.6" fill="none" opacity="0.8"
      />
    </svg>
  );
}

/** 河图洛书（黑白点阵） */
export function Hetu({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="8" y="8" width="48" height="48" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
      {[20, 32, 44].map((y) =>
        [20, 32, 44].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="currentColor" opacity="0.85" />
        ))
      )}
      <circle cx="20" cy="20" r="2.8" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="44" cy="20" r="2.8" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="20" cy="44" r="2.8" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="44" cy="44" r="2.8" fill="none" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

/** 天干地支（圆形 + 字） */
export function DIZHI({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="0.6" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 32 + Math.cos(rad) * 22;
        const y1 = 32 + Math.sin(rad) * 22;
        const x2 = 32 + Math.cos(rad) * 26;
        const y2 = 32 + Math.sin(rad) * 26;
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />;
      })}
      <text x="32" y="36" textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="serif" fontWeight="600">干</text>
    </svg>
  );
}

/** 吉日 / 历法 */
export function Calendar({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="ca-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d44a3a" />
          <stop offset="100%" stopColor="#7a1818" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="48" height="44" rx="2" stroke="url(#ca-g)" strokeWidth="1.2" fill="#1a0808" />
      <rect x="8" y="12" width="48" height="10" fill="url(#ca-g)" opacity="0.85" />
      <line x1="18" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <line x1="46" y1="6" x2="46" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="22" cy="34" r="1.4" fill="currentColor" />
      <circle cx="32" cy="34" r="1.4" fill="currentColor" />
      <circle cx="42" cy="34" r="1.4" fill="currentColor" />
      <circle cx="22" cy="44" r="1.4" fill="currentColor" />
      <circle cx="32" cy="44" r="1.4" fill="currentColor" />
      <circle cx="42" cy="44" r="1.4" fill="currentColor" />
      <text x="32" y="34" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="serif" fontWeight="700">吉</text>
    </svg>
  );
}

/** 财富（金元宝） */
export function Ingot({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="in-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d96b" />
          <stop offset="50%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#7a5a2a" />
        </linearGradient>
      </defs>
      <path
        d="M8 38 C8 30 16 26 32 26 C48 26 56 30 56 38 L56 46 C56 50 52 52 48 52 L16 52 C12 52 8 50 8 46 Z"
        fill="url(#in-g)" stroke="#5a3a10" strokeWidth="0.8"
      />
      <ellipse cx="32" cy="28" rx="22" ry="6" fill="#5a3a10" opacity="0.4" />
      <ellipse cx="32" cy="26" rx="22" ry="6" fill="url(#in-g)" />
      <text x="32" y="30" textAnchor="middle" fontSize="8" fill="#5a3a10" fontFamily="serif" fontWeight="700">福</text>
    </svg>
  );
}

/** 姻缘（双鱼戏水） */
export function Marriage({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="mr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8392f" />
          <stop offset="100%" stopColor="#7a1818" />
        </linearGradient>
      </defs>
      <path
        d="M16 18 C12 14 8 18 10 24 C12 30 18 36 24 40 C30 36 36 30 38 24 C40 18 36 14 32 18 C28 14 22 14 18 18 Z"
        fill="url(#mr-g)" opacity="0.8" stroke="currentColor" strokeWidth="0.8"
      />
      <path
        d="M48 18 C44 14 40 18 42 24 C44 30 50 36 56 40 C56 36 56 30 56 24 C56 18 52 14 48 18 Z"
        fill="url(#mr-g)" opacity="0.8" stroke="currentColor" strokeWidth="0.8"
      />
      <path d="M2 50 C16 46 24 52 32 50 C40 48 48 52 62 50" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M2 56 C16 52 24 58 32 56 C40 54 48 58 62 56" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" />
    </svg>
  );
}

/** 事业（华表/塔） */
export function Career({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="cr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#5a3a10" />
        </linearGradient>
      </defs>
      <path d="M32 6 L26 12 L38 12 Z" fill="url(#cr-g)" />
      <rect x="29" y="12" width="6" height="6" fill="url(#cr-g)" />
      <rect x="18" y="18" width="28" height="30" fill="#1a1010" stroke="url(#cr-g)" strokeWidth="1" />
      <rect x="22" y="22" width="20" height="6" stroke="url(#cr-g)" strokeWidth="0.6" fill="none" />
      <rect x="22" y="32" width="20" height="6" stroke="url(#cr-g)" strokeWidth="0.6" fill="none" />
      <rect x="22" y="42" width="20" height="3" stroke="url(#cr-g)" strokeWidth="0.6" fill="none" />
      <rect x="14" y="48" width="36" height="6" fill="url(#cr-g)" />
      <line x1="32" y1="54" x2="32" y2="60" stroke="url(#cr-g)" strokeWidth="1.4" />
    </svg>
  );
}

/** 天赋（星芒） */
export function Talent({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <radialGradient id="tl-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5ecd9" />
          <stop offset="100%" stopColor="#c8a45c" />
        </radialGradient>
      </defs>
      <g transform="translate(32 32)">
        {[0, 45, 90, 135].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M0 -22 L3 -3 L22 0 L3 3 L0 22 L-3 3 L-22 0 L-3 -3 Z"
            fill="url(#tl-g)" opacity="0.9"
          />
        ))}
        <circle r="4" fill="#f5ecd9" />
        <circle r="2" fill="#c8a45c" />
      </g>
    </svg>
  );
}

/** 反内耗（莲花静心） */
export function Lotus({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="lt-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5ecd9" />
          <stop offset="100%" stopColor="#c8a45c" />
        </linearGradient>
      </defs>
      <path d="M32 50 C20 50 12 42 12 36 C18 40 24 40 28 36 C24 42 26 48 32 50 Z" fill="url(#lt-g)" opacity="0.7" />
      <path d="M32 50 C44 50 52 42 52 36 C46 40 40 40 36 36 C40 42 38 48 32 50 Z" fill="url(#lt-g)" opacity="0.7" />
      <path d="M32 52 C24 52 18 46 18 38 C24 42 28 42 32 38 C36 42 40 42 46 38 C46 46 40 52 32 52 Z" fill="url(#lt-g)" />
      <path d="M32 52 L32 30" stroke="#5a3a10" strokeWidth="0.6" opacity="0.5" />
      <circle cx="32" cy="38" r="2" fill="#c8392f" />
    </svg>
  );
}

/** 人生 K 线（折线图 + 朱砂点） */
export function KLine({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="kl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#c8392f" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="2" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <line x1="4" y1="20" x2="60" y2="20" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <line x1="4" y1="36" x2="60" y2="36" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <line x1="4" y1="52" x2="60" y2="52" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
      <polyline
        points="8,48 18,42 28,46 38,30 48,18 56,22"
        fill="none" stroke="url(#kl-g)" strokeWidth="1.6"
      />
      <circle cx="8" cy="48" r="1.4" fill="currentColor" />
      <circle cx="18" cy="42" r="1.4" fill="currentColor" />
      <circle cx="28" cy="46" r="1.4" fill="currentColor" />
      <circle cx="38" cy="30" r="1.4" fill="#c8392f" />
      <circle cx="48" cy="18" r="1.6" fill="#c8392f" />
      <circle cx="56" cy="22" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** 运势（波纹） */
export function Wave({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="wv-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c8a45c" stopOpacity="0" />
          <stop offset="50%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M2 22 C12 14 20 30 32 22 C44 14 52 30 62 22" stroke="url(#wv-g)" strokeWidth="1.6" fill="none" />
      <path d="M2 32 C12 24 20 40 32 32 C44 24 52 40 62 32" stroke="url(#wv-g)" strokeWidth="1.6" fill="none" />
      <path d="M2 42 C12 34 20 50 32 42 C44 34 52 50 62 42" stroke="url(#wv-g)" strokeWidth="1.6" fill="none" />
      <circle cx="32" cy="32" r="2.4" fill="#c8392f" />
    </svg>
  );
}

/** 工具/扳手（通用工具） */
export function Wrench({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="wr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5ecd9" />
          <stop offset="100%" stopColor="#c8a45c" />
        </linearGradient>
      </defs>
      <path
        d="M14 50 L32 32 L42 42 L24 60 L18 60 L8 50 L14 50 Z"
        fill="none" stroke="url(#wr-g)" strokeWidth="1.4"
      />
      <circle cx="46" cy="22" r="9" fill="none" stroke="url(#wr-g)" strokeWidth="1.4" />
      <circle cx="46" cy="22" r="3" fill="url(#wr-g)" />
      <line x1="32" y1="32" x2="40" y2="40" stroke="url(#wr-g)" strokeWidth="0.8" />
    </svg>
  );
}

/** 设置（齿轮 - 简化为八角） */
export function Gear({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <g transform="translate(32 32)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="-2.4" y="-22" width="4.8" height="6"
            fill="currentColor"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle r="5" fill="currentColor" />
      </g>
    </svg>
  );
}

/** 提交（朱砂印按下） */
export function Stamp({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="st-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#5a3a10" />
        </linearGradient>
      </defs>
      <rect x="20" y="6" width="24" height="8" fill="url(#st-g)" />
      <rect x="18" y="14" width="28" height="6" fill="url(#st-g)" />
      <rect x="20" y="20" width="24" height="20" fill="#c8392f" />
      <rect x="20" y="20" width="24" height="20" fill="none" stroke="#f5ecd9" strokeWidth="1.4" />
      <text x="32" y="34" textAnchor="middle" fill="#f5ecd9" fontSize="10" fontFamily="serif" fontWeight="700">决</text>
    </svg>
  );
}

/** 加载（旋转勾玉） */
export function Magatama({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <g transform="translate(32 32)">
        {[0, 120, 240].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg}) translate(0 -16)`}
            d="M0 0 C-6 -6 -6 -14 0 -16 C6 -14 6 -6 0 0 Z"
            fill="currentColor"
          />
        ))}
        <circle r="3" fill="currentColor" />
      </g>
    </svg>
  );
}

/** 历史（沙漏） */
export function Hourglass({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <linearGradient id="hg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#5a3a10" />
        </linearGradient>
      </defs>
      <line x1="14" y1="6" x2="50" y2="6" stroke="url(#hg-g)" strokeWidth="1.6" />
      <line x1="14" y1="58" x2="50" y2="58" stroke="url(#hg-g)" strokeWidth="1.6" />
      <path d="M16 8 L48 8 L34 32 L48 56 L16 56 L30 32 Z" fill="none" stroke="url(#hg-g)" strokeWidth="1" />
      <path d="M16 8 L48 8 L34 32 L48 56 L16 56 L30 32 Z" fill="currentColor" opacity="0.4" />
      <circle cx="32" cy="50" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** 火花 / 起盘 */
export function Spark({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <g transform="translate(32 32)">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M0 -4 L0 -28 M-2 -22 L2 -22 M-3 -14 L3 -14"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"
          />
        ))}
        <circle r="6" fill="currentColor" opacity="0.4" />
        <circle r="3" fill="currentColor" />
      </g>
    </svg>
  );
}

/** 箭头右 */
export function ArrowRight({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" strokeWidth="1.6" />
      <polyline points="44,20 56,32 44,44" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** 箭头左 */
export function ArrowLeft({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" strokeWidth="1.6" />
      <polyline points="20,20 8,32 20,44" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** 关闭 */
export function Close({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="14" y1="14" x2="50" y2="50" stroke="currentColor" strokeWidth="1.8" />
      <line x1="50" y1="14" x2="14" y2="50" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** 信息 */
export function Info({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="32" cy="20" r="2" fill="currentColor" />
      <line x1="32" y1="28" x2="32" y2="46" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** 星光/小亮点（装饰） */
export function Sparkle({ size = 8, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M32 4 L34 30 L60 32 L34 34 L32 60 L30 34 L4 32 L30 30 Z" fill="currentColor" />
    </svg>
  );
}

/** 中心/命宫（朱砂圆点 + 烫金圈） */
export function CenterDot({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="8" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="#0a0606" />
    </svg>
  );
}


/** 铜钱（圆形方孔钱） */
export function Coin({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <defs>
        <radialGradient id="coin-g" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f5d96b" />
          <stop offset="60%" stopColor="#c8a45c" />
          <stop offset="100%" stopColor="#5a3a10" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#coin-g)" stroke="#5a3a10" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#5a3a10" strokeWidth="0.4" opacity="0.4" />
      <rect x="28" y="28" width="8" height="8" fill="#0a0606" stroke="#5a3a10" strokeWidth="0.6" />
      {/* 字 */}
      <text x="32" y="22" textAnchor="middle" fontSize="6" fill="#5a3a10" fontFamily="serif" fontWeight="700" opacity="0.7">康</text>
      <text x="32" y="48" textAnchor="middle" fontSize="6" fill="#5a3a10" fontFamily="serif" fontWeight="700" opacity="0.7">熙</text>
      <text x="20" y="34" textAnchor="middle" fontSize="6" fill="#5a3a10" fontFamily="serif" fontWeight="700" opacity="0.7">通</text>
      <text x="44" y="34" textAnchor="middle" fontSize="6" fill="#5a3a10" fontFamily="serif" fontWeight="700" opacity="0.7">宝</text>
    </svg>
  );
}
