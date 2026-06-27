import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { useTheme } from '../lib/theme'
import {
  IconSpizarnia, IconAI, IconTracker, IconZnajomi,
} from '../components/ikony'

function IconBell({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}


export default function StronaGlowna() {
  const { light } = useTheme()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-nocny-800 text-slate-200">

      {/* Nav */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-nocny-900/95 backdrop-blur-md border-b border-nocny-700 shadow-xl'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="EatMeApp" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/logowanie" className="btn-secondary text-sm py-1.5 px-4">
              Zaloguj się
            </Link>
            <Link to="/rejestracja" className="btn-primary text-sm py-1.5 px-4">
              Zarejestruj się
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — sticky, przykrywany przez kolejne sekcje */}
      <section className="sticky top-0 h-screen flex items-center justify-center overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&q=80&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 bg-nocny-800/78" />
        <div className="absolute inset-0 bg-gradient-to-b from-nocny-900/60 via-transparent to-nocny-800" />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto pt-16">
          <div className="animate-float mb-8 inline-block drop-shadow-2xl">
            <img src="/logo.png" alt="EatMeApp" className="h-36 w-auto" />
          </div>
          <h1
            className="text-5xl sm:text-7xl font-black text-white leading-tight mb-5 animate-fadeInUp"
            style={{ animationDelay: '0.1s' }}
          >
            Nie marnuj jedzenia.
          </h1>
          <p
            className="text-xl sm:text-2xl text-slate-300 mb-10 leading-relaxed animate-fadeInUp"
            style={{ animationDelay: '0.25s' }}
          >
            Dołącz do ruchu który walczy z marnotrawstwem i dba o klimat.
            Śledź spiżarnię, gotuj mądrze, dziel się z sąsiadami.
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp"
            style={{ animationDelay: '0.4s' }}
          >
            <Link
              to="/rejestracja"
              className="btn-primary text-base py-3.5 px-10 shadow-2xl shadow-zielony-500/30 text-center"
            >
              Zacznij za darmo
            </Link>
            <Link
              to="/logowanie"
              className="btn-secondary text-base py-3.5 px-10 text-center"
            >
              Mam już konto
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Stats — przykrywa hero od dołu */}
      <section className="relative bg-nocny-900 py-20 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400 mb-3">Liczby nie kłamią</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
              Skala globalnego<br />
              <span className="text-red-400">problemu</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-nocny-700">
            <div className="text-center px-8 py-6">
              <div className="font-display text-7xl font-black text-red-400 mb-2 leading-none">1/3</div>
              <div className="text-white font-semibold text-lg mb-2">całej żywności marnowane</div>
              <div className="text-slate-500 text-sm leading-relaxed">
                Tyle produkowanej żywności nigdy nie trafia na talerz. (FAO, 2023)
              </div>
            </div>
            <div className="text-center px-8 py-6">
              <div className="font-display text-7xl font-black text-red-400 mb-2 leading-none">8%</div>
              <div className="text-white font-semibold text-lg mb-2">globalnych emisji CO₂</div>
              <div className="text-slate-500 text-sm leading-relaxed">
                Marnotrawstwo żywności odpowiada za 8–10% wszystkich emisji gazów cieplarnianych.
              </div>
            </div>
            <div className="text-center px-8 py-6">
              <div className="font-display text-7xl font-black text-red-400 mb-2 leading-none">9<span className="text-4xl"> mln t</span></div>
              <div className="text-white font-semibold text-lg mb-2">marnuje Polska rocznie</div>
              <div className="text-slate-500 text-sm leading-relaxed">
                Polska jest 4. największym producentem odpadów żywnościowych w Europie.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem 1 */}
      <section className="relative bg-nocny-800 py-20 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-0.5 bg-red-500" />
              <p className="text-red-400 text-xs font-bold uppercase tracking-[0.2em]">Problem globalny</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
              Marnotrawstwo żywności<br />to globalny kryzys
            </h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              Każdego roku marnujemy 1,3 miliarda ton jedzenia. W tym samym czasie ponad
              783 miliony ludzi cierpi z powodu głodu. To nie jest tylko problem ekonomiczny
              -to moralne wyzwanie naszych czasów.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Przeciętne polskie gospodarstwo domowe wyrzuca rocznie około 247 kg jedzenia
              o wartości nawet 1000 zł. Mała zmiana nawyków może przynieść realną różnicę
              zarówno dla portfela, jak i dla planety.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&q=80&auto=format&fit=crop"
              alt="Marnotrawstwo jedzenia"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-nocny-800/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* Problem 2 */}
      <section className="relative bg-nocny-900 py-20 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl order-2 md:order-1">
            <img
              src="https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&q=80&auto=format&fit=crop"
              alt="Zmiany klimatu"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-nocny-900/60 to-transparent" />
          </div>
          <div className="order-1 md:order-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-0.5 bg-red-500" />
              <p className="text-red-400 text-xs font-bold uppercase tracking-[0.2em]">Klimat</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
              Bezpośredni wpływ<br />na zmiany klimatu
            </h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              Kiedy jedzenie trafia na wysypisko, rozkłada się i wydziela metan -gaz o 80 razy
              silniejszym efekcie cieplarnianym niż CO₂. Gdyby marnotrawstwo żywności było
              krajem, byłoby trzecim największym emitentem gazów cieplarnianych na świecie.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Każdy kilogram uratowanego jedzenia to realny wkład w walkę ze zmianami klimatu.
              EatMeApp mierzy ten wpływ i pokazuje go w liczbach które mają znaczenie.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-nocny-800 py-20 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-0.5 bg-zielony-500" />
              <p className="text-zielony-400 text-xs font-bold uppercase tracking-[0.2em]">Funkcje</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white">
              Wszystko czego potrzebujesz
            </h2>
          </div>

          {/* bento grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* wide image tile -spiżarnia photo */}
            <div className="col-span-2 sm:col-span-2 row-span-1 relative rounded-2xl overflow-hidden min-h-[180px]">
              <img
                src="https://plus.unsplash.com/premium_photo-1663126472261-6e58ab83bfea?w=1200&q=80&auto=format&fit=crop"
                alt="Wolontariusze"
                className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-nocny-900/90 via-nocny-900/30 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <p className="text-white font-semibold text-lg">Mapa wymiany</p>
                <p className="text-slate-300 text-sm mt-0.5">
                  Oddaj sąsiadom lub odbierz od nich - lokalna sieć dzielenia się produktami.
                </p>
              </div>
            </div>

            {/* single AI tile */}
            <div
              className="rounded-2xl p-5 flex flex-col justify-between"
              style={light
                ? { background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }
                : { background: 'radial-gradient(ellipse at top left, rgba(40,80,20,0.55) 0%, transparent 60%), #060e06', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }
              }
            >
              <div className="text-zielony-400">
                <IconAI className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-semibold mt-3">Przepisy AI</p>
                <p className="text-slate-400 text-sm mt-1">Claude generuje dania z produktów na wylocie.</p>
              </div>
            </div>

            {/* 4 smaller tiles */}
            {[
              { Icon: IconSpizarnia, tytul: 'Spiżarnia', opis: 'Skanuj kody, śledź terminy.' },
              { Icon: IconTracker,   tytul: 'Tracker',   opis: 'Ile CO₂ i zł oszczędzasz.' },
              { Icon: IconZnajomi,   tytul: 'Znajomi',   opis: 'Buduj lokalną społeczność.' },
              { Icon: IconBell,      tytul: 'Alerty',    opis: 'Push 3 dni przed terminem.' },
            ].map(({ Icon, tytul, opis }) => (
              <div
                key={tytul}
                className="rounded-2xl p-4 flex flex-col gap-2"
                style={{
                  background: 'radial-gradient(ellipse at top left, rgba(40,80,20,0.45) 0%, transparent 60%), #060e06',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                }}
              >
                <div className="text-zielony-500">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-white text-sm font-semibold">{tytul}</p>
                <p className="text-slate-500 text-xs leading-snug">{opis}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative bg-nocny-900 py-24 px-6 overflow-hidden" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-end pr-12 opacity-[0.04]">
          <Logo size={420} withText={false} />
        </div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-10">
          <div className="flex-1">
            <p className="text-zielony-500 text-xs font-semibold uppercase tracking-widest mb-4">
              Zacznij teraz
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Mniej w koszu.<br />Więcej na talerzu.
            </h2>
            <p className="text-slate-400 mt-4 leading-relaxed max-w-md">
              Dołącz do użytkowników którzy już ograniczają marnotrawstwo i realnie wpływają na klimat.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
            <Link
              to="/rejestracja"
              className="btn-primary text-base py-3.5 px-10 shadow-xl shadow-zielony-500/20 text-center"
            >
              Zarejestruj się za darmo
            </Link>
            <Link
              to="/logowanie"
              className="btn-secondary text-base py-3 px-10 text-center"
            >
              Mam już konto
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-nocny-800 py-8 text-center border-t border-nocny-700" style={{ zIndex: 1 }}>
        <p className="text-nocny-400 text-sm">EatMeApp -Hack4Change Gdańsk 2026</p>
      </footer>

    </div>
  )
}
