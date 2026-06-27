import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import Logowanie from './pages/Logowanie'
import Rejestracja from './pages/Rejestracja'
import StronaGlowna from './pages/StronaGlowna'
import Pulpit from './pages/Pulpit'
import Spizarnia from './pages/Spizarnia'
import Przepisy from './pages/Przepisy'
import Dashboard from './pages/Dashboard'
import Spolecznosc from './pages/Spolecznosc'
import Znajomi from './pages/Znajomi'
import Ustawienia from './pages/Ustawienia'
import Navbar from './components/Navbar'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/logowanie" replace />
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <Navigate to="/pulpit" replace /> : <>{children}</>
}

function HomeRoute() {
  const token = localStorage.getItem('token')
  return token ? <Navigate to="/pulpit" replace /> : <StronaGlowna />
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-grafit-850 app-shell">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/logowanie" element={<PublicOnlyRoute><Logowanie /></PublicOnlyRoute>} />
        <Route path="/rejestracja" element={<PublicOnlyRoute><Rejestracja /></PublicOnlyRoute>} />
        <Route path="/pulpit" element={<PrivateRoute><AppLayout><Pulpit /></AppLayout></PrivateRoute>} />
        <Route path="/spizarnia" element={<PrivateRoute><AppLayout><Spizarnia /></AppLayout></PrivateRoute>} />
        <Route
          path="/przepisy"
          element={
            <PrivateRoute>
              <AppLayout><Przepisy /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/tracker"
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
          path="/znajomi"
          element={
            <PrivateRoute>
              <AppLayout><Znajomi /></AppLayout>
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
        <Route path="*" element={<Navigate to="/spizarnia" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  )
}
