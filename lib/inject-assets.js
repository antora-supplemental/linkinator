'use strict'

const CSS_MARKER = 'linkinator.css'
const JS_MARKER = 'linkinator.js'

/** Resolve site-relative prefix (same pattern as soft-nav-page-toc). */
function assetPrefixFromHtml (html) {
  const m = html.match(/<script[^>]+src="([^"]*)\/js\/site\.js"/)
  if (!m) return null
  return m[1].replace(/\/(?:ui|_)$/, '')
}

/**
 * Inject stylesheet + script tags so published pages load Linkinator chrome
 * without hub supplemental-ui copies.
 */
function injectAssetTags (html) {
  if (!html || typeof html !== 'string') return html
  if (html.includes(CSS_MARKER) && html.includes(JS_MARKER)) return html

  const prefix = assetPrefixFromHtml(html)
  if (!prefix) return html

  let out = html
  if (!out.includes(CSS_MARKER)) {
    const cssTag = `<link rel="stylesheet" href="${prefix}/_/css/linkinator.css">`
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, cssTag + '\n</head>')
    else out = cssTag + out
  }

  if (!out.includes(JS_MARKER)) {
    const jsTag = `<script src="${prefix}/_/js/linkinator.js" defer></script>`
    const siteJs = /<script[^>]+src="[^"]*\/js\/site\.js"[^>]*><\/script>/
    if (siteJs.test(out)) out = out.replace(siteJs, (match) => match + jsTag)
  }

  return out
}

module.exports = { injectAssetTags, assetPrefixFromHtml, CSS_MARKER, JS_MARKER }
