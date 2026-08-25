;(function () {
  var STORAGE_KEY = 'worddeck-theme'
  var saved = window.localStorage.getItem(STORAGE_KEY)
  var theme = saved === 'light' ? 'light' : 'dark'

  function applyTheme(nextTheme) {
    theme = nextTheme
    document.body.dataset.theme = theme
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      var nextLabel = theme === 'dark' ? 'Light mode' : 'Dark mode'
      button.textContent = nextLabel
      button.setAttribute('aria-label', 'Switch to ' + nextLabel.toLowerCase())
    })
  }

  applyTheme(theme)
  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var nextTheme = theme === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
      applyTheme(nextTheme)
    })
  })
})()
