;(function () {
  try {
    var t = localStorage.getItem('theme')
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t)
    } else {
      var d = window.matchMedia('(prefers-color-scheme:dark)').matches
      document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light')
    }
  } catch (e) {}
})()
