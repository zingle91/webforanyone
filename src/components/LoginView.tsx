import { useState, type FormEvent } from 'react'

type Props = {
  onLogin: (id: string, password: string) => boolean
}

export function LoginView({ onLogin }: Props) {
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const id = String(data.get('id') ?? '')
    const password = String(data.get('password') ?? '')
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
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            name="id"
            defaultValue="tester01"
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            name="password"
            type="password"
            defaultValue="tester01"
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p className="hint" style={{ color: '#f87171', textAlign: 'left', marginTop: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn primary block">
          로그인
        </button>
      </form>
      <p className="hint">프로토타입 계정 · tester01 / tester01 · tester99 / tester99</p>
    </div>
  )
}
