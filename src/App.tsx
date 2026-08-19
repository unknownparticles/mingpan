import { useState, useEffect } from 'react';
import BirthForm from './components/BirthForm';
import type { BirthInput } from './components/BirthForm';
import { HeroLanding } from './components/HeroLanding';
import { DivinationView } from './components/DivinationView';
import ZiweiChart from './components/ZiweiChart';
import QimenChart from './components/QimenChart';
import BaziChart from './components/BaziChart';
import OverallAnalysis from './components/OverallAnalysis';
import { ToolSquare } from './components/ToolSquare';
import Settings from './components/Settings';
import { InstallApp } from './components/InstallApp';
import LoadingOverlay from './components/LoadingOverlay';
import { BackgroundLayer, ScrollCard } from './components/Ornament';
import { Taiji, Luopan, Bazi as BaziIcon, Spark, Gear, Seal, Wrench, Sparkle } from './components/Icon';
import { trueSolarTimeCorrection } from './lib/lunar';
import { loadRecords, saveRecord, deleteRecord } from './lib/store';
import type { HistoryRecord } from './lib/store';
import {
  consumeAuthCallbackToken,
  fetchMe,
  getStoredUser,
  type AuthSession,
  type AuthUser,
} from './lib/auth';
import { applyLoginAIDefaults } from './lib/aiInterpret';
import { handleWatchaCallback } from './lib/watchaAuth';

type Tab = 'ziwei' | 'qimen' | 'bazi' | 'overall' | 'tools' | 'form' | 'home' | 'divination' | 'settings';

const NAV_ITEMS: { key: Tab; label: string; sub: string; icon: React.ReactNode }[] = [
  { key: 'home', label: '首页', sub: '仪典', icon: <Seal size={18} /> },
  { key: 'ziwei', label: '紫微', sub: '十二宫', icon: <Taiji size={18} /> },
  { key: 'bazi', label: '八字', sub: '四柱', icon: <BaziIcon size={18} /> },
  { key: 'qimen', label: '奇门', sub: '遁甲', icon: <Luopan size={18} /> },
  { key: 'overall', label: '综合', sub: '详批', icon: <Spark size={18} /> },
  { key: 'tools', label: '工具', sub: '九用', icon: <Wrench size={18} /> },
];

let watchaCallbackPromise: Promise<AuthSession> | null | undefined;

function consumeWatchaCallback(): Promise<AuthSession> | null {
  if (watchaCallbackPromise !== undefined) return watchaCallbackPromise;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    watchaCallbackPromise = null;
    return null;
  }

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState(null, '', url.toString());

  watchaCallbackPromise = handleWatchaCallback(
    code,
    state,
    `${window.location.origin}${window.location.pathname}`,
    sessionStorage.getItem('watcha:register_code') || undefined,
  ).then((session) => {
    sessionStorage.removeItem('watcha:register_code');
    return session;
  });
  return watchaCallbackPromise;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [divination, setDivination] = useState<{ type: 'meiHua' | 'xiaoLiuRen'; data: any; question?: string } | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [birth, setBirth] = useState<BirthInput | null>(null);
  const [loading, setLoading] = useState<{ show: boolean; type: 'ziwei' | 'qimen' | 'bazi' }>({
    show: false, type: 'ziwei',
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const watchaLogin = consumeWatchaCallback();
    (async () => {
      if (watchaLogin) {
        try {
          const session = await watchaLogin;
          applyLoginAIDefaults({ force: true });
          if (!cancelled) setAuthUser(session.user);
        } catch (e: any) {
          console.error('Watcha login failed:', e?.message);
        }
        return;
      }

      try {
        await consumeAuthCallbackToken();
        const me = await fetchMe();
        if (me?.user) applyLoginAIDefaults();
        if (!cancelled) setAuthUser(me?.user || getStoredUser());
      } catch {
        if (!cancelled) setAuthUser(getStoredUser());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleSubmit(data: BirthInput) {
    setLoading({ show: true, type: 'ziwei' });
    setTimeout(() => {
      setBirth(data);
      const rec: HistoryRecord = {
        id: `${data.name || '匿名'}-${data.year}${data.month}${data.day}-${data.shiChenIndex}-${Date.now()}`,
        name: data.name,
        gender: data.gender,
        birthYear: data.year,
        birthMonth: data.month,
        birthDay: data.day,
        birthHour: data.hour,
        birthMinute: data.minute,
        shiChenIndex: data.shiChenIndex,
        longitude: data.longitude,
        isLunar: data.isLunar,
        lunarLeap: data.lunarLeap,
        cityName: data.cityName,
        createdAt: Date.now(),
      };
      saveRecord(rec);
      setRecords(loadRecords());
      setLoading({ show: false, type: 'ziwei' });
      setTab('ziwei');
    }, 1500);
  }

  function handleLoadRecord(r: HistoryRecord) {
    setBirth({
      name: r.name,
      gender: r.gender,
      year: r.birthYear,
      month: r.birthMonth,
      day: r.birthDay,
      hour: r.birthHour,
      minute: r.birthMinute,
      shiChenIndex: r.shiChenIndex,
      longitude: r.longitude,
      useTrueSolar: false,
      isLunar: r.isLunar,
      lunarLeap: r.lunarLeap,
      cityName: (r as any).cityName || '',
    });
    setTab('ziwei');
  }

  function handleDelete(id: string) {
    deleteRecord(id);
    setRecords(loadRecords());
  }

  function buildDate(b: BirthInput): Date {
    let d = new Date(b.year, b.month - 1, b.day, b.hour, b.minute);
    if (b.useTrueSolar) {
      d = trueSolarTimeCorrection(d, b.longitude);
    }
    return d;
  }

  function switchTab(t: Tab) {
    if (!birth) { setTab(t); return; }
    if (t === 'ziwei' || t === 'qimen' || t === 'bazi') {
      setLoading({ show: true, type: t });
      setTimeout(() => {
        setTab(t);
        setLoading({ show: false, type: t });
      }, 700);
    } else {
      setTab(t);
    }
  }

  return (
    <div className="app-shell max-w-md mx-auto flex flex-col relative">
      <BackgroundLayer />

      {/* 顶部 Logo 区 */}
      <header className="relative flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/30 blur-md rounded-xl" />
            <img
              src={`${import.meta.env.BASE_URL}icon.svg`}
              alt="命盘"
              className="relative w-9 h-9 rounded-xl border border-gold/60 shadow-[0_0_12px_rgba(200,164,92,0.4)] bg-ink/80"
            />
          </div>
          <div>
            <h1 className="text-xl text-gold-bright font-bold tracking-[0.4em] title-display leading-none">天 机 命 盘</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkle size={6} className="text-gold/60" />
              <span className="text-[8px] text-gold/60 tracking-[0.3em] title-display">紫微 · 奇门 · 八字 · 三才合一</span>
              <Sparkle size={6} className="text-gold/60" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InstallApp variant="compact" className="bg-ink-soft/60 backdrop-blur" />
          <button
            onClick={() => switchTab('settings')}
            className="relative max-w-[7.5rem] h-9 px-2 rounded-full border border-gold/30 bg-ink-soft/60 backdrop-blur flex items-center gap-1.5 text-gold hover:border-gold/80 hover:text-gold-bright transition"
            title={authUser ? `账号：${authUser.displayName || authUser.username}` : '登录 / 设置'}
          >
            <span className="w-6 h-6 rounded-full border border-gold/40 bg-ink/70 overflow-hidden flex items-center justify-center text-[10px] text-gold-bright shrink-0">
              {authUser?.avatarUrl ? (
                <img src={authUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (authUser?.displayName || authUser?.username || '登').slice(0, 1)
              )}
            </span>
            <span className="text-[10px] tracking-wider truncate hidden sm:inline">
              {authUser ? (authUser.displayName || authUser.username) : '登录'}
            </span>
          </button>
          <button
            onClick={() => switchTab('settings')}
            className="relative w-9 h-9 rounded-full border border-gold/30 bg-ink-soft/60 backdrop-blur flex items-center justify-center text-gold hover:border-gold/80 hover:text-gold-bright transition"
            title="设置"
          >
            <Gear size={18} />
          </button>
        </div>
      </header>

      {/* 生辰速览卡（有 birth 才显示） */}
      {birth && tab !== 'settings' && tab !== 'form' && (
        <div className="mb-3">
          <ScrollCard className="rounded-md p-2.5 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-gold-bright to-vermilion rounded-full" />
                <div>
                  <div className="text-[11px] text-cream title-display tracking-widest">
                    {birth.name || '匿名'} · {birth.gender === '男' ? '乾造' : '坤造'}
                  </div>
                  <div className="text-[9px] text-gold/70 tracking-wider mt-0.5">
                    {birth.year}年{birth.month}月{birth.day}日 {String(birth.hour).padStart(2,'0')}:{String(birth.minute).padStart(2,'0')}
                    {birth.useTrueSolar && birth.cityName && ` · ${birth.cityName}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTab('home')}
                className="text-[9px] text-gold/60 hover:text-gold-bright tracking-widest title-display px-2 py-1 border border-gold/20 rounded"
              >
                重 排
              </button>
            </div>
          </ScrollCard>
        </div>
      )}

      <main className={`flex-1 ${tab === 'settings' ? 'app-main-no-nav' : 'app-main'}`}>
        {tab === 'form' && (
          <BirthForm
            onSubmit={handleSubmit}
            records={records}
            onLoadRecord={handleLoadRecord}
            onDeleteRecord={handleDelete}
            onBack={() => setTab('home')}
          />
        )}

        {tab === 'home' && (
          <HeroLanding
            records={records}
            onLoadRecord={handleLoadRecord}
            onDeleteRecord={handleDelete}
            onStartInput={() => setTab('form')}
            onDivination={(r) => {
              setDivination(r);
              setTab('divination');
            }}
          />
        )}

        {tab === 'divination' && divination && (
          <DivinationView
            result={divination}
            onBack={() => setTab('home')}
            onStartInput={() => setTab('form')}
          />
        )}

        {tab === 'ziwei' && birth && (
          <ZiweiChart
            date={buildDate(birth)}
            shiChenIndex={birth.shiChenIndex}
            gender={birth.gender}
            isLunar={birth.isLunar}
            lunarLeap={birth.lunarLeap}
          />
        )}

        {tab === 'qimen' && birth && (
          <QimenChart
            date={buildDate(birth)}
            shiChenIndex={birth.shiChenIndex}
          />
        )}

        {tab === 'bazi' && birth && (
          <BaziChart
            date={buildDate(birth)}
            shiChenIndex={birth.shiChenIndex}
            gender={birth.gender}
          />
        )}

        {tab === 'overall' && birth && (
          <OverallAnalysis
            date={buildDate(birth)}
            shiChenIndex={birth.shiChenIndex}
            gender={birth.gender}
          />
        )}

        {tab === 'tools' && birth && (
          <ToolSquare
            date={buildDate(birth)}
            shiChenIndex={birth.shiChenIndex}
            gender={birth.gender}
          />
        )}

        {tab === 'settings' && (
          <Settings onClose={() => setTab(birth ? 'ziwei' : 'home')} onAuthChange={setAuthUser} authUser={authUser} />
        )}
      </main>

      <LoadingOverlay show={loading.show} type={loading.type} />

      {/* 底部卷轴式导航 */}
      {tab !== 'settings' && (
        <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="app-bottom-nav-inner max-w-md mx-auto px-3">
            <div className="relative pointer-events-auto">
              {/* 卷轴背景 */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-ink-soft/95 to-ink/95 backdrop-blur-md rounded-t-xl border-t border-gold/40"
                style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,164,92,0.2)' }}
              />
              {/* 卷轴两端的圆轴 */}
              <div className="absolute -top-1 left-6 right-6 h-1.5 flex items-center justify-between">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gold-bright to-gold-dark border border-gold-dark" />
                <div className="flex-1 mx-1 h-px bg-gradient-to-r from-gold/40 via-gold to-gold/40" />
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gold-bright to-gold-dark border border-gold-dark" />
              </div>

              <div className="relative grid grid-cols-6 gap-0.5 p-1.5 pt-3">
                {NAV_ITEMS.map((it) => {
                  const active = tab === it.key || (it.key === 'home' && tab === 'form');
                  return (
                    <button
                      key={it.key}
                      onClick={() => (it.key === 'home' ? setTab('home') : (birth && switchTab(it.key)))}
                      disabled={it.key !== 'home' && !birth}
                      className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-all ${
                        active
                          ? 'text-cream'
                          : 'text-gold/60 hover:text-gold'
                      } ${it.key !== 'form' && !birth ? 'opacity-25' : ''}`}
                    >
                      {active && (
                        <span
                          className="absolute inset-0 rounded-md"
                          style={{
                            background: 'linear-gradient(180deg, rgba(200,57,47,0.5) 0%, rgba(200,57,47,0.15) 100%)',
                            boxShadow: 'inset 0 0 8px rgba(200,164,92,0.4), 0 0 8px rgba(200,57,47,0.3)',
                            border: '1px solid rgba(200,164,92,0.5)',
                          }}
                        />
                      )}
                      <span className={`relative z-10 ${active ? 'text-gold-bright' : ''}`}>
                        {it.icon}
                      </span>
                      <span className="relative z-10 text-[10px] title-display tracking-widest leading-none">
                        {it.label}
                      </span>
                      <span className={`relative z-10 text-[7px] title-display tracking-wider leading-none ${active ? 'text-gold-bright/80' : 'text-gold/40'}`}>
                        {it.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
