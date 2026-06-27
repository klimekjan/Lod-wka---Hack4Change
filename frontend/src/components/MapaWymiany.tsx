import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Ogloszenie, Wydarzenie } from '../lib/api'

function tworzPinezke(kolor: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${kolor};transform:rotate(-45deg);
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><div style="width:8px;height:8px;background:#fff;border-radius:50%;transform:rotate(45deg)"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
}

const pinZielony = tworzPinezke('#16a34a')
const pinBursztyn = tworzPinezke('#d97706')
const pinFiolet = tworzPinezke('#9333ea')

const SRODEK_POLSKI: [number, number] = [52.0, 19.0]

function etykietaWlasciciela(
  imie?: string,
  nazwisko?: string,
  nick?: string,
): string | null {
  const inicjalImie = imie ? imie[0] + '.' : null
  const czesc = [inicjalImie, nazwisko].filter(Boolean).join(' ')
  if (czesc && nick) return `${czesc} (${nick})`
  if (czesc) return czesc
  if (nick) return `@${nick}`
  return null
}

function formatDataGodzina(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  ogloszenia: Ogloszenie[]
  userId?: number
  onZarezerwuj: (id: number) => void
  wydarzenia?: Wydarzenie[]
  onZapiszSie?: (id: number) => void
  onDodajProdukty?: (id: number) => void
}

export default function MapaWymiany({
  ogloszenia,
  userId,
  onZarezerwuj,
  wydarzenia = [],
  onZapiszSie,
  onDodajProdukty,
}: Props) {
  const zPinezka = useMemo(
    () => ogloszenia.filter(o => o.lat != null && o.lon != null),
    [ogloszenia],
  )
  const wydarzeniaZPinezka = useMemo(
    () => wydarzenia.filter(w => w.lat != null && w.lon != null),
    [wydarzenia],
  )

  const wszystkiePunkty = [
    ...zPinezka.map(o => [o.lat!, o.lon!] as [number, number]),
    ...wydarzeniaZPinezka.map(w => [w.lat!, w.lon!] as [number, number]),
  ]

  const srodek: [number, number] = wszystkiePunkty.length > 0
    ? wszystkiePunkty[0]
    : SRODEK_POLSKI
  const zoom = wszystkiePunkty.length > 0 ? 12 : 6

  return (
    <div className="rounded-xl overflow-hidden border border-grafit-600">
      <MapContainer
        center={srodek}
        zoom={zoom}
        style={{ height: 380, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zPinezka.map(o => {
          const czyZnajomy = !!o.wlasciciel_znajomy
          const icon = czyZnajomy ? pinBursztyn : pinZielony
          const etykieta = etykietaWlasciciela(
            o.wlasciciel_imie,
            o.wlasciciel_nazwisko,
            o.wlasciciel_nick,
          )
          return (
            <Marker key={`og-${o.id}`} position={[o.lat!, o.lon!]} icon={icon}>
              <Popup>
                <div className="space-y-1 min-w-[140px]">
                  <p className="font-semibold">{o.item_name}</p>
                  <p className="text-sm">
                    {o.quantity} {o.unit}
                  </p>
                  <p className="text-xs text-gray-500">{etykieta ?? 'Anonim'}</p>
                  {o.address && <p className="text-xs text-gray-400">{o.address}</p>}
                  {czyZnajomy && (
                    <p className="text-xs font-medium" style={{ color: '#d97706' }}>Znajomy</p>
                  )}
                  {o.status === 'available' && o.user_id !== userId && (
                    <button
                      className="btn-primary text-sm py-1 px-3 mt-1 w-full"
                      onClick={() => onZarezerwuj(o.id)}
                    >
                      Zarezerwuj
                    </button>
                  )}
                  {o.user_id === userId && (
                    <p className="text-xs font-medium" style={{ color: '#16a34a' }}>Twoje ogłoszenie</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
        {wydarzeniaZPinezka.map(w => (
          <Marker key={`ev-${w.id}`} position={[w.lat!, w.lon!]} icon={pinFiolet}>
            <Popup>
              <div className="space-y-1 min-w-[160px]">
                <p className="font-semibold" style={{ color: '#9333ea' }}>📅 {w.name}</p>
                <p className="text-xs text-gray-500">{formatDataGodzina(w.event_at)}</p>
                {w.address && <p className="text-xs text-gray-400">{w.address}</p>}
                <p className="text-xs text-gray-500">Uczestników: {w.liczba_uczestnikow}</p>
                {w.czy_moje && (
                  <p className="text-xs font-medium" style={{ color: '#9333ea' }}>Twoje wydarzenie</p>
                )}
                {!w.czy_moje && !w.czy_uczestnicze && onZapiszSie && (
                  <button
                    className="btn-primary text-sm py-1 px-3 mt-1 w-full"
                    style={{ backgroundColor: '#9333ea' }}
                    onClick={() => onZapiszSie(w.id)}
                  >
                    Zapisz się
                  </button>
                )}
                {w.czy_uczestnicze && !w.czy_moje && onDodajProdukty && (
                  <button
                    className="btn-primary text-sm py-1 px-3 mt-1 w-full"
                    style={{ backgroundColor: '#9333ea' }}
                    onClick={() => onDodajProdukty(w.id)}
                  >
                    Dodaj produkty
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
