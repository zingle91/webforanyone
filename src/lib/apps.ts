import type { MiniApp } from './types'

/** Vite BASE_URL ends with / — works for local (/) and GitHub Pages (/webforanyone/) */
const SAMPLE_ENTRY = `${import.meta.env.BASE_URL}mini-sample/index.html`

export const CATALOG: MiniApp[] = [
  {
    id: 'leave',
    name: '휴가 신청',
    description: '인사팀 · 연차/반차 신청',
    icon: '📅',
    colorClass: 'c1',
    publisher: '인사팀',
    entryUrl: SAMPLE_ENTRY,
  },
  {
    id: 'meeting',
    name: '회의실 예약',
    description: '총무팀 · 회의실 현황',
    icon: '🏢',
    colorClass: 'c2',
    publisher: '총무팀',
    entryUrl: SAMPLE_ENTRY,
  },
  {
    id: 'expense',
    name: '경비 정산',
    description: '재무팀 · 영수증 정산',
    icon: '🧾',
    colorClass: 'c3',
    publisher: '재무팀',
    entryUrl: SAMPLE_ENTRY,
  },
  {
    id: 'onboarding',
    name: '온보딩 체크',
    description: 'HR · 신규 입사자 체크리스트',
    icon: '✅',
    colorClass: 'c5',
    publisher: 'HR',
    entryUrl: SAMPLE_ENTRY,
  },
  {
    id: 'notice',
    name: '사내 공지',
    description: '인사팀 · 공지/확인',
    icon: '📣',
    colorClass: 'c4',
    publisher: '인사팀',
    entryUrl: SAMPLE_ENTRY,
  },
  {
    id: 'helpdesk',
    name: 'IT 헬프데스크',
    description: '정보보안팀 · 장애/문의',
    icon: '🛠️',
    colorClass: 'c6',
    publisher: '정보보안팀',
    entryUrl: SAMPLE_ENTRY,
  },
  {
    id: 'cafeteria',
    name: '구내식당 메뉴',
    description: '총무팀 · 오늘의 메뉴',
    icon: '🍽️',
    colorClass: 'c2',
    publisher: '총무팀',
    entryUrl: SAMPLE_ENTRY,
  },
]

/** Seed installed apps for new users */
export const DEFAULT_INSTALLED = ['leave', 'meeting', 'expense', 'onboarding']

export const STORAGE_KEYS = {
  session: 'corp-superapp:session',
  installed: 'corp-superapp:installed',
} as const
