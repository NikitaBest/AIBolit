import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import '../App.css'

function MobileAppShell() {
  useEffect(() => {
    // Гарантируем мобильный full-screen layout и корректную тему
    if (window.Telegram?.WebApp) {
      const telegram = window.Telegram.WebApp

      if (telegram.disableVerticalSwipes) {
        telegram.disableVerticalSwipes()
      }

      const applyTheme = () => {
        if (telegram.colorScheme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark')
        } else {
          document.documentElement.setAttribute('data-theme', 'light')
        }
      }

      applyTheme()

      telegram.onEvent('themeChanged', applyTheme)
    }
  }, [])

  return (
    <div className="app">
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}

export default MobileAppShell


