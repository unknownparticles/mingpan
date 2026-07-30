/**
 * PWA 一键安装
 * - Chromium：捕获 beforeinstallprompt，用户点击后 prompt()
 * - iOS Safari：引导「分享 → 添加到主屏幕」
 * - 已安装 / standalone：隐藏安装入口
 */

export type InstallPlatform = 'chromium' | 'ios' | 'other';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}

export function subscribeInstallAvailability(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = (navigator as any).standalone === true;
  const twa = document.referrer?.startsWith('android-app://');
  return !!(mq || iosStandalone || twa);
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  if (isIOS) return 'ios';
  // Chrome / Edge / Samsung Internet 等支持 beforeinstallprompt
  const isChromium = !!(window as any).chrome || /Edg|Chrome|CriOS|SamsungBrowser/i.test(ua);
  if (isChromium) return 'chromium';
  return 'other';
}

export function canOfferInstall(): boolean {
  if (isStandaloneDisplay()) return false;
  if (deferredPrompt) return true;
  const platform = detectInstallPlatform();
  // iOS 永远可展示引导（未独立显示时）
  if (platform === 'ios') return true;
  return false;
}

/** 触发系统安装面板；无 prompt 时返回 false */
export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable' | 'ios-guide'> {
  if (isStandaloneDisplay()) return 'unavailable';
  const platform = detectInstallPlatform();
  if (platform === 'ios') return 'ios-guide';

  const ev = deferredPrompt;
  if (!ev) return 'unavailable';
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    // 用过一次后需清空
    deferredPrompt = null;
    notify();
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

let hooked = false;
export function initPwaInstallListeners() {
  if (typeof window === 'undefined' || hooked) return;
  hooked = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}
