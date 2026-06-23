import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/logowanie'
    }
    return Promise.reject(err)
  },
)

export default api

// Typy

export interface Produkt {
  id: number
  user_id: number
  name: string
  category: string
  quantity: number
  unit: string
  barcode?: string
  image_url?: string
  added_at: string
  expires_at?: string
  status: string
  days_left?: number
  risk_score?: number
}

export interface User {
  id: number
  email: string
  miasto?: string
  notify_push: boolean
  notify_email: boolean
  notify_days_before: number
  notify_hour: number
  created_at: string
}

export interface Powiadomienie {
  id: number
  type: string
  message: string
  item_id?: number
  created_at: string
  read: boolean
}

export interface DashboardStats {
  kg_uratowane: number
  kg_zmarnowane: number
  zl_zaoszczone: number
  co2_unikniete: number
  streak_dni: number
  tygodniowe: { dzien: string; uratowane: number; zmarnowane: number }[]
}

export interface Ogloszenie {
  id: number
  user_id: number
  item_name: string
  quantity: number
  unit: string
  city: string
  status: string
  expires_at?: string
  created_at: string
  kontakt_email?: string
}

// Auth

export const auth = {
  rejestruj: (email: string, haslo: string, miasto?: string) =>
    api.post<{ access_token: string }>('/auth/rejestruj', { email, haslo, miasto }),
  login: (email: string, haslo: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', haslo)
    return api.post<{ access_token: string }>('/auth/login', form)
  },
  mnie: () => api.get<User>('/auth/mnie'),
  ustawienia: (dane: Partial<User>) => api.patch<User>('/auth/ustawienia', dane),
}

// Spiżarnia

export const spizarnia = {
  lista: (status = 'active') => api.get<Produkt[]>('/spizarnia', { params: { status } }),
  dodaj: (dane: Partial<Produkt>) => api.post<Produkt>('/spizarnia', dane),
  aktualizuj: (id: number, dane: Partial<Produkt>) => api.patch<Produkt>(`/spizarnia/${id}`, dane),
  akcja: (id: number, action: string, quantity?: number, weight_kg?: number) =>
    api.post<Produkt>(`/spizarnia/${id}/akcja`, { action, quantity, weight_kg }),
  usun: (id: number) => api.delete(`/spizarnia/${id}`),
  skanuj: (barcode: string) => api.get<{ found: boolean; name?: string; category?: string; image_url?: string; default_shelf_days?: number }>(`/produkty/barcode/${barcode}`),
}

// Powiadomienia

export const powiadomienia = {
  lista: () => api.get<Powiadomienie[]>('/powiadomienia'),
  licznik: () => api.get<{ count: number }>('/powiadomienia/licznik'),
  przeczytaj: (id: number) => api.post(`/powiadomienia/${id}/przeczytane`),
  przeczytajWszystkie: () => api.post('/powiadomienia/przeczytaj-wszystkie'),
}

// Dashboard

export const dashboard = {
  stats: () => api.get<DashboardStats>('/dashboard'),
}

// Spolecznosc

export const spolecznosc = {
  lista: (miasto?: string) => api.get<Ogloszenie[]>('/spolecznosc', { params: miasto ? { miasto } : {} }),
  dodaj: (dane: { item_name: string; quantity: number; unit: string; city: string; expires_at?: string }) =>
    api.post<Ogloszenie>('/spolecznosc', dane),
  zarezerwuj: (id: number) => api.post<Ogloszenie>(`/spolecznosc/${id}/zarezerwuj`),
  odebrane: (id: number) => api.post<Ogloszenie>(`/spolecznosc/${id}/odebrane`),
  usun: (id: number) => api.delete(`/spolecznosc/${id}`),
}
