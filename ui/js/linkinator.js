;(function () {
  'use strict'

  function onReady (fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
    else fn()
  }

  function setStatus (el, status) {
    if (!el) return
    el.className = el.className.replace(/\blini-status-\w+/g, '').trim() + ' lini-status-' + status
    el.setAttribute('data-lini-status', status)
    var t = el.querySelector('.lini-status-text')
    if (t) t.textContent = status
  }

  function bind () {
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest && ev.target.closest('.lini-wayback')
      if (!btn) return
      ev.preventDefault()
      ev.stopPropagation()
      var url = btn.getAttribute('data-wayback')
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    })

    // Optional: on focus/hover show status text; HEAD probe when data-lini-live="true"
    document.querySelectorAll('.lini[data-lini-live="true"]').forEach(function (el) {
      var href = el.getAttribute('data-lini-href')
      if (!href || el.getAttribute('data-lini-probed')) return
      el.addEventListener('mouseenter', function () {
        if (el.getAttribute('data-lini-probed')) return
        el.setAttribute('data-lini-probed', '1')
        // Opaque no-cors probe is limited; mark unknown unless a same-origin proxy is configured
        var proxy = window.LINKINATOR_PROBE_URL
        if (!proxy) {
          setStatus(el, 'unknown')
          el.classList.add('is-status-visible')
          return
        }
        fetch(proxy + encodeURIComponent(href), { credentials: 'omit' })
          .then(function (r) { return r.json() })
          .then(function (data) {
            setStatus(el, data.status || (data.ok ? 'ok' : 'invalid'))
            el.classList.add('is-status-visible')
          })
          .catch(function () {
            setStatus(el, 'unknown')
            el.classList.add('is-status-visible')
          })
      }, { once: true })
    })
  }

  onReady(bind)
})()
