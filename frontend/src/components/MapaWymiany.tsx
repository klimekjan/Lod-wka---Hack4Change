import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Ogloszenie } from '../lib/api'

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

interface Props {
  ogloszenia: Ogloszenie[]
  userId?: number
  onZarezerwuj: (id: number) => void
}

export default function MapaWymiany({ ogloszenia, userId, onZarezerwuj }: Props) {
  const zPinezka = useMemo(
    () => ogloszenia.filter(o => o.lat != null && o.lon != null),
    [ogloszenia],
  )

  const srodek: [number, number] = zPinezka.length > 0
    ? [zPinezka[0].lat!, zPinezka[0].lon!]
    : SRODEK_POLSKI
  const zoom = zPinezka.length > 0 ? 12 : 6

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200">
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
            <Marker key={o.id} position={[o.lat!, o.lon!]} icon={icon}>
              <Popup>
                <div className="space-y-1 min-w-[140px]">
                  <p className="font-semibold text-slate-900">{o.item_name}</p>
                  <p className="text-sm text-slate-600">
                    {o.quantity} {o.unit}
                  </p>
                  {etykieta && (
                    <p className="text-xs text-slate-500">{etykieta}</p>
                  )}
                  {o.address && <p className="text-xs text-slate-400">{o.address}</p>}
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
                    <p className="text-xs text-zielony-700 font-medium">Twoje ogłoszenie</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
