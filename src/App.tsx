import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AppSettings,
  ResourceItem,
  SortDir,
  SortKey,
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { formatMtime, formatSize, starsDisplay } from './lib/format'
import SettingsModal from './components/SettingsModal'
import EditPanel from './components/EditPanel'

function compareItems(
  a: ResourceItem,
  b: ResourceItem,
  key: SortKey,
  dir: SortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1
  switch (key) {
    case 'name':
      return mul * a.name.localeCompare(b.name, 'zh')
    case 'size':
      return mul * (a.size - b.size)
    case 'mtime':
      return mul * (a.mtimeMs - b.mtimeMs)
    case 'id':
      return mul * a.id.localeCompare(b.id)
    case 'stars':
      return mul * (a.stars - b.stars)
    case 'tags':
      return mul * a.tags.join('_').localeCompare(b.tags.join('_'), 'zh')
    default:
      return 0
  }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [items, setItems] = useState<ResourceItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [scanning, setScanning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [status, setStatus] = useState('就绪')
  const [clipboardTags, setClipboardTags] = useState<string[]>([])

  const selected = useMemo(
    () => items.find((i) => i.key === selectedKey) ?? null,
    [items, selectedKey],
  )

  const sorted = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => compareItems(a, b, sortKey, sortDir))
    return copy
  }, [items, sortKey, sortDir])

  const loadSettings = useCallback(async () => {
    if (!window.resOrg) {
      setStatus('非 Electron 环境：API 不可用')
      return
    }
    const res = await window.resOrg.getSettings()
    if (res.ok && res.data) setSettings(res.data)
  }, [])

  const runScan = useCallback(async () => {
    if (!window.resOrg) return
    setScanning(true)
    setStatus('正在扫描…')
    try {
      const res = await window.resOrg.scan()
      if (!res.ok || !res.data) {
        setStatus(res.error ?? '扫描失败')
        return
      }
      setItems(res.data.items)
      setErrors(res.data.errors)
      setStatus(`共 ${res.data.items.length} 项`)
      setSelectedKey((prev) =>
        prev && res.data!.items.some((i) => i.key === prev) ? prev : null,
      )
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadSettings()
      await runScan()
    })()
  }, [loadSettings, runScan])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return null
    return <span className="sort-mark">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  async function openSelected() {
    if (!selected || !window.resOrg) return
    const res = await window.resOrg.openPath(selected.path)
    if (!res.ok) setStatus(res.error ?? '打开失败')
  }

  async function handleApply(next: {
    id: string
    stars: number
    tags: string[]
  }) {
    if (!selected || !window.resOrg) return
    const res = await window.resOrg.applyMeta({
      path: selected.path,
      id: next.id,
      stars: next.stars,
      tags: next.tags,
      basename: selected.basename,
    })
    if (!res.ok || !res.data) {
      setStatus(res.error ?? '写入失败')
      return
    }
    setStatus('已写回文件名与对照表')
    await runScan()
    setSelectedKey(res.data.path)
  }

  async function saveSettingsAndClose(next: AppSettings) {
    if (!window.resOrg) return
    const res = await window.resOrg.setSettings(next)
    if (!res.ok || !res.data) {
      setStatus(res.error ?? '保存设置失败')
      return
    }
    setSettings(res.data)
    setShowSettings(false)
    await runScan()
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>ResOrganizeTool</h1>
        <button
          className="primary"
          disabled={scanning}
          onClick={() => void runScan()}
        >
          {scanning ? '扫描中…' : '刷新扫描'}
        </button>
        <button onClick={() => setShowSettings(true)}>设置</button>
        <button
          disabled={!selected}
          onClick={() => void openSelected()}
          title="用系统默认程序打开"
        >
          打开
        </button>
        <button
          disabled={!window.resOrg}
          onClick={async () => {
            const res = await window.resOrg.exportTags()
            if (!res.ok) setStatus(res.error ?? '导出失败')
            else if (res.data) setStatus(`已导出: ${res.data}`)
          }}
        >
          导出对照表
        </button>
        <div className="spacer" />
        <span className="status">{status}</span>
      </header>

      {errors.length > 0 && (
        <div className="error-banner">
          {errors.slice(0, 3).join(' · ')}
          {errors.length > 3 ? ` …另有 ${errors.length - 3} 条` : ''}
        </div>
      )}

      <div className="main">
        <div className="table-wrap">
          {sorted.length === 0 ? (
            <div className="empty">
              {settings.rootDirs.length === 0
                ? '请先在「设置」中添加根目录，然后扫描。'
                : '未找到媒体资源。可检查扩展名或文件夹资源策略。'}
            </div>
          ) : (
            <table className="resources">
              <thead>
                <tr>
                  <th className="col-kind">类型</th>
                  <th className="col-name" onClick={() => toggleSort('name')}>
                    名称{sortMark('name')}
                  </th>
                  <th className="col-size" onClick={() => toggleSort('size')}>
                    大小{sortMark('size')}
                  </th>
                  <th className="col-mtime" onClick={() => toggleSort('mtime')}>
                    修改时间{sortMark('mtime')}
                  </th>
                  <th className="col-id" onClick={() => toggleSort('id')}>
                    编号{sortMark('id')}
                  </th>
                  <th className="col-stars" onClick={() => toggleSort('stars')}>
                    星级{sortMark('stars')}
                  </th>
                  <th className="col-tags" onClick={() => toggleSort('tags')}>
                    标签{sortMark('tags')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr
                    key={item.key}
                    className={item.key === selectedKey ? 'selected' : ''}
                    onClick={() => setSelectedKey(item.key)}
                    onDoubleClick={() => {
                      void window.resOrg?.openPath(item.path).then((res) => {
                        if (!res.ok) setStatus(res.error ?? '打开失败')
                      })
                    }}
                  >
                    <td className="col-kind">
                      {item.kind === 'folder' ? '文件夹' : '文件'}
                    </td>
                    <td className="col-name" title={item.path}>
                      {item.name}
                    </td>
                    <td className="col-size">{formatSize(item.size)}</td>
                    <td className="col-mtime">{formatMtime(item.mtimeMs)}</td>
                    <td className="col-id">{item.id || '—'}</td>
                    <td className="col-stars">{starsDisplay(item.stars)}</td>
                    <td className="col-tags" title={item.tags.join(', ')}>
                      {item.tags.length ? item.tags.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="side">
          <h2>标签编辑</h2>
          <EditPanel
            item={selected}
            clipboardTags={clipboardTags}
            onCopyTags={(tags) => {
              setClipboardTags(tags)
              setStatus(`已复制 ${tags.length} 个标签`)
            }}
            onApply={(meta) => void handleApply(meta)}
          />
        </aside>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onCancel={() => setShowSettings(false)}
          onSave={(next) => void saveSettingsAndClose(next)}
        />
      )}
    </div>
  )
}
