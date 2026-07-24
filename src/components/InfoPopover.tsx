// 圆形 i 按钮 + 弹窗说明（用 Portal 渲染到 body，避免被父级 overflow 裁剪）
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  title: string;
  content: string;
  size?: 'sm' | 'md';
  position?: 'top' | 'bottom';
}

export default function InfoPopover({ title, content, size = 'sm', position = 'top' }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'top' });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popW = 256;
      const popH = 240;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let placement: 'top' | 'bottom' = position;
      if (position === 'top' && rect.top < popH + 16) {
        placement = 'bottom';
      } else if (position === 'bottom' && vh - rect.bottom < popH + 16) {
        placement = 'top';
      }

      let top: number;
      if (placement === 'top') {
        top = rect.top - 8;
      } else {
        top = rect.bottom + 8;
      }

      let left = rect.left + rect.width / 2 - popW / 2;
      if (left < 8) left = 8;
      if (left + popW > vw - 8) left = vw - popW - 8;

      setPos({ top, left, placement });
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className={`inline-flex items-center justify-center rounded-full border border-gold/40 bg-vermilion/10 text-gold hover:bg-vermilion/30 hover:border-gold-bright transition flex-shrink-0 ${
          size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs'
        }`}
        title="点击查看说明"
      >
        i
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[9999] w-64"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            {pos.placement === 'top' ? (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-ink-soft border-r border-b border-gold/30" />
            ) : (
              <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 rotate-45 bg-ink-soft border-l border-t border-gold/30" />
            )}
            <div className="paper p-3 shadow-2xl fade-in">
              <div className="text-sm text-gold-bright font-bold mb-1.5 title-display tracking-wider flex items-center justify-between">
                <span>📖 {title}</span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gold opacity-50 hover:opacity-100 text-base"
                >✕</button>
              </div>
              <div className="text-xs text-rice leading-relaxed prose prose-invert prose-xs max-w-none prose-headings:text-gold-bright prose-headings:font-bold prose-headings:mb-1 prose-h1:text-sm prose-h2:text-xs prose-h3:text-xs prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-vermilion prose-em:text-gold-bright prose-code:text-gold-bright prose-code:bg-ink/40 prose-code:px-1 prose-code:rounded">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
