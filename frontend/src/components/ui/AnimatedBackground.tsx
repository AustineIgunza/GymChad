import { useMemo } from 'react'

interface Particle {
  id: number
  left: string
  size: string
  color: string
  duration: string
  delay: string
}

const COLORS = [
  'rgba(220,38,38,0.35)',
  'rgba(29,78,216,0.35)',
  'rgba(124,58,237,0.3)',
  'rgba(59,130,246,0.3)',
  'rgba(255,255,255,0.2)',
]

export function AnimatedBackground() {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${(i * 5.7 + 3) % 100}%`,
      size: `${2 + (i % 3)}px`,
      color: COLORS[i % COLORS.length],
      duration: `${18 + (i * 3.1) % 22}s`,
      delay: `${(i * 2.3) % 18}s`,
    })),
  [])

  return (
    <>
      {/* Animated gradient orbs */}
      <div className="bg-orb bg-orb-1" style={{ zIndex: 0 }} />
      <div className="bg-orb bg-orb-2" style={{ zIndex: 0 }} />
      <div className="bg-orb bg-orb-3" style={{ zIndex: 0 }} />

      {/* Subtle grid */}
      <div className="bg-grid" style={{ zIndex: 0 }} />

      {/* Floating particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="bg-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
            zIndex: 0,
          }}
        />
      ))}
    </>
  )
}
