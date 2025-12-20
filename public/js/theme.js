// Theme helper: apply saved theme across all pages
(function(){
  function applyTheme() {
    const theme = localStorage.getItem('appTheme') || 'light'
    document.documentElement.setAttribute('data-theme', theme)

    const applyDarkClass = (useDark) => {
      if (useDark) document.body.classList.add('dark-theme')
      else document.body.classList.remove('dark-theme')
    }

    if (theme === 'dark') {
      applyDarkClass(true)
    } else if (theme === 'auto') {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
      applyDarkClass(mq ? mq.matches : false)
      if (mq) {
        const listener = (e) => applyDarkClass(e.matches)
        if (mq.addEventListener) mq.addEventListener('change', listener)
        else if (mq.addListener) mq.addListener(listener)
      }
    } else {
      applyDarkClass(false)
    }
  }

  // Run early
  try { applyTheme() } catch(e){ }

  // Expose for manual use
  window.applySavedTheme = applyTheme
})()
