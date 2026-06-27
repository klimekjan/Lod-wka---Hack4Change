import { useEffect, useRef, useState, FormEvent } from 'react'
import 'barcode-detector/side-effects' // polyfill dla Firefox (WASM ZXing)

interface Props {
  onScan: (barcode: string) => void
  onSearch: (query: string) => void
  onClose: () => void
}

function PanelLadowania() {
  return (
    <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-slate-50">
      <span className="text-slate-500 text-sm animate-pulse">Ładowanie...</span>
    </div>
  )
}

type Wykrycie = 'brak' | 'wykryto' | 'dekoduje'

export default function BarcodeScanner({ onScan, onSearch, onClose }: Props) {
  const [stan, setStan] = useState<'czeka' | 'dziala' | 'blad'>('czeka')
  const [bladTekst, setBladTekst] = useState('')
  const [wykrycie, setWykrycie] = useState<Wykrycie>('brak')
  const [ladowanie, setLadowanie] = useState(false)
  const [reczneOtwarte, setReczneOtwarte] = useState(false)
  const [reczneQuery, setReczneQuery] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannedRef = useRef(false)
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  function submitReczne(e: FormEvent) {
    e.preventDefault()
    const q = reczneQuery.trim()
    if (!q) return
    setLadowanie(true)
    onSearch(q)
  }

  useEffect(() => {
    let stream: MediaStream | null = null
    let interval = 0
    let active = true

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'],
    })

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        video.play()
        setStan('dziala')

        interval = window.setInterval(async () => {
          if (!active || scannedRef.current || !videoRef.current) return
          const vid = videoRef.current
          if (vid.readyState < 2) return

          try {
            const wyniki = await detector.detect(vid)
            if (!active) return
            if (wyniki.length === 0) {
              setWykrycie('brak')
              return
            }
            setWykrycie('wykryto')
            // Poczekaj chwilę na ostrzejszą klatkę, potem weź pierwszy wynik
            setTimeout(() => {
              if (!active || scannedRef.current) return
              const kod = wyniki[0].rawValue
              if (kod) {
                scannedRef.current = true
                setWykrycie('dekoduje')
                setLadowanie(true)
                onScanRef.current(kod)
              }
            }, 150)
          } catch {
            // klatka niezdatna — ignoruj
          }
        }, 250)
      })
      .catch((err: unknown) => {
        if (!active) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[BarcodeScanner]', msg)
        setStan('blad')
        setBladTekst(
          /NotAllowed|Permission|permission denied/i.test(msg)
            ? 'Brak dostępu do kamery. Sprawdź uprawnienia w przeglądarce.'
            : `Błąd kamery: ${msg}`,
        )
      })

    return () => {
      active = false
      clearInterval(interval)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const ramkaKolor =
    wykrycie === 'dekoduje' ? 'border-green-400' :
    wykrycie === 'wykryto'  ? 'border-amber-400' :
    'border-white/60'

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="font-semibold text-slate-800">Skanuj kod</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {ladowanie ? (
          <PanelLadowania />
        ) : (
          <div>
            <div className="relative bg-slate-900 aspect-video overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`border-2 rounded transition-colors duration-200 w-64 h-28 ${ramkaKolor}`} />
              </div>
              {stan === 'czeka' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
                  <p className="text-white/70 text-sm">Uruchamianie kamery...</p>
                </div>
              )}
            </div>

            <div className={`px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors duration-200 ${
              wykrycie === 'dekoduje' ? 'bg-green-50 text-green-700' :
              wykrycie === 'wykryto'  ? 'bg-amber-50 text-amber-700' :
              stan === 'blad'         ? 'bg-red-50 text-red-600' :
                                        'bg-slate-50 text-slate-500'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                wykrycie === 'dekoduje' ? 'bg-green-500 animate-pulse' :
                wykrycie === 'wykryto'  ? 'bg-amber-400 animate-pulse' :
                stan === 'blad'         ? 'bg-red-400' :
                                          'bg-slate-300'
              }`} />
              <span>
                {stan === 'blad'         ? bladTekst :
                 wykrycie === 'dekoduje' ? 'Dekodowanie...' :
                 wykrycie === 'wykryto'  ? 'Kod wykryty — trzymaj nieruchomo' :
                 stan === 'czeka'        ? 'Uruchamianie kamery...' :
                                           'Skieruj kamerę na kod kreskowy'}
              </span>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 pt-2 border-t border-slate-100">
          {!reczneOtwarte ? (
            <button
              className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
              onClick={() => setReczneOtwarte(true)}
            >
              Wpisz ręcznie
            </button>
          ) : (
            <form onSubmit={submitReczne} className="flex gap-2 items-center">
              <input
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Kod EAN lub nazwa produktu..."
                value={reczneQuery}
                onChange={e => setReczneQuery(e.target.value)}
                autoFocus
                disabled={ladowanie}
              />
              <button
                type="submit"
                disabled={!reczneQuery.trim() || ladowanie}
                className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-700 transition-colors shrink-0"
              >
                {ladowanie ? '...' : 'Szukaj'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
