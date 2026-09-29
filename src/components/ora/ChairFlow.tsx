import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { typeBySlug } from '../../data/appointmentTypes'
import { CLINIC, chairById, clinicianById } from '../../data/clinic'
import { ApiError, getAvailability, type ChairFlowData } from '../../lib/api'
import { PREFERENCES, bestTimes, matchesPreference, type Preference } from '../../lib/scheduling/availability'
import { addDays, formatDay, formatTime, relativeDay, today, weekday } from '../../lib/time'
import type { Slot } from '../../lib/types'

// Signature availability surface. Instead of a month grid, ORA shows a short
// set of genuinely feasible times, each drawn inside its real chair lane so the
// patient can see the visit fit into the day.

const DAY_START = 480
const DAY_END = 1080
const pct = (m: number) => ((m - DAY_START) / (DAY_END - DAY_START)) * 100

interface Props {
  typeSlug: string
  preference: Preference
  onPreference: (p: Preference) => void
  selected: Slot | null
  onSelect: (s: Slot | null) => void
  excludeId?: string
  preferSoonestNote?: boolean
}

export default function ChairFlow({ typeSlug, preference, onPreference, selected, onSelect, excludeId }: Props) {
  const type = typeBySlug(typeSlug)!
  const [data, setData] = useState<ChairFlowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    setData(null)
    getAvailability(type.id, { excludeId })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong loading times.'))
  }, [type.id, excludeId])

  useEffect(load, [load])

  // A remembered selection that is no longer feasible is dropped.
  useEffect(() => {
    if (data && selected && !data.slots.some((s) => s.start_at === selected.start_at && s.chair_id === selected.chair_id))
      onSelect(null)
  }, [data, selected, onSelect])

  const days = useMemo(() => Array.from({ length: CLINIC.horizonDays }, (_, i) => addDays(today(), i)), [])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    data?.slots.forEach((s) => matchesPreference(s, preference) && m.set(s.date, (m.get(s.date) ?? 0) + 1))
    return m
  }, [data, preference])
  const max = Math.max(1, ...counts.values())

  const bands = useMemo(() => {
    if (!data) return []
    if (day) return bestTimes(data.slots.filter((s) => s.date === day), preference, 3)
    return bestTimes(data.slots, preference, 5)
  }, [data, day, preference])
  const dayTimes = useMemo(
    () => (data && day ? data.slots.filter((s) => s.date === day && matchesPreference(s, preference)) : []),
    [data, day, preference],
  )

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      {/* Availability river */}
      <div className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="label">Next two weeks</p>
          {day && (
            <button className="label underline underline-offset-4 hover:text-charcoal" onClick={() => setDay(null)}>
              Show best times across all days
            </button>
          )}
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ol className="flex min-w-[640px] border-y border-bone" aria-label="Days with availability">
            {days.map((d) => {
              const closed = !CLINIC.hours[weekday(d)]
              const n = counts.get(d) ?? 0
              const on = day === d
              return (
                <li key={d} className="flex-1 border-r border-bone last:border-r-0">
                  <button
                    disabled={closed || !data || n === 0}
                    onClick={() => setDay(on ? null : d)}
                    aria-pressed={on}
                    aria-label={`${formatDay(d, 'long')}: ${closed ? 'closed' : `${n} times`}`}
                    className={`relative flex h-[92px] w-full flex-col items-center justify-end gap-1 pb-2 transition-colors disabled:cursor-default ${on ? 'bg-ivory' : 'hover:bg-ivory/60'}`}
                  >
                    <span className="flex h-9 items-end" aria-hidden>
                      {closed ? (
                        <span className="mb-1 h-px w-3 bg-steel-2" />
                      ) : (
                        <motion.span
                          className={`w-[3px] ${on ? 'bg-clinic' : n ? 'bg-graphite' : 'bg-steel-2'}`}
                          initial={false}
                          animate={{ height: data ? Math.max(3, (n / max) * 34) : 3 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                        />
                      )}
                    </span>
                    <span className="label text-[9px]">{formatDay(d).slice(0, 3)}</span>
                    <span className={`font-display text-lg leading-none ${closed ? 'text-steel' : ''}`}>{Number(d.slice(8))}</span>
                    {on && <motion.span layoutId="river-on" className="absolute inset-x-2 top-0 h-[2px] bg-clinic" />}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {/* Preference */}
      <LayoutGroup id="pref">
        <div role="tablist" aria-label="Time preference" className="mb-8 flex flex-wrap gap-x-7 gap-y-2">
          {PREFERENCES.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={preference === p.id}
              onClick={() => onPreference(p.id)}
              className={`relative pb-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${preference === p.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
            >
              {p.label}
              {preference === p.id && <motion.span layoutId="pref-line" className="absolute inset-x-0 bottom-0 h-px bg-charcoal" />}
            </button>
          ))}
        </div>
      </LayoutGroup>

      {!data ? (
        <BandSkeleton />
      ) : bands.length === 0 ? (
        <div className="border-y border-bone py-10">
          <p className="font-display text-2xl">No {PREFERENCES.find((p) => p.id === preference)?.label.toLowerCase()} free in the next two weeks.</p>
          <p className="mt-2 text-muted">Try another preference, or call the clinic and we'll look for you.</p>
        </div>
      ) : (
        <ol className="border-t border-bone" aria-label="Best available times">
          {bands.map((s, i) => (
            <Band
              key={`${s.start_at}-${s.chair_id}`}
              slot={s}
              duration={type.duration_minutes}
              busy={data.busy[s.date]?.[s.chair_id] ?? []}
              selected={selected?.start_at === s.start_at && selected.chair_id === s.chair_id}
              onSelect={() => onSelect(s)}
              tag={i === 0 && !day && preference === 'soonest' ? 'Soonest' : undefined}
            />
          ))}
        </ol>
      )}

      <AnimatePresence>
        {day && dayTimes.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="label mb-3 mt-8">Every start time on {formatDay(day, 'long')}</p>
            <div className="grid grid-cols-4 gap-px bg-bone sm:grid-cols-6 md:grid-cols-9">
              {dayTimes.map((s) => {
                const on = selected?.start_at === s.start_at
                return (
                  <button
                    key={s.start_at}
                    onClick={() => onSelect(s)}
                    aria-pressed={on}
                    className={`py-3 font-mono text-sm transition-colors ${on ? 'bg-charcoal text-ivory' : 'bg-porcelain hover:bg-ivory'}`}
                  >
                    {formatTime(s.startMin)}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Band({
  slot,
  duration,
  busy,
  selected,
  onSelect,
  tag,
}: {
  slot: Slot
  duration: number
  busy: [number, number][]
  selected: boolean
  onSelect: () => void
  tag?: string
}) {
  const reduce = useReducedMotion()
  const chair = chairById(slot.chair_id)!
  const clinician = clinicianById(slot.clinician_id)!
  return (
    <li className="border-b border-bone">
      <button
        onClick={onSelect}
        aria-pressed={selected}
        className={`group grid w-full items-center gap-x-8 gap-y-4 px-1 py-6 text-left transition-colors md:grid-cols-[200px_1fr_150px] ${selected ? 'bg-ivory' : 'hover:bg-ivory/50'}`}
      >
        <span>
          <span className="label flex items-center gap-2 text-[10px]">
            {relativeDay(slot.date)}
            {tag && <span className="text-clinic">· {tag}</span>}
          </span>
          <span className="mt-1 block font-display text-[2.6rem] leading-none tracking-tight">
            {formatTime(slot.startMin)}
            <span className="ml-2 text-base text-muted">— {formatTime(slot.startMin + duration)}</span>
          </span>
        </span>

        {/* Real chair lane for that day */}
        <span className="block" aria-hidden>
          <span className="relative block h-10 border-y border-steel-2 bg-porcelain">
            {busy.map(([s, e], k) => (
              <span
                key={k}
                className="absolute inset-y-1"
                style={{
                  left: `${pct(s)}%`,
                  width: `${pct(e) - pct(s)}%`,
                  background: 'repeating-linear-gradient(135deg, var(--color-bone) 0 4px, var(--color-shell) 4px 5px)',
                }}
              />
            ))}
            <motion.span
              className="absolute inset-y-0 border"
              initial={false}
              animate={{
                backgroundColor: selected ? 'var(--color-clinic)' : 'rgba(221,230,222,0.6)',
                borderColor: selected ? 'var(--color-clinic-deep)' : 'var(--color-clinic)',
                scaleY: selected ? 1 : 0.8,
                x: 0,
              }}
              whileHover={reduce || selected ? undefined : { x: 3 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              style={{ left: `${pct(slot.startMin)}%`, width: `${pct(slot.startMin + duration) - pct(slot.startMin)}%` }}
            />
            {[600, 720, 840, 960].map((m) => (
              <span key={m} className="absolute -bottom-5 -translate-x-1/2 font-mono text-[9px] text-muted" style={{ left: `${pct(m)}%` }}>
                {formatTime(m)}
              </span>
            ))}
          </span>
          <span className="mt-6 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {chair.name}
            {chair.resources.includes('scanner') ? ' · scanner' : ''} · {clinician.name}
          </span>
        </span>

        <span className="flex items-center justify-between gap-3 md:justify-end">
          <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${selected ? 'text-clinic-deep' : 'text-muted group-hover:text-charcoal'}`}>
            {selected ? 'Held for you' : 'Choose'}
          </span>
          <span
            className={`grid size-7 place-items-center rounded-full border transition-colors ${selected ? 'border-clinic bg-clinic text-ivory' : 'border-steel'}`}
            aria-hidden
          >
            {selected ? '✓' : ''}
          </span>
        </span>
      </button>
    </li>
  )
}

function BandSkeleton() {
  return (
    <div className="border-t border-bone" aria-busy="true" aria-label="Checking the live schedule">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid items-center gap-8 border-b border-bone py-7 md:grid-cols-[200px_1fr_150px]">
          <div className="space-y-2">
            <div className="h-2.5 w-16 bg-bone" />
            <div className="h-9 w-28 bg-bone" />
          </div>
          <div className="relative h-10 overflow-hidden border-y border-bone bg-ivory">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white to-transparent" style={{ animation: 'sweep-x 1.4s infinite' }} />
          </div>
          <div />
        </div>
      ))}
      <p className="label mt-4">Checking clinicians, chairs and the live schedule…</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border-y border-alert/40 py-10">
      <p className="label mb-3 text-alert">Schedule unavailable</p>
      <p className="font-display text-2xl">{message}</p>
      <p className="mt-2 max-w-[520px] text-muted">
        Nothing has been booked. You can try again, or call the clinic on {CLINIC.phone} and we'll find a time with you.
      </p>
      <button className="btn-primary mt-6" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
