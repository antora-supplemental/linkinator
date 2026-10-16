'use strict'

/**
 * Wrap external http(s) anchors with Link-inator chrome.
 * Structure: span.lini > a.lini-link + hover bar with Wayback control.
 */

const DEFAULT_EXCLUDE_ASIDE_RE = /<aside\b[^>]*\bclass\s*=\s*["'][^"']*\bpage-context\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/gi

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
    const hoverBar = wb
      ? '<span class="lini-hoverbar" role="group" aria-label="Link tools">' +
        '<button type="button" class="lini-wayback" data-wayback="' + escapeAttr(wb) +
        '" title="Open in Wayback Machine" aria-label="Wayback Machine">' +
        '<span class="lini-wayback-icon" aria-hidden="true">⧉</span></button></span>'
      : ''
    const wbData = wb ? ' data-lini-wayback="' + escapeAttr(wb) + '"' : ''
    return '<span class="lini lini-status-' + statusAttr + '" data-lini-href="' + escapeAttr(href) +
      '" data-lini-status="' + statusAttr + '"' + wbData + '>' +
      '<a' + merged.pre + 'href=' + q + href + q + merged.post + '>' + inner + '</a>' +
      hoverBar +
      '<span class="lini-status-text" hidden>' + statusAttr + '</span></span>'
  })
}

/**
 * Wrap only inside article.doc, skipping page-context asides (metadata chrome).
 */
function wrapArticleDocBody (body, options) {
  const chunks = []
  let lastIndex = 0
  const asideRe = new RegExp(DEFAULT_EXCLUDE_ASIDE_RE.source, 'gi')
  let match
  while ((match = asideRe.exec(body)) !== null) {
    if (match.index > lastIndex) {
      chunks.push(wrapAnchorsInHtml(body.slice(lastIndex, match.index), options))
    }
    chunks.push(match[0])
    lastIndex = asideRe.lastIndex
  }
  if (lastIndex < body.length) {
    chunks.push(wrapAnchorsInHtml(body.slice(lastIndex), options))
  }
  if (chunks.length === 0) return wrapAnchorsInHtml(body, options)
  return chunks.join('')
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

module.exports = { wrapExternalLinks, wrapAnchorsInHtml, waybackUrl }
