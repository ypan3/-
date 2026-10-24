/** 应用设置（本地持久化） */
export interface AppSettings {
  /** 多个根目录绝对路径 */
  rootDirs: string[]
  /** 对照表 JSON 路径；空则使用用户数据目录默认路径 */
  tagsTablePath: string
  /** 视为媒体的扩展名（小写，含点） */
  mediaExtensions: string[]
  /**
   * 文件夹资源策略：
   * - marked: 仅「名称已有编号标记」的文件夹入库
   * - all-direct: 每个根下直接子文件夹也入库
   * - none: 不把文件夹当资源
   */
  folderResourceMode: 'marked' | 'all-direct' | 'none'
}

export const DEFAULT_MEDIA_EXTENSIONS = [
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.wmv',
  '.webm',
  '.m4v',
  '.flv',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
]

export const DEFAULT_SETTINGS: AppSettings = {
  rootDirs: [],
  tagsTablePath: '',
  mediaExtensions: [...DEFAULT_MEDIA_EXTENSIONS],
  folderResourceMode: 'marked',
}

/** 对照表一行 */
export interface TagTableRow {
  id: string
  stars: number
  tags: string[]
  note?: string
  /** 最近已知相对路径（辅助显示，非主键） */
  lastKnownPath?: string
}

export interface TagTable {
  version: 1
  updatedAt: string
  rows: TagTableRow[]
}

export const EMPTY_TAG_TABLE: TagTable = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  rows: [],
}

export type ResourceKind = 'file' | 'folder'

/** 扫描得到的资源行（合并文件名解析 + 对照表） */
export interface ResourceItem {
  key: string
  kind: ResourceKind
  /** 绝对路径 */
  path: string
  /** 显示用完整文件/文件夹名 */
  name: string
  /** 去掉三段前缀后的原名（含扩展名对文件） */
  basename: string
  size: number
  mtimeMs: number
  id: string
  stars: number
  tags: string[]
  note: string
  /** 所属根目录 */
  rootDir: string
  /** 相对根目录的路径 */
  relativePath: string
}

export type SortKey = 'name' | 'size' | 'mtime' | 'id' | 'stars' | 'tags'
export type SortDir = 'asc' | 'desc'

export interface ScanResult {
  items: ResourceItem[]
  errors: string[]
}

export interface RenamePayload {
  path: string
  id: string
  stars: number
  tags: string[]
  /** 保留的 basename（含扩展名） */
  basename: string
}

export interface ApiResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}
