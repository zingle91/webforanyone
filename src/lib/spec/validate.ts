import Ajv, { type ErrorObject } from 'ajv'
import schema from '../../spec/miniapp-spec.schema.json'
import type {
  MiniappSpec,
  SpecErrorDocument,
  SpecScreen,
  ValidationIssue,
  ValidationResult,
} from './types'

const ajv = new Ajv({ allErrors: true, strict: false })
const validateSchema = ajv.compile(schema)

function isSpecError(doc: unknown): doc is SpecErrorDocument {
  return (
    !!doc &&
    typeof doc === 'object' &&
    'error' in doc &&
    typeof (doc as SpecErrorDocument).error === 'object'
  )
}

function isMiniappSpec(doc: unknown): doc is MiniappSpec {
  return (
    !!doc &&
    typeof doc === 'object' &&
    (doc as MiniappSpec).specVersion === 1 &&
    'app' in doc &&
    'data' in doc &&
    'screens' in doc &&
    'navigation' in doc &&
    !('error' in doc)
  )
}

function ajvToIssues(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  if (!errors) return []
  return errors.map((e) => ({
    code: 'schema_error',
    path: e.instancePath || '/',
    message: `${e.instancePath || '/'} ${e.message ?? '스키마 오류'}`,
    level: 'error' as const,
  }))
}

function entityMap(spec: MiniappSpec) {
  const map = new Map<string, MiniappSpec['data']['entities'][0]>()
  for (const e of spec.data.entities) map.set(e.name, e)
  return map
}

function screenIds(spec: MiniappSpec) {
  return new Set(spec.screens.map((s) => s.id))
}

function templateFields(tpl: string | undefined): string[] {
  if (!tpl) return []
  const out: string[] = []
  const re = /\{\{\s*([a-z][A-Za-z0-9_]*)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tpl))) out.push(m[1])
  return out
}

function checkDuplicates(spec: MiniappSpec, issues: ValidationIssue[]) {
  const enames = new Set<string>()
  for (const e of spec.data.entities) {
    if (enames.has(e.name)) {
      issues.push({
        code: 'duplicate_entity_name',
        path: `/data/entities`,
        message: `엔티티 이름 중복: ${e.name}`,
      })
    }
    enames.add(e.name)
    const fnames = new Set<string>()
    for (const f of e.fields) {
      if (fnames.has(f.name)) {
        issues.push({
          code: 'duplicate_field_name',
          path: `/data/entities/${e.name}/fields`,
          message: `필드 이름 중복: ${e.name}.${f.name}`,
        })
      }
      fnames.add(f.name)
    }
  }
  const sids = new Set<string>()
  for (const s of spec.screens) {
    if (sids.has(s.id)) {
      issues.push({
        code: 'duplicate_screen_id',
        path: `/screens`,
        message: `화면 id 중복: ${s.id}`,
      })
    }
    sids.add(s.id)
  }
  const tabs = spec.navigation.tabs ?? []
  const tabSet = new Set<string>()
  for (const t of tabs) {
    if (tabSet.has(t.screenId)) {
      issues.push({
        code: 'duplicate_tab_screen',
        path: `/navigation/tabs`,
        message: `탭 screenId 중복: ${t.screenId}`,
      })
    }
    tabSet.add(t.screenId)
  }
}

function checkPrimaryKeys(spec: MiniappSpec, issues: ValidationIssue[]) {
  for (const e of spec.data.entities) {
    const idFields = e.fields.filter((f) => f.type === 'id')
    if (idFields.length !== 1) {
      issues.push({
        code: 'missing_id_pk',
        path: `/data/entities/${e.name}`,
        message: `엔티티 ${e.name}에 id 타입 필드가 정확히 1개 필요합니다`,
      })
    } else {
      const idf = idFields[0]
      if (!idf.primaryKey) {
        issues.push({
          code: 'id_not_primary',
          path: `/data/entities/${e.name}/fields/${idf.name}`,
          message: `id 필드 ${idf.name}에 primaryKey: true 가 필요합니다`,
        })
      }
      if (idf.name !== 'id') {
        issues.push({
          code: 'id_name_recommended',
          path: `/data/entities/${e.name}/fields/${idf.name}`,
          message: `id 필드 이름은 'id'를 권장합니다`,
          level: 'warn',
        })
      }
    }
    for (const f of e.fields) {
      if (f.primaryKey && f.type !== 'id') {
        issues.push({
          code: 'extra_primary_key',
          path: `/data/entities/${e.name}/fields/${f.name}`,
          message: `primaryKey는 id 타입에만 허용됩니다`,
        })
      }
    }
  }
}

function checkFieldSemantics(spec: MiniappSpec, issues: ValidationIssue[]) {
  for (const e of spec.data.entities) {
    for (const f of e.fields) {
      if (f.type === 'enum' && f.default !== undefined && f.enum) {
        if (!f.enum.includes(String(f.default))) {
          issues.push({
            code: 'enum_default_invalid',
            path: `/data/entities/${e.name}/fields/${f.name}`,
            message: `enum 기본값이 허용 목록에 없습니다: ${f.default}`,
          })
        }
      }
      if (
        (f.type === 'string' || f.type === 'richtext') &&
        typeof f.default === 'string' &&
        f.maxLength !== undefined &&
        f.default.length > f.maxLength
      ) {
        issues.push({
          code: 'string_default_length',
          path: `/data/entities/${e.name}/fields/${f.name}`,
          message: `문자열 기본값이 maxLength를 초과합니다`,
        })
      }
      if (f.type === 'number' && f.min !== undefined && f.max !== undefined && f.min > f.max) {
        issues.push({
          code: 'number_range',
          path: `/data/entities/${e.name}/fields/${f.name}`,
          message: `min이 max보다 큽니다`,
        })
      }
      if (f.type === 'number' && typeof f.default === 'number') {
        if (f.min !== undefined && f.default < f.min) {
          issues.push({
            code: 'number_default_range',
            path: `/data/entities/${e.name}/fields/${f.name}`,
            message: `숫자 기본값이 min보다 작습니다`,
          })
        }
        if (f.max !== undefined && f.default > f.max) {
          issues.push({
            code: 'number_default_range',
            path: `/data/entities/${e.name}/fields/${f.name}`,
            message: `숫자 기본값이 max보다 큽니다`,
          })
        }
      }
      if (f.auto === 'createdAt' || f.auto === 'updatedAt') {
        if (f.type !== 'datetime') {
          issues.push({
            code: 'auto_type_mismatch',
            path: `/data/entities/${e.name}/fields/${f.name}`,
            message: `auto ${f.auto} 는 datetime 타입이어야 합니다`,
          })
        }
      }
      if (f.auto === 'currentUser' && f.type !== 'userRef') {
        issues.push({
          code: 'auto_type_mismatch',
          path: `/data/entities/${e.name}/fields/${f.name}`,
          message: `auto currentUser 는 userRef 타입이어야 합니다`,
        })
      }
      if (f.type === 'string' && f.maxLength === undefined) {
        issues.push({
          code: 'maxLength_required_hint',
          path: `/data/entities/${e.name}/fields/${f.name}`,
          message: `string 필드에 maxLength가 없어 호스트 기본 200이 적용됩니다`,
          level: 'warn',
        })
      }
    }
    if (e.indexes) {
      const names = new Set(e.fields.map((f) => f.name))
      e.indexes.forEach((idx, i) => {
        for (const col of idx) {
          if (!names.has(col)) {
            issues.push({
              code: 'index_unknown_field',
              path: `/data/entities/${e.name}/indexes/${i}`,
              message: `인덱스 필드 없음: ${col}`,
            })
          }
        }
      })
    }
  }
}

function checkScreenRefs(spec: MiniappSpec, issues: ValidationIssue[]) {
  const entities = entityMap(spec)
  const ids = screenIds(spec)

  const assertNav = (target: string | undefined, path: string) => {
    if (target && !ids.has(target)) {
      issues.push({
        code: 'unknown_navigate_target',
        path,
        message: `존재하지 않는 화면: ${target}`,
      })
    }
  }

  spec.screens.forEach((s, si) => {
    const ent = entities.get(s.entity)
    if (!ent) {
      issues.push({
        code: 'unknown_entity',
        path: `/screens/${si}/entity`,
        message: `알 수 없는 엔티티: ${s.entity}`,
      })
      return
    }
    const fieldNames = new Set(ent.fields.map((f) => f.name))
    const fieldByName = new Map(ent.fields.map((f) => [f.name, f]))

    if (s.type === 'form' || s.type === 'detail') {
      for (const fname of s.fields) {
        if (!fieldNames.has(fname)) {
          issues.push({
            code: 'unknown_field_on_screen',
            path: `/screens/${si}/fields`,
            message: `화면 필드 없음: ${fname}`,
          })
        }
      }
    }

    if (s.type === 'form') {
      for (const fname of s.fields) {
        const f = fieldByName.get(fname)
        if (f && (f.type === 'id' || f.auto)) {
          issues.push({
            code: 'form_fields_not_writable',
            path: `/screens/${si}/fields`,
            message: `폼에 id/auto 필드를 넣을 수 없습니다: ${fname}`,
          })
        }
      }
      assertNav(s.onSuccess?.navigate, `/screens/${si}/onSuccess/navigate`)
    }

    if (s.type === 'list') {
      if (s.sort) {
        for (const sort of s.sort) {
          if (!fieldNames.has(sort.field)) {
            issues.push({
              code: 'unknown_sort_field',
              path: `/screens/${si}/sort`,
              message: `정렬 필드 없음: ${sort.field}`,
            })
          }
        }
      }
      if (s.filter) {
        for (const [k, v] of Object.entries(s.filter)) {
          if (!fieldNames.has(k)) {
            issues.push({
              code: 'unknown_filter_field',
              path: `/screens/${si}/filter`,
              message: `필터 필드 없음: ${k}`,
            })
          } else if (v === '$currentUser') {
            const f = fieldByName.get(k)
            if (f && f.type !== 'userRef') {
              issues.push({
                code: 'filter_value_type',
                path: `/screens/${si}/filter/${k}`,
                message: `$currentUser 필터는 userRef 필드에만 허용됩니다`,
              })
            }
          }
        }
      }
      for (const tok of [
        ...templateFields(s.itemTitle),
        ...templateFields(s.itemSubtitle),
      ]) {
        if (!fieldNames.has(tok)) {
          issues.push({
            code: 'template_unknown_field',
            path: `/screens/${si}`,
            message: `템플릿 필드 없음: {{${tok}}}`,
          })
        }
      }
      assertNav(s.primaryAction?.navigate, `/screens/${si}/primaryAction/navigate`)
      assertNav(s.itemNavigate, `/screens/${si}/itemNavigate`)
    }

    if (s.type === 'detail' && s.actions) {
      s.actions.forEach((a, ai) => {
        if (a.type === 'navigate') {
          if (!a.navigate || !ids.has(a.navigate)) {
            issues.push({
              code: 'detail_action_navigate',
              path: `/screens/${si}/actions/${ai}`,
              message: `navigate 액션에 유효한 screenId가 필요합니다`,
            })
          }
        }
        if (a.set) {
          for (const k of Object.keys(a.set)) {
            const f = fieldByName.get(k)
            if (!f) {
              issues.push({
                code: 'detail_action_set_fields',
                path: `/screens/${si}/actions/${ai}/set`,
                message: `set 대상 필드 없음: ${k}`,
              })
            } else if (f.type === 'id' || f.auto) {
              issues.push({
                code: 'detail_action_set_fields',
                path: `/screens/${si}/actions/${ai}/set`,
                message: `id/auto 필드는 set 할 수 없습니다: ${k}`,
              })
            }
          }
        }
      })
    }
  })
}

function checkNavigation(spec: MiniappSpec, issues: ValidationIssue[]) {
  const ids = screenIds(spec)
  if (!ids.has(spec.navigation.initialScreen)) {
    issues.push({
      code: 'unknown_initial_screen',
      path: `/navigation/initialScreen`,
      message: `초기 화면 없음: ${spec.navigation.initialScreen}`,
    })
  }
  for (const t of spec.navigation.tabs ?? []) {
    if (!ids.has(t.screenId)) {
      issues.push({
        code: 'unknown_tab_screen',
        path: `/navigation/tabs`,
        message: `탭 화면 없음: ${t.screenId}`,
      })
    }
  }

  // unreachable warn
  const reachable = new Set<string>()
  const queue = [spec.navigation.initialScreen, ...(spec.navigation.tabs ?? []).map((t) => t.screenId)]
  const byId = new Map(spec.screens.map((s) => [s.id, s]))
  while (queue.length) {
    const id = queue.pop()!
    if (reachable.has(id)) continue
    reachable.add(id)
    const s = byId.get(id)
    if (!s) continue
    const targets: string[] = []
    if (s.type === 'form' && s.onSuccess?.navigate) targets.push(s.onSuccess.navigate)
    if (s.type === 'list') {
      if (s.primaryAction?.navigate) targets.push(s.primaryAction.navigate)
      if (s.itemNavigate) targets.push(s.itemNavigate)
    }
    if (s.type === 'detail' && s.actions) {
      for (const a of s.actions) if (a.navigate) targets.push(a.navigate)
    }
    for (const t of targets) if (!reachable.has(t)) queue.push(t)
  }
  for (const s of spec.screens) {
    if (!reachable.has(s.id)) {
      issues.push({
        code: 'unreachable_screen',
        path: `/screens/${s.id}`,
        message: `도달할 수 없는 화면: ${s.id}`,
        level: 'warn',
      })
    }
  }
}

function checkPermissions(spec: MiniappSpec, issues: ValidationIssue[]) {
  const perms = new Set(spec.app.permissions)
  const screens = spec.screens
  const needsWrite = screens.some(
    (s) =>
      (s.type === 'form' && (s.mode === 'create' || s.mode === 'edit')) ||
      (s.type === 'detail' &&
        s.actions?.some((a) => a.type === 'update' || a.type === 'delete')),
  )
  const needsRead = screens.some((s) => s.type === 'list' || s.type === 'detail')
  let needsUser = false
  for (const e of spec.data.entities) {
    if (e.fields.some((f) => f.type === 'userRef' || f.auto === 'currentUser')) needsUser = true
  }
  for (const s of screens) {
    if (s.type === 'list' && s.filter) {
      if (Object.values(s.filter).includes('$currentUser')) needsUser = true
    }
  }
  if (needsWrite && !perms.has('data.write')) {
    issues.push({
      code: 'permission_data_write_required',
      path: `/app/permissions`,
      message: `폼/수정이 있으면 data.write 권한이 필요합니다`,
    })
  }
  if (needsRead && !perms.has('data.read')) {
    issues.push({
      code: 'permission_data_read_required',
      path: `/app/permissions`,
      message: `목록/상세가 있으면 data.read 권한이 필요합니다`,
    })
  }
  if (needsUser && !perms.has('user.read')) {
    issues.push({
      code: 'permission_user_read_required',
      path: `/app/permissions`,
      message: `userRef/$currentUser 사용 시 user.read 권한이 필요합니다`,
    })
  }
}

function walkStrings(value: unknown, path: string, visit: (s: string, p: string) => void) {
  if (typeof value === 'string') visit(value, path)
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}/${i}`, visit))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStrings(v, `${path}/${k}`, visit)
    }
  }
}

function checkForbidden(spec: MiniappSpec, issues: ValidationIssue[]) {
  walkStrings(spec, '', (s, path) => {
    const lower = s.toLowerCase()
    if (lower.includes('<script') || lower.includes('javascript:') || lower.includes('</')) {
      issues.push({
        code: 'forbidden_html',
        path: path || '/',
        message: `금지된 HTML/스크립트 패턴이 포함되어 있습니다`,
      })
    }
    if (/\b(SELECT|DROP|INSERT)\s/i.test(s) || s.includes('--')) {
      // skip short names/titles that are unlikely SQL
      if (path.includes('description') || path.includes('assumptions') || path.includes('toast')) {
        issues.push({
          code: 'forbidden_sql',
          path: path || '/',
          message: `금지된 SQL 패턴이 포함되어 있습니다`,
        })
      }
    }
  })
}

export function secondaryValidate(spec: MiniappSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  checkDuplicates(spec, issues)
  checkPrimaryKeys(spec, issues)
  checkFieldSemantics(spec, issues)
  checkScreenRefs(spec, issues)
  checkNavigation(spec, issues)
  checkPermissions(spec, issues)
  checkForbidden(spec, issues)
  return issues
}

export type FullValidateResult = ValidationResult & {
  spec: MiniappSpec | null
  errorDoc: SpecErrorDocument | null
}

/** Ajv then secondary. Publish only when ok. */
export function validateMiniappDocument(doc: unknown): FullValidateResult {
  const schemaOk = validateSchema(doc)
  if (!schemaOk) {
    return {
      ok: false,
      errors: ajvToIssues(validateSchema.errors),
      spec: null,
      errorDoc: null,
    }
  }

  if (isSpecError(doc)) {
    return {
      ok: false,
      errors: [
        {
          code: doc.error.code,
          path: '/error',
          message: doc.error.message,
        },
      ],
      spec: null,
      errorDoc: doc,
    }
  }

  if (!isMiniappSpec(doc)) {
    return {
      ok: false,
      errors: [{ code: 'not_spec', path: '/', message: 'MiniappSpec 형식이 아닙니다' }],
      spec: null,
      errorDoc: null,
    }
  }

  const secondary = secondaryValidate(doc)
  const errors = secondary.filter((i) => i.level !== 'warn' && i.level !== 'info')
  const warnings = secondary.filter((i) => i.level === 'warn' || i.level === 'info')
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    spec: doc,
    errorDoc: null,
  }
}

export function formatIssuesKorean(issues: ValidationIssue[]): string {
  if (!issues.length) return ''
  return issues.map((i) => `· [${i.code}] ${i.message}`).join('\n')
}

/** unused helper kept for SpecRuntime typing convenience */
export function isFormScreen(s: SpecScreen): s is Extract<SpecScreen, { type: 'form' }> {
  return s.type === 'form'
}
