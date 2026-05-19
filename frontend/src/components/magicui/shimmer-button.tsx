import { cn } from '@/lib/utils'
import React from 'react'

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  children?: React.ReactNode
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = 'hsl(27 43% 55%)',
      shimmerSize = '0.08em',
      shimmerDuration = '2.5s',
      borderRadius = '8px',
      background = 'hsl(27 43% 29%)',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            '--shimmer-color': shimmerColor,
            '--shimmer-size': shimmerSize,
            '--shimmer-duration': shimmerDuration,
            '--border-radius': borderRadius,
            '--bg': background,
          } as React.CSSProperties
        }
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-5 py-2.5 text-sm font-semibold text-black [border-radius:var(--border-radius)]',
          'transition-all duration-150 active:scale-[0.98]',
          '[background:var(--bg)]',
          className
        )}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            'absolute inset-0 overflow-hidden [border-radius:var(--border-radius)]',
            'before:absolute before:inset-0',
            'before:[background:linear-gradient(90deg,transparent_0%,var(--shimmer-color)_50%,transparent_100%)]',
            'before:[background-size:200%_100%]',
            'before:animate-[shimmer_var(--shimmer-duration)_linear_infinite]',
            'before:opacity-60'
          )}
        />
        <span className="relative z-10">{children}</span>
        <style>{`
          @keyframes shimmer {
            0%   { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `}</style>
      </button>
    )
  }
)
ShimmerButton.displayName = 'ShimmerButton'
