import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ScrollToTop } from '@/components/ui/scroll-to-top'
import './index.css'
import App from './App.tsx'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'
import { Contact } from './pages/Contact'
import { RoutePlanner } from './pages/RoutePlanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/plan" element={<RoutePlanner />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
