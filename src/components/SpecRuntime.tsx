import { useMemo, useState } from 'react'
import type { MiniApp, SessionUser } from '../lib/types'
import type {
  EntityRecord,
  FormScreen,
  ListScreen,
  MiniappSpec,
  SpecField,
  SpecScreen,
} from '../lib/spec/types'
import { insertRecord, loadRecords } from '../lib/spec/persistence'

type Props = {
  app: MiniApp & { spec: MiniappSpec }
  user: SessionUser
  onClose: () => void
  onToast: (message: string) => void
  /** preview mode still writes to same local store scoped by sub+appId */
  preview?: boolean
}

function uid(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function applyTemplate(tpl: string | undefined, row: EntityRecord): string {
  if (!tpl) return ''
  return tpl.replace(/\{\{\s*([a-z][A-Za-z0-9_]*)\s*\}\}/g, (_, key: string) => {
    const v = row[key]
    if (v === null || v === undefined) return ''
    return String(v)
  })
}

function fieldLabel(f: SpecField): string {
  return f.label || f.name
}

function FormView({
  screen,
  fields,
  onSubmit,
}: {
  screen: FormScreen
  fields: SpecField[]
  onSubmit: (values: Record<string, string | number | boolean>) => void
}) {
  const initial: Record<string, string | number | boolean> = {}
  for (const f of fields) {
    if (f.type === 'boolean') initial[f.name] = Boolean(f.default ?? false)
    else if (f.type === 'number') initial[f.name] = typeof f.default === 'number' ? f.default : ''
    else if (f.type === 'date') initial[f.name] = (f.default as string) || new Date().toISOString().slice(0, 10)
    else if (f.type === 'enum') initial[f.name] = (f.default as string) || f.enum?.[0] || ''
    else initial[f.name] = (f.default as string) ?? ''
  }
  const [values, setValues] = useState(initial)

  const set = (name: string, v: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [name]: v }))

  return (
    <div className="preview-card spec-form">
      <div className="spec-screen-title">{screen.title}</div>
      {fields.map((f) => (
        <label key={f.name} className="spec-field">
          <span>{fieldLabel(f)}{f.required ? ' *' : ''}</span>
          {f.type === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(values[f.name])}
              onChange={(e) => set(f.name, e.target.checked)}
            />
          ) : f.type === 'enum' ? (
            <select
              value={String(values[f.name] ?? '')}
              onChange={(e) => set(f.name, e.target.value)}
            >
              {(f.enum ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : f.type === 'number' ? (
            <input
              type="number"
              value={values[f.name] === '' ? '' : Number(values[f.name])}
              min={f.min}
              max={f.max}
              onChange={(e) =>
                set(f.name, e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          ) : f.type === 'date' ? (
            <input
              type="date"
              value={String(values[f.name] ?? '')}
              onChange={(e) => set(f.name, e.target.value)}
            />
          ) : f.type === 'datetime' ? (
            <input
              type="datetime-local"
              value={String(values[f.name] ?? '')}
              onChange={(e) => set(f.name, e.target.value)}
            />
          ) : f.type === 'richtext' ? (
            <textarea
              rows={3}
              maxLength={f.maxLength ?? 5000}
              value={String(values[f.name] ?? '')}
              onChange={(e) => set(f.name, e.target.value)}
            />
          ) : (
            <input
              type="text"
              maxLength={f.maxLength ?? 200}
              value={String(values[f.name] ?? '')}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
        </label>
      ))}
      <button
        type="button"
        className="btn primary block"
        style={{ marginTop: 12 }}
        onClick={() => {
          for (const f of fields) {
            if (f.required) {
              const v = values[f.name]
              if (v === '' || v === undefined || v === null) {
                alert(`${fieldLabel(f)}을(를) 입력해 주세요`)
                return
              }
            }
          }
          onSubmit(values)
        }}
      >
        {screen.submitLabel || '제출'}
      </button>
    </div>
  )
}

function ListView({
  screen,
  rows,
  onPrimary,
}: {
  screen: ListScreen
  rows: EntityRecord[]
  onPrimary?: () => void
}) {
  return (
    <div className="spec-list">
      <div className="spec-screen-title row-between">
        <span>{screen.title}</span>
        {screen.primaryAction && (
          <button type="button" className="btn primary" onClick={onPrimary}>
            {screen.primaryAction.label}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="empty">{screen.emptyText || '내역이 없습니다'}</div>
      ) : (
        <div className="list">
          {rows.map((row) => (
            <div className="row" key={String(row.id)}>
              <div className="meta">
                <div className="n">{applyTemplate(screen.itemTitle, row) || String(row.id)}</div>
                <div className="d">{applyTemplate(screen.itemSubtitle, row)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SpecRuntime({ app, user, onClose, onToast }: Props) {
  const spec = app.spec
  const [screenId, setScreenId] = useState(spec.navigation.initialScreen)
  const [tick, setTick] = useState(0)

  const screen = useMemo(
    () => spec.screens.find((s) => s.id === screenId) as SpecScreen | undefined,
    [spec, screenId],
  )

  const entity = useMemo(() => {
    if (!screen) return null
    return spec.data.entities.find((e) => e.name === screen.entity) ?? null
  }, [spec, screen])

  const navigate = (id: string) => {
    if (spec.screens.some((s) => s.id === id)) setScreenId(id)
  }

  const handleFormSubmit = (values: Record<string, string | number | boolean>) => {
    if (!screen || screen.type !== 'form' || !entity) return
    const row: EntityRecord = { ...values }
    for (const f of entity.fields) {
      if (f.type === 'id') row[f.name] = uid()
      else if (f.auto === 'currentUser') row[f.name] = user.sub
      else if (f.auto === 'createdAt' || f.auto === 'updatedAt') row[f.name] = new Date().toISOString()
      else if (f.default !== undefined && (row[f.name] === undefined || row[f.name] === '')) {
        row[f.name] = f.default
      }
    }
    insertRecord(user.sub, spec.app.appId, entity.name, row)
    setTick((t) => t + 1)
    const toast = screen.onSuccess?.toast || '저장되었습니다'
    onToast(toast)
    if (screen.onSuccess?.navigate) navigate(screen.onSuccess.navigate)
  }

  const listRows = useMemo(() => {
    void tick
    if (!screen || screen.type !== 'list' || !entity) return []
    let rows = loadRecords(user.sub, spec.app.appId, entity.name)
    if (screen.filter) {
      rows = rows.filter((row) =>
        Object.entries(screen.filter!).every(([k, v]) => {
          if (v === '$currentUser') return row[k] === user.sub
          return String(row[k]) === v
        }),
      )
    }
    if (screen.sort?.length) {
      const { field, order } = screen.sort[0]
      rows = [...rows].sort((a, b) => {
        const av = a[field]
        const bv = b[field]
        if (av === bv) return 0
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = String(av) < String(bv) ? -1 : 1
        return order === 'desc' ? -cmp : cmp
      })
    }
    return rows
  }, [screen, entity, user.sub, spec.app.appId, tick])

  const formFields =
    screen?.type === 'form' && entity
      ? screen.fields
          .map((n) => entity.fields.find((f) => f.name === n))
          .filter((f): f is SpecField => !!f)
      : []

  const tabs = spec.navigation.tabs ?? []

  return (
    <div className="runtime">
      <div className="bar">
        <button type="button" className="btn ghost" onClick={onClose}>
          ←
        </button>
        <div className="title">{spec.app.name}</div>
        <button type="button" className="btn danger" onClick={onClose}>
          닫기
        </button>
      </div>
      {tabs.length > 0 && (
        <div className="spec-tabs">
          {tabs.map((t) => (
            <button
              key={t.screenId}
              type="button"
              className={`spec-tab ${screenId === t.screenId ? 'active' : ''}`}
              onClick={() => navigate(t.screenId)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="body spec-runtime-body">
        {!screen && <div className="empty">화면을 찾을 수 없습니다</div>}
        {screen?.type === 'form' && (
          <FormView
            key={`${screen.id}-${tick}`}
            screen={screen}
            fields={formFields}
            onSubmit={handleFormSubmit}
          />
        )}
        {screen?.type === 'list' && (
          <ListView
            screen={screen}
            rows={listRows}
            onPrimary={() => {
              if (screen.primaryAction?.navigate) navigate(screen.primaryAction.navigate)
            }}
          />
        )}
        {screen?.type === 'detail' && (
          <div className="stub-box">
            <strong>상세 화면</strong>
            v1 프로토타입에서 detail은 최소 지원입니다. 목록·폼을 사용해 주세요.
          </div>
        )}
      </div>
    </div>
  )
}
