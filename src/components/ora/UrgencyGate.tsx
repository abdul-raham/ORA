import { motion } from 'motion/react'
import { useState } from 'react'
import { CLINIC } from '../../data/clinic'
import { RED_FLAGS, URGENT_GUIDANCE, URGENT_REVIEW, type UrgencyTier } from '../../data/urgentCare'

// Static, clinic-approved routing gate. It checks only the configured flags.
// When one is selected, ordinary online booking stops and the configured
// urgent guidance is shown verbatim.

export function UrgencyCheck({ onClear, onFlag }: { onClear: () => void; onFlag: (tier: UrgencyTier, flags: string[]) => void }) {
  const [checked, setChecked] = useState<string[]>([])
  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const submit = () => {
    const flags = RED_FLAGS.filter((f) => checked.includes(f.id))
    onFlag(flags.some((f) => f.tier === 'emergency') ? 'emergency' : 'same-day', checked)
  }

  return (
    <section aria-labelledby="urgency-title" className="py-2">
      <p className="label mb-3 text-alert">Safety check</p>
      <h3 id="urgency-title" className="display mb-3 text-[clamp(1.9rem,3.4vw,2.9rem)]">
        Is any of this happening right now?
      </h3>
      <p className="mb-8 max-w-[560px] text-muted">
        We ask everyone this before booking. If one applies, online booking isn't the right route — we'll show you who to contact instead.
      </p>
      <fieldset>
        <legend className="sr-only">Select any that apply</legend>
        <ul className="max-w-[720px] border-t border-bone">
          {RED_FLAGS.map((f) => {
            const on = checked.includes(f.id)
            return (
              <li key={f.id} className="border-b border-bone">
                <label className="flex cursor-pointer items-start gap-4 py-4">
                  <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(f.id)} />
                  <span
                    aria-hidden
                    className={`mt-1 grid size-4 shrink-0 place-items-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clinic ${on ? 'border-alert bg-alert' : 'border-steel'}`}
                  >
                    {on && <span className="size-1.5 bg-ivory" />}
                  </span>
                  <span className={on ? 'text-charcoal' : 'text-graphite'}>{f.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button className="btn-primary" onClick={onClear} disabled={checked.length > 0}>
          None of these — find a time <span aria-hidden>→</span>
        </button>
        <button
          className="btn-quiet !border-alert !text-alert disabled:opacity-30"
          onClick={submit}
          disabled={checked.length === 0}
        >
          Yes — one or more applies
        </button>
      </div>
    </section>
  )
}

export default function UrgencyGate({ tier, onBack }: { tier: UrgencyTier; onBack: () => void }) {
  const g = URGENT_GUIDANCE[tier]
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="alert"
      aria-labelledby="gate-title"
      className="relative overflow-hidden border-t-2 border-alert bg-ivory px-5 py-10 md:px-12 md:py-14"
    >
      <p className="label mb-6 flex items-center gap-3 text-alert">
        <span className="inline-block size-2 rounded-full bg-alert" aria-hidden />
        Online booking paused
      </p>
      <h2 id="gate-title" className="display text-[clamp(2.6rem,6vw,5rem)]">
        {g.title}
      </h2>
      <p className="mt-5 max-w-[560px] text-lg text-graphite">{g.lead}</p>
      <ol className="mt-10 max-w-[640px] space-y-5">
        {g.steps.map((s, i) => (
          <li key={s} className="flex gap-5">
            <span className="label pt-1 text-alert">0{i + 1}</span>
            <span className="text-[1.05rem] leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex flex-wrap items-center gap-4">
        {tier === 'emergency' ? (
          <a href="tel:112" className="btn-primary !bg-alert">
            Call 112
          </a>
        ) : (
          <a href={CLINIC.urgentLineHref} className="btn-primary !bg-alert">
            Call ORA urgent line · {CLINIC.urgentLine}
          </a>
        )}
        {tier === 'emergency' && (
          <a href={CLINIC.urgentLineHref} className="btn-quiet">
            ORA urgent line · {CLINIC.urgentLine}
          </a>
        )}
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-bone pt-5">
        <p className="label text-[10px]">
          {URGENT_REVIEW.reference} · {URGENT_REVIEW.reviewed}
        </p>
        <button className="btn-quiet" onClick={onBack}>
          ← I selected this by mistake
        </button>
      </div>
    </motion.section>
  )
}
