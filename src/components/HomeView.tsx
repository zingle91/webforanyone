import type { MiniApp, SessionUser } from '../lib/types'

type Props = {
  user: SessionUser
  apps: MiniApp[]
  onOpen: (app: MiniApp) => void
}

export function HomeView({ user, apps, onOpen }: Props) {
  return (
    <div className="view">
      <div className="top">
        <h2>내 앱</h2>
        <span className="chip">
          {user.name} · {user.dept}
        </span>
      </div>
      <input className="search" placeholder="내 앱 검색" readOnly />
      <div className="section-label">
        설치됨 <span className="badge">{apps.length}</span>
      </div>
      {apps.length === 0 ? (
        <div className="empty">설치된 앱이 없습니다. 스토어에서 설치해 보세요.</div>
      ) : (
        <div className="grid">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              className="app-tile"
              onClick={() => onOpen(app)}
            >
              <div className={`icon ${app.colorClass}`}>{app.icon}</div>
              <div className="name">{app.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
