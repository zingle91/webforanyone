import { useEffect, useRef } from 'react'
import type { MiniApp, SessionUser } from '../lib/types'
import { handleBridgeRequest, isBridgeRequest } from '../lib/bridge'

type Props = {
  app: MiniApp
  user: SessionUser
  onClose: () => void
  onToast: (message: string) => void
}

export function MiniRuntime({ app, user, onClose, onToast }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Same-origin sample mini-app (Vite public/)
      if (event.origin !== window.location.origin) return
      if (!isBridgeRequest(event.data)) return

      const source = event.source
      if (!source || source !== iframeRef.current?.contentWindow) return

      const response = handleBridgeRequest(event.data, {
        getUser: () => user,
        showToast: onToast,
        closeMiniApp: onClose,
      })

      ;(source as Window).postMessage(response, event.origin)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [user, onClose, onToast])

  const src = `${app.entryUrl}?appId=${encodeURIComponent(app.id)}&title=${encodeURIComponent(app.name)}`

  return (
    <div className="runtime">
      <div className="bar">
        <button type="button" className="btn ghost" onClick={onClose}>
          ←
        </button>
        <div className="title">{app.name}</div>
        <button type="button" className="btn danger" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className="iframe-wrap">
        <iframe
          ref={iframeRef}
          title={app.name}
          src={src}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
