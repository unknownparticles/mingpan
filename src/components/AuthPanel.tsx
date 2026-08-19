import { useEffect, useState } from 'react';
import {
  buildExternalLoginUrl,
  buildOAuthStartUrl,
  fetchAuthConfig,
  fetchMe,
  getStoredUser,
  isLoggedIn,
  loginWithPassword,
  logout,
  registerWithPassword,
  type AuthPublicConfig,
  type AuthUser,
} from '../lib/auth';
import {
  applyLoginAIDefaults,
  applyLogoutAIDefaults,
} from '../lib/aiInterpret';

type Mode = 'login' | 'register';

interface Props {
  onAuthChange?: (user: AuthUser | null) => void;
  currentUser?: AuthUser | null;
}

export default function AuthPanel({ onAuthChange, currentUser }: Props) {
  const [user, setUserState] = useState<AuthUser | null>(getStoredUser());
  function setUser(next: AuthUser | null) {
    setUserState(next);
    onAuthChange?.(next);
  }

  // 同步应用启动时恢复的 CF Auth 会话。
  useEffect(() => {
    if (!currentUser) {
      setUserState(null);
      return;
    }
    if (isLoggedIn()) setUserState(currentUser);
  }, [currentUser]);

  const [config, setConfig] = useState<AuthPublicConfig | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // forms
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [registerCode, setRegisterCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchAuthConfig();
        if (!cancelled) setConfig(cfg);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '无法连接登录服务');
      }

      if (isLoggedIn()) {
        try {
          const me = await fetchMe();
          if (me?.user) applyLoginAIDefaults();
          if (!cancelled) setUser(me?.user || null);
        } catch (e: any) {
          if (!cancelled) setError(e?.message || '会话校验失败');
        }
      }

      if (!cancelled) setBooting(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const session = await loginWithPassword(account.trim(), password);
      applyLoginAIDefaults({ force: true });
      setUser(session.user);
      setMessage('登录成功，已默认开启平台 AI');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const session = await registerWithPassword({
        username: username.trim(),
        email: email.trim(),
        password,
        registerCode: registerCode.trim() || undefined,
      });
      applyLoginAIDefaults({ force: true });
      setUser(session.user);
      setMessage('注册成功，已默认开启平台 AI');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setLoading(true);
    setError('');
    try {
      if (isLoggedIn()) {
        await logout();
      }
      applyLogoutAIDefaults();
      setUser(null);
      setMessage('已退出登录');
    } catch (err: any) {
      setError(err?.message || '退出失败');
    } finally {
      setLoading(false);
    }
  }

  const oauthProviders = (config?.providers || []).filter(p => p.type === 'oauth2' && p.loginUrl);

  if (booting) {
    return (
      <div className="text-xs text-gold/60 py-2">正在连接登录服务…</div>
    );
  }

  if (user) {
    const displayUser = user;
    const m = displayUser.membership;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full border border-gold/40 bg-ink-soft/70 overflow-hidden flex items-center justify-center text-gold-bright title-display">
            {displayUser.avatarUrl ? (
              <img src={displayUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (displayUser.displayName || displayUser.username || '?').slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-cream title-display tracking-widest truncate">
              {displayUser.displayName || displayUser.username}
            </div>
            <div className="text-[10px] text-gold/60 truncate">
              @{displayUser.username}{displayUser.email ? ` · ${displayUser.email}` : ''}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-gold/20 bg-ink-soft/40 p-2">
              <div className="text-[10px] text-gold/50">会员等级</div>
              <div className="text-sm text-gold-bright title-display tracking-wider mt-0.5">
                {m?.name || m?.tier || 'free'}
              </div>
              <div className="text-[10px] text-gold/40 mt-0.5">
                {m?.expired ? '已过期回落' : (m?.expiresAt ? `到期 ${new Date(m.expiresAt).toLocaleDateString()}` : '长期有效')}
              </div>
            </div>
            <div className="rounded border border-gold/20 bg-ink-soft/40 p-2">
              <div className="text-[10px] text-gold/50">可用积分</div>
              <div className="text-sm text-gold-bright title-display tracking-wider mt-0.5">
                {displayUser.points ?? 0}
              </div>
              <div className="text-[10px] text-gold/40 mt-0.5">level {m?.level ?? 0}</div>
            </div>
        </div>

        {message && <div className="text-xs text-jade">{message}</div>}
        {error && <div className="text-xs text-vermilion">{error}</div>}

        <button
          onClick={onLogout}
          disabled={loading}
          className="w-full btn-ghost py-2 rounded text-sm disabled:opacity-40"
        >
          {loading ? '处理中…' : '退出登录'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      <div className="flex gap-2">
        <button
          className={`flex-1 text-xs py-1.5 rounded ${mode === 'login' ? 'btn-vermilion' : 'btn-ghost'}`}
          onClick={() => setMode('login')}
        >
          登 录
        </button>
        <button
          className={`flex-1 text-xs py-1.5 rounded ${mode === 'register' ? 'btn-vermilion' : 'btn-ghost'}`}
          onClick={() => setMode('register')}
        >
          注 册
        </button>
      </div>

      {mode === 'login' ? (
        <form className="space-y-3" onSubmit={onLogin}>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">账号 / 邮箱</label>
            <input
              className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
              value={account}
              onChange={e => setAccount(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">密码</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-vermilion py-2 rounded text-sm disabled:opacity-40">
            {loading ? '登录中…' : '登 录'}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={onRegister}>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">用户名</label>
            <input
              className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">邮箱</label>
            <input
              type="email"
              className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gold opacity-70 mb-1">密码（至少 8 位）</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {(config?.requireRegisterCode || !config?.allowPublicRegister) && (
            <div>
              <label className="block text-xs text-gold opacity-70 mb-1">注册码</label>
              <input
                className="w-full bg-transparent border-b border-gold/30 text-rice py-1 px-1 focus:outline-none focus:border-gold-bright text-sm"
                value={registerCode}
                onChange={e => setRegisterCode(e.target.value)}
                required
              />
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full btn-vermilion py-2 rounded text-sm disabled:opacity-40">
            {loading ? '注册中…' : '注 册'}
          </button>
        </form>
      )}

      {oauthProviders.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-gold/10">
          <div className="text-[10px] text-gold/50">第三方登录</div>
          <div className="flex flex-wrap gap-2">
            {oauthProviders.map(p => (
              <a
                key={p.name}
                href={buildOAuthStartUrl(p.loginUrl!, mode, registerCode.trim() || undefined)}
                className="text-xs px-2.5 py-1 rounded btn-ghost"
              >
                {p.displayName}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-gold/40 leading-relaxed">
        也可前往登录站：
        <a className="text-gold underline ml-1" href={buildExternalLoginUrl('login')} target="_blank" rel="noreferrer">
          打开登录页
        </a>
      </div>

      {message && <div className="text-xs text-jade">{message}</div>}
      {error && <div className="text-xs text-vermilion">{error}</div>}
    </div>
  );
}
