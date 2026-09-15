import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiKeyHelpModal } from './components/ApiKeyHelpModal'
import { HomeView } from './components/HomeView'
import { LoginView } from './components/LoginView'
import { MakeView } from './components/MakeView'
import { MiniRuntime } from './components/MiniRuntime'
import { SpecRuntime } from './components/SpecRuntime'
import { StoreView } from './components/StoreView'
import { Toast } from './components/Toast'
import { DEFAULT_INSTALLED } from './lib/apps'
import { mergeCatalog } from './lib/spec/catalog'
import {
  loadUserInstalled,
  saveUserInstalled,
} from './lib/spec/persistence'
import type { MiniappSpec } from './lib/spec/types'
import { clearSession, loadSession, saveSession } from './lib/storage'
import type { MiniApp, SessionUser, TabId } from './lib/types'
import { authenticate } from './lib/users'

type MakeSub = 'hub' | 'maker' | 'keys' | 'preview'

export default function App() {
  const [session, setSession] = useState<SessionUser | null>(() => loadSession())
  const [tab, setTab] = useState<TabId>('home')
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [activeApp, setActiveApp] = useState<MiniApp | null>(null)
  const [previewSpec, setPreviewSpec] = useState<MiniappSpec | null>(null)
  const [makeSub, setMakeSub] = useState<MakeSub>('hub')
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [catalogTick, setCatalogTick] = useState(0)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  useEffect(() => {
    if (!session) {
      setInstalledIds([])
      return
    }
    const saved = loadUserInstalled(session.sub)
    if (saved) setInstalledIds(saved)
    else {
      setInstalledIds([...DEFAULT_INSTALLED])
      saveUserInstalled(session.sub, [...DEFAULT_INSTALLED])
    }
  }, [session])

  const catalog = useMemo(() => {
    void catalogTick
    if (!session) return []
    return mergeCatalog(session.sub)
  }, [session, catalogTick])

  const installedApps = useMemo(
    () => catalog.filter((a) => installedIds.includes(a.id)),
    [catalog, installedIds],
  )

  const login = (id: string, password: string) => {
    const user = authenticate(id, password)
    if (!user) return false
    saveSession(user)
    setSession(user)
    setTab('home')
    setMakeSub('hub')
    setActiveApp(null)
    setPreviewSpec(null)
    return true
  }

  const logout = () => {
    clearSession()
    setSession(null)
    setActiveApp(null)
    setPreviewSpec(null)
    setMakeSub('hub')
  }

  const toggleInstall = (id: string) => {
    if (!session) return
    setInstalledIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      saveUserInstalled(session.sub, next)
      showToast(prev.includes(id) ? '앱을 삭제했습니다' : '앱을 설치했습니다')
      return next
    })
  }

  const switchTab = (next: TabId) => {
    setActiveApp(null)
    setPreviewSpec(null)
    setMakeSub('hub')
    setHelpOpen(false)
    setTab(next)
  }

  const handlePublished = () => {
    if (!session) return
    setCatalogTick((t) => t + 1)
    // Auto-install newly published drafts: reload catalog and ensure latest published ids installed
    const nextCatalog = mergeCatalog(session.sub)
    const userAppIds = nextCatalog.filter((a) => a.source === 'user').map((a) => a.id)
    setInstalledIds((prev) => {
      const merged = Array.from(new Set([...prev, ...userAppIds]))
      saveUserInstalled(session.sub, merged)
      return merged
    })
  }

  const openApp = (app: MiniApp) => {
    setPreviewSpec(null)
    setActiveApp(app)
  }

  const previewApp: MiniApp | null = previewSpec
    ? {
        id: previewSpec.app.appId,
        name: `${previewSpec.app.name} (미리보기)`,
        description: previewSpec.app.description ?? '',
        icon: '✨',
        colorClass: 'c5',
        publisher: session?.name ?? '나',
        spec: previewSpec,
        source: 'user',
      }
    : null

  const runtimeApp = activeApp ?? previewApp

  return (
    <div className="app-shell">
      <h1 className="shell-title">Corp SuperApp Host</h1>
      <p className="shell-sub">호스트 프로토타입 · iframe + SpecRuntime</p>

      <div className="phone">
        <div className="notch">
          <span>9:41</span>
          <div className="pill" />
          <span>LTE</span>
        </div>

        <div className="screen">
          <div className="screen-body">
            {!session ? (
              <LoginView onLogin={login} />
            ) : (
              <>
                {tab === 'home' && !runtimeApp && (
                  <HomeView
                    user={session}
                    apps={installedApps}
                    onOpen={openApp}
                  />
                )}
                {tab === 'store' && !runtimeApp && (
                  <StoreView
                    catalog={catalog}
                    installedIds={installedIds}
                    onToggle={toggleInstall}
                  />
                )}
                {tab === 'make' && !runtimeApp && (
                  <MakeView
                    sub={makeSub === 'preview' ? 'maker' : makeSub}
                    onSub={setMakeSub}
                    onOpenHelp={() => setHelpOpen(true)}
                    user={session}
                    onToast={showToast}
                    onPublished={handlePublished}
                    onPreview={(spec) => {
                      setPreviewSpec(spec)
                    }}
                  />
                )}

                {runtimeApp?.spec ? (
                  <SpecRuntime
                    app={runtimeApp as MiniApp & { spec: MiniappSpec }}
                    user={session}
                    onClose={() => {
                      setActiveApp(null)
                      setPreviewSpec(null)
                    }}
                    onToast={showToast}
                    preview={!!previewSpec && !activeApp}
                  />
                ) : runtimeApp && runtimeApp.entryUrl ? (
                  <MiniRuntime
                    app={runtimeApp}
                    user={session}
                    onClose={() => setActiveApp(null)}
                    onToast={showToast}
                  />
                ) : null}

                <ApiKeyHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

                {session && tab === 'home' && !runtimeApp && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <button type="button" className="btn ghost block" onClick={logout}>
                      로그아웃
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {session && !runtimeApp && (
            <nav className="tabbar" aria-label="메인 메뉴">
              <button
                type="button"
                className={`tab ${tab === 'home' ? 'active' : ''}`}
                onClick={() => switchTab('home')}
              >
                <span className="ico">🏠</span>내 앱
              </button>
              <button
                type="button"
                className={`tab ${tab === 'store' ? 'active' : ''}`}
                onClick={() => switchTab('store')}
              >
                <span className="ico">🏪</span>스토어
              </button>
              <button
                type="button"
                className={`tab ${tab === 'make' ? 'active' : ''}`}
                onClick={() => switchTab('make')}
              >
                <span className="ico">✨</span>만들기
              </button>
            </nav>
          )}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  )
}
