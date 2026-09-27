---
name: "Link-inator"
description: "Click-time link validity hints + archive.org/Wayback button (UI bolt-on)."
purpose: "link-ux"
layer: "bolt-on"
chassis: "bolt-on"
pipeline: true
asciidoctor: false
lifecycleHooks:
  - sitePublished
processorSubtypes: []
informalName: "Link-inator"
---

# Overview

Separate from build-time link-validator. Wraps outbound anchors for muted validity colors, sharp borders, and Wayback affordances.

## Install

```bash
pnpm add -D github:antora-supplemental/linkinator#v0.1.0
```
