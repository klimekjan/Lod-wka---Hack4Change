import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Logowanie from './pages/Logowanie'
import Rejestracja from './pages/Rejestracja'
import Spizarnia from './pages/Spizarnia'
import Przepisy from './pages/Przepisy'
import Dashboard from './pages/Dashboard'
import Spolecznosc from './pages/Spolecznosc'
import Ustawienia from './pages/Ustawienia'
import Navbar from './components/Navbar'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/logowanie" replace />
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/logowanie" element={<Logowanie />} />
        <Route path="/rejestracja" element={<Rejestracja />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout><Spizarnia /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/przepisy"
          element={
            <PrivateRoute>
              <AppLayout><Przepisy /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppLayout><Dashboard /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/spolecznosc"
          element={
            <PrivateRoute>
              <AppLayout><Spolecznosc /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ustawienia"
          element={
            <PrivateRoute>
              <AppLayout><Ustawienia /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
