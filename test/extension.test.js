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
})
