interface Props {
  type: 'superset' | 'dropset'
  group?: number
}

const COLORS = ['bg-blue-600','bg-purple-600','bg-emerald-600','bg-orange-500','bg-pink-600']

export function SupersetBadge({ type, group = 0 }: Props) {
  const color = COLORS[group % COLORS.length]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wide ${color}`}>
      {type === 'superset' ? 'SS' : 'DS'}
    </span>
  )
}
