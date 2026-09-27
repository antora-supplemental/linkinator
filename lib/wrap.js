'use strict'

/**
 * Wrap external http(s) anchors with Link-inator chrome.
 * Structure: span.lini > a.lini-link + button.lini-wayback (+ optional status)
 */
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

/**
 * Very small HTML rewriter: wrap <a href="http(s):..."> that are not already .lini-link
 */
function wrapExternalLinks (html, { status = 'unchecked' } = {}) {
  if (!html || typeof html !== 'string') return html
  return html.replace(/<a\b([^>]*?)href\s*=\s*(["'])(https?:\/\/[^"']+)\2([^>]*)>([\s\S]*?)<\/a>/gi, (full, pre, q, href, post, inner) => {
    const attrs = pre + post
    if (/\blini-link\b/i.test(attrs) || /\blini-skip\b/i.test(attrs)) return full
    const merged = mergeClass(pre, post)
    const wb = waybackUrl(href)
    const statusAttr = escapeAttr(status)
    const wbBtn = wb
      ? '<button type="button" class="lini-wayback" data-wayback="' + escapeAttr(wb) +
        '" title="Open in Wayback Machine" aria-label="Wayback Machine">' +
        '<span class="lini-wayback-icon" aria-hidden="true">⧉</span></button>'
      : ''
    return '<span class="lini lini-status-' + statusAttr + '" data-lini-href="' + escapeAttr(href) +
      '" data-lini-status="' + statusAttr + '">' +
      '<a' + merged.pre + 'href=' + q + href + q + merged.post + '>' + inner + '</a>' +
      wbBtn +
      '<span class="lini-status-text" hidden>' + statusAttr + '</span></span>'
  })
}

module.exports = { wrapExternalLinks, waybackUrl }
