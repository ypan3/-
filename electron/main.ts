import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
} from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  DEFAULT_SETTINGS,
  EMPTY_TAG_TABLE,
  type ApiResult,
  type AppSettings,
  type RenamePayload,
  type ResourceItem,
  type ScanResult,
  type TagTable,
  type TagTableRow,
} from '../shared/types'
import {
  buildResourceName,
  generateId,
  hasIdMarker,
  parseResourceName,
} from '../shared/filename'

// vite-plugin-electron 将主进程打成 CJS，此处可用 __dirname
declare const __dirname: string

let mainWindow: BrowserWindow | null = null

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function defaultTagsPath(): string {
  return path.join(app.getPath('userData'), 'tags-table.json')
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

async function loadSettings(): Promise<AppSettings> {
  const stored = await readJsonFile<Partial<AppSettings>>(settingsPath(), {})
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    mediaExtensions:
      stored.mediaExtensions?.length
        ? stored.mediaExtensions.map((e) => e.toLowerCase())
        : [...DEFAULT_SETTINGS.mediaExtensions],
    rootDirs: stored.rootDirs ?? [],
  }
}

async function saveSettings(next: AppSettings): Promise<AppSettings> {
  const normalized: AppSettings = {
    ...next,
    mediaExtensions: next.mediaExtensions.map((e) => {
      const lower = e.trim().toLowerCase()
      return lower.startsWith('.') ? lower : `.${lower}`
    }),
    rootDirs: next.rootDirs.map((d) => path.normalize(d)).filter(Boolean),
  }
  await writeJsonFile(settingsPath(), normalized)
  return normalized
}

async function resolveTagsPath(settings?: AppSettings): Promise<string> {
  const s = settings ?? (await loadSettings())
  return s.tagsTablePath.trim() || defaultTagsPath()
}

async function loadTagTable(): Promise<TagTable> {
  const file = await resolveTagsPath()
  const table = await readJsonFile<TagTable>(file, EMPTY_TAG_TABLE)
  if (!table.rows) table.rows = []
  return table
}

async function saveTagTable(table: TagTable): Promise<TagTable> {
  const file = await resolveTagsPath()
  const next: TagTable = {
    version: 1,
    updatedAt: new Date().toISOString(),
    rows: table.rows,
  }
  await writeJsonFile(file, next)
  return next
}

function upsertRow(table: TagTable, row: TagTableRow): TagTable {
  const idx = table.rows.findIndex((r) => r.id === row.id)
  const rows = [...table.rows]
  if (idx >= 0) rows[idx] = { ...rows[idx], ...row }
  else rows.push(row)
  return { ...table, rows }
}

async function walkDir(
  rootDir: string,
  dir: string,
  settings: AppSettings,
  tableById: Map<string, TagTableRow>,
  items: ResourceItem[],
  errors: string[],
  depth: number,
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    errors.push(`无法读取目录: ${dir} (${String(err)})`)
    return
  }

  const extSet = new Set(settings.mediaExtensions.map((e) => e.toLowerCase()))

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    const relativePath = path.relative(rootDir, full)

    if (entry.isDirectory()) {
      const parsed = parseResourceName(entry.name)
      const isDirectChild = depth === 0
      const asResource =
        settings.folderResourceMode === 'none'
          ? false
          : settings.folderResourceMode === 'all-direct'
            ? isDirectChild || hasIdMarker(entry.name)
            : hasIdMarker(entry.name)

      if (asResource) {
        let stat
        try {
          stat = await fs.stat(full)
        } catch (err) {
          errors.push(`无法读取: ${full} (${String(err)})`)
          continue
        }
        const id = parsed.id || ''
        const fromTable = id ? tableById.get(id) : undefined
        items.push({
          key: full,
          kind: 'folder',
          path: full,
          name: entry.name,
          basename: parsed.basename || entry.name,
          size: 0,
          mtimeMs: stat.mtimeMs,
          id,
          stars: fromTable?.stars ?? parsed.stars,
          tags: fromTable?.tags ?? parsed.tags,
          note: fromTable?.note ?? '',
          rootDir,
          relativePath,
        })
      }

      await walkDir(
        rootDir,
        full,
        settings,
        tableById,
        items,
        errors,
        depth + 1,
      )
      continue
    }

    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!extSet.has(ext)) continue

    let stat
    try {
      stat = await fs.stat(full)
    } catch (err) {
      errors.push(`无法读取: ${full} (${String(err)})`)
      continue
    }

    const parsed = parseResourceName(entry.name)
    const id = parsed.id || ''
    const fromTable = id ? tableById.get(id) : undefined

    items.push({
      key: full,
      kind: 'file',
      path: full,
      name: entry.name,
      basename: parsed.basename || entry.name,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      id,
      stars: fromTable?.stars ?? parsed.stars,
      tags: fromTable?.tags ?? parsed.tags,
      note: fromTable?.note ?? '',
      rootDir,
      relativePath,
    })
  }
}

async function scanRoots(): Promise<ScanResult> {
  const settings = await loadSettings()
  const table = await loadTagTable()
  const tableById = new Map(table.rows.map((r) => [r.id, r]))
  const items: ResourceItem[] = []
  const errors: string[] = []

  for (const root of settings.rootDirs) {
    try {
      const st = await fs.stat(root)
      if (!st.isDirectory()) {
        errors.push(`不是目录: ${root}`)
        continue
      }
    } catch {
      errors.push(`根目录不存在: ${root}`)
      continue
    }
    await walkDir(root, root, settings, tableById, items, errors, 0)
  }

  return { items, errors }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 560,
    title: 'ResOrganizeTool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data }
}

function fail(error: string): ApiResult<never> {
  return { ok: false, error }
}

function registerIpc(): void {
  ipcMain.handle('settings:get', async (): Promise<ApiResult<AppSettings>> => {
    try {
      return ok(await loadSettings())
    } catch (err) {
      return fail(String(err))
    }
  })

  ipcMain.handle(
    'settings:set',
    async (_e, next: AppSettings): Promise<ApiResult<AppSettings>> => {
      try {
        return ok(await saveSettings(next))
      } catch (err) {
        return fail(String(err))
      }
    },
  )

  ipcMain.handle(
    'settings:pickDirectory',
    async (): Promise<ApiResult<string | null>> => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
      })
      if (result.canceled || !result.filePaths[0]) return ok(null)
      return ok(result.filePaths[0])
    },
  )

  ipcMain.handle(
    'settings:pickTagsFile',
    async (): Promise<ApiResult<string | null>> => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile', 'promptToCreate'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (result.canceled || !result.filePaths[0]) return ok(null)
      return ok(result.filePaths[0])
    },
  )

  ipcMain.handle('scan:run', async (): Promise<ApiResult<ScanResult>> => {
    try {
      return ok(await scanRoots())
    } catch (err) {
      return fail(String(err))
    }
  })

  ipcMain.handle('tags:get', async (): Promise<ApiResult<TagTable>> => {
    try {
      return ok(await loadTagTable())
    } catch (err) {
      return fail(String(err))
    }
  })

  ipcMain.handle(
    'tags:save',
    async (_e, table: TagTable): Promise<ApiResult<TagTable>> => {
      try {
        return ok(await saveTagTable(table))
      } catch (err) {
        return fail(String(err))
      }
    },
  )

  ipcMain.handle(
    'tags:export',
    async (): Promise<ApiResult<string | null>> => {
      try {
        const table = await loadTagTable()
        const result = await dialog.showSaveDialog(mainWindow!, {
          title: '导出对照表',
          defaultPath: 'tags-table.json',
          filters: [{ name: 'JSON', extensions: ['json'] }],
        })
        if (result.canceled || !result.filePath) return ok(null)
        await writeJsonFile(result.filePath, table)
        return ok(result.filePath)
      } catch (err) {
        return fail(String(err))
      }
    },
  )

  ipcMain.handle(
    'resource:open',
    async (_e, targetPath: string): Promise<ApiResult> => {
      try {
        const err = await shell.openPath(targetPath)
        if (err) return fail(err)
        return ok(undefined)
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  ipcMain.handle(
    'resource:reveal',
    async (_e, targetPath: string): Promise<ApiResult> => {
      try {
        shell.showItemInFolder(targetPath)
        return ok(undefined)
      } catch (e) {
        return fail(String(e))
      }
    },
  )

  ipcMain.handle(
    'resource:applyMeta',
    async (
      _e,
      payload: RenamePayload,
    ): Promise<ApiResult<{ path: string; name: string; id: string }>> => {
      try {
        let id = payload.id.trim()
        if (!id) id = generateId()
        const newName = buildResourceName(
          id,
          payload.stars,
          payload.tags,
          payload.basename,
        )
        const dir = path.dirname(payload.path)
        const nextPath = path.join(dir, newName)
        if (path.normalize(nextPath) !== path.normalize(payload.path)) {
          await fs.rename(payload.path, nextPath)
        }
        const table = await loadTagTable()
        await saveTagTable(
          upsertRow(table, {
            id,
            stars: payload.stars,
            tags: payload.tags,
            lastKnownPath: nextPath,
          }),
        )
        return ok({ path: nextPath, name: newName, id })
      } catch (err) {
        return fail(String(err))
      }
    },
  )

  ipcMain.handle('util:generateId', (): ApiResult<string> => ok(generateId()))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
