import type { MiniappSpec, SpecField, SpecIcon } from './types'

export type GenerateResult = {
  assistantText: string
  spec: MiniappSpec
}

export type ChatTurn = { role: 'user' | 'assistant'; text: string }

const ICON_RULES: { re: RegExp; icon: SpecIcon }[] = [
  { re: /야근|야간|밤|moon/i, icon: 'moon' },
  { re: /휴가|연차|일정|calendar|날짜/i, icon: 'calendar' },
  { re: /회의|회의실|건물|building/i, icon: 'building' },
  { re: /경비|영수증|비용|receipt/i, icon: 'receipt' },
  { re: /체크|온보딩|확인|check/i, icon: 'check' },
  { re: /공지|알림|megaphone/i, icon: 'megaphone' },
  { re: /헬프|장애|수리|tools|IT/i, icon: 'tools' },
  { re: /식당|메뉴|식사|meal/i, icon: 'meal' },
  { re: /설문|통계|chart/i, icon: 'chart' },
  { re: /팀|인원|users|사람/i, icon: 'users' },
  { re: /문서|파일|file/i, icon: 'file' },
  { re: /체크리스트|클립|clipboard/i, icon: 'clipboard' },
  { re: /시간|근태|clock/i, icon: 'clock' },
  { re: /홈|home/i, icon: 'home' },
  { re: /즐겨|star|추천/i, icon: 'star' },
]

const FIELD_HINTS: { re: RegExp; name: string; type: SpecField['type']; label: string; extra?: Partial<SpecField> }[] = [
  { re: /날짜|일자|date/i, name: 'date', type: 'date', label: '날짜' },
  { re: /사유|이유|reason|내용|설명/i, name: 'reason', type: 'string', label: '사유', extra: { maxLength: 500 } },
  { re: /제목|title/i, name: 'title', type: 'string', label: '제목', extra: { maxLength: 100 } },
  { re: /물품|품명|item/i, name: 'itemName', type: 'string', label: '물품명', extra: { maxLength: 100 } },
  { re: /수량|개수|qty|quantity/i, name: 'qty', type: 'number', label: '수량', extra: { min: 1, default: 1 } },
  { re: /반납|returned/i, name: 'returned', type: 'boolean', label: '반납여부', extra: { default: false } },
  { re: /금액|비용|amount|price/i, name: 'amount', type: 'number', label: '금액', extra: { min: 0 } },
  { re: /장소|위치|location|room/i, name: 'location', type: 'string', label: '장소', extra: { maxLength: 100 } },
  { re: /시작|from|start/i, name: 'startAt', type: 'datetime', label: '시작' },
  { re: /종료|to|end/i, name: 'endAt', type: 'datetime', label: '종료' },
  { re: /메모|비고|memo|note/i, name: 'memo', type: 'string', label: '메모', extra: { maxLength: 500 } },
  { re: /상태|status/i, name: 'status', type: 'enum', label: '상태', extra: { enum: ['pending', 'approved', 'rejected'], default: 'pending' } },
  { re: /연락|전화|phone/i, name: 'phone', type: 'string', label: '연락처', extra: { maxLength: 40 } },
  { re: /이름|성명|name/i, name: 'displayName', type: 'string', label: '이름', extra: { maxLength: 40 } },
]

function slugifyKorean(text: string): string {
  const map: Record<string, string> = {
    야근: 'overtime',
    신청: 'request',
    휴가: 'leave',
    회의: 'meeting',
    경비: 'expense',
    비품: 'supply',
    대여: 'loan',
    공지: 'notice',
    설문: 'survey',
    식당: 'cafeteria',
    체크: 'check',
    목록: 'list',
    등록: 'register',
    예약: 'booking',
    보고: 'report',
    근태: 'attendance',
  }
  const parts: string[] = []
  for (const [ko, en] of Object.entries(map)) {
    if (text.includes(ko)) parts.push(en)
  }
  let slug = parts.join('-') || 'custom-app'
  slug = slug.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
  if (!/^[a-z]/.test(slug)) slug = `app-${slug}`
  return slug.slice(0, 48)
}

function pickIcon(text: string): SpecIcon {
  for (const r of ICON_RULES) if (r.re.test(text)) return r.icon
  return 'file'
}

function pickAppName(text: string): string {
  const cleaned = text
    .replace(/만들어\s*줘|만들어줘|부탁|해주세요|해줘|앱|미니앱|좀/g, '')
    .replace(/[.?!,~]+/g, ' ')
    .trim()
  if (!cleaned) return '새 미니앱'
  // Prefer short noun phrase
  const m = cleaned.match(/([가-힣A-Za-z0-9\s]{2,20})/)
  let name = (m?.[1] ?? cleaned).trim()
  if (name.length > 40) name = name.slice(0, 40)
  if (/신청/.test(text) && !/신청/.test(name)) name = `${name} 신청`.slice(0, 40)
  return name || '새 미니앱'
}

function collectUserText(turns: ChatTurn[]): string {
  return turns
    .filter((t) => t.role === 'user')
    .map((t) => t.text)
    .join('\n')
}

function detectFields(text: string): SpecField[] {
  const found: SpecField[] = []
  const used = new Set<string>()
  for (const hint of FIELD_HINTS) {
    if (hint.re.test(text) && !used.has(hint.name)) {
      used.add(hint.name)
      found.push({
        name: hint.name,
        type: hint.type,
        required: true,
        label: hint.label,
        ...(hint.extra ?? {}),
      })
    }
  }
  // Default form+list fields if vague
  if (found.length === 0) {
    found.push(
      { name: 'title', type: 'string', required: true, maxLength: 100, label: '제목' },
      { name: 'memo', type: 'string', required: false, maxLength: 500, label: '내용' },
    )
  }
  // Always include status for 신청-like apps if not present and text suggests workflow
  if (/신청|승인|대기|반려/.test(text) && !used.has('status')) {
    found.push({
      name: 'status',
      type: 'enum',
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      label: '상태',
    })
  }
  // Cap writable form fields (~4) — status usually not in form create
  return found
}

function buildSpec(allText: string, previous?: MiniappSpec | null): MiniappSpec {
  const assumptions: string[] = []
  const fieldsFromText = detectFields(allText)
  const writable = fieldsFromText.filter((f) => f.name !== 'status' || !f.auto)
  // Form fields: exclude status (auto default), keep user-editable
  let formFieldNames = writable
    .filter((f) => f.name !== 'status')
    .map((f) => f.name)
  if (formFieldNames.length === 0) {
    formFieldNames = ['title', 'memo']
    assumptions.push('요구가 모호하여 제목·내용 필드로 기본 폼을 생성했습니다')
  }

  const entityFields: SpecField[] = [
    { name: 'id', type: 'id', primaryKey: true },
    ...writable.map((f) =>
      f.name === 'status'
        ? f
        : { ...f, required: f.required !== false },
    ),
  ]

  // Ensure status exists for request-like apps
  if (/신청|등록|요청/.test(allText) && !entityFields.some((f) => f.name === 'status')) {
    entityFields.push({
      name: 'status',
      type: 'enum',
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      label: '상태',
    })
    assumptions.push('status 기본값은 pending')
  }

  if (!entityFields.some((f) => f.name === 'createdBy')) {
    entityFields.push({
      name: 'createdBy',
      type: 'userRef',
      required: true,
      auto: 'currentUser',
    })
  }
  if (!entityFields.some((f) => f.name === 'createdAt')) {
    entityFields.push({
      name: 'createdAt',
      type: 'datetime',
      required: true,
      auto: 'createdAt',
    })
  }

  assumptions.push('목록은 본인 데이터만 표시')

  const titleField =
    formFieldNames.find((n) => n === 'date' || n === 'title' || n === 'itemName') ??
    formFieldNames[0]
  const subtitleField = entityFields.some((f) => f.name === 'status')
    ? 'status'
    : formFieldNames[1] ?? formFieldNames[0]

  const appName = previous?.app.name && /수정|바꿔|추가|변경|기본값/.test(allText.split('\n').pop() ?? '')
    ? previous.app.name
    : pickAppName(allText.split('\n')[0] ?? allText)

  const appId =
    previous?.app.appId && previous.app.appId.length >= 2
      ? previous.app.appId
      : slugifyKorean(allText)

  const icon = pickIcon(allText)
  const entityName = /대여|loan/.test(allText)
    ? 'loans'
    : /예약|booking/.test(allText)
      ? 'bookings'
      : 'requests'

  // Apply simple revise hints on last user message
  const lastLine = allText.split('\n').filter(Boolean).pop() ?? ''
  if (/기본값.*대기|대기로/.test(lastLine)) {
    const st = entityFields.find((f) => f.name === 'status')
    if (st) {
      st.default = 'pending'
      assumptions.push('상태 기본값을 pending(대기)로 설정')
    }
  }
  if (/필드\s*추가|추가해/.test(lastLine)) {
    if (/메모/.test(lastLine) && !formFieldNames.includes('memo')) {
      entityFields.splice(entityFields.length - 2, 0, {
        name: 'memo',
        type: 'string',
        required: false,
        maxLength: 500,
        label: '메모',
      })
      formFieldNames.push('memo')
      assumptions.push('메모 필드를 추가했습니다')
    }
  }

  const formFieldsFinal = formFieldNames.filter((n) =>
    entityFields.some((f) => f.name === n && f.type !== 'id' && !f.auto),
  )

  const indexable = ['createdBy', 'status', 'date', 'createdAt'].filter((n) =>
    entityFields.some((f) => f.name === n),
  )

  const spec: MiniappSpec = {
    specVersion: 1,
    app: {
      appId,
      name: appName.slice(0, 40),
      description: `${appName} 및 목록`.slice(0, 200),
      icon,
      visibility: 'team',
      permissions: ['user.read', 'data.read', 'data.write'],
    },
    data: {
      entities: [
        {
          name: entityName,
          fields: entityFields,
          indexes: indexable.map((n) => [n]),
        },
      ],
    },
    screens: [
      {
        id: 'create',
        title: '새 신청',
        type: 'form',
        entity: entityName,
        mode: 'create',
        fields: formFieldsFinal,
        submitLabel: '제출',
        onSuccess: { toast: '저장되었습니다', navigate: 'list' },
      },
      {
        id: 'list',
        title: '내 목록',
        type: 'list',
        entity: entityName,
        filter: { createdBy: '$currentUser' },
        sort: [
          {
            field: entityFields.some((f) => f.name === 'date')
              ? 'date'
              : 'createdAt',
            order: 'desc',
          },
        ],
        itemTitle: `{{${titleField}}}`,
        itemSubtitle: `{{${subtitleField}}}`,
        emptyText: '내역이 없습니다',
        primaryAction: { label: '새로 작성', navigate: 'create' },
      },
    ],
    navigation: {
      initialScreen: 'create',
      tabs: [
        { screenId: 'create', label: '작성' },
        { screenId: 'list', label: '목록' },
      ],
    },
    assumptions: [...new Set(assumptions)],
  }

  // Adjust titles for non-신청 apps
  if (!/신청|요청/.test(allText)) {
    const form = spec.screens[0]
    const list = spec.screens[1]
    if (form.type === 'form') {
      form.title = '새 등록'
      form.submitLabel = '저장'
      form.onSuccess = { toast: '등록되었습니다', navigate: 'list' }
    }
    if (list.type === 'list') {
      list.title = '내 목록'
      list.primaryAction = { label: '새로 등록', navigate: 'create' }
    }
    if (spec.navigation.tabs) {
      spec.navigation.tabs[0].label = '등록'
    }
  } else {
    const form = spec.screens[0]
    const list = spec.screens[1]
    if (form.type === 'form') form.title = '새 신청'
    if (list.type === 'list') {
      list.title = '내 신청'
      list.emptyText = '신청 내역이 없습니다'
      list.primaryAction = { label: '새 신청', navigate: 'create' }
    }
    if (spec.navigation.tabs) {
      spec.navigation.tabs[0].label = '신청'
      spec.navigation.tabs[1].label = '목록'
    }
  }

  return spec
}

function summarize(spec: MiniappSpec): string {
  const form = spec.screens.find((s) => s.type === 'form')
  const list = spec.screens.find((s) => s.type === 'list')
  const formFields =
    form && form.type === 'form' ? form.fields.join(', ') : '-'
  const lines = [
    `「${spec.app.name}」 스펙 v1 초안을 만들었어요.`,
    `· 앱 ID: ${spec.app.appId}`,
    `· 화면: ${form ? '폼' : ''}${form && list ? ' + ' : ''}${list ? '목록' : ''}`,
    `· 폼 필드: ${formFields}`,
    `· 권한: ${spec.app.permissions.join(', ')}`,
    `· 가정: ${(spec.assumptions ?? []).join('; ') || '없음'}`,
    '',
    '미리보기로 확인한 뒤 게시할 수 있어요. 수정할 내용이 있으면 말씀해 주세요.',
  ]
  return lines.join('\n')
}

/**
 * Local Korean NL → MiniappSpec v1 (rule/heuristic).
 * On revise, regenerates FULL spec from conversation context.
 */
export function generateFromConversation(
  turns: ChatTurn[],
  previousSpec?: MiniappSpec | null,
): GenerateResult {
  const allText = collectUserText(turns)
  if (!allText.trim()) {
    const spec = buildSpec('간단한 신청과 목록', previousSpec)
    return {
      assistantText:
        '요청이 비어 있어 기본 신청+목록 앱을 준비했어요. 원하는 필드나 이름을 알려 주세요.',
      spec,
    }
  }

  // Unsupported patterns → still generate simplified form+list with note
  const unsupported =
    /SAP|외부\s*API|웹훅|webhook|결제|이메일\s*대량|실시간\s*연동|서버/i.test(allText)
  const spec = buildSpec(allText, previousSpec)
  let assistantText = summarize(spec)
  if (unsupported) {
    assistantText =
      '외부 연동·결제 등은 v1에서 지원하지 않아, 수동 입력용 폼+목록으로 단순화했어요.\n\n' +
      assistantText
    spec.assumptions = [
      ...(spec.assumptions ?? []),
      '외부 연동 요구는 제외하고 수동 입력으로 대체',
    ]
  }
  return { assistantText, spec }
}
