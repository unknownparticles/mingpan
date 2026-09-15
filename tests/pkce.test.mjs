import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { test } from 'node:test';
import { createPKCEChallenge, randomString } from '../src/lib/pkce.ts';

const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
function setCrypto(t, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value });
  t.after(() => Object.defineProperty(globalThis, 'crypto', descriptor));
}

test('原生摘要符合标准 PKCE 测试向量', async t => {
  setCrypto(t, webcrypto);
  assert.equal(await createPKCEChallenge(verifier), challenge);
});

test('缺少 subtle 时仍生成标准 S256 校验码', async t => {
  setCrypto(t, { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  assert.equal(await createPKCEChallenge(verifier), challenge);
  for (const length of [43, 64, 128]) {
    const value = randomString(length);
    assert.match(value, /^[A-Za-z0-9]+$/);
    assert.equal(value.length, length);
    assert.equal(await createPKCEChallenge(value), createHash('sha256').update(value).digest('base64url'));
  }
});

test('缺少 digest 方法时使用兼容摘要', async t => {
  setCrypto(t, { subtle: {} });
  assert.equal(await createPKCEChallenge(verifier), challenge);
});

test('缺少安全随机源时显示可操作提示', t => {
  setCrypto(t, undefined);
  assert.throws(() => randomString(43), /安全随机数.*HTTPS/);
});
