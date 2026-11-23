'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  wrapExternalLinks,
  waybackUrl,
  matchesUrlPattern,
  DEFAULT_EXCLUDE,
  LEGACY_EXCLUDE,
  DEFAULT_ARCHIVE_PROVIDERS,
  DEFAULT_SKIP_ROLES,
} = require('../lib/wrap.js')
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

  it('does not wrap header chrome when article is zoned', () => {
    const html =
      '<article class="doc" data-zone-root>' +
      '<header data-zone="header">' +
      '<div class="page-context-source-line">' +
      '<span class="page-context-source-actions">' +
      '<a href="https://github.com/view">View</a> | <a href="https://github.com/edit">Edit</a>' +
      '</span></div></header>' +
      '<div data-zone="body"><p>See <a href="https://example.com/doc">doc</a>.</p></div></article>'
    const out = wrapExternalLinks(html)
    const headerZone = out.match(/<header data-zone="header">[\s\S]*?<\/header>/)?.[0] ?? ''
    assert.doesNotMatch(headerZone, /lini-link/)
    assert.match(out, /example\.com\/doc[\s\S]*lini-link/)
  })

  it('legacy flat article still skips page-context-source-line', () => {
    const html =
      '<article class="doc">' +
      '<div class="page-context-source-line">' +
      '<span class="page-context-source-actions">' +
      '<a href="https://github.com/view">View</a></span></div>' +
      '<p>See <a href="https://example.com/doc">doc</a>.</p></article>'
    const out = wrapExternalLinks(html)
    const sourceChunk = out.slice(out.indexOf('page-context-source-line'), out.indexOf('</div>') + 6)
    assert.doesNotMatch(sourceChunk, /lini-link/)
    assert.match(out, /lini-wayback/)
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

  it('exposes legacy exclude selectors for flat articles', () => {
    assert.deepEqual(DEFAULT_EXCLUDE, LEGACY_EXCLUDE)
    assert.ok(LEGACY_EXCLUDE.some((s) => String(s).includes('page-context')))
  })

  it('skips archive.org and subdomains by default without wrapping', () => {
    assert.deepEqual(DEFAULT_ARCHIVE_PROVIDERS, ['archive.org'])
    const html =
      '<article class="doc"><p>' +
      '<a href="https://customer.io/">Customer.io</a> ' +
      '<a href="https://web.archive.org/web/20261112124438/https://customer.io/">2026-11-12 snapshot</a> ' +
      '<a href="https://archive.org/details/example">Archive item</a> ' +
      '<a href="https://notarchive.org/">Lookalike</a>' +
      '</p></article>'
    const out = wrapExternalLinks(html)
    assert.match(out, /href="https:\/\/customer\.io\/"[^>]*class="lini-link"|class="lini-link"[^>]*href="https:\/\/customer\.io\/"/)
    assert.match(out, /href="https:\/\/notarchive\.org\/"[^>]*class="lini-link"|class="lini-link"[^>]*href="https:\/\/notarchive\.org\/"/)
    assert.match(out, /<a href="https:\/\/web\.archive\.org\/web\/20261112124438\/https:\/\/customer\.io\/">2026-11-12 snapshot<\/a>/)
    assert.match(out, /<a href="https:\/\/archive\.org\/details\/example">Archive item<\/a>/)
  })

  it('supports custom archiveProviders, extraArchiveProviders, and excludeUrls domains/prefixes', () => {
    const html =
      '<article class="doc"><p>' +
      '<a href="https://perma.cc/ABC1-2345">Perma</a> ' +
      '<a href="https://internal.example.com/app">Internal</a> ' +
      '<a href="https://docs.example.com/archive/2026">Archived docs</a> ' +
      '<a href="https://docs.example.com/archive-other">Not prefix</a> ' +
      '<a href="https://docs.example.com/live">Live docs</a>' +
      '</p></article>'
    const out = wrapExternalLinks(html, {
      extraArchiveProviders: ['perma.cc'],
      excludeUrls: ['internal.example.com', 'https://docs.example.com/archive/'],
    })
    assert.match(out, /<a href="https:\/\/perma\.cc\/ABC1-2345">Perma<\/a>/)
    assert.match(out, /<a href="https:\/\/internal\.example\.com\/app">Internal<\/a>/)
    assert.match(out, /<a href="https:\/\/docs\.example\.com\/archive\/2026">Archived docs<\/a>/)
    assert.match(out, /docs\.example\.com\/archive-other[\s\S]*lini-wayback/)
    assert.match(out, /docs\.example\.com\/live[\s\S]*lini-wayback/)

    // Allowing empty archiveProviders opts back into wrapping archive.org
    const rewrapped = wrapExternalLinks(
      '<article class="doc"><p><a href="https://web.archive.org/web/*/https://example.com/">WB</a></p></article>',
      { archiveProviders: [] }
    )
    assert.match(rewrapped, /lini-wayback/)
  })

  it('matches domain, host+path, and full URL prefix patterns accurately', () => {
    assert.equal(matchesUrlPattern('https://web.archive.org/web/123/https://x.com', 'archive.org'), true)
    assert.equal(matchesUrlPattern('https://notarchive.org/', 'archive.org'), false)
    assert.equal(matchesUrlPattern('https://sub.example.com/archive/2026', 'example.com/archive'), true)
    assert.equal(matchesUrlPattern('https://sub.example.com/archives/2026', 'example.com/archive'), false)
    assert.equal(matchesUrlPattern('https://example.com/archive/a', 'https://example.com/archive/'), true)
    assert.equal(matchesUrlPattern('https://example.com/archive-2', 'https://example.com/archive/'), false)
  })

  it('supports human-readable linkinator-skip role plus skip-linkinator and legacy lini-skip aliases', () => {
    assert.ok(DEFAULT_SKIP_ROLES.includes('linkinator-skip'))
    assert.ok(DEFAULT_SKIP_ROLES.includes('skip-linkinator'))
    assert.ok(DEFAULT_SKIP_ROLES.includes('lini-skip'))
    const html =
      '<article class="doc"><p>' +
      '<a href="https://a.example/" class="linkinator-skip">A</a> ' +
      '<a href="https://b.example/" class="bare skip-linkinator">B</a> ' +
      '<a href="https://c.example/" class="lini-skip">C</a> ' +
      '<a href="https://d.example/">D</a>' +
      '</p></article>'
    const out = wrapExternalLinks(html)
    assert.match(out, /<a href="https:\/\/a\.example\/" class="linkinator-skip">A<\/a>/)
    assert.match(out, /<a href="https:\/\/b\.example\/" class="bare skip-linkinator">B<\/a>/)
    assert.match(out, /<a href="https:\/\/c\.example\/" class="lini-skip">C<\/a>/)
    assert.match(out, /d\.example\/"[^>]*>D<\/a><span class="lini-ext"/)
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
