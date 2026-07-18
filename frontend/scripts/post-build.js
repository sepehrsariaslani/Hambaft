import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { findPrimaryAssets, inlineBuiltAssetsFromDir } from './post-build-lib.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const publicSource = resolve(__dirname, '../public')
const publicTarget = resolve(rootDir, 'hambaft/public')
const benchRoot = resolve(rootDir, '../..')
const sitesRoot = resolve(benchRoot, 'sites')

function syncFile(src, dst) {
  mkdirSync(dirname(dst), { recursive: true })
  const content = readFileSync(src)
  try {
    writeFileSync(dst, content)
  } catch (err) {
    if (!existsSync(dst)) {
      throw err
    }

    removeIfExists(dst)
    writeFileSync(dst, content)
  }
}

function removeIfExists(targetPath) {
  if (!existsSync(targetPath)) return
  try {
    rmSync(targetPath, { recursive: true, force: true })
  } catch (err) {
    console.warn('[post-build] could not remove', targetPath, err.message)
  }
}

function syncDir(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true })

  if (!existsSync(srcDir)) {
    return
  }

  const srcEntries = new Set(readdirSync(srcDir))
  for (const dstEntry of readdirSync(dstDir)) {
    if (!srcEntries.has(dstEntry)) {
      removeIfExists(resolve(dstDir, dstEntry))
    }
  }

  for (const entry of srcEntries) {
    const srcPath = resolve(srcDir, entry)
    const dstPath = resolve(dstDir, entry)
    const srcStat = statSync(srcPath)

    if (srcStat.isDirectory()) {
      if (existsSync(dstPath) && !statSync(dstPath).isDirectory()) {
        removeIfExists(dstPath)
      }
      syncDir(srcPath, dstPath)
      continue
    }

    syncFile(srcPath, dstPath)
  }
}

function syncPublishedCopies() {
  if (!existsSync(sitesRoot)) {
    return
  }

  const defaultSite = process.env.HAMBAFT_SITE_NAME || 'hambaft.ir'
  const publishTargets = [
    resolve(sitesRoot, 'assets/hambaft'),
    resolve(sitesRoot, defaultSite, 'public'),
  ]

  for (const target of publishTargets) {
    const parentDir = dirname(target)
    if (!existsSync(parentDir)) {
      continue
    }

    try {
      removeIfExists(resolve(target, 'frontend'))
      syncDir(resolve(publicTarget, 'assets'), resolve(target, 'assets'))
      for (const fileName of ['index.html', 'manifest.json', 'sw.js', 'hambaft-icon.svg']) {
        const src = resolve(publicTarget, fileName)
        if (!existsSync(src)) continue
        syncFile(src, resolve(target, fileName))
      }
      console.log('[post-build] published to', target)
    } catch (err) {
      console.error('[post-build] failed to publish to', target, err.message)
    }
  }
}

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
syncPublishedCopies()
