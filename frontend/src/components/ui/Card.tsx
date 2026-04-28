import { motion, type HTMLMotionProps } from 'framer-motion'
import { clsx } from 'clsx'

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  hover?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, hover = false, glow = false, padding = 'md', className, ...props }: CardProps) {
  return (
    <motion.div
      className={clsx(
        'bg-bg-card border border-border rounded-2xl',
        hover && 'transition-all duration-200 hover:border-primary-700/30 hover:shadow-card-hover cursor-pointer',
        glow && 'shadow-glow-sm',
        {
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-4': padding === 'md',
          'p-6': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
