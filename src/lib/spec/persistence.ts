import type {
  ApiKeyProvider,
  EncryptedStoredApiKey,
  EntityRecord,
  MakerDraft,
  PublishedUserApp,
} from './types'

const PREFIX = 'corp-superapp'

function draftsKey(sub: string) {
  return `${PREFIX}:drafts:${sub}`
}
function publishedKey(sub: string) {
  return `${PREFIX}:published:${sub}`
}
function apiKeysKey(sub: string) {
  return `${PREFIX}:apikeys:${sub}`
}
function recordsKey(sub: string, appId: string, entity: string) {
  return `${PREFIX}:records:${sub}:${appId}:${entity}`
}
function installedKey(sub: string) {
  return `${PREFIX}:installed:${sub}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** Drafts */
export function loadDrafts(sub: string): MakerDraft[] {
  return readJson<MakerDraft[]>(draftsKey(sub), [])
}

export function saveDrafts(sub: string, drafts: MakerDraft[]): void {
  writeJson(draftsKey(sub), drafts)
}

export function upsertDraft(sub: string, draft: MakerDraft): void {
  const list = loadDrafts(sub)
  const i = list.findIndex((d) => d.appId === draft.appId)
  if (i >= 0) list[i] = draft
  else list.unshift(draft)
  saveDrafts(sub, list)
}

export function getDraft(sub: string, appId: string): MakerDraft | null {
  return loadDrafts(sub).find((d) => d.appId === appId) ?? null
}

export function removeDraft(sub: string, appId: string): void {
  saveDrafts(
    sub,
    loadDrafts(sub).filter((d) => d.appId !== appId),
  )
}

/** Published apps (per owner sub) */
export function loadPublished(sub: string): PublishedUserApp[] {
  return readJson<PublishedUserApp[]>(publishedKey(sub), [])
}

export function savePublished(sub: string, apps: PublishedUserApp[]): void {
  writeJson(publishedKey(sub), apps)
}

export function publishApp(app: PublishedUserApp): void {
  const list = loadPublished(app.ownerSub)
  const i = list.findIndex((a) => a.appId === app.appId)
  if (i >= 0) list[i] = app
  else list.unshift(app)
  savePublished(app.ownerSub, list)
}

export function findPublishedByAppId(
  ownerSub: string,
  appId: string,
): PublishedUserApp | null {
  return loadPublished(ownerSub).find((a) => a.appId === appId) ?? null
}

/** Entity records */
export function loadRecords(
  sub: string,
  appId: string,
  entity: string,
): EntityRecord[] {
  return readJson<EntityRecord[]>(recordsKey(sub, appId, entity), [])
}

export function saveRecords(
  sub: string,
  appId: string,
  entity: string,
  rows: EntityRecord[],
): void {
  writeJson(recordsKey(sub, appId, entity), rows)
}

export function insertRecord(
  sub: string,
  appId: string,
  entity: string,
  row: EntityRecord,
): EntityRecord {
  const rows = loadRecords(sub, appId, entity)
  rows.unshift(row)
  saveRecords(sub, appId, entity, rows)
  return row
}

/** BYOK API keys (encrypted only) */
export type LoadApiKeysResult = {
  keys: EncryptedStoredApiKey[]
  clearedLegacy: boolean
}

function isEncryptedEntry(raw: unknown): raw is EncryptedStoredApiKey {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    typeof o.provider === 'string' &&
    typeof o.salt === 'string' &&
    typeof o.iv === 'string' &&
    typeof o.ciphertext === 'string' &&
    typeof o.keySuffix === 'string' &&
    typeof o.updatedAt === 'string' &&
    !('key' in o)
  )
}

function isLegacyPlainEntry(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return typeof o.key === 'string' && typeof o.provider === 'string'
}

/**
 * Load encrypted API key metadata. Legacy plaintext `{ key }` entries are
 * deleted immediately; callers should toast when `clearedLegacy` is true.
 */
export function loadApiKeys(sub: string): LoadApiKeysResult {
  const raw = readJson<unknown[]>(apiKeysKey(sub), [])
  if (!Array.isArray(raw) || raw.length === 0) {
    return { keys: [], clearedLegacy: false }
  }
  const clearedLegacy = raw.some(isLegacyPlainEntry)
  const keys = raw.filter(isEncryptedEntry)
  if (clearedLegacy || keys.length !== raw.length) {
    writeJson(apiKeysKey(sub), keys)
  }
  return { keys, clearedLegacy }
}

export function saveEncryptedApiKey(
  sub: string,
  entry: EncryptedStoredApiKey,
): void {
  const { keys } = loadApiKeys(sub)
  const list = keys.filter((k) => k.provider !== entry.provider)
  list.push(entry)
  writeJson(apiKeysKey(sub), list)
}

export function removeApiKey(sub: string, provider: ApiKeyProvider): void {
  const { keys } = loadApiKeys(sub)
  writeJson(
    apiKeysKey(sub),
    keys.filter((k) => k.provider !== provider),
  )
}

export function getEncryptedApiKey(
  sub: string,
  provider: ApiKeyProvider,
): EncryptedStoredApiKey | null {
  return loadApiKeys(sub).keys.find((k) => k.provider === provider) ?? null
}

/** Per-user installed ids (falls back handled by caller with defaults) */
export function loadUserInstalled(sub: string): string[] | null {
  const raw = localStorage.getItem(installedKey(sub))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveUserInstalled(sub: string, ids: string[]): void {
  writeJson(installedKey(sub), ids)
}

/** Mask using stored keySuffix (no decrypt needed). */
export function maskApiKeySuffix(keySuffix: string): string {
  if (!keySuffix) return '••••••••'
  return `••••…${keySuffix}`
}
