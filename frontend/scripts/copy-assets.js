import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const src = path.resolve(__dirname, '../../hambaft/public/frontend')
const dst = path.resolve(__dirname, '../../../../sites/assets/hambaft/frontend')

function copyDir(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const dstPath = path.join(dstDir, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

if (!fs.existsSync(src)) {
  console.error('❌ Source not found:', src)
  process.exit(1)
}

// Remove old assets
if (fs.existsSync(dst)) {
  fs.rmSync(dst, { recursive: true, force: true })
}

// Copy fresh assets
copyDir(src, dst)
console.log('✅ Assets copied to:', dst)

// Also update HTML files with cache-bust timestamp
const timestamp = Date.now()
const htmlFiles = [
  path.resolve(__dirname, '../../hambaft/public/index.html'),
  path.resolve(__dirname, '../../hambaft/www/hambaft.html'),
  path.resolve(__dirname, '../../hambaft/www/hambaft/index.html'),
  path.resolve(__dirname, '../../hambaft/templates/pages/hambaft.html'),
]

for (const htmlPath of htmlFiles) {
  if (fs.existsSync(htmlPath)) {
    let content = fs.readFileSync(htmlPath, 'utf-8')
    // Remove old cache-bust params
    content = content.replace(/\?v=\d+/g, '')
    // Add new cache-bust params
    content = content.replace(/\.js"/g, `.js?v=${timestamp}"`)
    content = content.replace(/\.css"/g, `.css?v=${timestamp}"`)
    fs.writeFileSync(htmlPath, content)
  }
}
console.log('✅ HTML cache-busted with v=' + timestamp)
