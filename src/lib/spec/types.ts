/** MiniappSpec v1 — aligned with schema/example */

export type SpecIcon =
  | 'calendar'
  | 'building'
  | 'receipt'
  | 'check'
  | 'megaphone'
  | 'tools'
  | 'meal'
  | 'chart'
  | 'moon'
  | 'users'
  | 'file'
  | 'clipboard'
  | 'clock'
  | 'home'
  | 'star'

export type SpecPermission = 'user.read' | 'data.read' | 'data.write' | 'ui.toast'
export type SpecVisibility = 'private' | 'team' | 'company'
export type FieldType =
  | 'id'
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'userRef'
  | 'richtext'
export type AutoValue = 'createdAt' | 'updatedAt' | 'currentUser'

export type SpecField = {
  name: string
  type: FieldType
  primaryKey?: boolean
  required?: boolean
  default?: string | number | boolean
  maxLength?: number
  min?: number
  max?: number
  enum?: string[]
  auto?: AutoValue
  label?: string
}

export type SpecEntity = {
  name: string
  fields: SpecField[]
  indexes?: string[][]
}

export type FormScreen = {
  id: string
  title: string
  type: 'form'
  entity: string
  mode: 'create' | 'edit'
  fields: string[]
  submitLabel?: string
  onSuccess?: { toast?: string; navigate?: string }
}

export type ListScreen = {
  id: string
  title: string
  type: 'list'
  entity: string
  filter?: Record<string, string>
  sort?: { field: string; order: 'asc' | 'desc' }[]
  itemTitle?: string
  itemSubtitle?: string
  emptyText?: string
  primaryAction?: { label: string; navigate: string }
  itemNavigate?: string
}

export type DetailAction = {
  label: string
  type: 'update' | 'delete' | 'navigate'
  navigate?: string
  confirm?: string
  set?: Record<string, string | number | boolean>
}

export type DetailScreen = {
  id: string
  title: string
  type: 'detail'
  entity: string
  fields: string[]
  actions?: DetailAction[]
}

export type SpecScreen = FormScreen | ListScreen | DetailScreen

export type MiniappSpec = {
  specVersion: 1
  app: {
    appId: string
    name: string
    description?: string
    icon: SpecIcon
    visibility: SpecVisibility
    permissions: SpecPermission[]
  }
  data: {
    entities: SpecEntity[]
  }
  screens: SpecScreen[]
  navigation: {
    initialScreen: string
    tabs?: { screenId: string; label: string }[]
  }
  assumptions?: string[]
}

export type SpecErrorDocument = {
  specVersion: 1
  error: {
    code:
      | 'unsupported_requirement'
      | 'ambiguous_requirement'
      | 'violates_policy'
      | 'too_complex'
    message: string
    suggest?: string
  }
}

export type ValidationIssue = {
  code: string
  path: string
  message: string
  level?: 'error' | 'warn' | 'info'
}

export type ValidationResult = {
  ok: boolean
  errors: ValidationIssue[]
  warnings?: ValidationIssue[]
}

export type MakerMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: number
}

export type MakerDraft = {
  appId: string
  updatedAt: string
  messages: MakerMessage[]
  spec: MiniappSpec | null
  status: 'draft' | 'published'
}

export type PublishedUserApp = {
  appId: string
  publishedAt: string
  ownerSub: string
  ownerName: string
  spec: MiniappSpec
}

export type ApiKeyProvider = 'openai' | 'anthropic' | 'gemini'

export type StoredApiKey = {
  provider: ApiKeyProvider
  key: string
  updatedAt: string
}

export type EntityRecord = Record<string, string | number | boolean | null>
