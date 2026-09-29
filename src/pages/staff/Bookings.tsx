import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useMemo, useState } from 'react'
import { APPOINTMENT_TYPES, typeById } from '../../data/appointmentTypes'
import { CHAIRS, CLINICIANS, chairById, clinicianById } from '../../data/clinic'
import { ApiError, cancelBooking, sendReminders, statusLabel } from '../../lib/api'
import { formatDay, formatIsoTime, relativeDay, toWall, today } from '../../lib/time'
import type { Appointment, AppointmentStatus } from '../../lib/types'
import { EmptyState, GridSkeleton } from '../../staff/States'
import { ACCESS_NOTE, useStaff } from '../../staff/StaffContext'

type Scope = 'upcoming' | 'today' | 'past' | 'cancelled' | 'all'
type Field = 'clinician' | 'type' | 'chair' | 'status' | 'source'
interface Token {
  field: Field
  value: string
  negate: boolean
}
interface SavedView {
  name: string
  scope: Scope
  tokens: Token[]
}

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]

const STATUSES: AppointmentStatus[] = ['booked', 'arrived', 'checked_in', 'in_chair', 'complete', 'cancelled', 'no_show']
const FIELDS: { id: Field; label: string; options: { id: string; label: string }[] }[] = [
  { id: 'clinician', label: 'Clinician', options: CLINICIANS.map((c) => ({ id: c.id, label: c.name })) },
  { id: 'type', label: 'Visit', options: APPOINTMENT_TYPES.map((t) => ({ id: t.id, label: t.name })) },
  { id: 'chair', label: 'Chair', options: CHAIRS.map((c) => ({ id: c.id, label: c.name })) },
  { id: 'status', label: 'Status', options: STATUSES.map((s) => ({ id: s, label: statusLabel(s) })) },
  { id: 'source', label: 'Source', options: [{ id: 'online', label: 'Online' }, { id: 'reception', label: 'Reception' }] },
]
const fieldValue = (a: Appointment, f: Field) =>
  ({ clinician: a.clinician_id, type: a.appointment_type_id, chair: a.chair_id, status: a.status, source: a.source })[f]
const optionLabel = (t: Token) => FIELDS.find((f) => f.id === t.field)?.options.find((o) => o.id === t.value)?.label ?? t.value

const loadViews = (): SavedView[] => {
  try {
    return JSON.parse(localStorage.getItem('ora.views') ?? '[]') as SavedView[]
  } catch {
    return []
  }
}

const PAGE = 40

export default function Bookings() {
  const { view, error, refresh, openAppointment, access } = useStaff()
  const [scope, setScope] = useState<Scope>('upcoming')
  const [q, setQ] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [adding, setAdding] = useState<Field | 'menu' | null>(null)
  const [sort, setSort] = useState<{ by: 'when' | 'patient' | 'status'; dir: 1 | -1 }>({ by: 'when', dir: 1 })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(PAGE)
  const [views, setViews] = useState<SavedView[]>(loadViews)
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmBulkCancel, setConfirmBulkCancel] = useState(false)
  const t = today()

  const rows = useMemo(() => {
    if (!view) return []
    const s = q.trim().toLowerCase()
    return view.appointments
      .filter((a) => {
        const d = a.start_at.slice(0, 10)
        if (scope === 'upcoming' && (d < t || a.status === 'cancelled' || a.status === 'complete' || a.status === 'no_show')) return false
        if (scope === 'today' && d !== t) return false
        if (scope === 'past' && d >= t) return false
        if (scope === 'cancelled' && a.status !== 'cancelled') return false
        for (const tk of tokens) {
          const match = fieldValue(a, tk.field) === tk.value
          if (match === tk.negate) return false
        }
        if (s) {
          const p = view.patients.get(a.patient_id)
          const hay = `${p?.full_name} ${p?.phone.replace(/\s/g, '')} ${a.booking_code}`.toLowerCase()
          if (!hay.includes(s.replace(/\s/g, '')) && !hay.includes(s)) return false
        }
        return true
      })
      .sort((a, b) => {
        const d = sort.dir
        if (sort.by === 'patient') return d * (view.patients.get(a.patient_id)?.full_name ?? '').localeCompare(view.patients.get(b.patient_id)?.full_name ?? '')
        if (sort.by === 'status') return d * (STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status))
        return d * (scope === 'past' ? -1 : 1) * a.start_at.localeCompare(b.start_at)
      })
  }, [view, scope, tokens, q, sort, t])

  if (error && !view) return <Pad><EmptyState kind="error" title="Bookings are unreachable." body={error} action={<button className="btn-primary" onClick={() => refresh()}>Try again</button>} /></Pad>

  const shown = rows.slice(0, limit)
  const days = [...new Set(rows.map((a) => a.start_at.slice(0, 10)))]
  const perDay = new Map(days.map((d) => [d, rows.filter((a) => a.start_at.startsWith(d)).length]))
  const maxDay = Math.max(1, ...perDay.values())
  const grouped = sort.by === 'when'
  const allShownSelected = shown.length > 0 && shown.every((a) => selected.has(a.id))

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map((a) => a.id)))
  const addToken = (field: Field, value: string) => {
    setTokens((ts) => [...ts.filter((x) => !(x.field === field && x.value === value)), { field, value, negate: false }])
    setAdding(null)
    setLimit(PAGE)
  }
  const saveView = () => {
    const name = `${SCOPES.find((s) => s.id === scope)?.label}${tokens.length ? ' · ' + tokens.map(optionLabel).join(', ') : ''}`
    const next = [...views.filter((v) => v.name !== name), { name, scope, tokens }].slice(-6)
    setViews(next)
    try {
      localStorage.setItem('ora.views', JSON.stringify(next))
    } catch {
      // Saved views are a convenience only.
    }
  }
  const exportCsv = () => {
    if (!view) return
    const list = rows.filter((a) => selected.has(a.id))
    const header = ['Booking code', 'Date', 'Time', 'Patient', 'Phone', 'Visit', 'Clinician', 'Chair', 'Status', 'Source']
    const lines = list.map((a) => {
      const p = view.patients.get(a.patient_id)
      return [a.booking_code, a.start_at.slice(0, 10), formatIsoTime(a.start_at), p?.full_name, p?.phone, typeById(a.appointment_type_id)?.name, clinicianById(a.clinician_id)?.name, chairById(a.chair_id)?.name, statusLabel(a.status), a.source]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    })
    const url = URL.createObjectURL(new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ora-bookings-${t}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setFlash({ text: `Exported ${list.length} bookings.`, ok: true })
  }
  const bulk = async (kind: 'remind' | 'cancel') => {
    const ids = [...selected]
    try {
      if (kind === 'remind') {
        await sendReminders(ids)
        setFlash({ text: `${ids.length} reminders prepared (demo — not sent).`, ok: true })
      } else {
        for (const id of ids) {
          const a = view?.appointments.find((x) => x.id === id)
          if (a && a.status !== 'cancelled') await cancelBooking(a.booking_code, 'reception')
        }
        setFlash({ text: `${ids.length} visits cancelled. Chair time released.`, ok: true })
        setSelected(new Set())
        setConfirmBulkCancel(false)
      }
    } catch (e) {
      setFlash({ text: e instanceof ApiError ? e.message : 'Bulk action stopped part-way. Check the list.', ok: false })
    }
  }

  const SortHead = ({ by, children }: { by: 'when' | 'patient' | 'status'; children: string }) => (
    <button
      className={`label inline-flex items-center gap-1 text-[10px] ${sort.by === by ? 'text-charcoal' : ''}`}
      onClick={() => setSort((s) => ({ by, dir: s.by === by ? ((-s.dir) as 1 | -1) : 1 }))}
      aria-sort={sort.by === by ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
    >
      {children} {sort.by === by ? (sort.dir === 1 ? '↑' : '↓') : ''}
    </button>
  )

  return (
    <Pad>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-3">Bookings</p>
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)]">Every visit, one ledger.</h1>
        </div>
      </div>

      {/* Scope + search */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-bone pb-3">
        <div role="tablist" aria-label="Scope" className="-mb-3 flex gap-5 overflow-x-auto">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={scope === s.id}
              onClick={() => {
                setScope(s.id)
                setLimit(PAGE)
                setSelected(new Set())
              }}
              className={`relative whitespace-nowrap pb-3 font-mono text-[11px] uppercase tracking-[0.14em] ${scope === s.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
            >
              {s.label}
              {scope === s.id && <motion.span layoutId="scope-line" className="absolute inset-x-0 bottom-0 h-px bg-charcoal" />}
            </button>
          ))}
        </div>
        <input className="field !w-full !py-1.5 !text-base sm:!w-[280px]" placeholder="Name, phone or code" aria-label="Search bookings" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} />
      </div>

      {/* Spatial filter tokens */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <AnimatePresence>
          {tokens.map((tk, i) => (
            <motion.span
              key={`${tk.field}-${tk.value}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`inline-flex items-center border text-[12.5px] ${tk.negate ? 'border-alert/50 bg-alert-soft/40' : 'border-steel-2 bg-ivory'}`}
            >
              <span className="label px-2 text-[9.5px]">{FIELDS.find((f) => f.id === tk.field)?.label}</span>
              <button
                className={`border-x px-2 py-1 font-mono text-[10px] uppercase ${tk.negate ? 'border-alert/40 text-alert' : 'border-steel-2 text-muted'}`}
                onClick={() => setTokens((ts) => ts.map((x, k) => (k === i ? { ...x, negate: !x.negate } : x)))}
                title="Toggle is / is not"
              >
                {tk.negate ? 'is not' : 'is'}
              </button>
              <span className="px-2">{optionLabel(tk)}</span>
              <button className="px-2 py-1 text-muted hover:text-alert" aria-label={`Remove filter ${optionLabel(tk)}`} onClick={() => setTokens((ts) => ts.filter((_, k) => k !== i))}>
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <div className="relative">
          <button className="btn-quiet !py-1" onClick={() => setAdding(adding ? null : 'menu')} aria-expanded={!!adding}>
            + Filter
          </button>
          <AnimatePresence>
            {adding && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setAdding(null)} aria-hidden />
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="porcelain-surface absolute left-0 top-9 z-30 max-h-[320px] w-[260px] overflow-y-auto p-2">
                  {adding === 'menu'
                    ? FIELDS.map((f) => (
                        <button key={f.id} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-bone/60" onClick={() => setAdding(f.id)}>
                          {f.label} <span className="text-muted">›</span>
                        </button>
                      ))
                    : FIELDS.find((f) => f.id === adding)!.options.map((o) => (
                        <button key={o.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-bone/60" onClick={() => addToken(adding as Field, o.id)}>
                          {o.label}
                        </button>
                      ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        {(tokens.length > 0 || scope !== 'upcoming') && (
          <button className="label ml-1 underline underline-offset-4 hover:text-charcoal" onClick={saveView}>
            Save view
          </button>
        )}
        {tokens.length > 0 && (
          <button className="label ml-1 hover:text-alert" onClick={() => setTokens([])}>
            Clear
          </button>
        )}
        {views.length > 0 && (
          <span className="ml-auto flex flex-wrap items-center gap-3">
            <span className="label text-[9.5px]">Views</span>
            {views.map((v) => (
              <button key={v.name} className="text-[12.5px] underline decoration-steel-2 underline-offset-4 hover:decoration-charcoal" onClick={() => (setScope(v.scope), setTokens(v.tokens))}>
                {v.name}
              </button>
            ))}
          </span>
        )}
      </div>

      {flash && (
        <p role="status" className={`mb-4 border-l-2 pl-3 text-sm ${flash.ok ? 'border-clinic text-clinic-deep' : 'border-alert text-alert'}`}>
          {flash.text}
        </p>
      )}

      {/* Dataset navigator */}
      {view && rows.length > 0 && grouped && days.length > 1 && (
        <div className="mb-6 flex items-end gap-[3px] overflow-x-auto pb-1" aria-label="Jump to day">
          {days.map((d) => (
            <button
              key={d}
              title={`${formatDay(d, 'long')} · ${perDay.get(d)} visits`}
              onClick={() => {
                const idx = rows.findIndex((a) => a.start_at.startsWith(d))
                if (idx >= limit) setLimit(Math.ceil((idx + 1) / PAGE) * PAGE)
                window.setTimeout(() => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
              }}
              className="group flex w-7 shrink-0 flex-col items-center gap-1"
            >
              <span className={`w-[3px] ${d === t ? 'bg-clinic' : 'bg-graphite group-hover:bg-clinic'}`} style={{ height: 4 + (perDay.get(d)! / maxDay) * 26 }} />
              <span className="font-mono text-[9px] text-muted">{Number(d.slice(8))}</span>
            </button>
          ))}
        </div>
      )}

      {!view ? (
        <GridSkeleton />
      ) : rows.length === 0 ? (
        tokens.length || q ? (
          <EmptyState kind="filtered" title="No bookings match." body="Nothing fits this combination of filters and search." action={<button className="btn-quiet" onClick={() => (setTokens([]), setQ(''))}>Clear filters</button>} />
        ) : (
          <EmptyState kind={scope === 'cancelled' ? 'done' : 'first-use'} title={scope === 'cancelled' ? 'No cancellations.' : 'No bookings here yet.'} body="New bookings appear here the moment they’re made — online or at the desk." />
        )
      ) : (
        <>
          {/* Desktop grid */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="sticky top-16 z-10 bg-porcelain">
              <tr className="border-y border-steel-2">
                <th className="w-8 py-2">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="Select all shown" className="accent-[var(--color-charcoal)]" />
                </th>
                <th className="w-[92px]"><SortHead by="when">When</SortHead></th>
                <th><SortHead by="patient">Patient</SortHead></th>
                <th className="label text-[10px] font-normal">Visit</th>
                <th className="label hidden text-[10px] font-normal lg:table-cell">Clinician</th>
                <th className="label text-[10px] font-normal">Chair</th>
                <th><SortHead by="status">Status</SortHead></th>
                <th className="label hidden text-[10px] font-normal xl:table-cell">Code</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {shown.map((a, i) => {
                const d = a.start_at.slice(0, 10)
                const newDay = grouped && (i === 0 || shown[i - 1].start_at.slice(0, 10) !== d)
                const p = view.patients.get(a.patient_id)
                const open = expanded === a.id
                return (
                  <Fragment key={a.id}>
                    {newDay && (
                      <tr id={`day-${d}`} className="scroll-mt-28">
                        <td colSpan={9} className="pb-2 pt-6">
                          <span className="font-display text-xl">{relativeDay(d, 'long')}</span>
                          <span className="label ml-3 text-[9.5px]">
                            {formatDay(d)} · {perDay.get(d)} visits
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr className={`border-b border-bone transition-colors ${selected.has(a.id) ? 'bg-clinic-soft/40' : 'hover:bg-ivory/70'} ${a.status === 'cancelled' ? 'text-muted' : ''}`}>
                      <td className="py-3">
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${p?.full_name}`} className="accent-[var(--color-charcoal)]" />
                      </td>
                      <td className="font-mono">
                        {grouped ? formatIsoTime(a.start_at) : `${formatDay(d)} ${formatIsoTime(a.start_at)}`}
                      </td>
                      <td>
                        <button className="text-left hover:text-clinic-deep" onClick={() => openAppointment(a.id)}>
                          <span className={`block ${a.status === 'cancelled' ? 'line-through' : ''}`}>{p?.full_name}</span>
                          <span className="font-mono text-[11px] text-muted">{p?.phone}</span>
                        </button>
                      </td>
                      <td>{typeById(a.appointment_type_id)?.short}</td>
                      <td className="hidden lg:table-cell">{clinicianById(a.clinician_id)?.name}</td>
                      <td>{chairById(a.chair_id)?.name.replace('Chair ', 'C')}</td>
                      <td>
                        <StatusTag a={a} />
                      </td>
                      <td className="hidden font-mono text-[11px] text-muted xl:table-cell">{a.booking_code}</td>
                      <td>
                        <button className="grid size-7 place-items-center text-muted hover:text-charcoal" aria-expanded={open} aria-label="Expand row" onClick={() => setExpanded(open ? null : a.id)}>
                          <motion.span animate={{ rotate: open ? 180 : 0 }}>▾</motion.span>
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-bone bg-ivory/60">
                        <td />
                        <td colSpan={8} className="py-4">
                          <RowDetail a={a} onOpen={() => openAppointment(a.id)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {/* Phone cards */}
          <ul className="space-y-3 md:hidden">
            {shown.map((a, i) => {
              const d = a.start_at.slice(0, 10)
              const p = view.patients.get(a.patient_id)
              return (
                <Fragment key={a.id}>
                  {grouped && (i === 0 || shown[i - 1].start_at.slice(0, 10) !== d) && (
                    <li id={`day-${d}`} className="scroll-mt-24 pt-4 font-display text-xl">
                      {relativeDay(d, 'long')}
                    </li>
                  )}
                  <li className={`border bg-ivory p-4 ${selected.has(a.id) ? 'border-clinic' : 'border-bone'}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${p?.full_name}`} className="mt-1 accent-[var(--color-charcoal)]" />
                      <button className="flex-1 text-left" onClick={() => openAppointment(a.id)}>
                        <span className="flex items-baseline justify-between">
                          <span className="font-display text-2xl">{formatIsoTime(a.start_at)}</span>
                          <StatusTag a={a} />
                        </span>
                        <span className="mt-1 block">{p?.full_name}</span>
                        <span className="block text-sm text-muted">
                          {typeById(a.appointment_type_id)?.short} · {chairById(a.chair_id)?.name} · {clinicianById(a.clinician_id)?.name}
                        </span>
                      </button>
                    </div>
                  </li>
                </Fragment>
              )
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="label">
              Showing {shown.length} of {rows.length}
            </p>
            {rows.length > shown.length && (
              <button className="btn-quiet" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown.length)} more
              </button>
            )}
          </div>
        </>
      )}

      {/* Bulk action workspace */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-3 bottom-20 z-30 mx-auto flex max-w-[760px] flex-wrap items-center gap-x-5 gap-y-2 bg-charcoal px-5 py-3.5 text-ivory shadow-2xl lg:bottom-6"
            role="region"
            aria-label="Bulk actions"
          >
            <span className="font-display text-xl">{selected.size}</span>
            <span className="label mr-auto text-[10px] !text-steel-2">selected</span>
            <button className="font-mono text-[11px] uppercase tracking-[0.12em] hover:text-clinic-soft disabled:opacity-30" disabled={access('remind') !== 'full'} onClick={() => bulk('remind')}>
              Prepare reminders
            </button>
            <button className="font-mono text-[11px] uppercase tracking-[0.12em] hover:text-clinic-soft" onClick={exportCsv}>
              Export CSV
            </button>
            {confirmBulkCancel ? (
              <button className="font-mono text-[11px] uppercase tracking-[0.12em] text-alert-soft underline" onClick={() => bulk('cancel')}>
                Confirm cancel {selected.size}
              </button>
            ) : (
              <button
                className="font-mono text-[11px] uppercase tracking-[0.12em] hover:text-alert-soft disabled:opacity-30"
                disabled={access('cancel') !== 'full'}
                title={access('cancel') !== 'full' ? ACCESS_NOTE.readonly : undefined}
                onClick={() => setConfirmBulkCancel(true)}
              >
                Cancel visits
              </button>
            )}
            <button className="font-mono text-[11px] uppercase tracking-[0.12em] text-steel-2 hover:text-ivory" onClick={() => (setSelected(new Set()), setConfirmBulkCancel(false))}>
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Pad>
  )
}

const Pad = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-[1400px] px-4 pb-32 pt-8 md:px-6 lg:px-10">{children}</div>

function StatusTag({ a }: { a: Appointment }) {
  const tone =
    a.status === 'cancelled' || a.status === 'no_show'
      ? 'text-alert'
      : a.status === 'in_chair' || a.status === 'checked_in' || a.status === 'arrived'
        ? 'text-clinic-deep'
        : a.status === 'complete'
          ? 'text-muted'
          : 'text-charcoal'
  const late = a.status === 'booked' && Date.parse(a.start_at) < Date.now() - 5 * 60000 && Date.parse(a.end_at) > Date.now()
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${late ? 'text-alert' : tone}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {late ? 'Late' : statusLabel(a.status)}
      {a.reschedule_requested && <span className="text-alert">· call</span>}
    </span>
  )
}

function RowDetail({ a, onOpen }: { a: Appointment; onOpen: () => void }) {
  const { view } = useStaff()
  const intake = view?.intake.get(a.id)
  const events = (view?.events ?? []).filter((e) => e.appointment_id === a.id).sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 3)
  const w = toWall(a.start_at)
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr_auto]">
      <div>
        <p className="label mb-2 text-[9.5px]">Visit</p>
        <p>
          {typeById(a.appointment_type_id)?.name} · {formatDay(w.date, 'long')} {formatIsoTime(a.start_at)}—{formatIsoTime(a.end_at)}
        </p>
        {intake && (
          <p className="mt-2 text-muted">
            Intake: {intake.routing_category} route{intake.complete ? '' : ' · incomplete'}
          </p>
        )}
      </div>
      <div>
        <p className="label mb-2 text-[9.5px]">Latest</p>
        <ul className="space-y-1">
          {events.map((e) => (
            <li key={e.id} className="text-[13px]">
              {e.label}
              {e.status === 'simulated' && <span className="text-clinic-deep"> · demo</span>}
            </li>
          ))}
        </ul>
      </div>
      <button className="btn-quiet self-start" onClick={onOpen}>
        Full details →
      </button>
    </div>
  )
}
