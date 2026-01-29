import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'

// Инициализация Telegram Web App
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp
  tg.ready()
  tg.expand()
  
  // Отключаем вертикальные свайпы для закрытия приложения
  // Это позволяет использовать свайпы внутри приложения без конфликтов
  if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes()
  }
  
  // Настройка цветовой схемы (фон в зависимости от темы Telegram)
  const isDark = tg.colorScheme === 'dark'
  const bgColor = isDark ? '#000000' : '#FFFFFF'

  tg.setHeaderColor(bgColor)
  tg.setBackgroundColor(bgColor)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
