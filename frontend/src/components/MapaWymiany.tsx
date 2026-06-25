import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Ogloszenie } from '../lib/api'

// Fix domyslnych ikon markerow Leaflet (znany problem z bundlerami — sciezki do PNG gina).
// Uzywamy wlasnej zielonej pinezki jako divIcon, spojnej z paleta aplikacji.
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#16a34a;transform:rotate(-45deg);
    border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
  "><div style="width:8px;height:8px;background:#fff;border-radius:50%;transform:rotate(45deg)"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

// Srodek Polski jako fallback gdy zadne ogloszenie nie ma wspolrzednych.
const SRODEK_POLSKI: [number, number] = [52.0, 19.0]

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
        {zPinezka.map(o => (
          <Marker key={o.id} position={[o.lat!, o.lon!]} icon={pinIcon}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{o.item_name}</p>
                <p className="text-sm text-slate-600">
                  {o.quantity} {o.unit}
                </p>
                {o.address && <p className="text-xs text-slate-500">{o.address}</p>}
                {o.status === 'available' && o.user_id !== userId && (
                  <button
                    className="btn-primary text-sm py-1 px-3 mt-1"
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
        ))}
      </MapContainer>
    </div>
  )
}
