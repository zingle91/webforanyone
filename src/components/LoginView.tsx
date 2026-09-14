type Props = { onLogin: () => void }

export function LoginView({ onLogin }: Props) {
  return (
    <div className="login-wrap">
      <div className="brand">
        <div className="logo">S</div>
        <h3>Corp SuperApp</h3>
        <p>임직원 전용 호스트 웹앱</p>
      </div>
      <div className="field">
        <label>회사 계정</label>
        <input value="minsu.kim@company.com" readOnly />
      </div>
      <div className="field">
        <label>비밀번호</label>
        <input type="password" value="••••••••" readOnly />
      </div>
      <button type="button" className="btn primary block" onClick={onLogin}>
        SSO / 로그인
      </button>
      <p className="hint">프로토타입 · 실제로는 회사 SSO</p>
    </div>
  )
}
