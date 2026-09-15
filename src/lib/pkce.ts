import { sha256 } from '@noble/hashes/sha2.js';

export function randomString(len = 32): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('当前浏览器不支持安全随机数，请使用新版浏览器通过 HTTPS 打开后重试登录');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(len);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

export async function createPKCEChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const subtle = globalThis.crypto?.subtle;
  // 部分浏览器和非安全上下文没有 Web Crypto 摘要接口，仍保持标准 S256。
  const hash = subtle?.digest
    ? new Uint8Array(await subtle.digest('SHA-256', data))
    : sha256(data);
  return btoa(String.fromCharCode(...hash))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
