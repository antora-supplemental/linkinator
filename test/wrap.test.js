'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { wrapExternalLinks, waybackUrl } = require('../lib/wrap.js')
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

  it('wraps external anchors inside article.doc with hover bar + wayback', () => {
    const html = '<article class="doc"><p>See <a href="https://example.com/x">Example</a> please.</p></article>'
    const out = wrapExternalLinks(html, { status: 'unchecked' })
    assert.match(out, /class="lini lini-status-unchecked"/)
    assert.match(out, /lini-hoverbar/)
    assert.match(out, /lini-wayback/)
    assert.match(out, /web\.archive\.org/)
    assert.match(out, /lini-link/)
    assert.match(out, /href="https:\/\/example.com\/x"/)
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

  it('exports register + registry meta', () => {
    assert.equal(typeof ext.register, 'function')
    assert.equal(meta.informalName, 'Link-inator')
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
