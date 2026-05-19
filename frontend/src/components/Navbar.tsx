import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const links = [
  { to: '/midgard',  label: 'Home' },
  { to: '/vanaheim', label: 'Library' },
  { to: '/asgard',   label: 'Admin' },
]

export default function Navbar() {
  const location = useLocation()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex justify-center pt-4 px-4">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="flex items-center gap-1 rounded-full border border-border bg-card/80 px-2 py-1.5 shadow-lg backdrop-blur-md"
      >
        {/* Logo */}
        <NavLink
          to="/midgard"
          className="mr-2 flex items-center gap-2 px-3 py-1"
        >
          <span className="text-sm font-semibold tracking-widest text-gold uppercase">
            Yggdrasil
          </span>
        </NavLink>

        <div className="w-px h-4 bg-border mx-1" />

        {links.map((link) => {
          const active = location.pathname.startsWith(link.to)
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={cn(
                'relative px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-150',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-secondary"
                  transition={{ type: 'spring', duration: 0.35 }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </NavLink>
          )
        })}
      </motion.nav>
    </header>
  )
}
