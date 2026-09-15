import type { MiniApp } from '../lib/types'

type Props = {
  catalog: MiniApp[]
  installedIds: string[]
  onToggle: (id: string) => void
}

export function StoreView({ catalog, installedIds, onToggle }: Props) {
  return (
    <div className="view">
      <div className="top">
        <h2>스토어</h2>
        <span className="chip">전사 공개</span>
      </div>
      <input className="search" placeholder="미니앱 검색" readOnly />
      {catalog.length === 0 ? (
        <div className="empty">
          아직 등록된 앱이 없습니다. 만들기에서 미니앱을 게시해 보세요.
        </div>
      ) : (
        <div className="list">
          {catalog.map((app) => {
            const installed = installedIds.includes(app.id)
            return (
              <div className="row" key={app.id}>
                <div className={`icon ${app.colorClass}`}>{app.icon}</div>
                <div className="meta">
                  <div className="n">{app.name}</div>
                  <div className="d">
                    {app.publisher} · {app.description}
                  </div>
                </div>
                <button
                  type="button"
                  className={installed ? 'btn ghost' : 'btn primary'}
                  onClick={() => onToggle(app.id)}
                >
                  {installed ? '삭제' : '설치'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
