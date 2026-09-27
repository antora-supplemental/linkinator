'use strict'

/** Self-register metadata for extension-lister / antora-supplemental registry. */
module.exports = {
  name: 'Link-inator',
  packageName: '@antora-supplemental/linkinator',
  purpose: 'link-ux',
  layer: 'bolt-on',
  chassis: 'bolt-on',
  pipeline: true,
  asciidoctor: false,
  lifecycleHooks: ['sitePublished'],
  processorSubtypes: [],
  informalName: 'Link-inator',
  description: 'Click-time validity hints, muted colors + sharp border, archive.org/Wayback button',
}
