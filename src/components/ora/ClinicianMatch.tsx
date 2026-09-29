import { motion, useReducedMotion } from 'motion/react'
import { capacityFor } from '../../lib/scheduling/availability'
import type { AppointmentType } from '../../lib/types'

// Resolves the visit's requirements against clinician capability and chair
// equipment. The patient sees that it's handled, not a list of specialties.

const CAPABILITY_TEXT: Record<AppointmentType['capability'], string> = {
  general: 'General dentistry',
  restorative: 'Restorative care',
  cosmetic: 'Cosmetic consultations',
  orthodontic: 'Orthodontics',
  hygiene: 'Dental hygiene',
  periodontal: 'Gum health',
  paediatric: "Children's dentistry",
}

export default function ClinicianMatch({ type }: { type: AppointmentType }) {
  const reduce = useReducedMotion()
  const { clinicians, chairs } = capacityFor(type)
  const rows = [
    { k: 'Clinician', need: CAPABILITY_TEXT[type.capability], have: `${clinicians.length} can take this visit` },
    {
      k: 'Chair',
      need: type.resource_type === 'scanner' ? 'Intraoral scanner' : 'Standard treatment chair',
      have: chairs.map((c) => c.name.replace('Chair ', '')).join(' · '),
    },
    { k: 'Time', need: `${type.duration_minutes} min + reset`, have: 'Checked against live schedule' },
  ]
  return (
    <div>
      <p className="label mb-3">Matched automatically</p>
      <p className="mb-5 text-sm leading-relaxed text-graphite">
        You don't need to choose a specialist. ORA pairs this visit with a clinician who offers it and a chair equipped for it.
      </p>
      <dl className="border-t border-bone">
        {rows.map((r, i) => (
          <motion.div
            key={r.k}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="grid grid-cols-[72px_1fr_auto] items-baseline gap-3 border-b border-bone py-3"
          >
            <dt className="label text-[10px]">{r.k}</dt>
            <dd className="text-sm">{r.need}</dd>
            <dd className="flex items-center gap-2 font-mono text-[11px] text-clinic-deep">
              <span className="size-1.5 rounded-full bg-clinic" aria-hidden />
              {r.have}
            </dd>
          </motion.div>
        ))}
      </dl>
    </div>
  )
}
