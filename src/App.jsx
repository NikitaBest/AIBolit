import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MobileAppShell from './layout/MobileAppShell.jsx'
import Welcome from './pages/Welcome.jsx'
import Camera from './pages/Camera.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobileAppShell />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/camera" element={<Camera />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
