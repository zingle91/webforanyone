import { useState } from 'react'

type Provider = 'openai' | 'anthropic' | 'gemini'

const STEPS: Record<Provider, { title: string; desc: string }[]> = {
  openai: [
    { title: '계정 준비', desc: 'platform.openai.com 에 로그인해요. 회사/개인 구독 계정을 사용해요.' },
    { title: 'API keys 메뉴', desc: '왼쪽 메뉴에서 API keys → Create new secret key를 눌러요.' },
    { title: '키 복사', desc: 'sk-로 시작하는 문자열을 바로 복사해요. 이후엔 다시 볼 수 없어요.' },
    { title: '여기에 붙여넣기', desc: '프로바이더 OpenAI 선택 → API 키 칸에 붙여넣고 키 저장.' },
  ],
  anthropic: [
    { title: '계정 준비', desc: 'console.anthropic.com 에 로그인해요.' },
    { title: 'API Keys', desc: 'API Keys에서 새 키를 만들어요.' },
    { title: '키 복사', desc: 'sk-ant- 형태 키를 복사해요.' },
    { title: '여기에 붙여넣기', desc: '프로바이더 Anthropic → 붙여넣고 저장.' },
  ],
  gemini: [
    { title: '계정 준비', desc: 'Google AI Studio (aistudio.google.com)에 로그인해요.' },
    { title: 'Get API key', desc: 'Get API key로 새 키를 만들어요.' },
    { title: '키 복사', desc: '발급된 키 문자열을 복사해요.' },
    { title: '여기에 붙여넣기', desc: '프로바이더 Google Gemini → 붙여넣고 저장.' },
  ],
}

type Props = {
  open: boolean
  onClose: () => void
}

export function ApiKeyHelpModal({ open, onClose }: Props) {
  const [provider, setProvider] = useState<Provider>('openai')
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="top" style={{ marginBottom: 8 }}>
          <h3>API 키란?</h3>
          <button type="button" className="btn ghost" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="lead">
          API 키는 AI 서비스(OpenAI 등)가 “이 사람이 사용 권한이 있다”고 확인하는{' '}
          <strong>비밀번호 같은 문자열</strong>이에요. 미니앱 메이커가 내 계정으로 모델을
          호출할 때 필요해요.
        </p>
        <div className="warn-box">
          키는 다른 사람에게 공유하지 마세요. 이 브라우저에서 로그인 비밀번호로
          암호화해 저장하며, 서버로 업로드하지 않습니다. (현재 단계)
        </div>
        <div className="provider-tabs">
          {(
            [
              ['openai', 'OpenAI'],
              ['anthropic', 'Anthropic'],
              ['gemini', 'Gemini'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={provider === id ? 'active' : ''}
              onClick={() => setProvider(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="steps">
          {STEPS[provider].map((s, i) => (
            <div className="step" key={s.title}>
              <div className="t">
                <span className="n">{i + 1}</span>
                {s.title}
              </div>
              <div className="d">{s.desc}</div>
            </div>
          ))}
        </div>
        <button type="button" className="btn primary block" onClick={onClose}>
          알겠어요
        </button>
      </div>
    </div>
  )
}
