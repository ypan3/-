/**
 * 文件名约定：
 * 【{id}】【{stars}】【{tag1}_{tag2}_…】{basename}{ext}
 *
 * - 星级写入纯数字 0–5
 * - 无标签时第三段写 【】（空），避免解析歧义
 * - 三段前缀均存在才视为「已标记」；否则整名当 basename
 */

const SEGMENT = /【([^】]*)】/g

export interface ParsedName {
  id: string
  stars: number
  tags: string[]
  /** 去掉三段前缀后的名称（文件含扩展名） */
  basename: string
  /** 是否成功解析出三段前缀 */
  marked: boolean
}

function clampStars(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(5, Math.round(n)))
}

function parseStars(raw: string): number {
  const trimmed = raw.trim()
  const starMatch = trimmed.match(/^★\s*(\d+)$/)
  if (starMatch) return clampStars(Number(starMatch[1]))
  const num = Number(trimmed)
  return clampStars(Number.isFinite(num) ? num : 0)
}

function parseTags(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  return trimmed
    .split('_')
    .map((t) => t.trim())
    .filter(Boolean)
}

/** 从文件名或文件夹名解析编号/星级/标签 */
export function parseResourceName(name: string): ParsedName {
  const segments: string[] = []
  let lastIndex = 0
  SEGMENT.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = SEGMENT.exec(name)) !== null) {
    if (match.index !== lastIndex) break
    segments.push(match[1] ?? '')
    lastIndex = SEGMENT.lastIndex
    if (segments.length >= 3) break
  }

  if (segments.length < 3) {
    return {
      id: '',
      stars: 0,
      tags: [],
      basename: name,
      marked: false,
    }
  }

  return {
    id: segments[0].trim(),
    stars: parseStars(segments[1]),
    tags: parseTags(segments[2]),
    basename: name.slice(lastIndex),
    marked: true,
  }
}

/** 是否已有编号标记（至少第一段可解析为非空 id） */
export function hasIdMarker(name: string): boolean {
  const parsed = parseResourceName(name)
  return parsed.marked && parsed.id.length > 0
}

function sanitizeTag(tag: string): string {
  return tag
    .trim()
    .replace(/[【】_]/g, '')
    .replace(/\s+/g, '-')
}

/** 生成带三段前缀的文件/文件夹名 */
export function buildResourceName(
  id: string,
  stars: number,
  tags: string[],
  basename: string,
): string {
  const safeId = id.trim() || 'unknown'
  const safeStars = String(clampStars(stars))
  const safeTags = tags.map(sanitizeTag).filter(Boolean).join('_')
  const safeBase = basename.replace(/^【[^】]*】【[^】]*】【[^】]*】/, '')
  return `【${safeId}】【${safeStars}】【${safeTags}】${safeBase}`
}

/** 生成短编号（初版：时间戳进制 + 随机） */
export function generateId(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 6)
  return `${t}${r}`
}
