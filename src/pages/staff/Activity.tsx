import { useMemo, useState } from 'react'
import { ActivityStream, actorOf } from '../../staff/AuditTimeline'
import { EmptyState, ListSkeleton } from '../../staff/States'
import { useStaff } from '../../staff/StaffContext'

// Everything that happened, grouped into periods, with ORA's repeated
// automation folded so people's actions stand out.

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'people', label: 'People' },
  { id: 'ora', label: 'ORA automation' },
  { id: 'changes', label: 'Changes' },
] as const

export default function Activity() {
  const { view } = useStaff()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')

  const events = useMemo(() => {
    if (!view) return []
    const now = Date.now()
    return view.events
      .filter((e) => Date.parse(e.completed_at ?? e.created_at) <= now + 60000)
      .filter((e) => {
        const actor = actorOf(e)
        if (filter === 'people') return actor !== 'ORA'
        if (filter === 'ora') return actor === 'ORA'
        if (filter === 'changes') return ['rescheduled', 'cancelled', 'status_changed'].includes(e.event_type)
        return true
      })
      .map((e) => {
        const a = view.appointments.find((x) => x.id === e.appointment_id)
        return { ...e, patientName: a ? view.patients.get(a.patient_id)?.full_name : undefined }
      })
      .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at))
      .slice(0, 300)
  }, [view, filter])

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-24 pt-8 md:px-6 lg:px-10">
      <p className="label mb-3">Activity</p>
      <h1 className="display mb-8 text-[clamp(2.4rem,5vw,4rem)]">Who did what, and when.</h1>
      <div role="tablist" className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-bone pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`font-mono text-[11px] uppercase tracking-[0.14em] ${filter === f.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {!view ? <ListSkeleton rows={8} /> : events.length === 0 ? <EmptyState kind="done" title="Nothing here yet." /> : <ActivityStream events={events} />}
    </div>
  )
}
