'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { injectAssetTags } = require('../lib/inject-assets.js')

describe('linkinator inject assets', () => {
  const head = '<html><head></head><body>'
  const foot = '<script src="/docs/_/js/site.js"></script></body></html>'

  it('injects css + js after site.js using ui root prefix', () => {
    const html = head + foot
    const out = injectAssetTags(html)
    assert.match(out, /href="\/docs\/_\/css\/linkinator\.css"/)
    assert.match(out, /src="\/docs\/_\/js\/linkinator\.js"/)
    assert.match(out, /site\.js"><\/script><script src="\/docs\/_\/js\/linkinator\.js"/)
  })

  it('is idempotent', () => {
    const once = injectAssetTags(head + foot)
    assert.equal(injectAssetTags(once), once)
  })
})
