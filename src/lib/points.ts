// 前端点数系统
// 由于后端尚未接入点数校验，先在本地做扣减记录和 UI 提示
// 后端接入后替换为服务端校验即可

export interface PointsConfig {
  enabled: boolean;
  // 各功能点数消耗
  costs: Record<string, number>;
}

export const DEFAULT_COSTS: PointsConfig = {
  enabled: true,
  costs: {
    // 轻量 1点
    'ziwei-palace': 1,
    'kline-year': 1,
    // 标准 2点
    'bazi-full': 2,
    'qimen-palace': 2,
    'dateSelect': 2,
    'fortune': 2,
    'tool-coreChart': 2,
    'tool-wealth': 2,
    'tool-talent': 2,
    'tool-career': 2,
    'tool-marriage': 2,
    'tool-antiBurnout': 1,
    // 深度 3点
    'ziwei-overall': 3,
    'divination': 3,
    // 重型 5点
    'overall-analysis': 5,
    'custom-question': 5,
  },
};

function getPointsKey(): string {
  return 'mingpan:points-usage';
}

interface PointsRecord {
  date: string; // YYYY-MM-DD UTC
  used: number;
  total: number;
  plan: string;
  history: { mode: string; cost: number; at: number }[];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyPointsLimit(plan: string): number {
  switch (plan) {
    case 'vip-lite': return 40;
    case 'vip-pro': return 150;
    case 'vip-ultimate': return 400;
    default: return 10;
  }
}

export function getUserPlan(): string {
  try {
    const raw = localStorage.getItem('mingpan:user-plan');
    if (raw) return JSON.parse(raw).plan || 'free';
  } catch {}
  return 'free';
}

export function setUserPlan(plan: string) {
  try {
    localStorage.setItem('mingpan:user-plan', JSON.stringify({ plan }));
  } catch {}
}

export function getPointsRecord(): PointsRecord {
  try {
    const raw = localStorage.getItem(getPointsKey());
    if (raw) {
      const rec = JSON.parse(raw) as PointsRecord;
      // 新的一天重置
      if (rec.date !== todayKey()) {
        return {
          date: todayKey(),
          used: 0,
          total: getDailyPointsLimit(getUserPlan()),
          plan: getUserPlan(),
          history: [],
        };
      }
      // 套餐变更时更新 total
      if (rec.plan !== getUserPlan()) {
        return { ...rec, total: getDailyPointsLimit(getUserPlan()), plan: getUserPlan() };
      }
      return rec;
    }
  } catch {}
  return {
    date: todayKey(),
    used: 0,
    total: getDailyPointsLimit(getUserPlan()),
    plan: getUserPlan(),
    history: [],
  };
}

function savePointsRecord(rec: PointsRecord) {
  try {
    localStorage.setItem(getPointsKey(), JSON.stringify(rec));
  } catch {}
}

// 全局点数扣减回调（Settings 注册，AI 调用时触发）
type PointsDeductHandler = (info: { cost: number; left: number; success: boolean }) => void;
let handler: PointsDeductHandler | null = null;

export function onPointsDeducted(h: PointsDeductHandler) {
  handler = h;
}

export function notifyPointsDeducted(info: { cost: number; left: number; success: boolean }) {
  if (handler) handler(info);
}

export function getPointsLeft(): number {
  const rec = getPointsRecord();
  return Math.max(0, rec.total - rec.used);
}

export function getPointsInfo(): { used: number; total: number; left: number; plan: string; resetsAt: string } {
  const rec = getPointsRecord();
  // 计算下次重置时间（UTC 00:00）
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return {
    used: rec.used,
    total: rec.total,
    left: Math.max(0, rec.total - rec.used),
    plan: rec.plan,
    resetsAt: tomorrow.toISOString().slice(0, 16) + ' UTC',
  };
}

export function deductPoints(mode: string, cost?: number): { success: boolean; left: number; cost: number } {
  const rec = getPointsRecord();
  const actualCost = cost ?? DEFAULT_COSTS.costs[mode] ?? 2;
  const left = rec.total - rec.used;

  if (left < actualCost) {
    notifyPointsDeducted({ success: false, left, cost: actualCost });
    return { success: false, left, cost: actualCost };
  }

  rec.used += actualCost;
  rec.history.push({ mode, cost: actualCost, at: Date.now() });
  savePointsRecord(rec);
  notifyPointsDeducted({ success: true, left: rec.total - rec.used, cost: actualCost });
  return { success: true, left: rec.total - rec.used, cost: actualCost };
}

export function getLastDeductInfo(): { mode: string; cost: number; at: number } | null {
  const rec = getPointsRecord();
  if (rec.history.length === 0) return null;
  return rec.history[rec.history.length - 1];
}

export function canAfford(mode: string): boolean {
  const rec = getPointsRecord();
  const cost = DEFAULT_COSTS.costs[mode] ?? 2;
  return (rec.total - rec.used) >= cost;
}
