import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MobileAppShell from './layout/MobileAppShell.jsx'
import Welcome from './pages/Welcome.jsx'
import PrioritySelection from './pages/PrioritySelection.jsx'
import AlgorithmSettings from './pages/AlgorithmSettings.jsx'
import Preparation from './pages/Preparation.jsx'
import Camera from './pages/Camera.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobileAppShell />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/priority" element={<PrioritySelection />} />
          <Route path="/algorithm-settings" element={<AlgorithmSettings />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/camera" element={<Camera />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
