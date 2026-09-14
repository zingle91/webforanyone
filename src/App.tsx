import { useCallback, useMemo, useState } from 'react'
import { ApiKeyHelpModal } from './components/ApiKeyHelpModal'
import { HomeView } from './components/HomeView'
import { LoginView } from './components/LoginView'
import { MakeView } from './components/MakeView'
import { MiniRuntime } from './components/MiniRuntime'
import { StoreView } from './components/StoreView'
import { Toast } from './components/Toast'
import { CATALOG } from './lib/apps'
import {
  clearSession,
  loadInstalled,
  loadSession,
  saveInstalled,
  saveSession,
} from './lib/storage'
import type { MiniApp, SessionUser, TabId } from './lib/types'

const MOCK_USER: SessionUser = {
  name: '김민수',
  dept: 'AI팀',
  sub: 'emp-10482',
  email: 'minsu.kim@company.com',
}

type MakeSub = 'hub' | 'maker' | 'keys'

export default function App() {
  const [session, setSession] = useState<SessionUser | null>(() => loadSession())
  const [tab, setTab] = useState<TabId>('home')
  const [installedIds, setInstalledIds] = useState<string[]>(() => loadInstalled())
  const [activeApp, setActiveApp] = useState<MiniApp | null>(null)
  const [makeSub, setMakeSub] = useState<MakeSub>('hub')
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const installedApps = useMemo(
    () => CATALOG.filter((a) => installedIds.includes(a.id)),
    [installedIds],
  )

  const login = () => {
    saveSession(MOCK_USER)
    setSession(MOCK_USER)
    setTab('home')
  }

  const logout = () => {
    clearSession()
    setSession(null)
    setActiveApp(null)
    setMakeSub('hub')
  }

  const toggleInstall = (id: string) => {
    setInstalledIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      saveInstalled(next)
      showToast(prev.includes(id) ? '앱을 삭제했습니다' : '앱을 설치했습니다')
      return next
    })
  }

  const switchTab = (next: TabId) => {
    setActiveApp(null)
    setMakeSub('hub')
    setHelpOpen(false)
    setTab(next)
  }

  return (
    <div className="app-shell">
      <h1 className="shell-title">Corp SuperApp Host</h1>
      <p className="shell-sub">호스트 스켈레톤 프로토타입 · iframe + postMessage</p>

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
                {tab === 'home' && !activeApp && (
                  <HomeView
                    user={session}
                    apps={installedApps}
                    onOpen={(app) => setActiveApp(app)}
                  />
                )}
                {tab === 'store' && !activeApp && (
                  <StoreView
                    catalog={CATALOG}
                    installedIds={installedIds}
                    onToggle={toggleInstall}
                  />
                )}
                {tab === 'make' && !activeApp && (
                  <MakeView
                    sub={makeSub}
                    onSub={setMakeSub}
                    onOpenHelp={() => setHelpOpen(true)}
                  />
                )}

                {activeApp && (
                  <MiniRuntime
                    app={activeApp}
                    user={session}
                    onClose={() => setActiveApp(null)}
                    onToast={showToast}
                  />
                )}

                <ApiKeyHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

                {session && tab === 'home' && !activeApp && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <button type="button" className="btn ghost block" onClick={logout}>
                      로그아웃
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {session && !activeApp && makeSub === 'hub' && (
            <div className="tabbar">
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
            </div>
          )}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  )
}
