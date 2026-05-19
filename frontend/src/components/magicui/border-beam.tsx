import { cn } from '@/lib/utils'

interface BorderBeamProps {
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  className?: string
}

export function BorderBeam({
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom = 'hsl(27 43% 42%)',
  colorTo = 'hsl(27 43% 60%)',
  className,
}: BorderBeamProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden', className)}
      style={{ '--duration': duration, '--delay': `-${delay}s` } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `
            radial-gradient(ellipse ${size}px ${size}px at var(--x, 50%) var(--y, 50%),
              ${colorFrom} 0%,
              ${colorTo} 40%,
              transparent 70%)
          `,
          animation: `border-beam-rotate ${duration}s linear infinite`,
          animationDelay: `calc(var(--delay, 0s))`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'destination-out',
        }}
      />
      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-beam-rotate {
          from { --angle: 0deg; }
          to   { --angle: 360deg; }
        }
      `}</style>
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from var(--angle, 0deg), transparent 0%, transparent 75%, ${colorFrom} 85%, ${colorTo} 90%, transparent 100%)`,
          animation: `border-beam-rotate ${duration}s linear infinite`,
          animationDelay: `calc(var(--delay, 0s))`,
          padding: '1px',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'destination-out',
        }}
      />
    </div>
  )
}
