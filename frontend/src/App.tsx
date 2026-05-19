import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from './components/Sidebar'
import Asgard from './pages/Asgard'
import AsgardLogin from './pages/AsgardLogin'
import Vanaheim from './pages/Vanaheim'
import VanaheimEntry from './pages/VanaheimEntry'
import Svartalfheim from './pages/Svartalfheim'
import Bifrost from './pages/Bifrost'
import Niflheim from './pages/Niflheim'

export default function App() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <div className="flex-1 ml-52 min-h-screen">
        <Routes>
          <Route path="/"             element={<Navigate to="/vanaheim" replace />} />
          <Route path="/asgard/login" element={<AsgardLogin />} />
          <Route path="/asgard/*"     element={<Asgard />} />
          <Route path="/vanaheim"          element={<Vanaheim />} />
          <Route path="/vanaheim/:id"     element={<VanaheimEntry />} />
          <Route path="/svartalfheim"     element={<Svartalfheim />} />
          <Route path="/bifrost"          element={<Bifrost />} />
          <Route path="/niflheim"         element={<Niflheim />} />
        </Routes>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(38 28% 89%)',
            border: '1px solid hsl(35 32% 74%)',
            color: 'hsl(24 52% 11%)',
          },
        }}
      />
    </div>
  )
}
