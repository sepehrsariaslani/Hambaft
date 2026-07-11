import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const publicSource = resolve(__dirname, '../public')
const publicTarget = resolve(rootDir, 'hambaft/public')

// 1. Copy static public assets (manifest.json, sw.js, hambaft-icon.svg) to hambaft/public
// Use read+write instead of copyFile to avoid EPERM on read-only target files
const staticAssets = ['manifest.json', 'sw.js', 'hambaft-icon.svg']
for (const asset of staticAssets) {
  const src = resolve(publicSource, asset)
  const dst = resolve(publicTarget, asset)
  if (existsSync(src)) {
    try {
      mkdirSync(dirname(dst), { recursive: true })
      const content = readFileSync(src)
      writeFileSync(dst, content)
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

  // Also scan the main JS bundle for dynamic import references (lazy-loaded chunks)
  // Vite emits dynamic import paths in two formats:
  //   "assets/SectionName.HASH.js"  or  "./SectionName.HASH.js"
  // These are relative to the chunk's location, so Frappe resolves them as
  // /assets/hambaft/assets/SectionName.HASH.js at runtime.
  const jsFilesToScan = [...referencedAssets].filter(r => r.endsWith('.js'))
  let passNewRefs = true
  while (passNewRefs) {
    passNewRefs = false
    for (const ref of [...jsFilesToScan]) {
      try {
        const jsPath = resolve(assetsDir, ref)
        if (!existsSync(jsPath)) continue
        const jsContent = readFileSync(jsPath, 'utf-8')
        // Match dynamic import paths: "assets/X.js" or "./X.js" or "/assets/hambaft/assets/X.js"
        const jsAssetRegex = /["'](?:\.\/|assets\/|\/assets\/hambaft\/assets\/)([^"']+\.(js|css))["']/g
        let jsMatch
        while ((jsMatch = jsAssetRegex.exec(jsContent)) !== null) {
          const assetName = jsMatch[1].replace(/^assets\//, '')
          if (!referencedAssets.has(assetName)) {
            referencedAssets.add(assetName)
            // If this is a JS file we haven't scanned yet, add it for next pass
            if (assetName.endsWith('.js') && !jsFilesToScan.includes(assetName)) {
              jsFilesToScan.push(assetName)
              passNewRefs = true
            }
          }
        }
      } catch (e) { /* ignore */ }
    }
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
