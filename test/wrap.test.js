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

  it('wraps external anchors with lini chrome + wayback button', () => {
    const html = '<p>See <a href="https://example.com/x">Example</a> please.</p>'
    const out = wrapExternalLinks(html, { status: 'unchecked' })
    assert.match(out, /class="lini lini-status-unchecked"/)
    assert.match(out, /lini-wayback/)
    assert.match(out, /web\.archive\.org/)
    assert.match(out, /lini-link/)
    assert.match(out, /href="https:\/\/example.com\/x"/)
  })

  it('skips non-http and already wrapped', () => {
    assert.equal(wrapExternalLinks('<a href="/local/">x</a>'), '<a href="/local/">x</a>')
    const once = wrapExternalLinks('<a href="https://a.example/">a</a>')
    const twice = wrapExternalLinks(once)
    assert.equal(once, twice)
  })

  it('exports register + registry meta', () => {
    assert.equal(typeof ext.register, 'function')
    assert.equal(meta.informalName, 'Link-inator')
    assert.equal(meta.layer, 'bolt-on')
    assert.equal(meta.purpose, 'link-ux')
  })

  it('register hooks sitePublished', () => {
    const handlers = {}
    const fake = { on (e, fn) { handlers[e] = fn }, getLogger () { return { info () {} } } }
    ext.register.call(fake, { config: {} })
    assert.equal(typeof handlers.sitePublished, 'function')
  })
})
