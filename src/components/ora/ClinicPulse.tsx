import { motion, useReducedMotion } from 'motion/react'
import { typeById } from '../../data/appointmentTypes'
import { CHAIRS, CLINIC, chairById } from '../../data/clinic'
import type { StaffView } from '../../lib/api'
import { formatDay, formatTime, relativeDay, toWall, wallNow, weekday } from '../../lib/time'

const N = ({ children }: { children: React.ReactNode }) => (
  <span className="font-normal not-italic underline decoration-clinic decoration-1 underline-offset-[0.18em]">{children}</span>
)

// Dashboard opening statement. The state of the studio is written as one
// sentence rather than a row of KPI cards.

export default function ClinicPulse({ date, view, exceptions }: { date: string; view: StaffView; exceptions: number }) {
  const reduce = useReducedMotion()
  const now = wallNow()
  const isToday = date === now.date
  const day = view.appointments.filter((a) => a.start_at.startsWith(date) && a.status !== 'cancelled')
  const inChair = day.filter((a) => a.status === 'in_chair')
  const nowMs = Date.now()
  const late = day.filter((a) => a.status === 'booked' && Date.parse(a.start_at) < nowMs - 5 * 60000 && Date.parse(a.end_at) > nowMs)
  const next = day
    .filter((a) => a.status === 'booked' && Date.parse(a.start_at) >= nowMs)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))[0]
  const hours = CLINIC.hours[weekday(date)]
  const open = isToday && hours && now.minutes >= hours[0] && now.minutes < hours[1]

  let sentence: React.ReactNode
  if (!hours) sentence = <>The clinic is closed {isToday ? 'today' : `on ${formatDay(date, 'long')}`}. Nothing is booked.</>
  else if (!isToday)
    sentence = (
      <>
        {relativeDay(date, 'long')}: <N>{day.length} visits</N> across {CHAIRS.length} chairs, first at{' '}
        <N>{day[0] ? formatTime(Math.min(...day.map((a) => toWall(a.start_at).minutes))) : '—'}</N>.
      </>
    )
  else
    sentence = (
      <>
        <N>{day.length} visits</N> today. <N>{inChair.length} of {CHAIRS.length}</N> chairs active
        {next ? (
          <>
            , next arrival <N>{view.patients.get(next.patient_id)?.full_name.split(' ')[0]}</N> at <N>{formatTime(toWall(next.start_at).minutes)}</N> in{' '}
            {chairById(next.chair_id)?.name}
          </>
        ) : (
          <>, no more arrivals today</>
        )}
        . {late.length ? <>Running <N>{late.length} late</N>.</> : open ? <>Running on time.</> : <>{now.minutes < hours[0] ? 'Opens' : 'Closed'} at {formatTime(now.minutes < hours[0] ? hours[0] : hours[1])}.</>}
      </>
    )

  const span = hours ? hours[1] - hours[0] : 1
  return (
    <section aria-labelledby="pulse-title" className="border-b border-bone pb-10">
      <p id="pulse-title" className="label mb-5 flex items-center gap-3">
        <span className={`relative inline-flex size-2 rounded-full ${open ? 'bg-clinic' : 'bg-steel'}`} aria-hidden>
          {open && !reduce && <span className="absolute inset-0 animate-ping rounded-full bg-clinic/60" />}
        </span>
        Clinic pulse · {formatDay(date, 'long')}
        {isToday && ` · ${formatTime(now.minutes)}`}
      </p>
      <p className="display max-w-[1100px] text-[clamp(1.9rem,3.6vw,3.4rem)] !leading-[1.08]">{sentence}</p>
      {exceptions > 0 && (
        <p className="mt-4 text-graphite">
          <span className="text-alert">{exceptions} {exceptions === 1 ? 'thing needs' : 'things need'} a person</span> — everything else is handled.
        </p>
      )}

      {hours && (
        <div className="relative mt-8 h-8" aria-hidden>
          <div className="steel-rule absolute inset-x-0 top-4" />
          {day.map((a) => {
            const m = toWall(a.start_at).minutes
            const type = typeById(a.appointment_type_id)
            return (
              <motion.span
                key={a.id}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                className={`absolute top-1 w-px origin-bottom ${a.status === 'complete' ? 'bg-steel' : a.status === 'in_chair' ? 'bg-clinic' : 'bg-charcoal'}`}
                style={{ left: `${((m - hours[0]) / span) * 100}%`, height: 6 + (type?.duration_minutes ?? 30) / 5 }}
              />
            )
          })}
          {isToday && now.minutes >= hours[0] && now.minutes <= hours[1] && (
            <span className="absolute top-2 size-[9px] -translate-x-1/2 rounded-full border-2 border-porcelain bg-clinic" style={{ left: `${((now.minutes - hours[0]) / span) * 100}%` }} />
          )}
          <span className="absolute -bottom-2 left-0 font-mono text-[9.5px] text-muted">{formatTime(hours[0])}</span>
          <span className="absolute -bottom-2 right-0 font-mono text-[9.5px] text-muted">{formatTime(hours[1])}</span>
        </div>
      )}
    </section>
  )
}
