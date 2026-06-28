import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { spizarnia, powiadomienia, Powiadomienie, NotificationItem } from '../lib/api'

// tymczasowe szacowanie wagi
const _WAGA_SZT: Record<string, number> = {
  'nabiał': 0.15, 'mięso surowe': 0.20, 'ryby': 0.15, 'warzywa liściaste': 0.12,
  'warzywa twarde': 0.15, 'owoce': 0.15, 'pieczywo': 0.08, 'jajka': 0.06,
  'napoje': 0.33, 'przetwory': 0.35, 'inne': 0.15,
}
const _WAGA_OPAK: Record<string, number> = {
  'nabiał': 0.50, 'mięso surowe': 0.35, 'ryby': 0.25, 'warzywa liściaste': 0.20,
  'warzywa twarde': 0.40, 'owoce': 0.50, 'pieczywo': 0.45, 'jajka': 0.60,
  'napoje': 0.75, 'przetwory': 0.40, 'inne': 0.30,
}
function szacujKg(quantity: number, unit: string, category: string): number {
  const u = unit.trim().toLowerCase()
  if (u === 'kg')    return quantity
  if (u === 'g')     return quantity * 0.001
  if (u === 'dag')   return quantity * 0.01
  if (u === 'l')     return quantity
  if (u === 'ml')    return quantity * 0.001
  if (u === 'szt.')  return quantity * (_WAGA_SZT[category] ?? 0.15)
  if (u === 'opak.') return quantity * (_WAGA_OPAK[category] ?? 0.30)
  return quantity * 0.15
}

const KOLOR_KAT: Record<string, string> = {
  'nabiał': '#3b5e6e', 'mięso surowe': '#7c3e3e', 'ryby': '#2d5470',
  'warzywa liściaste': '#2d5e3a', 'warzywa twarde': '#4a6e2d',
  'owoce': '#6e4a2d', 'pieczywo': '#6e5c2d', 'jajka': '#6e5c2d',
  'napoje': '#2d4a6e', 'przetwory': '#5c2d6e', 'inne': '#3a3a3a',
}

const PROG_X = 110
const PROG_Y = 80
const PROG_SPLIT = 40

type Kierunek = 'prawo-gora' | 'prawo-dol' | 'lewo' | 'gora' | 'dol' | null

interface Props {
  powiadomieniaDoOceny: Powiadomienie[]
  onClose: () => void
}

function SimpleHint({ label, kolor, opacity }: { label: string; kolor: string; opacity: number }) {
  if (opacity < 0.08) return null
  return (
    <div
      className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-10"
      style={{ opacity: Math.min(opacity * 1.4, 1) }}
    >
      <span
        className="text-2xl font-display font-bold px-5 py-2.5 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${kolor}dd, ${kolor}88)`,
          color: '#131410',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function DualRightOverlay({ dragX, dragY }: { dragX: number; dragY: number }) {
  if (dragX < 25) return null
  const sila = Math.min(dragX / 140, 1)
  const isGora = dragY < PROG_SPLIT
  const mocny = sila > 0.5

  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-10">
      <div
        className="absolute top-0 left-0 right-0 h-1/2 flex items-center justify-center"
        style={{
          background: isGora
            ? `radial-gradient(ellipse at center, rgba(174,230,58,${0.22 * sila}) 0%, transparent 70%)`
            : `radial-gradient(ellipse at center, rgba(174,230,58,${0.07 * sila}) 0%, transparent 70%)`,
        }}
      >
        <span
          className="font-display font-bold px-4 py-2 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #aee63add, #7bc42a88)',
            color: '#131410',
            fontSize: isGora ? '1.5rem' : '1rem',
            opacity: isGora ? sila : sila * 0.35,
            transform: 'rotate(-10deg)',
          }}
        >
          Zjadlem
        </span>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 flex items-center justify-center"
        style={{
          background: !isGora
            ? `radial-gradient(ellipse at center, rgba(34,211,238,${0.22 * sila}) 0%, transparent 70%)`
            : `radial-gradient(ellipse at center, rgba(34,211,238,${0.07 * sila}) 0%, transparent 70%)`,
        }}
      >
        <span
          className="font-display font-bold px-4 py-2 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #22d3eedd, #0e9ab088)',
            color: '#131410',
            fontSize: !isGora ? '1.5rem' : '1rem',
            opacity: !isGora ? sila : sila * 0.35,
            transform: 'rotate(10deg)',
          }}
        >
          Oddaje
        </span>
      </div>

      {sila > 0.3 && (
        <div
          className="absolute left-0 right-0 top-1/2 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${isGora ? 'rgba(174,230,58' : 'rgba(34,211,238'},${sila * 0.6}) 30%, ${isGora ? 'rgba(174,230,58' : 'rgba(34,211,238'},${sila * 0.6}) 70%, transparent)`,
          }}
        />
      )}
    </div>
  )
}

function KartaProdukt({ item }: { item: NotificationItem }) {
  const dni = item.days_left
  const kolorDni =
    dni == null ? '#9a9b8c'
    : dni < 0   ? '#f87171'
    : dni <= 2  ? '#fb923c'
    : dni <= 5  ? '#d97706'
    : '#aee63a'

  return (
    <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden">
      {item.image_url ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 flex items-center justify-center"
          style={{ background: KOLOR_KAT[item.category] ?? '#26271f' }}
        >
          <svg className="w-24 h-24 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      )}
      <div className="px-5 py-4 shrink-0" style={{ background: 'radial-gradient(ellipse at top left, rgba(174,230,58,0.07) 0%, transparent 65%), #1f201a' }}>
        <p className="font-display text-2xl font-semibold text-grafit-100 truncate">{item.name}</p>
        <p className="text-sm text-grafit-400 mt-0.5">{item.quantity} {item.unit} · {item.category}</p>
        <div className="mt-3">
          <span className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ color: kolorDni, background: `${kolorDni}20` }}>
            {dni == null ? 'brak terminu'
              : dni < 0  ? `${Math.abs(dni)} dni po terminie`
              : dni === 0 ? 'wygasa dzisiaj'
              : `${dni} ${dni === 1 ? 'dzień' : 'dni'} do końca`}
          </span>
        </div>
      </div>
    </div>
  )
}

// Transformacje kart w stosie (indeks 0 = wierzchnia)
const STACK = [
  { scale: 1,    y: 0,  opacity: 1 },
  { scale: 0.95, y: 12, opacity: 0.75 },
  { scale: 0.90, y: 24, opacity: 0.45 },
]

export default function PrzegladTinder({ powiadomieniaDoOceny, onClose }: Props) {
  const [indeks, setIndeks] = useState(0)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [odlatuje, setOdlatuje] = useState<Kierunek>(null)
  const [komunikat, setKomunikat] = useState<string | null>(null)
  const [zajety, setZajety] = useState(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const qc = useQueryClient()

  const invaliduj = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['licznik-powiadomien'] })
    qc.invalidateQueries({ queryKey: ['powiadomienia-lista'] })
    qc.invalidateQueries({ queryKey: ['spizarnia'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }, [qc])

  const koniec = indeks >= powiadomieniaDoOceny.length

  function nastepnaKarta() {
    setIndeks(i => i + 1)
    setDrag({ x: 0, y: 0 })
    setOdlatuje(null)
    setKomunikat(null)
  }

  async function wykonajAkcje(kierunek: Kierunek) {
    const karta = powiadomieniaDoOceny[indeks]
    if (!karta?.produkt || zajety || !kierunek) return
    setZajety(true)
    setOdlatuje(kierunek)
    try {
      const { id, quantity, unit, category } = karta.produkt
      const kg = szacujKg(quantity, unit, category)
      if (kierunek === 'prawo-gora')      await spizarnia.akcja(id, 'eaten',  undefined, kg)
      else if (kierunek === 'prawo-dol')  await spizarnia.akcja(id, 'shared', undefined, kg)
      else if (kierunek === 'lewo')       await spizarnia.akcja(id, 'wasted', undefined, kg)
      else if (kierunek === 'gora')       await spizarnia.przedluz(id, 3)
      await powiadomienia.przeczytaj(karta.id)
      invaliduj()
      setTimeout(nastepnaKarta, 320)
    } catch (err: any) {
      setOdlatuje(null)
      setDrag({ x: 0, y: 0 })
      if (err?.response?.status === 400)
        setKomunikat('Ustaw adres w Ustawieniach, zeby oddac produkt na mape wymiany.')
    } finally {
      setZajety(false)
    }
  }

  async function odrzuc() {
    const karta = powiadomieniaDoOceny[indeks]
    if (!karta || zajety) return
    setZajety(true)
    setOdlatuje('dol')
    try {
      await powiadomienia.przeczytaj(karta.id)
      invaliduj()
      setTimeout(nastepnaKarta, 320)
    } finally {
      setZajety(false)
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (zajety) return
    startRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current || zajety) return
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y })
  }
  function onPointerUp() {
    if (!startRef.current || zajety) return
    startRef.current = null
    const { x, y } = drag
    const absX = Math.abs(x)
    const absY = Math.abs(y)
    if (x > PROG_X)                       wykonajAkcje(y < PROG_SPLIT ? 'prawo-gora' : 'prawo-dol')
    else if (x < -PROG_X)                 wykonajAkcje('lewo')
    else if (y < -PROG_Y && absY > absX)  wykonajAkcje('gora')
    else if (y > PROG_Y  && absY > absX)  odrzuc()
    else                                  setDrag({ x: 0, y: 0 })
  }

  const absX = Math.abs(drag.x)
  const absY = Math.abs(drag.y)
  const isPrawo = drag.x > 25
  const isLewo  = drag.x < -25 && absX > absY
  const isGora  = drag.y < -25 && absY > absX
  const isDol   = drag.y >  25 && absY > absX

  const topTransform = odlatuje
    ? odlatuje === 'prawo-gora' ? 'translate(160vw, -20vh) rotate(30deg)'
    : odlatuje === 'prawo-dol'  ? 'translate(160vw,  20vh) rotate(30deg)'
    : odlatuje === 'lewo'       ? 'translate(-160vw, -10vh) rotate(-30deg)'
    : odlatuje === 'gora'       ? 'translate(0, -130vh)'
    : 'translate(0, 130vh)'
    : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.04}deg)`

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at top right, rgba(239,68,68,0.12) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(239,68,68,0.05) 0%, transparent 50%), #131410' }}
    >
      {/* Nagłówek */}
      <div className="w-full max-w-sm flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <div>
          <p className="font-display text-xl font-semibold text-grafit-100">Co z tym zrobic?</p>
          <p className="text-xs text-grafit-400 mt-0.5">
            {koniec ? 'Wszystko ogarnięte' : `${indeks + 1} / ${powiadomieniaDoOceny.length}`}
          </p>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-full text-grafit-400 hover:text-grafit-100 hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Obszar kart — phone-sized, wycentrowany */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
        {koniec ? (
          <div className="flex flex-col items-center justify-center gap-4 w-full max-w-sm px-4">
            <svg className="w-16 h-16 text-limonka-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-display text-2xl font-semibold text-grafit-100">Wszystko ogarnięte</p>
            <p className="text-sm text-grafit-400">Spizarnia na biezaco</p>
            <button onClick={onClose} className="btn mt-4">Zamknij</button>
          </div>
        ) : (
          /* Stos kart o wymiarach telefonu */
          <div
            className="relative"
            style={{ width: 'min(360px, calc(100vw - 2rem))', height: 'min(520px, calc(100vh - 220px))' }}
          >
            {/* Karty pod spodem (renderowane od najdalszej) */}
            {[2, 1].map((offset) => {
              const idx = indeks + offset
              const item = powiadomieniaDoOceny[idx]?.produkt
              const s = STACK[offset]
              if (!item) return null
              return (
                <div
                  key={idx}
                  className="absolute inset-0"
                  style={{
                    transform: `scale(${s.scale}) translateY(${s.y}px)`,
                    opacity: s.opacity,
                    zIndex: 3 - offset,
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                    transformOrigin: 'center bottom',
                  }}
                >
                  <KartaProdukt item={item} />
                </div>
              )
            })}

            {/* Wierzchnia karta */}
            {powiadomieniaDoOceny[indeks]?.produkt && (
              <div
                className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
                style={{
                  transform: topTransform,
                  transition: odlatuje
                    ? 'transform 0.32s ease-out, opacity 0.32s ease-out'
                    : drag.x === 0 && drag.y === 0
                    ? 'transform 0.2s ease-out'
                    : 'none',
                  opacity: odlatuje ? 0 : 1,
                  zIndex: 4,
                  touchAction: 'none',
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <KartaProdukt item={powiadomieniaDoOceny[indeks].produkt!} />
                {isPrawo && <DualRightOverlay dragX={drag.x} dragY={drag.y} />}
                {isLewo  && <SimpleHint label="Wyrzucilem"   kolor="#f87171" opacity={absX / 150} />}
                {isGora  && <SimpleHint label="+3 dni"       kolor="#fbbf24" opacity={absY / 120} />}
                {isDol   && <SimpleHint label="Nie pamietam" kolor="#9a9b8c" opacity={absY / 150} />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Komunikat błędu */}
      {komunikat && (
        <div className="w-full max-w-sm mx-4 mb-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm text-center">
          {komunikat}
        </div>
      )}

      {/* Przyciski */}
      {!koniec && (
        <div className="flex items-center justify-center gap-3 px-4 pb-4 pt-2 shrink-0">
          <Btn onClick={() => wykonajAkcje('lewo')}      disabled={zajety} color="#f87171" label="Wyrzucilem"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} />
          <Btn onClick={odrzuc}                          disabled={zajety} color="#9a9b8c" label="Nie pamietam" small
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <Btn onClick={() => wykonajAkcje('gora')}      disabled={zajety} color="#fbbf24" label="+3 dni" small
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <Btn onClick={() => wykonajAkcje('prawo-gora')} disabled={zajety} color="#aee63a" label="Zjadlem"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>} />
          <Btn onClick={() => wykonajAkcje('prawo-dol')}  disabled={zajety} color="#22d3ee" label="Oddaje"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>} />
        </div>
      )}

      {!koniec && (
        <p className="text-center text-[10px] text-grafit-600 pb-3 shrink-0">
          prawo-gora = zjadlem · prawo-dol = oddalem · lewo = wyrzucil · gora = +3 dni
        </p>
      )}
    </div>
  )
}

function Btn({ onClick, disabled, color, label, icon, small = false }: {
  onClick: () => void; disabled: boolean; color: string
  label: string; icon: React.ReactNode; small?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`${small ? 'w-11 h-11' : 'w-14 h-14'} rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-40`}
      style={{ background: `${color}18`, border: `2px solid ${color}50`, color }}>
      {icon}
    </button>
  )
}
