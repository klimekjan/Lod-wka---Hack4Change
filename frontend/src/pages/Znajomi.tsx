import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { znajomi as znajomiApi, ProfilPubliczny, Zaproszenie } from '../lib/api'

function etykietaStatusu(status: ProfilPubliczny['status_znajomosci']) {
  if (status === 'znajomy') return 'Znajomy'
  if (status === 'wyslane') return 'Wysłano'
  if (status === 'oczekuje') return 'Oczekuje'
  return null
}

function KartaProfilu({
  profil,
  onZapros,
  onAkceptuj,
  onOdrzuc,
  onUsun,
  zaproszenieId,
}: {
  profil: ProfilPubliczny
  onZapros?: () => void
  onAkceptuj?: () => void
  onOdrzuc?: () => void
  onUsun?: () => void
  zaproszenieId?: number
}) {
  const pelneImie = [profil.imie, profil.nazwisko].filter(Boolean).join(' ')
  const displayName = pelneImie || profil.nick || `Użytkownik #${profil.id}`
  const etykieta = etykietaStatusu(profil.status_znajomosci)

  return (
    <div className="karta flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-900">{displayName}</span>
          {pelneImie && profil.nick && (
            <span className="text-sm text-slate-500">@{profil.nick}</span>
          )}
        </div>
        {etykieta && profil.status_znajomosci !== 'oczekuje' && (
          <span className="text-xs text-slate-400">{etykieta}</span>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {profil.status_znajomosci === 'brak' && onZapros && (
          <button className="btn-primary text-sm py-1 px-3" onClick={onZapros}>
            Dodaj
          </button>
        )}
        {profil.status_znajomosci === 'wyslane' && (
          <span className="text-xs text-slate-400 py-1">Wysłano</span>
        )}
        {profil.status_znajomosci === 'oczekuje' && onAkceptuj && onOdrzuc && (
          <>
            <button className="btn-primary text-sm py-1 px-3" onClick={onAkceptuj}>
              Akceptuj
            </button>
            <button className="btn-secondary text-sm py-1 px-2" onClick={onOdrzuc}>
              Odrzuć
            </button>
          </>
        )}
        {profil.status_znajomosci === 'znajomy' && onUsun && (
          <button className="btn-secondary text-sm py-1 px-2 text-slate-400" onClick={onUsun}>
            Usuń
          </button>
        )}
      </div>
    </div>
  )
}

export default function Znajomi() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')

  const { data: listaZnajomych = [] } = useQuery({
    queryKey: ['znajomi'],
    queryFn: () => znajomiApi.lista().then(r => r.data),
  })

  const { data: zaproszenia = [] } = useQuery({
    queryKey: ['zaproszenia'],
    queryFn: () => znajomiApi.zaproszenia().then(r => r.data),
  })

  const { data: wynikSzukania = [], isFetching: szukanie } = useQuery({
    queryKey: ['znajomi-szukaj', query],
    queryFn: () => query.length >= 2 ? znajomiApi.szukaj(query).then(r => r.data) : Promise.resolve([]),
    enabled: query.length >= 2,
  })

  const invaliduj = () => {
    queryClient.invalidateQueries({ queryKey: ['znajomi'] })
    queryClient.invalidateQueries({ queryKey: ['zaproszenia'] })
    queryClient.invalidateQueries({ queryKey: ['znajomi-szukaj'] })
    queryClient.invalidateQueries({ queryKey: ['licznik-zaproszen'] })
  }

  const mutZapros = useMutation({
    mutationFn: (userId: number) => znajomiApi.zapros(userId),
    onSuccess: invaliduj,
  })

  const mutAkceptuj = useMutation({
    mutationFn: (id: number) => znajomiApi.akceptuj(id),
    onSuccess: invaliduj,
  })

  const mutOdrzuc = useMutation({
    mutationFn: (id: number) => znajomiApi.odrzuc(id),
    onSuccess: invaliduj,
  })

  const mutUsun = useMutation({
    mutationFn: (userId: number) => znajomiApi.usun(userId),
    onSuccess: invaliduj,
  })

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Znajomi</h1>

      {/* Wyszukiwarka */}
      <div className="karta space-y-3">
        <h2 className="font-semibold text-slate-800">Znajdź użytkownika</h2>
        <input
          className="input"
          placeholder="Imię, nazwisko lub nick (min. 2 znaki)..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query.length >= 2 && (
          <div className="space-y-2">
            {szukanie && <p className="text-sm text-slate-400">Szukam...</p>}
            {!szukanie && wynikSzukania.length === 0 && (
              <p className="text-sm text-slate-400">Brak wyników dla „{query}"</p>
            )}
            {wynikSzukania.map(profil => (
              <KartaProfilu
                key={profil.id}
                profil={profil}
                onZapros={() => mutZapros.mutate(profil.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Zaproszenia */}
      {zaproszenia.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-bursztyn-600 uppercase tracking-widest">
            Zaproszenia ({zaproszenia.length})
          </h2>
          {zaproszenia.map((z: Zaproszenie) =>
            z.profil ? (
              <KartaProfilu
                key={z.id}
                profil={{ ...z.profil, status_znajomosci: 'oczekuje' }}
                zaproszenieId={z.id}
                onAkceptuj={() => mutAkceptuj.mutate(z.id)}
                onOdrzuc={() => mutOdrzuc.mutate(z.id)}
              />
            ) : null,
          )}
        </div>
      )}

      {/* Lista znajomych */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Znajomi ({listaZnajomych.length})
        </h2>
        {listaZnajomych.length === 0 && (
          <div className="karta text-center py-10">
            <p className="font-medium text-slate-700">Nie masz jeszcze znajomych</p>
            <p className="text-sm text-slate-400 mt-1">
              Wyszukaj użytkownika powyżej i wyślij zaproszenie
            </p>
          </div>
        )}
        {listaZnajomych.map(profil => (
          <KartaProfilu
            key={profil.id}
            profil={profil}
            onUsun={() => mutUsun.mutate(profil.id)}
          />
        ))}
      </div>
    </div>
  )
}
