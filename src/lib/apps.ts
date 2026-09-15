import type { MiniApp } from './types'

/** Built-in seed catalog — empty; user-published apps come from localStorage. */
export const CATALOG: MiniApp[] = []

/** Default installs for first login — none (no seed apps). */
export const DEFAULT_INSTALLED: string[] = []

export const STORAGE_KEYS = {
  session: 'corp-superapp:session',
  installed: 'corp-superapp:installed',
} as const
