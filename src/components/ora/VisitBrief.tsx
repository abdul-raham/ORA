import { motion } from 'motion/react'
import { typeBySlug } from '../../data/appointmentTypes'
import { CLINIC, chairById, clinicianById } from '../../data/clinic'
import { formatDay, formatTime } from '../../lib/time'
import type { Slot } from '../../lib/types'

// Compact pre-confirmation summary. Shares a layout id with CarePass so that on
// confirmation it compresses into the pass.

export default function VisitBrief({
  typeSlug,
  slot,
  patientName,
  onEdit,
}: {
  typeSlug: string
  slot: Slot
  patientName?: string
  onEdit?: (step: 2 | 3) => void
}) {
  const type = typeBySlug(typeSlug)!
  const rows: [string, string, (2 | 3)?][] = [
    ['Visit', type.name, 2],
    ['When', `${formatDay(slot.date, 'long')} · ${formatTime(slot.startMin)}`, 3],
    ['Length', `${type.duration_minutes} minutes`],
    ['With', clinicianById(slot.clinician_id)!.name],
    ['Where', `${chairById(slot.chair_id)!.name} · ${CLINIC.address[0]}`],
  ]
  if (patientName) rows.push(['Patient', patientName])

  return (
    <motion.section layoutId="carepass" className="porcelain-surface relative p-6 md:p-8" aria-label="Visit summary">
      <div className="mb-6 flex items-baseline justify-between">
        <p className="label">Visit brief</p>
        <p className="font-display text-xl">
          ORA<span className="text-clinic">°</span>
        </p>
      </div>
      <dl>
        {rows.map(([k, v, edit]) => (
          <div key={k} className="grid grid-cols-[76px_1fr_auto] items-baseline gap-3 border-t border-bone py-3">
            <dt className="label text-[10px]">{k}</dt>
            <dd className="leading-snug">{v}</dd>
            {edit && onEdit ? (
              <button className="label text-[10px] underline underline-offset-4 hover:text-charcoal" onClick={() => onEdit(edit)}>
                Edit
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </dl>
    </motion.section>
  )
}
