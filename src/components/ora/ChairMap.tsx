import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { typeById } from '../../data/appointmentTypes'
import { CHAIRS, CLINIC, clinicianById } from '../../data/clinic'
import { statusLabel, type StaffView } from '../../lib/api'
import { canPlace } from '../../lib/scheduling/availability'
import { formatTime, toIso, toWall, wallNow, weekday } from '../../lib/time'
import type { Appointment, AppointmentStatus } from '../../lib/types'

// Primary operational view: treatment-chair lanes across the day. Visits sit in
// their real chair windows. Booked visits can be dragged; they snap to 15-minute
// windows and only land where the scheduling engine allows.

const LANE_H = 88
const STEP = 15

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  booked: 'bg-ivory border-graphite/70 text-charcoal',
  arrived: 'bg-clinic-soft border-clinic text-clinic-deep',
  checked_in: 'bg-clinic-soft border-clinic-deep text-clinic-deep',
  in_chair: 'bg-clinic border-clinic-deep text-ivory',
  complete: 'bg-bone/70 border-steel-2 text-muted',
  cancelled: 'bg-transparent border-steel-2 text-muted',
  no_show: 'bg-alert-soft border-alert/50 text-alert',
}

interface Drag {
  id: string
  phase: 'drag' | 'snap' | 'return'
  x0: number
  y0: number
  dx: number
  dy: number
  chairIdx: number
  startMin: number
  ok: boolean
  reason?: string
}

export default function ChairMap({
  date,
  view,
  selectedId,
  onSelect,
  onMove,
}: {
  date: string
  view: StaffView
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, chairId: string, startAt: string) => Promise<string | null>
}) {
  const reduce = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(wallNow())

  const hours = CLINIC.hours[weekday(date)] ?? [480, 1080]
  const [open, close] = hours
  const span = close - open
  const ppm = width / span

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const t = window.setInterval(() => setNow(wallNow()), 30000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 3600)
    return () => window.clearTimeout(t)
  }, [notice])

  const appts = view.appointments.filter((a) => a.start_at.startsWith(date) && a.status !== 'cancelled')
  const closedDay = !CLINIC.hours[weekday(date)]
  const hourMarks = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => open + i * 60)
  const offs = view.timeOff.filter((o) => o.start_at.startsWith(date))

  const evaluate = (a: Appointment, dx: number, dy: number, x0: number, y0: number): Drag => {
    const s = toWall(a.start_at).minutes
    const type = typeById(a.appointment_type_id)!
    const rawStart = s + dx / ppm
    const startMin = Math.max(open, Math.min(close - type.duration_minutes, Math.round(rawStart / STEP) * STEP))
    const baseIdx = CHAIRS.findIndex((c) => c.id === a.chair_id)
    const chairIdx = Math.max(0, Math.min(CHAIRS.length - 1, baseIdx + Math.round(dy / LANE_H)))
    const res = canPlace(
      { appointments: view.appointments, timeOff: view.timeOff },
      { type, clinician_id: a.clinician_id, chair_id: CHAIRS[chairIdx].id, start_at: toIso(date, startMin), excludeId: a.id },
    )
    return { id: a.id, phase: 'drag', x0, y0, dx, dy, chairIdx, startMin, ok: res.ok, reason: res.ok ? undefined : res.reason }
  }

  const onPointerDown = (e: React.PointerEvent, a: Appointment) => {
    if (a.status !== 'booked' || e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag(evaluate(a, 0, 0, e.clientX, e.clientY))
  }
  const onPointerMove = (e: React.PointerEvent, a: Appointment) => {
    if (!drag || drag.id !== a.id || drag.phase !== 'drag') return
    setDrag(evaluate(a, e.clientX - drag.x0, e.clientY - drag.y0, drag.x0, drag.y0))
  }
  const springBack = (d: Drag, message?: string) => {
    setDrag({ ...d, phase: 'return', dx: 0, dy: 0 })
    if (message) setNotice(message)
    window.setTimeout(() => setDrag((cur) => (cur?.id === d.id && cur.phase === 'return' ? null : cur)), 450)
  }
  const onPointerUp = async (a: Appointment) => {
    if (!drag || drag.id !== a.id || drag.phase !== 'drag') return
    const d = drag
    const moved = Math.abs(d.dx) > 4 || Math.abs(d.dy) > 4
    if (!moved) {
      setDrag(null)
      return onSelect(a.id)
    }
    const origMin = toWall(a.start_at).minutes
    const baseIdx = CHAIRS.findIndex((c) => c.id === a.chair_id)
    if (d.startMin === origMin && d.chairIdx === baseIdx) return springBack(d)
    if (!d.ok) return springBack(d, d.reason ?? 'That window is not available.')
    // ChairSnap: settle magnetically into the target window, then commit.
    setDrag({ ...d, phase: 'snap', dx: (d.startMin - origMin) * ppm, dy: (d.chairIdx - baseIdx) * LANE_H })
    const err = await onMove(a.id, CHAIRS[d.chairIdx].id, toIso(date, d.startMin))
    if (err) return springBack(d, err)
    setDrag(null)
    setNotice(`Moved to ${CHAIRS[d.chairIdx].name} at ${formatTime(d.startMin)} · patient update prepared`)
  }

  const showNow = date === now.date && now.minutes >= open && now.minutes <= close

  return (
    <section aria-labelledby="chairmap-title" className="relative">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="chairmap-title" className="label">
          Chair map
        </h2>
        <p className="label text-[10px]">Drag a booked visit to move it · click for details</p>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" style={{ touchAction: drag ? 'none' : 'pan-x' }}>
        <div className="grid min-w-[900px] grid-cols-[108px_1fr]">
          {/* Time axis */}
          <div />
          <div className="relative h-7">
            {hourMarks.map((m) => (
              <span key={m} className="absolute -translate-x-1/2 font-mono text-[10px] text-muted" style={{ left: (m - open) * ppm }}>
                {formatTime(m)}
              </span>
            ))}
          </div>

          {/* Lane labels */}
          <div className="border-t border-steel-2">
            {CHAIRS.map((c) => (
              <div key={c.id} className="flex flex-col justify-center border-b border-bone pr-3" style={{ height: LANE_H }}>
                <span className="font-display text-xl leading-none">{c.name}</span>
                <span className="label mt-1 text-[9px]">{c.resources.includes('scanner') ? 'Scanner' : 'Standard'}</span>
              </div>
            ))}
          </div>

          {/* Lanes */}
          <div ref={track} className="relative border-t border-steel-2" style={{ height: LANE_H * CHAIRS.length }}>
            {hourMarks.map((m) => (
              <span key={m} className="absolute inset-y-0 w-px bg-bone" style={{ left: (m - open) * ppm }} aria-hidden />
            ))}
            {CHAIRS.map((c, i) => (
              <div key={c.id} className="absolute inset-x-0 border-b border-bone" style={{ top: i * LANE_H, height: LANE_H }} aria-hidden />
            ))}
            {closedDay && (
              <p className="absolute inset-0 grid place-items-center font-display text-3xl text-muted">Clinic closed</p>
            )}

            {/* Drop target preview */}
            {drag?.phase === 'drag' && (Math.abs(drag.dx) > 4 || Math.abs(drag.dy) > 4) && (() => {
              const a = appts.find((x) => x.id === drag.id)!
              const dur = typeById(a.appointment_type_id)!.duration_minutes
              return (
                <motion.div
                  className={`pointer-events-none absolute z-20 border-2 border-dashed ${drag.ok ? 'border-clinic bg-clinic-soft/50' : 'border-alert bg-alert-soft/60'}`}
                  initial={false}
                  animate={{ left: (drag.startMin - open) * ppm, top: drag.chairIdx * LANE_H + 8 }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 30 }}
                  style={{ width: dur * ppm, height: LANE_H - 16 }}
                >
                  <span className={`absolute -top-6 left-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] ${drag.ok ? 'text-clinic-deep' : 'text-alert'}`}>
                    {formatTime(drag.startMin)} · {drag.ok ? 'fits' : drag.reason}
                  </span>
                </motion.div>
              )
            })()}

            {appts.map((a) => {
              const w = toWall(a.start_at)
              const type = typeById(a.appointment_type_id)!
              const idx = CHAIRS.findIndex((c) => c.id === a.chair_id)
              const p = view.patients.get(a.patient_id)
              const isDrag = drag?.id === a.id
              const dragging = isDrag && drag.phase === 'drag' && (Math.abs(drag.dx) > 4 || Math.abs(drag.dy) > 4)
              // Once the move has landed in the data, the offset is no longer needed.
              const landed = isDrag && drag.phase === 'snap' && w.minutes === drag.startMin && a.chair_id === CHAIRS[drag.chairIdx].id
              const ox = isDrag && !landed ? drag.dx : 0
              const oy = isDrag && !landed ? drag.dy : 0
              const conflict = view.timeOff.some(
                (o) => o.clinician_id === a.clinician_id && Date.parse(o.start_at) < Date.parse(a.end_at) && Date.parse(a.start_at) < Date.parse(o.end_at),
              )
              return (
                <motion.button
                  key={a.id}
                  initial={false}
                  animate={{ x: ox, y: oy, scale: dragging ? 1.02 : 1 }}
                  transition={
                    !reduce && isDrag && drag.phase !== 'drag' && !landed
                      ? { type: 'spring', stiffness: 640, damping: 24 }
                      : { duration: 0 }
                  }
                  onPointerDown={(e) => onPointerDown(e, a)}
                  onPointerMove={(e) => onPointerMove(e, a)}
                  onPointerUp={() => onPointerUp(a)}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(a.id))}
                  aria-label={`${p?.full_name}, ${type.name}, ${formatTime(w.minutes)}, ${a.chair_id.replace('chair-', 'chair ')}, ${statusLabel(a.status)}`}
                  className={`absolute z-10 overflow-hidden border text-left transition-shadow ${STATUS_STYLE[a.status]} ${selectedId === a.id ? 'ring-2 ring-charcoal ring-offset-2 ring-offset-porcelain' : ''} ${a.status === 'booked' ? 'cursor-grab active:cursor-grabbing' : ''} ${conflict ? 'outline outline-2 outline-offset-1 outline-alert' : ''}`}
                  style={{
                    left: (w.minutes - open) * ppm,
                    top: idx * LANE_H + 8,
                    width: Math.max(type.duration_minutes * ppm - 2, 14),
                    height: LANE_H - 16,
                    opacity: dragging ? 0.55 : 1,
                    boxShadow: dragging ? '0 18px 30px -12px rgba(0,0,0,0.35)' : undefined,
                    zIndex: isDrag ? 30 : undefined,
                    touchAction: a.status === 'booked' ? 'none' : undefined,
                  }}
                >
                  <span className="block px-2 pt-1.5">
                    <span className="block truncate text-[13px] font-medium leading-tight">{p?.full_name}</span>
                    <span className="block truncate text-[11px] opacity-80">{type.short}</span>
                    <span className="mt-1 block truncate font-mono text-[9.5px] uppercase tracking-[0.08em] opacity-75">
                      {formatTime(w.minutes)} · {clinicianById(a.clinician_id)?.name.replace('Dr. ', 'Dr ').split(' ').slice(0, 2).join(' ')}
                    </span>
                  </span>
                  {a.reschedule_requested && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-alert" aria-hidden />}
                </motion.button>
              )
            })}

            {showNow && (
              <div className="pointer-events-none absolute inset-y-0 z-30 w-px bg-clinic" style={{ left: (now.minutes - open) * ppm }} aria-hidden>
                <span className="absolute -top-6 -translate-x-1/2 bg-clinic px-1.5 py-0.5 font-mono text-[9.5px] text-ivory">
                  {formatTime(now.minutes)}
                </span>
                <span className="absolute -bottom-1 -left-[3px] size-[7px] rounded-full bg-clinic" />
              </div>
            )}
          </div>

          {offs.length > 0 && (
            <>
              <div className="flex items-center pr-3">
                <span className="label text-[9px]">Time off</span>
              </div>
              <div className="relative h-8">
                {offs.map((o) => {
                  const s = toWall(o.start_at).minutes
                  const e = toWall(o.end_at).minutes
                  return (
                    <span
                      key={o.id}
                      className="absolute top-2 flex h-5 items-center overflow-hidden whitespace-nowrap border border-alert/40 px-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-alert"
                      style={{
                        left: (s - open) * ppm,
                        width: (e - s) * ppm,
                        background: 'repeating-linear-gradient(135deg, transparent 0 4px, rgba(142,59,44,0.12) 4px 5px)',
                      }}
                    >
                      {clinicianById(o.clinician_id)?.name} · {o.reason}
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 h-5" aria-live="polite">
        {notice && (
          <p className={`font-mono text-[11px] uppercase tracking-[0.1em] ${notice.startsWith('Moved') ? 'text-clinic-deep' : 'text-alert'}`}>{notice}</p>
        )}
      </div>
    </section>
  )
}
