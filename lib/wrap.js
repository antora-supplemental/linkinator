'use strict'

/**
 * Wrap external http(s) anchors with Linkinator chrome.
 * Structure: span.lini > a.lini-link + .lini-ext (inline) + .lini-actions (Archive on hover).
 *
 * Skips metadata chrome via configurable `exclude` selectors (default: page-context,
 * Source View|Edit line, data-zone header/meta). Optional `scope` limits wrapping to
 * matching zones (auto-detects `[data-zone="body"]` when present).
 */

const DEFAULT_EXCLUDE = [
  '.page-context',
  '.page-context-source-line',
  '.page-context-source-actions',
  '[data-zone="header"]',
  '[data-zone="meta"]',
]

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const OPEN_TAG_RE = /<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g

function waybackUrl (href) {
  try {
    const u = new URL(href)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return 'https://web.archive.org/web/*/' + encodeURI(u.href)
  } catch (_) {
    return null
  }
}

function escapeAttr (s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function mergeClass (pre, post) {
  const attrs = pre + post
  if (/\bclass\s*=/.test(attrs)) {
    const nextPre = pre.replace(/\bclass\s*=\s*(["'])([^"']*)\1/i, (_, q, cls) => {
      const parts = cls.split(/\s+/).filter(Boolean)
      if (!parts.includes('lini-link')) parts.push('lini-link')
      return 'class=' + q + parts.join(' ') + q
    })
    if (nextPre !== pre) return { pre: nextPre, post }
    const nextPost = post.replace(/\bclass\s*=\s*(["'])([^"']*)\1/i, (_, q, cls) => {
      const parts = cls.split(/\s+/).filter(Boolean)
      if (!parts.includes('lini-link')) parts.push('lini-link')
      return 'class=' + q + parts.join(' ') + q
    })
    return { pre, post: nextPost }
  }
  return { pre: pre + ' class="lini-link"', post }
}

const ANCHOR_RE = /<a\b([^>]*?)href\s*=\s*(["'])(https?:\/\/[^"']+)\2([^>]*)>([\s\S]*?)<\/a>/gi

function wrapAnchorsInHtml (html, { status = 'unchecked' } = {}) {
  if (!html || typeof html !== 'string') return html
  return html.replace(ANCHOR_RE, (full, pre, q, href, post, inner) => {
    const attrs = pre + post
    if (/\blini-link\b/i.test(attrs) || /\blini-skip\b/i.test(attrs)) return full
    const merged = mergeClass(pre, post)
    const wb = waybackUrl(href)
    const statusAttr = escapeAttr(status)
    const extIcon = '<span class="lini-ext" aria-hidden="true"></span>'
    const actions = wb
      ? '<span class="lini-actions" role="group" aria-label="Link tools">' +
        '<button type="button" class="lini-wayback" data-wayback="' + escapeAttr(wb) +
        '" title="Open in Wayback Machine" aria-label="Archive in Wayback Machine">' +
        '<span class="lini-wayback-icon" aria-hidden="true"></span></button></span>'
      : ''
    const wbData = wb ? ' data-lini-wayback="' + escapeAttr(wb) + '"' : ''
    return '<span class="lini lini-status-' + statusAttr + '" data-lini-href="' + escapeAttr(href) +
      '" data-lini-status="' + statusAttr + '"' + wbData + '>' +
      '<a' + merged.pre + 'href=' + q + href + q + merged.post + '>' + inner + '</a>' +
      extIcon +
      actions +
      '<span class="lini-status-text" hidden>' + statusAttr + '</span></span>'
  })
}

function getAttr (openAttrs, name) {
  const re = new RegExp('\\b' + name + '\\s*=\\s*(["\'])([^"\']*)\\1', 'i')
  const m = openAttrs.match(re)
  return m ? m[2] : null
}

function classList (openAttrs) {
  const cls = getAttr(openAttrs, 'class')
  return cls ? cls.split(/\s+/).filter(Boolean) : []
}

function matchesCssSelector (tagName, openAttrs, selector) {
  if (typeof selector !== 'string') return false
  const sel = selector.trim()
  const dz = sel.match(/^\[data-zone\s*=\s*["']([^"']+)["']\]$/i)
  if (dz) return getAttr(openAttrs, 'data-zone') === dz[1]
  if (sel.startsWith('.')) {
    return classList(openAttrs).includes(sel.slice(1))
  }
  const tc = sel.match(/^([a-zA-Z][\w-]*)\.([\w-]+)$/)
  if (tc) {
    return tagName.toLowerCase() === tc[1].toLowerCase() && classList(openAttrs).includes(tc[2])
  }
  return tagName.toLowerCase() === sel.toLowerCase()
}

function matchesSelector (tagName, openAttrs, selector) {
  if (selector instanceof RegExp) {
    return selector.test('<' + tagName + openAttrs + '>')
  }
  if (typeof selector === 'string') return matchesCssSelector(tagName, openAttrs, selector)
  return false
}

function isSelfClosing (tagName, openTagText) {
  if (/\/>\s*$/.test(openTagText)) return true
  return VOID_ELEMENTS.has(tagName.toLowerCase())
}

/**
 * @param {string} html
 * @param {number} startIndex - index of `<`
 * @param {string} tagName
 * @returns {number} index after closing tag (or after void/self-closed tag)
 */
function findElementEnd (html, startIndex, tagName) {
  const lower = tagName.toLowerCase()
  const openMatch = /^<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/i.exec(html.slice(startIndex))
  if (!openMatch) return html.length
  const openLen = openMatch[0].length
  if (isSelfClosing(openMatch[1], openMatch[0])) return startIndex + openLen

  let depth = 1
  let pos = startIndex + openLen
  while (pos < html.length && depth > 0) {
    const rest = html.slice(pos)
    const nextOpen = /^<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/i.exec(rest)
    const nextClose = /^<\/([a-zA-Z][\w:-]*)\s*>/i.exec(rest)
    const openAt = nextOpen ? nextOpen.index : -1
    const closeAt = nextClose ? nextClose.index : -1

    if (nextOpen && openAt === 0 && (closeAt !== 0)) {
      if (!isSelfClosing(nextOpen[1], nextOpen[0]) && nextOpen[1].toLowerCase() === lower) depth += 1
      pos += nextOpen[0].length
      continue
    }
    if (nextClose && closeAt === 0) {
      if (nextClose[1].toLowerCase() === lower) depth -= 1
      pos += nextClose[0].length
      continue
    }
    pos += 1
  }
  return pos
}

function collectMatchingElements (html, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors]
  const hits = []
  const re = new RegExp(OPEN_TAG_RE.source, 'gi')
  let m
  while ((m = re.exec(html)) !== null) {
    const tagName = m[1]
    const attrs = m[2]
    const openTag = m[0]
    if (isSelfClosing(tagName, openTag)) continue
    if (!list.some((sel) => matchesSelector(tagName, attrs, sel))) continue
    const start = m.index
    const end = findElementEnd(html, start, tagName)
    hits.push({ start, end, openLen: openTag.length, tagName })
    if (end > re.lastIndex) re.lastIndex = end
  }
  return hits
}

function mergeRegions (regions) {
  if (!regions.length) return regions
  const sorted = [...regions].sort((a, b) => a.start - b.start)
  const merged = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const cur = sorted[i]
    if (cur.start <= prev.end) prev.end = Math.max(prev.end, cur.end)
    else merged.push({ ...cur })
  }
  return merged
}

function collectExcludedRegions (html, excludeList) {
  const elements = collectMatchingElements(html, excludeList)
  return mergeRegions(elements.map(({ start, end }) => ({ start, end })))
}

function wrapWithExclusions (html, options) {
  const exclude = options.exclude != null ? options.exclude : DEFAULT_EXCLUDE
  const regions = collectExcludedRegions(html, exclude)
  if (!regions.length) return wrapAnchorsInHtml(html, options)
  let out = ''
  let last = 0
  for (const { start, end } of regions) {
    if (start > last) out += wrapAnchorsInHtml(html.slice(last, start), options)
    out += html.slice(start, end)
    last = end
  }
  if (last < html.length) out += wrapAnchorsInHtml(html.slice(last), options)
  return out
}

function innerContentBounds (html, start, end) {
  const openMatch = /^<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/i.exec(html.slice(start))
  if (!openMatch) return null
  const innerStart = start + openMatch[0].length
  const closeMatch = /<\/([a-zA-Z][\w:-]*)\s*>$/i.exec(html.slice(start, end))
  if (!closeMatch) return null
  const innerEnd = end - closeMatch[0].length
  if (innerEnd < innerStart) return null
  return { innerStart, innerEnd }
}

function wrapScopedElements (html, scopeSelector, options) {
  const scopes = collectMatchingElements(html, scopeSelector)
  if (!scopes.length) return wrapWithExclusions(html, options)
  let result = html
  for (let i = scopes.length - 1; i >= 0; i--) {
    const { start, end } = scopes[i]
    const bounds = innerContentBounds(result, start, end)
    if (!bounds) continue
    const { innerStart, innerEnd } = bounds
    const inner = result.slice(innerStart, innerEnd)
    const wrapped = wrapWithExclusions(inner, options)
    result = result.slice(0, innerStart) + wrapped + result.slice(innerEnd)
  }
  return result
}

/**
 * Wrap only inside article.doc, skipping excluded metadata zones.
 */
function wrapArticleDocBody (body, options) {
  const scope =
    options.scope != null
      ? options.scope
      : (/data-zone\s*=\s*["']body["']/i.test(body) ? '[data-zone="body"]' : null)
  if (scope) return wrapScopedElements(body, scope, options)
  return wrapWithExclusions(body, options)
}

function wrapExternalLinks (html, options = {}) {
  if (!html || typeof html !== 'string') return html
  const articleRe = /<article\b[^>]*\bclass\s*=\s*["'][^"']*\bdoc\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi
  if (!articleRe.test(html)) return html
  articleRe.lastIndex = 0
  return html.replace(articleRe, (full, body) => {
    const processed = wrapArticleDocBody(body, options)
    return full.replace(body, processed)
  })
}

module.exports = {
  wrapExternalLinks,
  wrapAnchorsInHtml,
  waybackUrl,
  DEFAULT_EXCLUDE,
}
