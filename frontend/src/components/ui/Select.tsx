import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        <select
          className={clsx(
            'w-full appearance-none bg-bg-secondary border border-border rounded-xl',
            'text-text-primary px-4 py-2.5 pr-10 min-h-[44px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-700/50 focus:border-primary-700/50',
            'transition-all duration-200',
            error && 'border-accent-red/50',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-bg-secondary">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>
      {error && <p className="text-xs text-accent-red">{error}</p>}
    </div>
  )
}
