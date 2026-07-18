import { readFileSync } from 'fs'
import { resolve } from 'path'

const MODULE_PRELOAD_RE = /^\s*<link rel="modulepreload" crossorigin href="[^"]+">\s*$/gm
const MODULE_SCRIPT_RE = /<script type="module" crossorigin src="([^"]*\/assets\/([^"]+))"><\/script>/
const STYLESHEET_RE = /<link rel="stylesheet" crossorigin href="([^"]*\/assets\/([^"]+))">/

function escapeInlineScript(source) {
  return source.replace(/<\/script/gi, '<\\/script')
}

function escapeInlineStyle(source) {
  return source.replace(/<\/style/gi, '<\\/style')
}

export function findPrimaryAssets(html) {
  const jsMatch = html.match(MODULE_SCRIPT_RE)
  const cssMatch = html.match(STYLESHEET_RE)

  return {
    jsTag: jsMatch?.[0] ?? null,
    jsAssetName: jsMatch?.[2] ?? null,
    cssTag: cssMatch?.[0] ?? null,
    cssAssetName: cssMatch?.[2] ?? null,
  }
}

export function inlineBuiltAssets(html, { jsSource, cssSource }) {
  let output = html.replace(MODULE_PRELOAD_RE, '')

  if (typeof cssSource === 'string') {
    const { cssTag } = findPrimaryAssets(output)
    if (cssTag) {
      output = output.replace(cssTag, () => `<style data-hambaft-inline="app">\n${escapeInlineStyle(cssSource)}\n</style>`)
    }
  }

  if (typeof jsSource === 'string') {
    const { jsTag } = findPrimaryAssets(output)
    if (jsTag) {
      output = output.replace(jsTag, () => `<script type="module" data-hambaft-inline="app">\n${escapeInlineScript(jsSource)}\n</script>`)
    }
  }

  return output
}

export function inlineBuiltAssetsFromDir(html, assetsDir) {
  const { jsAssetName, cssAssetName } = findPrimaryAssets(html)
  const jsSource = jsAssetName ? readFileSync(resolve(assetsDir, jsAssetName), 'utf-8') : undefined
  const cssSource = cssAssetName ? readFileSync(resolve(assetsDir, cssAssetName), 'utf-8') : undefined

  return inlineBuiltAssets(html, { jsSource, cssSource })
}
