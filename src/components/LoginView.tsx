import { useState } from 'react'

type Props = {
  onLogin: (id: string, password: string) => boolean
}

export function LoginView({ onLogin }: Props) {
  const [id, setId] = useState('tester01')
  const [password, setPassword] = useState('tester01')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const ok = onLogin(id, password)
    if (!ok) setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    else setError(null)
  }

  return (
    <div className="login-wrap">
      <div className="brand">
        <div className="logo">S</div>
        <h3>Corp SuperApp</h3>
        <p>임직원 전용 호스트 웹앱</p>
      </div>
      <div className="field">
        <label>아이디</label>
        <input
          value={id}
          autoComplete="username"
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <div className="field">
        <label>비밀번호</label>
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      {error && (
        <p className="hint" style={{ color: '#f87171', textAlign: 'left', marginTop: 0 }}>
          {error}
        </p>
      )}
      <button type="button" className="btn primary block" onClick={submit}>
        로그인
      </button>
      <p className="hint">프로토타입 계정 · tester01 / tester01</p>
    </div>
  )
}
