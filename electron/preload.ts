import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApiResult,
  AppSettings,
  RenamePayload,
  ScanResult,
  TagTable,
} from '../shared/types'

const api = {
  getSettings: (): Promise<ApiResult<AppSettings>> =>
    ipcRenderer.invoke('settings:get'),
  setSettings: (settings: AppSettings): Promise<ApiResult<AppSettings>> =>
    ipcRenderer.invoke('settings:set', settings),
  pickDirectory: (): Promise<ApiResult<string | null>> =>
    ipcRenderer.invoke('settings:pickDirectory'),
  pickTagsFile: (): Promise<ApiResult<string | null>> =>
    ipcRenderer.invoke('settings:pickTagsFile'),

  scan: (): Promise<ApiResult<ScanResult>> => ipcRenderer.invoke('scan:run'),

  getTags: (): Promise<ApiResult<TagTable>> => ipcRenderer.invoke('tags:get'),
  saveTags: (table: TagTable): Promise<ApiResult<TagTable>> =>
    ipcRenderer.invoke('tags:save', table),
  exportTags: (): Promise<ApiResult<string | null>> =>
    ipcRenderer.invoke('tags:export'),

  openPath: (targetPath: string): Promise<ApiResult> =>
    ipcRenderer.invoke('resource:open', targetPath),
  revealPath: (targetPath: string): Promise<ApiResult> =>
    ipcRenderer.invoke('resource:reveal', targetPath),
  applyMeta: (
    payload: RenamePayload,
  ): Promise<ApiResult<{ path: string; name: string; id: string }>> =>
    ipcRenderer.invoke('resource:applyMeta', payload),
  generateId: (): Promise<ApiResult<string>> =>
    ipcRenderer.invoke('util:generateId'),
}

contextBridge.exposeInMainWorld('resOrg', api)

export type ResOrgApi = typeof api
