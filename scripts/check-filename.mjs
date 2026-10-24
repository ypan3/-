import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist-electron', 'filename-check.mjs')

const esbuild = await import(
  pathToFileURL(path.join(root, 'node_modules/esbuild/lib/main.js')).href
)
await esbuild.build({
  entryPoints: [path.join(root, 'shared/filename.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
})

const { parseResourceName, buildResourceName, hasIdMarker } = await import(
  pathToFileURL(out).href
)

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

const cases = [
  ['【abc】【3】【tag1_tag2】video.mp4', 'abc', 3, ['tag1', 'tag2'], 'video.mp4', true],
  ['【id1】【0】【】folder', 'id1', 0, [], 'folder', true],
  ['plain.mp4', '', 0, [], 'plain.mp4', false],
]

for (const [name, id, stars, tags, basename, marked] of cases) {
  const p = parseResourceName(name)
  assert(p.id === id, `${name} id`)
  assert(p.stars === stars, `${name} stars`)
  assert(JSON.stringify(p.tags) === JSON.stringify(tags), `${name} tags`)
  assert(p.basename === basename, `${name} basename`)
  assert(p.marked === marked, `${name} marked`)
  if (p.marked) {
    const built = buildResourceName(p.id, p.stars, p.tags, p.basename)
    assert(built === name, `roundtrip ${name} -> ${built}`)
  }
}

assert(hasIdMarker('【x】【1】【】a.mp4'), 'has marker')
assert(!hasIdMarker('a.mp4'), 'no marker')
assert(
  buildResourceName('z', 5, ['a', 'b'], 'clip.mp4') === '【z】【5】【a_b】clip.mp4',
  'build',
)

try {
  fs.unlinkSync(out)
} catch {
  /* ignore */
}

if (!process.exitCode) console.log('all filename checks passed')
