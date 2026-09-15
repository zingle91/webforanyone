import type { SessionUser } from './types'

/** Prototype local accounts (not for production) */
export type LocalAccount = {
  id: string
  password: string
  user: SessionUser
}

export const LOCAL_ACCOUNTS: LocalAccount[] = [
  {
    id: 'tester01',
    password: 'tester01',
    user: {
      name: '테스터01',
      dept: 'QA팀',
      sub: 'tester01',
      email: 'tester01@company.com',
    },
  },
  {
    id: 'tester99',
    password: 'tester99',
    user: {
      name: '테스터99',
      dept: 'QA팀',
      sub: 'tester99',
      email: 'tester99@company.com',
    },
  },
]

export function authenticate(id: string, password: string): SessionUser | null {
  const account = LOCAL_ACCOUNTS.find(
    (a) => a.id === id.trim() && a.password === password,
  )
  return account ? { ...account.user } : null
}
