import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ThemeProvider } from './lib/theme'
import { auth } from './lib/api'
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
import Weryfikuj from './pages/Weryfikuj'
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

function EmailBaner() {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => auth.mnie().then(r => r.data) })
  const [wyslano, setWyslano] = useState(false)
  const mutacja = useMutation({
    mutationFn: () => auth.wyslijWeryfikacje(),
    onSuccess: () => { setWyslano(true); queryClient.invalidateQueries({ queryKey: ['user'] }) },
  })

  if (!user || user.email_verified) return null

  return (
    <div className="bg-bursztyn-500/10 border-b border-bursztyn-500/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-bursztyn-400">
        Potwierdź adres email, aby w pełni korzystać z aplikacji.
      </span>
      {wyslano ? (
        <span className="text-bursztyn-400 text-xs shrink-0">Wysłano ✓</span>
      ) : (
        <button
          onClick={() => mutacja.mutate()}
          disabled={mutacja.isPending}
          className="text-xs text-bursztyn-400 underline shrink-0 hover:text-bursztyn-300"
        >
          {mutacja.isPending ? 'Wysyłam...' : 'Wyślij ponownie'}
        </button>
      )}
    </div>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-grafit-850 app-shell">
      <Navbar />
      <EmailBaner />
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
        <Route path="/weryfikuj" element={<Weryfikuj />} />
        <Route path="*" element={<Navigate to="/spizarnia" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  )
}
