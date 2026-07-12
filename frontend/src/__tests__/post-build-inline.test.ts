import { describe, expect, it } from 'vitest'
import { inlineBuiltAssets } from '../../scripts/post-build-lib.js'

describe('inlineBuiltAssets', () => {
  it('inlines js and css without corrupting $ sequences', () => {
    const html = `
      <html>
        <head>
          <link rel="modulepreload" crossorigin href="/assets/hambaft/assets/chunk.ABC.js">
          <link rel="stylesheet" crossorigin href="/assets/hambaft/assets/index.ABC.css">
        </head>
        <body>
          <div id="root"></div>
          <script type="module" crossorigin src="/assets/hambaft/assets/index.ABC.js"></script>
        </body>
      </html>
    `
    const jsSource = 'console.log("$& $1 $$ literal");'
    const cssSource = 'body{color:#123456;}'

    const result = inlineBuiltAssets(html, {
      jsSource,
      cssSource,
    })

    expect(result).toContain('<style data-hambaft-inline="app">')
    expect(result).toContain('<script type="module" data-hambaft-inline="app">')
    expect(result).toContain(jsSource)
    expect(result).toContain(cssSource)
    expect(result).not.toContain('rel="modulepreload"')
    expect(result).not.toContain('crossorigin src="/assets/hambaft/assets/index.ABC.js"')
    expect(result).not.toContain('rel="stylesheet" crossorigin href="/assets/hambaft/assets/index.ABC.css"')
  })
})
