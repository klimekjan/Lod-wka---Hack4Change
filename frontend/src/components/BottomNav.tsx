import { Link, useLocation } from 'react-router-dom'
import { SEKCJE } from '../lib/nav'

const zakładki = SEKCJE.filter((s) => s.bottomBar)

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-slate-200 pb-safe">
      <div className="flex items-stretch">
        {zakładki.map((s) => {
          const aktywna = pathname === s.href
          return (
            <Link
              key={s.href}
              to={s.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-xs font-medium transition-colors active:scale-95 ${
                aktywna ? 'text-zielony-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={aktywna ? 'text-zielony-700' : 'text-slate-400'}>
                {s.icon}
              </span>
              <span className="leading-tight">{s.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
