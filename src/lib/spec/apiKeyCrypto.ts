/** Browser-side BYOK API key encryption (PBKDF2 + AES-GCM). */

import type { ApiKeyProvider, EncryptedStoredApiKey } from './types'

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const IV_BYTES = 12
const AES_BITS = 256

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]!)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

/** Password material includes user.sub so keys are bound to the account. */
function passwordMaterial(password: string, sub: string): string {
  return `${password}\0${sub}`
}

async function deriveAesKey(
  password: string,
  sub: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passwordMaterial(password, sub)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function keySuffixOf(plaintext: string): string {
  if (plaintext.length <= 4) return plaintext
  return plaintext.slice(-4)
}

export async function encryptApiKey(
  plaintext: string,
  password: string,
  sub: string,
): Promise<Pick<EncryptedStoredApiKey, 'salt' | 'iv' | 'ciphertext' | 'keySuffix'>> {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const aesKey = await deriveAesKey(password, sub, salt)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  )
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(cipherBuf),
    keySuffix: keySuffixOf(plaintext),
  }
}

export async function decryptApiKey(
  entry: Pick<EncryptedStoredApiKey, 'salt' | 'iv' | 'ciphertext'>,
  password: string,
  sub: string,
): Promise<string> {
  const salt = fromBase64(entry.salt)
  const iv = fromBase64(entry.iv)
  const ciphertext = fromBase64(entry.ciphertext)
  const aesKey = await deriveAesKey(password, sub, salt)
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  )
  return new TextDecoder().decode(plainBuf)
}

/** Format heuristics only — not a live LLM call (CORS limits). */
export function looksLikeApiKey(
  provider: ApiKeyProvider,
  key: string,
): boolean {
  const k = key.trim()
  if (k.length < 8) return false
  if (provider === 'openai') return /^sk-[A-Za-z0-9_-]+/.test(k)
  if (provider === 'anthropic') return /^sk-ant-[A-Za-z0-9_-]+/.test(k)
  if (provider === 'gemini') return /^[A-Za-z0-9_-]{20,}$/.test(k)
  return false
}

/** Encrypt then decrypt with same password — verifies storage integrity. */
export async function roundTripTest(
  plaintext: string,
  password: string,
  sub: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const enc = await encryptApiKey(plaintext, password, sub)
    const back = await decryptApiKey(enc, password, sub)
    if (back !== plaintext) {
      return { ok: false, message: '복호화 결과가 원문과 일치하지 않습니다' }
    }
    return { ok: true, message: '암호화·복호화 라운드트립 성공' }
  } catch {
    return { ok: false, message: '암호화/복호화에 실패했습니다' }
  }
}
