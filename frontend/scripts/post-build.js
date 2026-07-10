import { readFileSync, copyFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const publicSource = resolve(__dirname, '../public')
const publicTarget = resolve(rootDir, 'hambaft/public')

// 1. Copy static public assets (manifest.json, sw.js, hambaft-icon.svg) to hambaft/public
const staticAssets = ['manifest.json', 'sw.js', 'hambaft-icon.svg']
for (const asset of staticAssets) {
  const src = resolve(publicSource, asset)
  const dst = resolve(publicTarget, asset)
  if (existsSync(src)) {
    try {
      mkdirSync(dirname(dst), { recursive: true })
      copyFileSync(src, dst)
      console.log('[post-build] copied', asset)
    } catch (err) {
      console.error('[post-build] failed to copy', asset, err.message)
    }
  }
}

// 2. Clean stale hashed assets — keep only assets referenced in the built index.html
const sourceHtml = resolve(publicTarget, 'index.html')

let html
try {
  html = readFileSync(sourceHtml, 'utf-8')
} catch (err) {
  console.error('[post-build] index.html not found at', sourceHtml)
  process.exit(1)
}

// Clean stale assets: remove files in assets/ that aren't referenced in the HTML
const assetsDir = resolve(publicTarget, 'assets')
if (existsSync(assetsDir)) {
  // Extract all asset references from the HTML
  // With base '/assets/hambaft/', Vite generates URLs like /assets/hambaft/assets/index.HASH.js
  const referencedAssets = new Set()
  const assetRegex = /\/assets\/hambaft\/assets\/([^\s"')]+)/g
  let match
  while ((match = assetRegex.exec(html)) !== null) {
    referencedAssets.add(match[1])
  }

  // Also check CSS for url() references
  for (const ref of referencedAssets) {
    if (ref.endsWith('.css')) {
      try {
        const cssPath = resolve(assetsDir, ref)
        if (existsSync(cssPath)) {
          const cssContent = readFileSync(cssPath, 'utf-8')
          const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g
          let urlMatch
          while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
            const urlRef = urlMatch[1].replace(/^\.\.\//, '').replace(/^assets\//, '')
            referencedAssets.add(urlRef)
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  try {
    const files = readdirSync(assetsDir)
    let removed = 0
    for (const file of files) {
      if (!referencedAssets.has(file)) {
        const isJs = file.endsWith('.js')
        const isCss = file.endsWith('.css')
        // Only clean .js and .css stale files
        if (isJs || isCss) {
          try {
            rmSync(resolve(assetsDir, file))
            removed++
          } catch (e) { /* ignore */ }
        }
      }
    }
    if (removed > 0) console.log(`[post-build] cleaned ${removed} stale asset(s)`)
  } catch (e) { /* ignore */ }
}

// 3. Note: We do NOT copy index.html to templates/pages/ or www/ anymore.
// Those files are Jinja templates that dynamically resolve hashed asset filenames
// via _get_asset_paths() in their Python context generators.

console.log('[post-build] done')
