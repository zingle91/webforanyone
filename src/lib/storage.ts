import type { SessionUser } from './types'
import { DEFAULT_INSTALLED, STORAGE_KEYS } from './apps'

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function saveSession(user: SessionUser): void {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.session)
}

export function loadInstalled(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.installed)
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.installed, JSON.stringify(DEFAULT_INSTALLED))
      return [...DEFAULT_INSTALLED]
    }
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : [...DEFAULT_INSTALLED]
  } catch {
    return [...DEFAULT_INSTALLED]
  }
}

export function saveInstalled(ids: string[]): void {
  localStorage.setItem(STORAGE_KEYS.installed, JSON.stringify(ids))
}
