// tool 정의와 입력 검증 — 모델이 보낸 인자 문자열을 실행 전에 스키마로 검사한다.
// 지원하는 타입은 에이전트 tool에 필요한 integer·string(enum)뿐
import type { ToolSpec } from './llmClient'

export type ParamSchema =
  | { type: 'integer'; description?: string; minimum?: number }
  | { type: 'string';  description?: string; enum?: string[] }

export interface ObjectSchema {
  type:       'object'
  properties: Record<string, ParamSchema>
  required:   string[]
}

export type ToolArgs = Record<string, string | number>

export interface ToolDefinition {
  name:        string
  description: string
  parameters:  ObjectSchema
  /** 게임 상태 기준 추가 검증 (내 펫인지, 가진 아이템인지 등) — 실패 이유 또는 null */
  check?(args: ToolArgs): string | null
  run(args: ToolArgs): unknown
}

export type ValidateResult = { ok: true; args: ToolArgs } | { ok: false; error: string }

export function validateArgs(schema: ObjectSchema, raw: string): ValidateResult {
  let parsed: unknown
  try {
    parsed = raw.trim() === '' ? {} : JSON.parse(raw)
  } catch {
    return { ok: false, error: '인자가 올바른 JSON이 아닙니다' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: '인자는 JSON 객체여야 합니다' }
  }

  const input = parsed as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!(key in schema.properties)) return { ok: false, error: `알 수 없는 인자: ${key}` }
  }
  for (const key of schema.required) {
    if (input[key] === undefined) return { ok: false, error: `필수 인자 누락: ${key}` }
  }

  const args: ToolArgs = {}
  for (const [key, value] of Object.entries(input)) {
    const prop = schema.properties[key]
    if (prop.type === 'integer') {
      // 작은 모델은 숫자를 "7"처럼 문자열로 보내는 일이 잦아 숫자 문자열만 정수로 받아준다
      const n = typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value
      if (typeof n !== 'number' || !Number.isInteger(n)) return { ok: false, error: `${key}는 정수여야 합니다` }
      if (prop.minimum !== undefined && n < prop.minimum) return { ok: false, error: `${key}는 ${prop.minimum} 이상이어야 합니다` }
      args[key] = n
    } else {
      if (typeof value !== 'string') return { ok: false, error: `${key}는 문자열이어야 합니다` }
      if (prop.enum && !prop.enum.includes(value)) return { ok: false, error: `${key}는 ${prop.enum.join('·')} 중 하나여야 합니다` }
      args[key] = value
    }
  }
  return { ok: true, args }
}

export function toToolSpec(def: ToolDefinition): ToolSpec {
  return { type: 'function', function: { name: def.name, description: def.description, parameters: def.parameters } }
}
