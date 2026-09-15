import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionUser } from '../lib/types'
import type {
  ApiKeyProvider,
  MakerDraft,
  MakerMessage,
  MiniappSpec,
  StoredApiKey,
} from '../lib/spec/types'
import { generateFromConversation } from '../lib/spec/generator'
import {
  formatIssuesKorean,
  validateMiniappDocument,
} from '../lib/spec/validate'
import {
  loadApiKeys,
  loadDrafts,
  maskApiKey,
  publishApp,
  removeApiKey,
  saveApiKey,
  upsertDraft,
} from '../lib/spec/persistence'
import { iconToEmoji } from '../lib/spec/icons'

type Sub = 'hub' | 'maker' | 'keys' | 'preview'

type Props = {
  sub: Sub
  onSub: (s: Sub) => void
  onOpenHelp: () => void
  user: SessionUser
  onToast: (msg: string) => void
  onPublished: () => void
  onPreview: (spec: MiniappSpec) => void
}

function newId() {
  return `m-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

const WELCOME: MakerMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '어떤 미니앱을 만들까요? 예: "야근 신청과 내 신청 목록", "비품 대여 기록(물품명·수량·반납여부)"',
  at: Date.now(),
}

export function MakeView({
  sub,
  onSub,
  onOpenHelp,
  user,
  onToast,
  onPublished,
  onPreview,
}: Props) {
  const [drafts, setDrafts] = useState<MakerDraft[]>(() => loadDrafts(user.sub))
  const [messages, setMessages] = useState<MakerMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [spec, setSpec] = useState<MiniappSpec | null>(null)
  const [validationErrors, setValidationErrors] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [provider, setProvider] = useState<ApiKeyProvider>('openai')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savedKeys, setSavedKeys] = useState<StoredApiKey[]>(() => loadApiKeys(user.sub))

  useEffect(() => {
    setDrafts(loadDrafts(user.sub))
    setSavedKeys(loadApiKeys(user.sub))
  }, [user.sub])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sub])

  const publishedDrafts = useMemo(
    () => drafts.filter((d) => d.status === 'published'),
    [drafts],
  )
  const draftOnly = useMemo(
    () => drafts.filter((d) => d.status === 'draft' && d.spec),
    [drafts],
  )

  const persistCurrent = (nextSpec: MiniappSpec | null, nextMessages: MakerMessage[], status: 'draft' | 'published' = 'draft') => {
    if (!nextSpec) return
    const draft: MakerDraft = {
      appId: nextSpec.app.appId,
      updatedAt: new Date().toISOString(),
      messages: nextMessages,
      spec: nextSpec,
      status,
    }
    upsertDraft(user.sub, draft)
    setDrafts(loadDrafts(user.sub))
  }

  const runGenerate = () => {
    const text = input.trim()
    if (!text || busy) return
    setBusy(true)
    const userMsg: MakerMessage = { id: newId(), role: 'user', text, at: Date.now() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')

    try {
      const turns = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }))
      const { assistantText, spec: nextSpec } = generateFromConversation(turns, spec)
      const result = validateMiniappDocument(nextSpec)
      const errText = result.ok ? '' : formatIssuesKorean(result.errors)
      setValidationErrors(errText)

      const finalSpec = result.spec ?? nextSpec
      setSpec(finalSpec)

      let reply = assistantText
      if (!result.ok) {
        reply += `\n\n⚠️ 검증 오류가 있어요:\n${errText}`
      } else {
        reply += '\n\n✅ 스키마·Secondary 검증을 통과했습니다.'
      }

      const aiMsg: MakerMessage = {
        id: newId(),
        role: 'assistant',
        text: reply,
        at: Date.now(),
      }
      const withAi = [...nextMessages, aiMsg]
      setMessages(withAi)
      persistCurrent(finalSpec, withAi, 'draft')
    } finally {
      setBusy(false)
    }
  }

  const handlePublish = () => {
    if (!spec) {
      onToast('먼저 스펙을 생성해 주세요')
      return
    }
    const result = validateMiniappDocument(spec)
    if (!result.ok || !result.spec) {
      setValidationErrors(formatIssuesKorean(result.errors))
      onToast('검증 실패 — 게시할 수 없습니다')
      return
    }
    publishApp({
      appId: result.spec.app.appId,
      publishedAt: new Date().toISOString(),
      ownerSub: user.sub,
      ownerName: user.name,
      spec: result.spec,
    })
    persistCurrent(result.spec, messages, 'published')
    onPublished()
    onToast('게시했습니다 · 내 앱/스토어에 표시됩니다')
    onSub('hub')
  }

  const openDraft = (d: MakerDraft) => {
    setMessages(d.messages.length ? d.messages : [WELCOME])
    setSpec(d.spec)
    setValidationErrors('')
    onSub('maker')
  }

  const startNew = () => {
    setMessages([WELCOME])
    setSpec(null)
    setValidationErrors('')
    setInput('')
    onSub('maker')
  }

  if (sub === 'maker') {
    return (
      <div className="subscreen">
        <div className="bar">
          <button type="button" className="btn ghost" onClick={() => onSub('hub')}>
            ←
          </button>
          <div className="title">AI 미니앱 메이커</div>
          <span className="chip">로컬</span>
        </div>
        <div className="body maker-body">
          <div className="spec-note">
            로컬 규칙 기반 생성기 · MINIAPP_SPEC v1 · API 키 없이 동작
          </div>
          <div className="chat">
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role === 'user' ? 'me' : 'ai'}`}>
                {m.text.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < m.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {validationErrors && (
            <div className="warn-box" style={{ whiteSpace: 'pre-wrap' }}>
              {validationErrors}
            </div>
          )}
          {spec && (
            <div className="maker-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const result = validateMiniappDocument(spec)
                  if (!result.ok) {
                    setValidationErrors(formatIssuesKorean(result.errors))
                    onToast('검증 실패 — 미리보기 불가')
                    return
                  }
                  onPreview(spec)
                }}
              >
                미리보기
              </button>
              <button type="button" className="btn primary" onClick={handlePublish}>
                게시
              </button>
            </div>
          )}
          <div className="composer">
            <textarea
              className="input"
              rows={2}
              placeholder="예: 야근 신청과 내 신청 목록"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  runGenerate()
                }
              }}
            />
            <button
              type="button"
              className="btn primary"
              disabled={busy || !input.trim()}
              onClick={runGenerate}
            >
              {spec ? '수정' : '생성'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (sub === 'keys') {
    return (
      <div className="subscreen">
        <div className="bar">
          <button type="button" className="btn ghost" onClick={() => onSub('hub')}>
            ←
          </button>
          <div className="title">LLM API 키</div>
          <span className="chip">BYOK</span>
        </div>
        <div className="body">
          <p className="hint" style={{ textAlign: 'left', margin: '0 0 12px' }}>
            선택 사항입니다. 코어 메이커는 <strong>로컬 생성기</strong>로 API 키 없이
            동작합니다. 키는 이 브라우저 localStorage에만 저장됩니다.
          </p>
          <button type="button" className="linkish" onClick={onOpenHelp}>
            ❓ API키가 무엇인가요?
          </button>

          <div className="provider-tabs" style={{ marginTop: 8 }}>
            {(['openai', 'anthropic', 'gemini'] as ApiKeyProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                className={provider === p ? 'active' : ''}
                onClick={() => setProvider(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <label className="spec-field">
            <span>API 키</span>
            <input
              type="password"
              className="input"
              placeholder="sk-… 또는 발급 키"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn primary block"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (!apiKeyInput.trim()) {
                onToast('키를 입력해 주세요')
                return
              }
              saveApiKey(user.sub, provider, apiKeyInput.trim())
              setSavedKeys(loadApiKeys(user.sub))
              setApiKeyInput('')
              onToast('키를 저장했습니다 (로컬)')
            }}
          >
            키 저장
          </button>

          <div className="section-label" style={{ marginTop: 18 }}>
            저장된 키
          </div>
          {savedKeys.length === 0 ? (
            <div className="empty">저장된 키가 없습니다</div>
          ) : (
            <div className="list">
              {savedKeys.map((k) => (
                <div className="row" key={k.provider}>
                  <div className="meta">
                    <div className="n">{k.provider}</div>
                    <div className="d">{maskApiKey(k.key)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      removeApiKey(user.sub, k.provider)
                      setSavedKeys(loadApiKeys(user.sub))
                      onToast('삭제했습니다')
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <div className="top">
        <h2>만들기</h2>
        <span className="chip ok">로컬 생성</span>
      </div>

      <div className="cta">
        <h3>AI 미니앱 메이커</h3>
        <p>
          한국어로 설명하면 <code>MINIAPP_SPEC</code> v1 JSON을 만들고, 검증·미리보기·게시까지
          진행합니다. (로컬 규칙 기반 · API 키 불필요)
        </p>
        <button type="button" className="btn primary block" onClick={startNew}>
          대화로 미니앱 만들기
        </button>
      </div>

      <button
        type="button"
        className="btn ghost block"
        style={{ marginBottom: 14 }}
        onClick={() => onSub('keys')}
      >
        LLM API 키 관리 (선택)
      </button>

      <div className="section-label">내가 만든 미니앱</div>
      {draftOnly.length === 0 && publishedDrafts.length === 0 ? (
        <div className="empty">아직 만든 앱이 없습니다</div>
      ) : (
        <div className="list">
          {[...publishedDrafts, ...draftOnly].map((d) => (
            <div className="row" key={d.appId}>
              <div className="icon c5">
                {d.spec ? iconToEmoji(d.spec.app.icon) : '✨'}
              </div>
              <div className="meta">
                <div className="n">{d.spec?.app.name ?? d.appId}</div>
                <div className="d">
                  {d.status} · {d.appId}
                </div>
              </div>
              <button type="button" className="btn ghost" onClick={() => openDraft(d)}>
                {d.status === 'published' ? '관리' : '이어하기'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
