/**
 * PWA 一键安装入口
 * - 顶栏紧凑按钮 / 卡片式引导
 */
import { useEffect, useState } from 'react';
import {
  canOfferInstall,
  detectInstallPlatform,
  initPwaInstallListeners,
  isStandaloneDisplay,
  promptPwaInstall,
  subscribeInstallAvailability,
  getDeferredInstallPrompt,
} from '../lib/pwaInstall';

interface Props {
  /** compact: 顶栏小按钮；card: 首页/设置大卡片 */
  variant?: 'compact' | 'card' | 'banner';
  className?: string;
}

export function InstallApp({ variant = 'compact', className = '' }: Props) {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const platform = detectInstallPlatform();

  function refresh() {
    const stand = isStandaloneDisplay();
    setInstalled(stand);
    setAvailable(!stand && (canOfferInstall() || !!getDeferredInstallPrompt() || platform === 'ios' || platform === 'other'));
  }

  useEffect(() => {
    initPwaInstallListeners();
    refresh();
    return subscribeInstallAvailability(refresh);
  }, []);

  // Chromium 若尚未抛 beforeinstallprompt，仍展示入口，点击时给提示
  useEffect(() => {
    const t = window.setTimeout(refresh, 800);
    return () => clearTimeout(t);
  }, []);

  if (installed) {
    if (variant === 'compact') return null;
    return (
      <div className={`rounded-lg border border-jade/30 bg-jade/10 px-3 py-2 text-[11px] text-jade ${className}`}>
        已安装为应用 · 可从桌面图标直接打开
      </div>
    );
  }

  if (!available && variant === 'compact') return null;

  async function onInstall() {
    setBusy(true);
    setHint('');
    try {
      const result = await promptPwaInstall();
      if (result === 'ios-guide') {
        setShowIos(true);
      } else if (result === 'accepted') {
        setHint('安装成功，可从桌面启动');
        setInstalled(true);
      } else if (result === 'dismissed') {
        setHint('已取消安装');
      } else {
        // 无 beforeinstallprompt：给通用指引
        if (platform === 'ios') setShowIos(true);
        else setHint('请使用 Chrome / Edge 菜单中的「安装应用」；或等待页面可安装条件就绪后再试');
      }
    } finally {
      setBusy(false);
      refresh();
    }
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onInstall}
        disabled={busy}
        title="安装到桌面"
        className={`relative flex items-center justify-center w-9 h-9 rounded-full border border-gold/35 text-gold hover:border-gold-bright hover:text-gold-bright transition disabled:opacity-50 ${className}`}
      >
        <InstallSvg size={16} />
        <span className="sr-only">安装应用</span>
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`rounded-lg border border-gold/35 bg-ink-soft/80 px-3 py-2.5 flex items-center gap-3 ${className}`}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="w-10 h-10 rounded-xl border border-gold/30" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gold-bright font-bold title-display tracking-widest">安装「命盘」应用</div>
          <div className="text-[10px] text-gold/55 mt-0.5 truncate">SVG 图标 · 离线可开 · 一键添加到桌面</div>
        </div>
        <button
          type="button"
          onClick={onInstall}
          disabled={busy}
          className="shrink-0 px-3 py-1.5 rounded-full bg-vermilion/90 text-cream text-[11px] title-display tracking-widest disabled:opacity-50"
        >
          {busy ? '…' : '安装'}
        </button>
        {showIos && <IosGuide onClose={() => setShowIos(false)} />}
      </div>
    );
  }

  // card
  return (
    <div className={`rounded-lg border border-gold/30 bg-ink-soft/70 p-3 space-y-2 ${className}`}>
      <div className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="命盘" className="w-12 h-12 rounded-2xl border border-gold/40 shadow-[0_0_12px_rgba(200,164,92,0.25)]" />
        <div className="flex-1">
          <div className="text-sm text-gold-bright font-bold title-display tracking-widest">一键安装应用</div>
          <div className="text-[10px] text-gold/55 mt-0.5 leading-relaxed">
            使用 SVG 应用图标，支持添加到主屏幕 / 桌面，独立窗口打开
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onInstall}
        disabled={busy}
        className="w-full py-2.5 rounded-full bg-vermilion/90 hover:bg-vermilion text-cream text-xs title-display tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <InstallSvg size={14} />
        {busy ? '拉起安装中…' : platform === 'ios' ? '查看安装步骤' : '安装到桌面'}
      </button>
      {hint && <div className="text-[10px] text-gold/60 text-center">{hint}</div>}
      {showIos && <IosGuide onClose={() => setShowIos(false)} />}
    </div>
  );
}

function IosGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-gold/40 bg-ink p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm text-gold-bright font-bold title-display tracking-widest">iOS 安装步骤</div>
          <button type="button" onClick={onClose} className="text-gold/60 text-xs">关闭</button>
        </div>
        <ol className="text-[12px] text-rice/90 space-y-2 list-decimal pl-4 leading-relaxed">
          <li>点击底部分享按钮 <span className="text-gold">□↑</span></li>
          <li>下滑找到 <span className="text-gold">「添加到主屏幕」</span></li>
          <li>确认名称「命盘」后点 <span className="text-gold">添加</span></li>
        </ol>
        <div className="flex items-center gap-2 pt-1">
          <img src={`${import.meta.env.BASE_URL}icons/apple-touch-icon.png`} alt="" className="w-10 h-10 rounded-xl" />
          <div className="text-[10px] text-gold/55">安装后主屏幕将显示太极金印图标</div>
        </div>
      </div>
    </div>
  );
}

function InstallSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export default InstallApp;
