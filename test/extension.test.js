'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

describe('linkinator extension', () => {
  it('hooks pagesComposed and logs preface', () => {
    const ext = require('../lib/extension.js')
    const handlers = {}
    const logs = []
    ext.register.call({
      on (e, fn) { handlers[e] = fn },
      getLogger () { return { info (...a) { logs.push(a.join(' ')) } } },
    }, { config: {} })
    assert.equal(typeof handlers.pagesComposed, 'function')
    assert.equal(handlers.sitePublished, undefined)
    handlers.pagesComposed({
      playbook: { site: {} },
      siteCatalog: null,
      contentCatalog: { findBy () { return [] } },
    })
    const text = logs.join('\n')
    assert.match(text, /linkinator: starting outbound link wrap/)
    assert.match(text, /linkinator: checking 0 pages/)
  })

  it('forwards archiveProviders, extraArchiveProviders, excludeUrls, and skipRoles config', () => {
    const ext = require('../lib/extension.js')
    const handlers = {}
    ext.register.call({
      on (e, fn) { handlers[e] = fn },
      getLogger () { return { info () {} } },
    }, {
      config: {
        injectAssets: false,
        extraArchiveProviders: ['perma.cc'],
        excludeUrls: ['https://skip.example.com/'],
      },
    })
    const page = {
      contents: Buffer.from(
        '<article class="doc"><p>' +
        '<a href="https://web.archive.org/web/*/https://customer.io/">WB</a> ' +
        '<a href="https://perma.cc/XYZ">Perma</a> ' +
        '<a href="https://skip.example.com/a">Skip</a> ' +
        '<a href="https://keep.example.com/a">Keep</a>' +
        '</p></article>'
      ),
    }
    handlers.pagesComposed({
      playbook: { site: {} },
      siteCatalog: null,
      contentCatalog: { findBy () { return [page] } },
    })
    const out = page.contents.toString('utf8')
    assert.match(out, /<a href="https:\/\/web\.archive\.org\/web\/\*\/https:\/\/customer\.io\/">WB<\/a>/)
    assert.match(out, /<a href="https:\/\/perma\.cc\/XYZ">Perma<\/a>/)
    assert.match(out, /<a href="https:\/\/skip\.example\.com\/a">Skip<\/a>/)
    assert.match(out, /keep\.example\.com\/a[\s\S]*lini-wayback/)
  })
})
