import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const initialized = useRef(false)

  useEffect(() => {
    // Guard przeciw double-mount w React StrictMode
    if (initialized.current) return
    initialized.current = true

    const scanner = new Html5QrcodeScanner(
      'barcode-reader',
      {
        fps: 10,
        qrbox: { width: 260, height: 140 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        rememberLastUsedCamera: true,
      },
      false,
    )

    scanner.render(
      (decoded) => {
        scanner.clear().finally(() => onScan(decoded))
      },
      () => { /* błędy skanowania są normalne, ignorujemy */ },
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [onScan])

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Skanuj kod kreskowy</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div id="barcode-reader" className="[&_video]:w-full [&_video]:rounded-none [&_img]:hidden" />
        <p className="text-xs text-slate-400 text-center px-4 py-3">
          EAN-13, EAN-8, Code-128 — skieruj kamerę na kod
        </p>
      </div>
    </div>
  )
}
