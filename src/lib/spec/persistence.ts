import type {
  ApiKeyProvider,
  EntityRecord,
  MakerDraft,
  PublishedUserApp,
  StoredApiKey,
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

/** BYOK API keys */
export function loadApiKeys(sub: string): StoredApiKey[] {
  return readJson<StoredApiKey[]>(apiKeysKey(sub), [])
}

export function saveApiKey(
  sub: string,
  provider: ApiKeyProvider,
  key: string,
): void {
  const list = loadApiKeys(sub).filter((k) => k.provider !== provider)
  list.push({ provider, key, updatedAt: new Date().toISOString() })
  writeJson(apiKeysKey(sub), list)
}

export function removeApiKey(sub: string, provider: ApiKeyProvider): void {
  writeJson(
    apiKeysKey(sub),
    loadApiKeys(sub).filter((k) => k.provider !== provider),
  )
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

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}…${key.slice(-4)}`
}
