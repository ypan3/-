export function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  const digits = i === 0 ? 0 : n >= 10 ? 1 : 2
  return `${n.toFixed(digits)} ${units[i]}`
}

export function formatMtime(ms: number): string {
  if (!ms) return '—'
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function starsDisplay(n: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(n)))
  if (clamped === 0) return '☆'
  return '★'.repeat(clamped)
}
