// 排盘加载动画 — 旋转太极 + 流光 + 罗盘
interface Props {
  show: boolean;
  type: 'ziwei' | 'qimen' | 'bazi';
  text?: string;
}

export default function LoadingOverlay({ show, type, text }: Props) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 backdrop-blur-sm fade-in">
      <div className="flex flex-col items-center">
        {/* 旋转的太极 + 八环 */}
        <div className="relative w-32 h-32">
          {/* 外环流光 */}
          <div className="absolute inset-0 rounded-full border-2 border-gold/30 spin-slow" />
          <div className="absolute inset-2 rounded-full border border-vermilion/40 spin-slow-reverse" />
          <div className="absolute inset-4 rounded-full border border-gold/20 spin-slow" style={{ animationDuration: '15s' }} />

          {/* 中心太极 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto w-20 h-20 spin-slow" style={{ animationDuration: '6s' }}>
            <defs>
              <radialGradient id="taiji-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#c8a45c" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* 背景光晕 */}
            <circle cx="50" cy="50" r="48" fill="url(#taiji-glow)" />
            {/* 阴鱼（黑） */}
            <path d="M 50,10 A 40,40 0 0 1 50,90 A 20,20 0 0 1 50,50 A 20,20 0 0 0 50,10 Z" fill="#0a0606" />
            {/* 阳鱼（朱红） */}
            <path d="M 50,10 A 40,40 0 0 0 50,90 A 20,20 0 0 0 50,50 A 20,20 0 0 1 50,10 Z" fill="#c8392f" />
            {/* 阴阳眼 */}
            <circle cx="50" cy="30" r="4" fill="#c8392f" />
            <circle cx="50" cy="70" r="4" fill="#0a0606" />
          </svg>

          {/* 罗盘指针 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto w-32 h-32">
            <g className="spin-slow-reverse" style={{ animationDuration: '4s' }}>
              <line x1="50" y1="8" x2="50" y2="20" stroke="#e6c878" strokeWidth="1.5" />
              <line x1="50" y1="80" x2="50" y2="92" stroke="#c8a45c" strokeWidth="0.8" strokeOpacity="0.5" />
              <line x1="8" y1="50" x2="20" y2="50" stroke="#c8a45c" strokeWidth="0.8" strokeOpacity="0.5" />
              <line x1="80" y1="50" x2="92" y2="50" stroke="#c8a45c" strokeWidth="0.8" strokeOpacity="0.5" />
            </g>
          </svg>
        </div>

        {/* 文字 */}
        <div className="mt-6 text-gold-bright text-lg title-display tracking-widest">
          {text || defaultText(type)}
        </div>
        <div className="mt-2 text-xs text-gold opacity-60 tracking-wider">
          {['紫微', '奇门', '八字'][type === 'ziwei' ? 0 : type === 'qimen' ? 1 : 2]} · 排盘中
        </div>
        {/* 进度条流光 */}
        <div className="mt-4 w-48 h-0.5 bg-gold/20 overflow-hidden rounded">
          <div className="h-full w-1/2 shimmer" />
        </div>
      </div>
    </div>
  );
}

function defaultText(type: 'ziwei' | 'qimen' | 'bazi'): string {
  if (type === 'ziwei') return '观 星';
  if (type === 'qimen') return '遁 甲';
  return '排 盘';
}
