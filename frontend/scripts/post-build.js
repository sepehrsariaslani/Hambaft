import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')

const sourceHtml = resolve(rootDir, 'hambaft/public/index.html')
const targets = [
  resolve(rootDir, 'hambaft/www/hambaft.html'),
  resolve(rootDir, 'hambaft/templates/pages/hambaft.html'),
]

let html
 try {
  html = readFileSync(sourceHtml, 'utf-8')
} catch (err) {
  console.error('[post-build] index.html not found at', sourceHtml)
  process.exit(1)
}

for (const target of targets) {
  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, html, 'utf-8')
    console.log('[post-build] copied to', target)
  } catch (err) {
    console.error('[post-build] failed to write', target, err.message)
  }
}

console.log('[post-build] done')
