import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import type { PatientDraft } from '../../store/visitStore'

// Progressive intake: each fold opens only once the one before it is usable,
// so the patient never faces a long form.

export const validName = (v: string) => v.trim().length >= 2
export const validPhone = (v: string) => v.replace(/\D/g, '').length >= 10
export const validEmail = (v: string) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const intakeReady = (p: PatientDraft) => validName(p.full_name) && validPhone(p.phone) && validEmail(p.email) && p.consent
export const intakeComplete = (p: PatientDraft) => intakeReady(p) && !!p.firstVisit

export default function IntakeFold({ value, onChange }: { value: PatientDraft; onChange: (p: Partial<PatientDraft>) => void }) {
  const open2 = validName(value.full_name)
  const open3 = open2 && validPhone(value.phone)
  const open4 = open3 && validEmail(value.email)

  return (
    <div className="space-y-2">
      <Fold index="01" label="Your name" open>
        <input
          className="field"
          autoComplete="name"
          placeholder="Full name"
          value={value.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          aria-label="Full name"
        />
      </Fold>
      <Fold index="02" label="Mobile number" open={open2} hint="For your confirmation and reminder.">
        <input
          className="field font-mono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+234 …"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          aria-label="Mobile number"
          aria-invalid={!!value.phone && !validPhone(value.phone)}
        />
        {!!value.phone && !validPhone(value.phone) && <p className="mt-2 text-sm text-alert">Please enter a full mobile number.</p>}
      </Fold>
      <Fold index="03" label="A little more" open={open3} hint="Optional — helps reception prepare.">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <input
              className="field"
              type="email"
              autoComplete="email"
              placeholder="Email (optional)"
              value={value.email}
              onChange={(e) => onChange({ email: e.target.value })}
              aria-label="Email, optional"
              aria-invalid={!validEmail(value.email)}
            />
            {!validEmail(value.email) && <p className="mt-2 text-sm text-alert">That email doesn't look quite right.</p>}
          </div>
          <Toggle
            label="First visit to ORA?"
            value={value.firstVisit}
            options={[
              ['yes', 'Yes'],
              ['no', "I've been before"],
            ]}
            onChange={(v) => onChange({ firstVisit: v as PatientDraft['firstVisit'] })}
          />
          <div className="md:col-span-2">
            <Toggle
              label="How would you like the visit paced?"
              value={value.pace}
              options={[
                ['standard', 'Standard'],
                ['unhurried', 'Unhurried — I feel nervous at the dentist'],
              ]}
              onChange={(v) => onChange({ pace: v as PatientDraft['pace'] })}
            />
          </div>
          <div className="md:col-span-2">
            <textarea
              className="field min-h-[72px] resize-none text-base"
              maxLength={280}
              placeholder="Anything that helps us plan your time — access needs, timing constraints."
              value={value.note}
              onChange={(e) => onChange({ note: e.target.value })}
              aria-label="Note for reception, optional"
            />
            <p className="mt-2 text-xs text-muted">Please don't include medical details here — your clinician will ask in person.</p>
          </div>
        </div>
      </Fold>
      <Fold index="04" label="Contact consent" open={open4}>
        <label className="flex cursor-pointer items-start gap-4">
          <input type="checkbox" className="peer sr-only" checked={value.consent} onChange={(e) => onChange({ consent: e.target.checked })} />
          <span
            aria-hidden
            className={`mt-0.5 grid size-5 shrink-0 place-items-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clinic ${value.consent ? 'border-clinic bg-clinic text-ivory' : 'border-steel'}`}
          >
            {value.consent && '✓'}
          </span>
          <span className="text-graphite">ORA may contact me about this visit — confirmation, reminder and any change to the time.</span>
        </label>
      </Fold>
    </div>
  )
}

function Fold({ index, label, hint, open, children }: { index: string; label: string; hint?: string; open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <div className="border-t border-bone" style={{ perspective: 900 }}>
      <div className="flex items-baseline gap-4 pt-4">
        <span className={`label ${open ? 'text-charcoal' : ''}`}>{index}</span>
        <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${open ? 'text-charcoal' : 'text-steel'}`}>{label}</span>
        {hint && open && <span className="hidden text-sm text-muted sm:inline">— {hint}</span>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0, rotateX: -35 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1, rotateX: 0 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, rotateX: -35 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top' }}
            className="overflow-hidden"
          >
            <div className="pb-7 pl-0 pt-3 md:pl-10">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Toggle({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-muted">{label}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map(([id, text]) => (
          <label key={id} className="flex cursor-pointer items-center gap-2.5">
            <input type="radio" className="peer sr-only" checked={value === id} onChange={() => onChange(id)} />
            <span
              aria-hidden
              className={`size-3 rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clinic ${value === id ? 'border-clinic bg-clinic' : 'border-steel'}`}
            />
            <span className={value === id ? 'text-charcoal' : 'text-graphite'}>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
