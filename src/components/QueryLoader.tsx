// 综合分析查询动画 - 三环旋转 + 太极 + 流光
import { useEffect, useState } from 'react';

interface Props {
  show: boolean;
  stage: 'init' | 'analyze' | 'verify' | 'summary';
  text?: string;
}

const STAGE_TEXT = {
  init: { title: '起 卦', sub: '恭请三盘显化' },
  analyze: { title: '推 演', sub: '紫微奇门八字三盘交叉' },
  verify: { title: '校 验', sub: '流年大运交叉验证' },
  summary: { title: '总 结', sub: '汇聚要点形成结论' },
};

export default function QueryLoader({ show, stage, text }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!show) {
      setProgress(0);
      return;
    }
    let p = 0;
    const stages: Array<typeof stage> = ['init', 'analyze', 'verify', 'summary'];
    const cur = stages.indexOf(stage);
    const target = ((cur + 1) / stages.length) * 100;
    const timer = setInterval(() => {
      p += 2;
      const eased = Math.min(target, p);
      setProgress(eased);
      if (p >= target + 10) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [show, stage]);

  if (!show) return null;

  const stageInfo = STAGE_TEXT[stage];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 backdrop-blur-md fade-in">
      {/* 背景八卦图层 */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <g fill="none" stroke="#c8a45c" strokeWidth="0.3">
            <circle cx="50" cy="50" r="40"/>
            <circle cx="50" cy="50" r="35"/>
            <circle cx="50" cy="50" r="30"/>
            <circle cx="50" cy="50" r="25"/>
            <circle cx="50" cy="50" r="20"/>
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
              <line key={a} x1="50" y1="10" x2="50" y2="90"
                transform={`rotate(${a} 50 50)`}/>
            ))}
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center relative">
        {/* 三层旋转环 */}
        <div className="relative w-40 h-40">
          {/* 外环：朱红旋转 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ animation: 'spin-slow 4s linear infinite' }}>
            <circle cx="50" cy="50" r="48" fill="none"
              stroke="#c8392f" strokeWidth="0.5" strokeOpacity="0.6"
              strokeDasharray="20 5 10 5" />
          </svg>
          {/* 中环：金色反向 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ animation: 'spin-slow-reverse 6s linear infinite' }}>
            <circle cx="50" cy="50" r="40" fill="none"
              stroke="#c8a45c" strokeWidth="0.4" strokeOpacity="0.5"
              strokeDasharray="3 2" />
          </svg>
          {/* 内环：金色正向 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ animation: 'spin-slow 8s linear infinite' }}>
            <circle cx="50" cy="50" r="32" fill="none"
              stroke="#e6c878" strokeWidth="0.3" strokeOpacity="0.4" />
          </svg>

          {/* 中心太极 - 旋转 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto w-24 h-24" style={{ animation: 'spin-slow 3s linear infinite' }}>
            <defs>
              <radialGradient id="query-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#c8a45c" stopOpacity="1" />
                <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#query-glow)" opacity="0.5" />
            {/* 阴鱼 */}
            <path d="M 50,10 A 40,40 0 0 1 50,90 A 20,20 0 0 1 50,50 A 20,20 0 0 0 50,10 Z" fill="#0a0606" />
            {/* 阳鱼 */}
            <path d="M 50,10 A 40,40 0 0 0 50,90 A 20,20 0 0 0 50,50 A 20,20 0 0 1 50,10 Z" fill="#c8392f" />
            {/* 阴阳眼 */}
            <circle cx="50" cy="30" r="4" fill="#c8392f" />
            <circle cx="50" cy="70" r="4" fill="#0a0606" />
          </svg>

          {/* 四角光芒 */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-32">
            <g className="ray-rotate" style={{ transformOrigin: 'center' }}>
              <line x1="50" y1="5" x2="50" y2="15" stroke="#e6c878" strokeWidth="1" />
              <line x1="50" y1="85" x2="50" y2="95" stroke="#c8a45c" strokeWidth="0.6" strokeOpacity="0.6" />
              <line x1="5" y1="50" x2="15" y2="50" stroke="#c8a45c" strokeWidth="0.6" strokeOpacity="0.6" />
              <line x1="85" y1="50" x2="95" y2="50" stroke="#c8a45c" strokeWidth="0.6" strokeOpacity="0.6" />
            </g>
          </svg>
        </div>

        {/* 阶段文字 */}
        <div className="mt-8 text-center">
          <div className="text-2xl text-gold-bright title-display tracking-[0.5em] font-bold">
            {text || stageInfo.title}
          </div>
          <div className="text-xs text-gold opacity-70 mt-2 tracking-wider">
            {stageInfo.sub}
          </div>
        </div>

        {/* 阶段进度条 */}
        <div className="mt-6 w-56">
          <div className="flex justify-between text-[9px] text-gold opacity-50 mb-1.5 tracking-wider">
            <span className={stage === 'init' ? 'text-gold-bright font-bold' : ''}>① 起卦</span>
            <span className={stage === 'analyze' ? 'text-gold-bright font-bold' : ''}>② 推演</span>
            <span className={stage === 'verify' ? 'text-gold-bright font-bold' : ''}>③ 校验</span>
            <span className={stage === 'summary' ? 'text-gold-bright font-bold' : ''}>④ 总结</span>
          </div>
          <div className="h-1 bg-gold/15 overflow-hidden rounded-full">
            <div className="h-full bg-gradient-to-r from-vermilion via-gold-bright to-vermilion transition-all duration-300"
              style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(230, 200, 120, 0.6)' }} />
          </div>
        </div>

        {/* 装饰符文 */}
        <div className="mt-4 flex gap-3 text-[10px] text-gold opacity-50 tracking-widest">
          <span>乾</span><span>兑</span><span>离</span><span>震</span>
          <span>巽</span><span>坎</span><span>艮</span><span>坤</span>
        </div>
      </div>
    </div>
  );
}
