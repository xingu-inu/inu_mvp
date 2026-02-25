;(function () {
  try {
    var t = localStorage.getItem('theme')
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else if (t === 'system') {
      var d = window.matchMedia('(prefers-color-scheme:dark)').matches
      document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  } catch {}
})()
