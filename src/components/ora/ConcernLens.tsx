import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { REGION_LABELS, SMILE_GOALS, concernById, visibleQuestions, type Question } from '../../data/routingRules'
import type { ConcernId, Region } from '../../lib/types'
import { useVisit } from '../../store/visitStore'
import SmileGoal from './SmileGoal'
import SmileMap from './SmileMap'

// Adaptive follow-up surface. One question is in focus at a time; answered
// questions fold into a single line that can be reopened. Only information that
// changes the booking is asked for.

const answerText = (q: Question, v: string) => {
  if (q.kind === 'map') return REGION_LABELS[v as Region]
  if (q.kind === 'goal') return SMILE_GOALS.find((g) => g.id === v)?.label ?? v
  return q.options?.find((o) => o.id === v)?.label ?? v
}

export default function ConcernLens({ concern, onComplete }: { concern: ConcernId; onComplete: () => void }) {
  const answers = useVisit((s) => s.answers)
  const answer = useVisit((s) => s.answer)
  const reduce = useReducedMotion()
  const [editing, setEditing] = useState<string | null>(null)
  const config = concernById(concern)
  const questions = visibleQuestions(config, answers)
  const current = editing ?? questions.find((q) => !answers[q.id])?.id ?? null
  const complete = current === null

  const respond = (q: Question, v: string) => {
    answer(q.id, v)
    setEditing(null)
  }

  return (
    <div>
      <ol className="border-t border-bone">
        {questions.map((q, i) => {
          const open = q.id === current
          const value = answers[q.id]
          if (!open && !value) return null
          return (
            <li key={q.id} className="border-b border-bone">
              {open ? (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="py-8"
                >
                  <p className="label mb-3">Q.{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="display mb-2 text-[clamp(1.9rem,3.4vw,2.9rem)]">{q.prompt}</h3>
                  {q.help && <p className="mb-6 max-w-[520px] text-muted">{q.help}</p>}
                  <div className="mt-6">
                    {q.kind === 'map' && <SmileMap value={value} onChange={(r) => respond(q, r)} />}
                    {q.kind === 'goal' && <SmileGoal value={value} onChange={(g) => respond(q, g)} />}
                    {(q.kind === 'choice' || q.kind === 'type') && (
                      <ChoiceList q={q} value={value} onChoose={(v) => respond(q, v)} />
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-baseline gap-4 py-4">
                  <span className="label w-10 shrink-0">Q.{String(i + 1).padStart(2, '0')}</span>
                  <span className="hidden flex-1 text-muted sm:block">{q.prompt}</span>
                  <span className="flex-1 font-display text-lg sm:flex-none sm:text-right">{answerText(q, value)}</span>
                  <button className="label shrink-0 underline decoration-steel-2 underline-offset-4 hover:text-charcoal" onClick={() => setEditing(q.id)}>
                    Change
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex flex-wrap items-center justify-between gap-6"
          >
            <p className="max-w-[420px] text-sm text-muted">That's everything we need to choose your appointment.</p>
            <button className="btn-primary" onClick={onComplete}>
              Continue <span aria-hidden>→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChoiceList({ q, value, onChoose }: { q: Question; value?: string; onChoose: (v: string) => void }) {
  return (
    <ul role="radiogroup" aria-label={q.prompt} className={q.kind === 'type' ? 'grid gap-x-10 md:grid-cols-2' : 'max-w-[640px]'}>
      {q.options!.map((o) => {
        const on = value === o.id
        return (
          <li key={o.id} className="border-b border-bone first:border-t md:[&:nth-child(2)]:border-t">
            <button
              role="radio"
              aria-checked={on}
              onClick={() => onChoose(o.id)}
              className="group flex w-full items-center gap-4 py-4 text-left"
            >
              <svg viewBox="0 0 20 14" className="h-3.5 w-5 shrink-0" aria-hidden>
                <path d="M2 12 C3 1, 17 1, 18 12" fill="none" stroke={on ? 'var(--color-clinic)' : 'var(--color-steel)'} strokeWidth={1.3} />
                {on && <circle cx={10} cy={4.6} r={2} fill="var(--color-clinic)" />}
              </svg>
              <span className={`flex-1 text-[1.05rem] transition-colors ${on ? 'text-charcoal' : 'text-graphite group-hover:text-charcoal'}`}>
                {o.label}
              </span>
              {o.hint && <span className="label text-[10px]">{o.hint}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
