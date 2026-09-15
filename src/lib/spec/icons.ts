import type { SpecIcon } from './types'

const ICON_EMOJI: Record<SpecIcon, string> = {
  calendar: '📅',
  building: '🏢',
  receipt: '🧾',
  check: '✅',
  megaphone: '📣',
  tools: '🛠️',
  meal: '🍽️',
  chart: '📊',
  moon: '🌙',
  users: '👥',
  file: '📄',
  clipboard: '📋',
  clock: '⏰',
  home: '🏠',
  star: '⭐',
}

const COLOR_CYCLE = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const

export function iconToEmoji(icon: SpecIcon | string): string {
  if (icon in ICON_EMOJI) return ICON_EMOJI[icon as SpecIcon]
  return '📄'
}

export function colorForAppId(appId: string): string {
  let h = 0
  for (let i = 0; i < appId.length; i++) h = (h + appId.charCodeAt(i) * (i + 1)) % 997
  return COLOR_CYCLE[h % COLOR_CYCLE.length]
}
