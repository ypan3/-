import { useEffect, useState } from 'react'
import type { ResourceItem } from '@shared/types'

interface Props {
  item: ResourceItem | null
  clipboardTags: string[]
  onCopyTags: (tags: string[]) => void
  onApply: (next: { id: string; stars: number; tags: string[] }) => void
}

export default function EditPanel({
  item,
  clipboardTags,
  onCopyTags,
  onApply,
}: Props) {
  const [id, setId] = useState('')
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (!item) {
      setId('')
      setStars(0)
      setTags([])
      return
    }
    setId(item.id)
    setStars(item.stars)
    setTags([...item.tags])
  }, [item])

  if (!item) {
    return (
      <div className="panel">
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          选中一行资源后可编辑编号、星级与标签。保存时会写回对照表并重命名文件。
        </p>
      </div>
    )
  }

  function addTag() {
    const t = newTag.trim()
    if (!t) return
    if (tags.includes(t)) {
      setNewTag('')
      return
    }
    setTags([...tags, t])
    setNewTag('')
  }

  async function ensureId() {
    if (id.trim()) return
    if (!window.resOrg) return
    const res = await window.resOrg.generateId()
    if (res.ok && res.data) setId(res.data)
  }

  return (
    <div className="panel">
      <label>
        路径
        <input type="text" value={item.path} readOnly title={item.path} />
      </label>
      <label>
        编号
        <div className="row">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="空则保存时自动生成"
          />
          <button type="button" onClick={() => void ensureId()}>
            生成
          </button>
        </div>
      </label>
      <label>
        星级 (0–5)
        <input
          type="number"
          min={0}
          max={5}
          value={stars}
          onChange={(e) => setStars(Number(e.target.value))}
        />
      </label>
      <div>
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          标签
        </div>
        <div className="tag-list">
          {tags.map((t) => (
            <span className="tag-chip" key={t}>
              {t}
              <button
                type="button"
                aria-label={`删除 ${t}`}
                onClick={() => setTags(tags.filter((x) => x !== t))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="text"
            value={newTag}
            placeholder="新标签"
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTag()
            }}
          />
          <button type="button" onClick={addTag}>
            添加
          </button>
        </div>
      </div>
      <div className="row">
        <button type="button" onClick={() => onCopyTags(tags)}>
          复制标签
        </button>
        <button
          type="button"
          disabled={clipboardTags.length === 0}
          onClick={() => {
            const merged = [...tags]
            for (const t of clipboardTags) {
              if (!merged.includes(t)) merged.push(t)
            }
            setTags(merged)
          }}
        >
          粘贴标签
        </button>
      </div>
      <button
        className="primary"
        type="button"
        onClick={() => onApply({ id, stars, tags })}
      >
        保存到文件名 + 对照表
      </button>
    </div>
  )
}
