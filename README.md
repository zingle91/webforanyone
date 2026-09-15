# Corp SuperApp Host (스켈레톤)

사내 위챗형 슈퍼앱 **호스트** 프로토타입입니다.  
모바일 브라우저 데모용 Vite + React + TypeScript 스켈레톤입니다.

**GitHub Pages 공개 URL:** https://zingle91.github.io/webforanyone/

저장소: https://github.com/zingle91/webforanyone

---

## 로컬 실행

```bash
cd corp-superapp-host   # 또는 클론한 저장소 루트
npm install
npm run dev
```

브라우저에서 **http://localhost:5173** 을 엽니다.

일반 빌드:

```bash
npm run build
```

---

## GitHub Pages 배포

### 1) 저장소 Settings에서 Pages 소스 지정 (최초 1회)

1. GitHub 저장소 **Settings** → **Pages** 로 이동합니다.
2. **Build and deployment** → **Source** 에서 **GitHub Actions** 를 선택합니다.
3. `main` 브랜치에 푸시하거나 Actions 탭에서 **Deploy to GitHub Pages** 워크플로를 **Run workflow** 합니다.
4. 배포가 끝나면 다음 주소에서 확인합니다:  
   **https://zingle91.github.io/webforanyone/**

워크플로 파일: `.github/workflows/deploy-pages.yml`  
(푸시 `main` + `workflow_dispatch`, `GITHUB_PAGES=true`, `VITE_BASE=/webforanyone/`)

### 2) 로컬에서 Pages용 빌드 확인

```bash
GITHUB_PAGES=true VITE_BASE=/webforanyone/ npm run build
```

- `vite.config.ts` 의 `base` 가 `/webforanyone/` 로 설정됩니다.
- `dist/index.html` 및 에셋 경로에 `/webforanyone/` 접두사가 붙는지 확인하세요.
- 미리보기: `npx vite preview --base /webforanyone/` (또는 `npm run preview` 후 base가 반영된 dist 사용)

### 3) 이 프로젝트를 `webforanyone` 저장소에 푸시하는 방법

아직 git이 초기화되지 않았거나 원격이 없다면 (로컬에서, 본인 GitHub 인증으로):

```bash
cd corp-superapp-host
git init
git remote add origin https://github.com/zingle91/webforanyone.git
git add .
git commit -m "Configure Vite base and GitHub Pages deploy"
git branch -M main
git push -u origin main
```

SSH를 쓰는 경우: `git remote add origin git@github.com:zingle91/webforanyone.git`

> 이 환경에서는 GitHub 토큰/로그인이 없어 자동 푸시를 하지 않습니다. 위 단계는 사용자 계정에서 실행하세요.

---

## 포함된 기능 (호스트만)

1. **로그인 목** — SSO 버튼 → `localStorage` 세션 `{ name, dept, sub }`
2. **하단 탭** — 내 앱 | 스토어 | 만들기
3. **내 앱** — 설치된 미니앱 그리드 (시드 4개)
4. **스토어** — 설치/삭제 토글 (`localStorage`)
5. **만들기** — 로컬 NL→MiniappSpec 메이커, 검증, 미리보기, 게시 + BYOK 키(선택)
6. **미니앱 런타임** — 시드: iframe MiniRuntime / 사용자 앱: SpecRuntime
7. **postMessage 브릿지** — `corp-superapp` v1  
   - `host.user.get` / `host.ui.toast` / `host.nav.close`  
   - origin 검사 포함

---

## 미니앱 만들기

사내 직원이 **한국어로 설명**하면 호스트가 **로컬 규칙 기반 생성기**로 `MiniappSpec` v1 JSON을 만들고, 검증·미리보기·게시까지 진행합니다.

### 흐름

1. 로그인 (`tester01` / `tester01`)
2. 하단 **만들기** → **대화로 미니앱 만들기**
3. 예: `야근 신청과 내 신청 목록` 입력 후 생성
4. 스키마(Ajv) + Secondary 검증 통과 확인 → **미리보기** → **게시**
5. **내 앱** / **스토어**에 표시 → 열어 폼 제출 → 목록에서 확인

### 로컬 생성기

- API 키 **없이** 동작 (BYOK LLM 키는 선택·localStorage만)
- 수정 요청 시 대화 맥락으로 **전체 스펙을 다시 생성**
- 게시된 앱은 `SpecRuntime`(폼+목록)으로 실행
- 시드 카탈로그 앱은 기존처럼 `iframe` + `MiniRuntime`

### 저장 위치 (브라우저)

- 초안/게시 스펙, 엔티티 레코드, API 키: `localStorage` (사용자 `sub` 스코프)
- 서버·DB 없음 (GitHub Pages 정적 배포)


## 범위 밖

- 필수 LLM API 호출 (코어 경로는 로컬 생성기)
- 서버 측 저장 / 실제 SQLite 파일
- 실제 SSO

## 참고

디자인 목업(런타임 의존 없음): `/workspace/corp-superapp-mock/index.html`

### base 환경 변수

| 조건 | `base` |
|------|--------|
| `VITE_BASE` 설정됨 | 해당 값 (끝에 `/` 보정) |
| `GITHUB_PAGES=true` | `/webforanyone/` |
| 기본 (로컬) | `/` |
