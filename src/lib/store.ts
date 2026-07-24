// 简单 localStorage 包装（紫微盘对象不能直接序列化，所以存关键信息）
export interface HistoryRecord {
  id: string;
  name: string;
  gender: '男' | '女';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  shiChenIndex: number;
  longitude: number;
  isLunar: boolean;
  lunarLeap: boolean;
  cityName?: string;
  createdAt: number;
}

const KEY = 'mingpan:records';

export function loadRecords(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRecord(rec: HistoryRecord): void {
  const list = loadRecords();
  const idx = list.findIndex(r => r.id === rec.id);
  if (idx >= 0) {
    list[idx] = rec;
  } else {
    list.unshift(rec);
  }
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function deleteRecord(id: string): void {
  const list = loadRecords().filter(r => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearRecords(): void {
  localStorage.removeItem(KEY);
}
