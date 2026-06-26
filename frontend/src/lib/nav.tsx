import { type ReactNode } from 'react'
import {
  LayoutDashboard,
  ShoppingBasket,
  ChefHat,
  BarChart2,
  Users,
  Settings,
} from 'lucide-react'

export interface Sekcja {
  href: string
  label: string
  opis: string
  icon: ReactNode
  bottomBar: boolean
  pulpitWidget: boolean
}

export const SEKCJE: Sekcja[] = [
  {
    href: '/pulpit',
    label: 'Pulpit',
    opis: 'Strona główna aplikacji.',
    icon: <LayoutDashboard size={22} />,
    bottomBar: false,
    pulpitWidget: false,
  },
  {
    href: '/spizarnia',
    label: 'Spiżarnia',
    opis: 'Zarządzaj produktami i datami ważności.',
    icon: <ShoppingBasket size={22} />,
    bottomBar: true,
    pulpitWidget: true,
  },
  {
    href: '/przepisy',
    label: 'Przepisy',
    opis: 'Propozycje dań na podstawie tego co masz.',
    icon: <ChefHat size={22} />,
    bottomBar: true,
    pulpitWidget: true,
  },
  {
    href: '/tracker',
    label: 'Tracker',
    opis: 'Śledź ile jedzenia oszczędzasz i nie marnujesz.',
    icon: <BarChart2 size={22} />,
    bottomBar: true,
    pulpitWidget: true,
  },
  {
    href: '/spolecznosc',
    label: 'Wymiana',
    opis: 'Oddaj lub weź produkty od innych użytkowników.',
    icon: <Users size={22} />,
    bottomBar: true,
    pulpitWidget: true,
  },
  {
    href: '/ustawienia',
    label: 'Ustawienia',
    opis: 'Powiadomienia, konto i preferencje.',
    icon: <Settings size={22} />,
    bottomBar: true,
    pulpitWidget: true,
  },
]
