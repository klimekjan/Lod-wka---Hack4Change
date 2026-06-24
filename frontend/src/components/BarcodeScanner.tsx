import { useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stan, setStan] = useState<'czeka' | 'dziala' | 'blad'>('czeka')
  const [bladTekst, setBladTekst] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let interval = 0
    let skonczono = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } } })
      .then((s) => {
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        video.onloadedmetadata = () => {
          video.play()
          setStan('dziala')
        }

        if (!('BarcodeDetector' in window)) return

        const detector = new (window as unknown as { BarcodeDetector: new (o: object) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39'],
        })

        interval = window.setInterval(async () => {
          if (skonczono || !videoRef.current) return
          try {
            const wyniki = await detector.detect(videoRef.current)
            if (wyniki.length > 0) {
              skonczono = true
              clearInterval(interval)
              onScan(wyniki[0].rawValue)
            }
          } catch {
            // klatka niezdatna do skanowania — ignoruj
          }
        }, 300)
      })
      .catch(() => {
        setStan('blad')
        setBladTekst('Brak dostępu do kamery. Sprawdź uprawnienia w przeglądarce.')
      })

    return () => {
      skonczono = true
      clearInterval(interval)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScan])

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="font-semibold text-slate-800">Skanuj kod kreskowy</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-white/60 rounded-lg w-52 h-20" />
            </div>
            {stan === 'czeka' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/60 text-sm">Uruchamianie kamery...</p>
              </div>
            )}
          </div>

          {stan === 'blad' ? (
            <p className="text-xs text-red-500 text-center">{bladTekst}</p>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              {stan === 'dziala'
                ? 'EAN-13, EAN-8, Code-128 — skieruj kamerę na kod'
                : 'Uruchamianie...'}
            </p>
          )}

          {stan === 'dziala' && !('BarcodeDetector' in window) && (
            <p className="text-xs text-bursztyn-600 text-center">
              Automatyczne skanowanie niedostępne w tej przeglądarce.
              Użyj Chrome lub wpisz kod ręcznie.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
