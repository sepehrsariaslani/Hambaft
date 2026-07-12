import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { findPrimaryAssets, inlineBuiltAssetsFromDir } from './post-build-lib.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const publicSource = resolve(__dirname, '../public')
const publicTarget = resolve(rootDir, 'hambaft/public')

function collectReferencedAssets(html, assetsDir) {
  const referencedAssets = new Set()
  const assetRegex = /\/assets\/hambaft\/assets\/([^\s"')]+)/g
  const primaryAssets = findPrimaryAssets(html)

  if (primaryAssets.jsAssetName) referencedAssets.add(primaryAssets.jsAssetName)
  if (primaryAssets.cssAssetName) referencedAssets.add(primaryAssets.cssAssetName)

  let match
  while ((match = assetRegex.exec(html)) !== null) {
    referencedAssets.add(match[1])
  }

  const jsFilesToScan = [...referencedAssets].filter(ref => ref.endsWith('.js'))
  let passNewRefs = true
  while (passNewRefs) {
    passNewRefs = false
    for (const ref of [...jsFilesToScan]) {
      try {
        const jsPath = resolve(assetsDir, ref)
        if (!existsSync(jsPath)) continue
        const jsContent = readFileSync(jsPath, 'utf-8')
        const jsAssetRegex = /["'](?:\.\/|assets\/|\/assets\/hambaft\/assets\/)([^"']+\.(js|css))["']/g
        let jsMatch
        while ((jsMatch = jsAssetRegex.exec(jsContent)) !== null) {
          const assetName = jsMatch[1].replace(/^assets\//, '')
          if (!referencedAssets.has(assetName)) {
            referencedAssets.add(assetName)
            if (assetName.endsWith('.js') && !jsFilesToScan.includes(assetName)) {
              jsFilesToScan.push(assetName)
              passNewRefs = true
            }
          }
        }
      } catch (_) {
      }
    }
  }

  for (const ref of referencedAssets) {
    if (!ref.endsWith('.css')) continue
    try {
      const cssPath = resolve(assetsDir, ref)
      if (!existsSync(cssPath)) continue
      const cssContent = readFileSync(cssPath, 'utf-8')
      const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g
      let urlMatch
      while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
        referencedAssets.add(urlMatch[1].replace(/^\.\.\//, '').replace(/^assets\//, ''))
      }
    } catch (_) {
    }
  }

  return referencedAssets
}

const staticAssets = ['manifest.json', 'sw.js', 'hambaft-icon.svg']
for (const asset of staticAssets) {
  const src = resolve(publicSource, asset)
  const dst = resolve(publicTarget, asset)
  if (!existsSync(src)) continue
  try {
    mkdirSync(dirname(dst), { recursive: true })
    writeFileSync(dst, readFileSync(src))
    console.log('[post-build] copied', asset)
  } catch (err) {
    console.error('[post-build] failed to copy', asset, err.message)
  }
}

const sourceHtml = resolve(publicTarget, 'index.html')

let originalHtml
try {
  originalHtml = readFileSync(sourceHtml, 'utf-8')
} catch (_) {
  console.error('[post-build] index.html not found at', sourceHtml)
  process.exit(1)
}

const assetsDir = resolve(publicTarget, 'assets')
const referencedAssets = existsSync(assetsDir)
  ? collectReferencedAssets(originalHtml, assetsDir)
  : new Set()

const inlinedHtml = inlineBuiltAssetsFromDir(originalHtml, assetsDir)
writeFileSync(sourceHtml, inlinedHtml)

if (existsSync(assetsDir)) {
  try {
    const files = readdirSync(assetsDir)
    let removed = 0
    for (const file of files) {
      if (referencedAssets.has(file)) continue
      if (!file.endsWith('.js') && !file.endsWith('.css')) continue
      try {
        rmSync(resolve(assetsDir, file))
        removed += 1
      } catch (_) {
      }
    }
    if (removed > 0) console.log(`[post-build] cleaned ${removed} stale asset(s)`)
  } catch (_) {
  }
}

console.log('[post-build] done')
