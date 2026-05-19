import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Shield, FolderOpen, Rainbow, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { api, type Realm } from '@/api/client'

const routeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  '/vanaheim':     BookOpen,
  '/svartalfheim': FolderOpen,
  '/bifrost':      Rainbow,
  '/niflheim':     KeyRound,
  '/asgard':       Shield,
}

export default function Sidebar() {
  const location = useLocation()
  const [realms, setRealms] = useState<Realm[]>([])

  useEffect(() => {
    api.getRealms().then(setRealms).catch(() => {})
  }, [])

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="fixed left-0 top-0 h-full w-52 border-r border-border bg-card flex flex-col z-40"
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">
          Yggdrasil
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">The World Tree</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {realms.map((realm) => {
          const Icon = routeIcons[realm.route]
          if (!Icon) return null
          const active = location.pathname.startsWith(realm.route)
          return (
            <NavLink
              key={realm.route}
              to={realm.route}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                active
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-pill"
                  className="absolute inset-0 rounded-lg bg-secondary border border-border"
                  transition={{ type: 'spring', duration: 0.35 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0" />
              <span className="relative z-10">{realm.description}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground/50 tracking-wider uppercase">
          Local Network
        </p>
      </div>
    </motion.aside>
  )
}
