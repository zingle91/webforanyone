import { CATALOG } from '../apps'
import type { MiniApp } from '../types'
import { iconToEmoji, colorForAppId } from './icons'
import { loadPublished } from './persistence'
import type { MiniappSpec, PublishedUserApp } from './types'

export function publishedToMiniApp(pub: PublishedUserApp): MiniApp {
  const { spec } = pub
  return {
    id: spec.app.appId,
    name: spec.app.name,
    description: spec.app.description ?? '',
    icon: iconToEmoji(spec.app.icon),
    colorClass: colorForAppId(spec.app.appId),
    publisher: pub.ownerName || '나',
    entryUrl: undefined,
    spec,
    source: 'user',
    ownerSub: pub.ownerSub,
  }
}

export function mergeCatalog(userSub: string): MiniApp[] {
  const published = loadPublished(userSub).map(publishedToMiniApp)
  const ids = new Set(published.map((p) => p.id))
  const seed = CATALOG.filter((c) => !ids.has(c.id))
  return [...seed, ...published]
}

export function resolveApp(
  userSub: string,
  appId: string,
): MiniApp | null {
  return mergeCatalog(userSub).find((a) => a.id === appId) ?? null
}

export function hasSpec(app: MiniApp): app is MiniApp & { spec: MiniappSpec } {
  return !!app.spec
}
