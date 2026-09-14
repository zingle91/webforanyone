type Sub = 'hub' | 'maker' | 'keys'

type Props = {
  sub: Sub
  onSub: (s: Sub) => void
  onOpenHelp: () => void
}

export function MakeView({ sub, onSub, onOpenHelp }: Props) {
  if (sub === 'maker') {
    return (
      <div className="subscreen">
        <div className="bar">
          <button type="button" className="btn ghost" onClick={() => onSub('hub')}>
            ←
          </button>
          <div className="title">AI 미니앱 메이커</div>
          <span className="chip">SPEC v1</span>
        </div>
        <div className="body">
          <div className="stub-box">
            <strong>다음 단계에서 연결</strong>
            대화형 AI 메이커와 MINIAPP_SPEC 렌더러는 이후 단계에서 연동됩니다.
            현재는 호스트 스켈레톤 화면입니다.
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
            본인 구독 키만 사용 · 호스트가 대신 호출 · 키는 암호화 저장 (예정)
          </p>
          <button type="button" className="linkish" onClick={onOpenHelp}>
            ❓ API키가 무엇인가요?
          </button>
          <div className="stub-box">
            <strong>다음 단계에서 연결</strong>
            실제 LLM API 키 등록·저장·프록시 호출은 범위 밖입니다. 튜토리얼 모달만
            동작합니다.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <div className="top">
        <h2>만들기</h2>
        <span className="chip ok">프로토타입</span>
      </div>

      <div className="cta">
        <h3>AI 미니앱 메이커</h3>
        <p>
          말로 설명하면 <code>MINIAPP_SPEC</code> 규격 JSON으로 만들어 줘요. 코드 작성
          불필요.
        </p>
        <button type="button" className="btn primary block" onClick={() => onSub('maker')}>
          대화로 미니앱 만들기
        </button>
      </div>

      <button
        type="button"
        className="btn ghost block"
        style={{ marginBottom: 14 }}
        onClick={() => onSub('keys')}
      >
        LLM API 키 관리
      </button>

      <div className="section-label">내가 만든 미니앱</div>
      <div className="list">
        <div className="row">
          <div className="icon c3">🧾</div>
          <div className="meta">
            <div className="n">경비 정산</div>
            <div className="d">published · 샘플</div>
          </div>
          <button type="button" className="btn ghost" disabled>
            관리
          </button>
        </div>
        <div className="row">
          <div className="icon c5">🌙</div>
          <div className="meta">
            <div className="n">야근 신청</div>
            <div className="d">draft · AI 생성</div>
          </div>
          <button type="button" className="btn ghost" disabled>
            미리보기
          </button>
        </div>
      </div>
    </div>
  )
}
