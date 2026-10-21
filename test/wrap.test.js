'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { wrapExternalLinks, waybackUrl, DEFAULT_EXCLUDE } = require('../lib/wrap.js')
const ext = require('../lib/extension.js')
const meta = require('../lib/registry-meta.js')

describe('linkinator wrap', () => {
  it('builds wayback URLs', () => {
    assert.equal(
      waybackUrl('https://example.com/path'),
      'https://web.archive.org/web/*/https://example.com/path'
    )
    assert.equal(waybackUrl('mailto:x@y.z'), null)
  })

  it('wraps external anchors with inline ext icon + hover Archive', () => {
    const html = '<article class="doc"><p>See <a href="https://example.com/x">Example</a> please.</p></article>'
    const out = wrapExternalLinks(html, { status: 'unchecked' })
    assert.match(out, /class="lini lini-status-unchecked"/)
    assert.doesNotMatch(out, /lini-block/)
    assert.match(out, /class="lini-ext"/)
    assert.match(out, /lini-actions/)
    assert.match(out, /lini-wayback-icon" aria-hidden="true"><\/span>/)
    assert.match(out, /lini-wayback/)
    assert.match(out, /web\.archive\.org/)
    assert.match(out, /lini-link/)
    assert.match(out, /href="https:\/\/example.com\/x"/)
  })

  it('does not add lini-block on list items with long prose', () => {
    const html =
      '<article class="doc"><ul><li><strong>Hub</strong> — prose before ' +
      '<a href="https://devcentr.org/">Live site</a> after.</li></ul></article>'
    const out = wrapExternalLinks(html)
    assert.match(out, /class="lini lini-status-unchecked"/)
    assert.doesNotMatch(out, /lini-block/)
    assert.match(out, /<li><strong>Hub<\/strong>/)
  })

  it('skips chrome outside article.doc and page-context asides', () => {
    const header = '<header><a href="https://example.com/logo">Logo</a></header>'
    assert.equal(wrapExternalLinks(header), header)
    const meta = '<article class="doc"><aside class="page-context"><a href="https://github.com/edit">Edit</a></aside></article>'
    assert.doesNotMatch(wrapExternalLinks(meta), /lini-wayback/)
    const body = '<article class="doc"><p><a href="https://a.example/">a</a></p></article>'
    const once = wrapExternalLinks(body)
    const twice = wrapExternalLinks(once)
    assert.equal(once, twice)
    assert.equal(wrapExternalLinks('<article class="doc"><a href="/local/">x</a></article>'), '<article class="doc"><a href="/local/">x</a></article>')
  })

  it('does not wrap View|Edit in page-context-source-line', () => {
    const html =
      '<article class="doc">' +
      '<div class="page-context-source-line">' +
      '<span class="page-context-source-actions">' +
      '<a href="https://github.com/view">View</a> | <a href="https://github.com/edit">Edit</a>' +
      '</span></div>' +
      '<p>See <a href="https://example.com/doc">doc</a>.</p></article>'
    const out = wrapExternalLinks(html)
    const sourceChunk = out.slice(out.indexOf('page-context-source-line'), out.indexOf('</div>') + 6)
    assert.doesNotMatch(sourceChunk, /lini-link/)
    assert.match(out, /lini-wayback/)
    assert.match(out, /example\.com\/doc/)
  })

  it('skips data-zone header/meta and wraps only data-zone body when zoned', () => {
    const html =
      '<article class="doc">' +
      '<div data-zone="header"><a href="https://header.example/h">H</a></div>' +
      '<div data-zone="body"><p><a href="https://body.example/b">B</a></p></div>' +
      '<aside class="page-context-footer" data-zone="meta">' +
      '<a href="https://meta.example/m">M</a></aside></article>'
    const out = wrapExternalLinks(html)
    const headerZone = out.match(/<div data-zone="header">[\s\S]*?<\/div>/)?.[0] ?? ''
    const metaZone = out.match(/<aside[^>]*data-zone="meta"[\s\S]*?<\/aside>/)?.[0] ?? ''
    assert.doesNotMatch(headerZone, /lini-link/)
    assert.doesNotMatch(metaZone, /lini-link/)
    assert.match(out, /body\.example[\s\S]*lini-link/)
  })

  it('exposes default exclude selectors for metadata chrome', () => {
    assert.ok(Array.isArray(DEFAULT_EXCLUDE))
    assert.ok(DEFAULT_EXCLUDE.some((s) => String(s).includes('page-context-source-line')))
  })

  it('exports register + registry meta', () => {
    assert.equal(typeof ext.register, 'function')
    assert.equal(meta.informalName, 'Linkinator')
    assert.equal(meta.layer, 'bolt-on')
    assert.equal(meta.purpose, 'link-ux')
  })

  it('register hooks pagesComposed', () => {
    const handlers = {}
    const fake = { on (e, fn) { handlers[e] = fn }, getLogger () { return { info () {} } } }
    ext.register.call(fake, { config: {} })
    assert.equal(typeof handlers.pagesComposed, 'function')
  })
})
