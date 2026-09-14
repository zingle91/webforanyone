import type { BridgeRequest, BridgeResponse, SessionUser } from './types'

export const BRIDGE_CHANNEL = 'corp-superapp' as const
export const BRIDGE_VERSION = 1 as const

export function isBridgeRequest(data: unknown): data is BridgeRequest {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    d.channel === BRIDGE_CHANNEL &&
    d.version === BRIDGE_VERSION &&
    typeof d.id === 'string' &&
    typeof d.method === 'string'
  )
}

export type BridgeHandlers = {
  getUser: () => SessionUser | null
  showToast: (message: string) => void
  closeMiniApp: () => void
}

export function handleBridgeRequest(
  req: BridgeRequest,
  handlers: BridgeHandlers,
): BridgeResponse {
  const base = {
    channel: BRIDGE_CHANNEL,
    version: BRIDGE_VERSION,
    id: req.id,
  } as const

  try {
    switch (req.method) {
      case 'host.user.get': {
        const user = handlers.getUser()
        if (!user) {
          return {
            ...base,
            ok: false,
            error: { code: 'unauthenticated', message: '로그인이 필요합니다.' },
          }
        }
        return {
          ...base,
          ok: true,
          result: {
            sub: user.sub,
            name: user.name,
            dept: user.dept,
            email: user.email ?? 'minsu.kim@company.com',
          },
        }
      }
      case 'host.ui.toast': {
        const message =
          typeof req.params?.message === 'string'
            ? req.params.message
            : '알림'
        handlers.showToast(message)
        return { ...base, ok: true, result: { shown: true } }
      }
      case 'host.nav.close': {
        handlers.closeMiniApp()
        return { ...base, ok: true, result: { closed: true } }
      }
      default:
        return {
          ...base,
          ok: false,
          error: {
            code: 'unknown_method',
            message: `지원하지 않는 메서드: ${req.method}`,
          },
        }
    }
  } catch (e) {
    return {
      ...base,
      ok: false,
      error: {
        code: 'internal',
        message: e instanceof Error ? e.message : '내부 오류',
      },
    }
  }
}
