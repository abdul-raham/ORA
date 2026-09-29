import { motion } from 'motion/react'
import { typeById } from '../../data/appointmentTypes'
import { CLINIC, chairById, clinicianById } from '../../data/clinic'
import { pointAt, normalAt, type Curve } from '../../lib/arch'
import { formatDay, formatIsoTime, toWall } from '../../lib/time'
import type { Appointment, AppointmentEvent, Patient } from '../../lib/types'

// Premium confirmation pass generated from the persisted appointment. Sized to
// screenshot cleanly on a phone.

const PASS_ARCH: Curve = [
  [14, 58],
  [18, 6],
  [142, 6],
  [146, 58],
]

/** Booking code drawn as an impression: each character sets a tick length. */
function ImpressionCode({ code }: { code: string }) {
  const chars = code.replace('ORA-', '').split('')
  const n = 25
  return (
    <svg viewBox="0 0 160 64" className="h-16 w-40" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const t = 0.04 + (0.92 * i) / (n - 1)
        const c = chars[i % chars.length].charCodeAt(0)
        const len = 4 + ((c * (i + 3)) % 9)
        const [x, y] = pointAt(PASS_ARCH, t)
        const [nx, ny] = normalAt(PASS_ARCH, t)
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x + nx * len}
            y2={y + ny * len}
            stroke={i % 6 === 0 ? 'var(--color-clinic)' : 'var(--color-charcoal)'}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

export default function CarePass({
  appointment,
  patient,
  events,
  animateIn = false,
}: {
  appointment: Appointment
  patient: Patient
  events: AppointmentEvent[]
  animateIn?: boolean
}) {
  const type = typeById(appointment.appointment_type_id)!
  const clinician = clinicianById(appointment.clinician_id)!
  const chair = chairById(appointment.chair_id)!
  const w = toWall(appointment.start_at)
  const cancelled = appointment.status === 'cancelled'
  const auto = events.filter((e) => ['confirmation_prepared', 'reminder_scheduled', 'prep_shared'].includes(e.event_type)).slice(-3)

  return (
    <motion.article
      layoutId={animateIn ? 'carepass' : undefined}
      className="porcelain-surface grain relative mx-auto w-full max-w-[440px] overflow-hidden"
      aria-label="CarePass"
    >
      <div className="flex items-center justify-between border-b border-bone px-6 py-4">
        <p className="font-display text-2xl leading-none">
          ORA<span className="text-clinic">°</span>
        </p>
        <p className="font-mono text-xs tracking-[0.16em]">{appointment.booking_code}</p>
      </div>

      <div className="px-6 pb-6 pt-8">
        <p className="label mb-3 flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${cancelled ? 'bg-alert' : 'bg-clinic'}`} aria-hidden />
          {cancelled ? 'Visit cancelled' : 'CarePass'}
        </p>
        <h2 className={`display text-[3.3rem] uppercase ${cancelled ? 'text-muted line-through decoration-1' : ''}`}>
          You're
          <br />
          expected.
        </h2>
        <p className="mt-4 font-display text-2xl">{patient.full_name}</p>

        <dl className="mt-7 grid grid-cols-2 gap-x-4 border-t border-bone">
          {[
            ['Visit', type.name, 'col-span-2'],
            ['Date', formatDay(w.date, 'long'), ''],
            ['Time', `${formatIsoTime(appointment.start_at)} — ${formatIsoTime(appointment.end_at)}`, ''],
            ['With', clinician.name, ''],
            ['Chair', chair.name, ''],
            ['Studio', `${CLINIC.address[0]}, ${CLINIC.address[1]}`, 'col-span-2'],
          ].map(([k, v, span]) => (
            <div key={k} className={`border-b border-bone py-3 ${span}`}>
              <dt className="label text-[9.5px]">{k}</dt>
              <dd className="mt-1 leading-snug">{v}</dd>
            </div>
          ))}
        </dl>

        {auto.length > 0 && !cancelled && (
          <ul className="mt-5 space-y-1.5">
            {auto.map((e) => (
              <li key={e.id} className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                <span className={`size-1.5 rounded-full border ${e.status === 'done' ? 'border-clinic bg-clinic' : 'border-clinic'}`} aria-hidden />
                {e.label}
                {e.status === 'simulated' && <span className="text-clinic-deep">· demo</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-end justify-between border-t border-bone bg-bone/40 px-6 py-4">
        <div>
          <p className="label text-[9.5px]">Arrive by</p>
          <p className="font-mono text-sm">{formatIsoTime(new Date(Date.parse(appointment.start_at) - 10 * 60000).toISOString())}</p>
        </div>
        <ImpressionCode code={appointment.booking_code} />
      </div>
    </motion.article>
  )
}
