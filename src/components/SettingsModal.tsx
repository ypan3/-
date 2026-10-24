import { useState } from 'react'
import type { AppSettings } from '@shared/types'

interface Props {
  settings: AppSettings
  onCancel: () => void
  onSave: (next: AppSettings) => void
}

export default function SettingsModal({ settings, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings })
  const [extText, setExtText] = useState(settings.mediaExtensions.join(', '))

  async function addRoot() {
    if (!window.resOrg) return
    const res = await window.resOrg.pickDirectory()
    if (!res.ok || !res.data) return
    if (draft.rootDirs.includes(res.data)) return
    setDraft({ ...draft, rootDirs: [...draft.rootDirs, res.data] })
  }

  async function pickTagsPath() {
    if (!window.resOrg) return
    const res = await window.resOrg.pickTagsFile()
    if (!res.ok || !res.data) return
    setDraft({ ...draft, tagsTablePath: res.data })
  }

  function commit() {
    const mediaExtensions = extText
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((e) => (e.startsWith('.') ? e : `.${e}`))
    onSave({ ...draft, mediaExtensions })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>设置</h2>

        <div className="field">
          <label>根目录（可多个，均递归扫描）</label>
          <div className="root-list">
            {draft.rootDirs.length === 0 && (
              <span style={{ color: 'var(--text-muted)' }}>尚未添加</span>
            )}
            {draft.rootDirs.map((dir) => (
              <div className="root-item" key={dir}>
                <span title={dir}>{dir}</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      rootDirs: draft.rootDirs.filter((d) => d !== dir),
                    })
                  }
                >
                  移除
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => void addRoot()}>
            添加目录…
          </button>
        </div>

        <div className="field">
          <label>对照表 JSON 路径（空 = 应用数据目录默认文件）</label>
          <div className="row">
            <input
              type="text"
              style={{ flex: 1, width: '100%' }}
              value={draft.tagsTablePath}
              onChange={(e) =>
                setDraft({ ...draft, tagsTablePath: e.target.value })
              }
              placeholder="默认 tags-table.json"
            />
            <button type="button" onClick={() => void pickTagsPath()}>
              浏览…
            </button>
          </div>
        </div>

        <div className="field">
          <label>媒体扩展名（逗号分隔）</label>
          <input
            type="text"
            style={{ width: '100%' }}
            value={extText}
            onChange={(e) => setExtText(e.target.value)}
          />
        </div>

        <div className="field">
          <label>文件夹资源策略</label>
          <select
            value={draft.folderResourceMode}
            onChange={(e) =>
              setDraft({
                ...draft,
                folderResourceMode: e.target
                  .value as AppSettings['folderResourceMode'],
              })
            }
          >
            <option value="marked">仅名称已有编号标记的文件夹</option>
            <option value="all-direct">每个根目录的直接子文件夹 + 带标记文件夹</option>
            <option value="none">不把文件夹当资源</option>
          </select>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
          面向 Windows；开发时可在 Linux/macOS 跑通 UI。设置与对照表保存在本地，无云同步。
        </p>

        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="primary" onClick={commit}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
