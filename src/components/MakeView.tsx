import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { SessionUser } from '../lib/types'
import type {
  ApiKeyProvider,
  EncryptedStoredApiKey,
  MakerDraft,
  MakerMessage,
  MiniappSpec,
} from '../lib/spec/types'
import { generateFromConversation } from '../lib/spec/generator'
import {
  formatIssuesKorean,
  validateMiniappDocument,
} from '../lib/spec/validate'
import {
  getEncryptedApiKey,
  loadApiKeys,
  loadDrafts,
  maskApiKeySuffix,
  publishApp,
  removeApiKey,
  saveEncryptedApiKey,
  upsertDraft,
} from '../lib/spec/persistence'
import {
  decryptApiKey,
  encryptApiKey,
  looksLikeApiKey,
  roundTripTest,
} from '../lib/spec/apiKeyCrypto'
import { iconToEmoji } from '../lib/spec/icons'

type Sub = 'hub' | 'maker' | 'keys' | 'preview'

type Props = {
  sub: Sub
  onSub: (s: Sub) => void
  onOpenHelp: () => void
  user: SessionUser
  /** Login password in memory only; null after refresh until re-login. */
  sessionSecret: string | null
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
  sessionSecret,
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
  const keyFormRef = useRef<HTMLFormElement>(null)

  const [provider, setProvider] = useState<ApiKeyProvider>('openai')
  const [savedKeys, setSavedKeys] = useState<EncryptedStoredApiKey[]>(
    () => loadApiKeys(user.sub).keys,
  )
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(loadDrafts(user.sub))
    setSavedKeys(loadApiKeys(user.sub).keys)
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

  const refreshKeys = () => {
    setSavedKeys(loadApiKeys(user.sub).keys)
  }

  const requireSecret = (): string | null => {
    if (!sessionSecret) {
      onToast('다시 로그인해 주세요')
      setKeyFeedback('세션 비밀번호가 없습니다. 로그아웃 후 다시 로그인해 주세요.')
      return null
    }
    return sessionSecret
  }

  const handleSaveKey = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const secret = requireSecret()
    if (!secret) return
    const data = new FormData(form)
    const rawKey = String(data.get('apiKey') ?? '').trim()
    if (!rawKey) {
      onToast('키를 입력해 주세요')
      setKeyFeedback('API 키를 입력해 주세요.')
      return
    }
    setKeyBusy(true)
    setKeyFeedback(null)
    try {
      const enc = await encryptApiKey(rawKey, secret, user.sub)
      saveEncryptedApiKey(user.sub, {
        provider,
        ...enc,
        updatedAt: new Date().toISOString(),
      })
      refreshKeys()
      form.reset()
      setKeyFeedback('키를 암호화해 저장했습니다 (브라우저 로컬).')
      onToast('키를 암호화해 저장했습니다')
    } catch (err) {
      console.error('API key save failed', err)
      setKeyFeedback('저장에 실패했습니다.')
      onToast('키 저장 실패')
    } finally {
      setKeyBusy(false)
    }
  }

  const handleTestKey = async () => {
    const secret = requireSecret()
    if (!secret) return
    const form = keyFormRef.current
    const typed = form
      ? String(new FormData(form).get('apiKey') ?? '').trim()
      : ''
    setKeyBusy(true)
    setKeyFeedback(null)
    try {
      if (typed) {
        if (!looksLikeApiKey(provider, typed)) {
          setKeyFeedback(
            `형식 검사 실패 (${provider}). 실제 LLM 호출은 CORS 제한으로 생략합니다.`,
          )
          onToast('키 형식 검사 실패')
          return
        }
        const rt = await roundTripTest(typed, secret, user.sub)
        setKeyFeedback(
          rt.ok
            ? `${rt.message}. 형식 OK · 실제 LLM 호출은 CORS 제한으로 하지 않습니다.`
            : rt.message,
        )
        onToast(rt.ok ? '키 테스트 성공' : '키 테스트 실패')
        return
      }
      const stored = getEncryptedApiKey(user.sub, provider)
      if (!stored) {
        setKeyFeedback('저장된 키가 없습니다. 키를 입력하거나 먼저 저장해 주세요.')
        onToast('저장된 키 없음')
        return
      }
      const plain = await decryptApiKey(stored, secret, user.sub)
      if (!looksLikeApiKey(provider, plain)) {
        setKeyFeedback(
          '복호화는 됐지만 형식 검사에 실패했습니다. (실제 LLM 호출은 CORS로 생략)',
        )
        onToast('형식 검사 실패')
        return
      }
      if (plain.slice(-4) !== stored.keySuffix) {
        setKeyFeedback('복호화 결과와 keySuffix가 일치하지 않습니다.')
        onToast('키 테스트 실패')
        return
      }
      setKeyFeedback(
        '저장된 키 복호화·형식 검사 성공. 실제 LLM 호출은 CORS 제한으로 하지 않습니다.',
      )
      onToast('키 테스트 성공')
    } catch {
      setKeyFeedback(
        '복호화 실패 — 로그인 비밀번호가 다르거나 데이터가 손상되었을 수 있습니다.',
      )
      onToast('키 테스트 실패')
    } finally {
      setKeyBusy(false)
    }
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
            동작합니다. 키는 로그인 비밀번호로 <strong>브라우저에서 암호화</strong>되어
            localStorage에만 저장되며, 서버로 업로드하지 않습니다 (현재 단계).
          </p>
          <div className="warn-box" style={{ marginBottom: 12 }}>
            평문 API 키는 저장하지 않습니다. 새로고침 후에는 복호화를 위해{' '}
            <strong>다시 로그인</strong>해야 합니다.
          </div>
          <button type="button" className="linkish" onClick={onOpenHelp}>
            ❓ API키가 무엇인가요?
          </button>

          {!sessionSecret && (
            <div className="warn-box" style={{ marginTop: 12 }}>
              세션 비밀번호가 없습니다. 키를 저장·테스트하려면{' '}
              <strong>다시 로그인해 주세요</strong>.
            </div>
          )}

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

          <form ref={keyFormRef} onSubmit={handleSaveKey}>
            <label className="spec-field">
              <span>API 키</span>
              <input
                type="password"
                className="input"
                name="apiKey"
                placeholder="sk-… 또는 발급 키"
                autoComplete="off"
                disabled={!sessionSecret || keyBusy}
              />
            </label>
            <button
              type="submit"
              className="btn primary block"
              style={{ marginTop: 10 }}
              disabled={!sessionSecret || keyBusy}
            >
              키 저장
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              disabled={!sessionSecret || keyBusy}
              onClick={() => void handleTestKey()}
            >
              키 테스트
            </button>
          </form>

          {keyFeedback && (
            <p
              className="hint"
              style={{ textAlign: 'left', marginTop: 10, color: '#a5b4fc' }}
            >
              {keyFeedback}
            </p>
          )}

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
                    <div className="d">{maskApiKeySuffix(k.keySuffix)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      removeApiKey(user.sub, k.provider)
                      refreshKeys()
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
