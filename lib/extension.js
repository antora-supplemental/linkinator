'use strict'

const fs = require('node:fs')
const ospath = require('node:path')
const { wrapExternalLinks } = require('./wrap.js')
const { createProgress } = require('./progress.js')
const registryMeta = require('./registry-meta.js')

const PKG = '@antora-supplemental/linkinator'
const TOOL = 'linkinator'

/**
 * Antora extension (Link-inator): wrap outbound links with click-time UX chrome
 * and inject CSS/JS for muted validity colors + sharp border + archive.org button.
 *
 * Runs on pagesComposed (HTML ready, before publish) so wrapping affects output
 * and preface/progress appear during the build — not a silent sitePublished dump.
 *
 * Config:
 * - skip: boolean
 * - statusDefault: 'unchecked' | 'ok' | 'unknown' | 'invalid'
 * - injectAssets: boolean (default true)
 */
function register ({ config = {} } = {}) {
  const context = this
  if (config.skip) return

  const statusDefault = config.statusDefault || 'unchecked'
  const injectAssets = config.injectAssets !== false

  context.on('pagesComposed', ({ playbook, siteCatalog, contentCatalog }) => {
    const logger = typeof context.getLogger === 'function'
      ? context.getLogger(PKG)
      : { info: (...a) => console.log('[' + PKG + ']', ...a) }

    const progress = createProgress({ id: TOOL, logger })
    progress.starting('starting outbound link wrap')

    const pages = (contentCatalog && typeof contentCatalog.findBy === 'function')
      ? (contentCatalog.findBy({ family: 'page' }) || [])
      : []

    progress.checking(pages.length, 'pages')
    let n = 0
    let wrapped = 0
    for (const page of pages) {
      n += 1
      if (!page.contents) {
        progress.tick(n, pages.length)
        continue
      }
      const html = Buffer.isBuffer(page.contents) ? page.contents.toString('utf8') : String(page.contents)
      const next = wrapExternalLinks(html, { status: statusDefault })
      if (next !== html) {
        page.contents = Buffer.from(next)
        wrapped += 1
      }
      progress.tick(n, pages.length)
    }

    if (injectAssets && siteCatalog && typeof siteCatalog.addFile === 'function') {
      const css = fs.readFileSync(ospath.join(__dirname, '..', 'ui', 'css', 'linkinator.css'))
      const js = fs.readFileSync(ospath.join(__dirname, '..', 'ui', 'js', 'linkinator.js'))
      addSiteFile(siteCatalog, '_/css/linkinator.css', css)
      addSiteFile(siteCatalog, '_/js/linkinator.js', js)
    }

    try {
      if (playbook && playbook.site) {
        playbook.site.keys = playbook.site.keys || {}
        playbook.site.keys.linkinator = registryMeta
      }
    } catch (_) {}

    progress.done('wrapped links on ' + wrapped + '/' + n + ' page(s)')
  })
}

function addSiteFile (siteCatalog, pathOut, contents) {
  try {
    siteCatalog.addFile({
      contents: Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
      out: { path: pathOut },
      pub: { url: '/' + pathOut.replace(/\\/g, '/'), absolute: false },
    })
  } catch (_) {}
}

module.exports = register
module.exports.register = register
module.exports.registryMeta = registryMeta
