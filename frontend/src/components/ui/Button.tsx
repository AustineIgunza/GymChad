import { motion, type HTMLMotionProps } from 'framer-motion'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 select-none cursor-pointer'

  const variants = {
    primary: 'bg-primary-700 hover:bg-primary-600 text-white shadow-glow-sm active:scale-95',
    secondary: 'bg-bg-tertiary hover:bg-bg-hover text-text-primary border border-border active:scale-95',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-hover active:scale-95',
    danger: 'bg-accent-red/10 hover:bg-accent-red/20 text-accent-red border border-accent-red/20 active:scale-95',
    outline: 'border border-primary-700/50 text-primary-400 hover:bg-primary-700/10 active:scale-95',
  }

  const sizes = {
    sm: 'text-sm px-3 py-2 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 min-h-[44px]',
    lg: 'text-base px-6 py-3.5 min-h-[52px]',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', disabled || loading ? 'opacity-50 cursor-not-allowed' : '', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  )
}
