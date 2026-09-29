import { motion } from 'motion/react'
import { SMILE_GOALS } from '../../data/routingRules'
import type { SmileGoalId } from '../../lib/types'

// Appearance goals presented as a porcelain shade guide: each tab a slightly
// different shade, lifted out of the guide when chosen.

const SHADES = ['#fbf8f1', '#f4eee3', '#ede5d6', '#e6dcca', '#dfd3be']

export default function SmileGoal({ value, onChange }: { value?: string; onChange: (g: SmileGoalId) => void }) {
  return (
    <div role="radiogroup" aria-label="Smile goal" className="overflow-x-auto pb-2">
      <div className="flex min-w-[560px] items-end gap-2 border-b border-steel-2 pt-8 md:gap-3">
        {SMILE_GOALS.map((g, i) => {
          const on = value === g.id
          return (
            <motion.button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(g.id)}
              initial={false}
              animate={{ y: on ? -22 : 0 }}
              whileHover={{ y: on ? -22 : -8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative flex h-[210px] flex-1 flex-col justify-between rounded-t-[48px] border border-b-0 px-3 pb-4 pt-6 text-left"
              style={{
                background: `linear-gradient(180deg, #fffdf9 0%, ${SHADES[i]} 55%, ${SHADES[Math.min(i + 1, 4)]} 100%)`,
                borderColor: on ? 'var(--color-clinic)' : 'var(--color-steel-2)',
                boxShadow: on ? '0 24px 40px -24px rgba(52,80,63,0.45)' : 'inset 0 1px 0 #fff',
              }}
            >
              <span className="label text-[10px]">{`A${i + 1}`}</span>
              <span>
                <span className="block font-display text-[1.3rem] leading-tight">{g.label}</span>
                <span className="mt-1 block text-[0.8rem] leading-snug text-muted">{g.line}</span>
              </span>
              {on && <span className="absolute right-3 top-5 size-2 rounded-full bg-clinic" aria-hidden />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
