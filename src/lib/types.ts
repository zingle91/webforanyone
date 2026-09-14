export type SessionUser = {
  name: string
  dept: string
  sub: string
  email?: string
}

export type MiniApp = {
  id: string
  name: string
  description: string
  icon: string
  colorClass: string
  publisher: string
  /** sample mini-app path under public/ */
  entryUrl: string
}

export type TabId = 'home' | 'store' | 'make'

export type BridgeRequest = {
  channel: 'corp-superapp'
  version: 1
  id: string
  method: string
  params?: Record<string, unknown>
}

export type BridgeResponse = {
  channel: 'corp-superapp'
  version: 1
  id: string
  ok: boolean
  result?: unknown
  error?: { code: string; message: string }
}
