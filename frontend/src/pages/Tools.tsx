import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Calculator, BarChart2, Activity } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { WarmupCalculator } from '../components/tools/WarmupCalculator'
import { PlateCalculator } from '../components/tools/PlateCalculator'
import { OneRmCalculator } from '../components/tools/OneRmCalculator'

type Tool = 'warmup' | 'plate' | 'onerm' | null

const tools = [
  { id: 'warmup' as Tool, icon: Activity, title: 'Warmup Calculator', desc: 'Generate warmup sets from your working weight', color: 'from-blue-600 to-blue-800' },
  { id: 'plate' as Tool, icon: Dumbbell, title: 'Plate Calculator', desc: 'See exactly which plates to load on the bar', color: 'from-primary-600 to-primary-800' },
  { id: 'onerm' as Tool, icon: BarChart2, title: '1RM Estimator', desc: 'Estimate your one-rep max from any set', color: 'from-red-600 to-red-800' },
  { id: null, icon: Calculator, title: 'BMI Calculator', desc: 'Coming soon', color: 'from-zinc-600 to-zinc-800', disabled: true },
]

export function ToolsPage() {
  const [active, setActive] = useState<Tool>(null)

  return (
    <div className="page">
      <div className="page-inner pt-6">
        <PageHeader title="Tools" subtitle="Fitness calculators" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {tools.map(t => (
            <motion.button
              key={t.title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !t.disabled && setActive(t.id)}
              className={`glass rounded-2xl p-5 text-left flex items-start gap-4 transition-all ${t.disabled ? 'opacity-40 cursor-not-allowed' : 'glass-hover cursor-pointer'}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0`}>
                <t.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{t.title}</h3>
                <p className="text-sm text-text-muted mt-0.5">{t.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Tool modals */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={e => e.target === e.currentTarget && setActive(null)}
            >
              {active === 'warmup' && <WarmupCalculator onClose={() => setActive(null)} />}
              {active === 'plate' && <PlateCalculator onClose={() => setActive(null)} />}
              {active === 'onerm' && <OneRmCalculator onClose={() => setActive(null)} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
