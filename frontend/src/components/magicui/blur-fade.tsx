import { motion, useInView, type Variants } from 'framer-motion'
import { useRef } from 'react'

interface BlurFadeProps {
  children: React.ReactNode
  className?: string
  variant?: Variants
  duration?: number
  delay?: number
  yOffset?: number
  blur?: string
  inView?: boolean
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  blur = '6px',
  inView = false,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const defaultVariant = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: 'blur(0px)' },
  }

  const combinedVariant = variant ?? defaultVariant

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={!inView || isInView ? 'visible' : 'hidden'}
      variants={combinedVariant}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
