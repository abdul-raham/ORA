import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APPOINTMENT_TYPES } from '../data/appointmentTypes'
import { chairById } from '../data/clinic'
import { findSlots } from '../lib/scheduling/availability'
import { formatIsoTime, formatTime, relativeDay, toWall, today } from '../lib/time'
import { STAFF_NAV } from './LivingSidebar'
import { useStaff } from './StaffContext'

// ⌘K / Ctrl+K: navigate, act, find people and visits, ask for the next free
// time for any visit type, or do quick duration arithmetic.

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  run: () => void
}

const calc = (q: string) => {
  const expr = q.replace(/x/gi, '*').replace(/\s/g, '')
  if (!/^[\d+\-*/().]+$/.test(expr) || !/[+\-*/]/.test(expr)) return null
  try {
    const v = Function(`"use strict";return (${expr})`)() as number
    return Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, view, openAppointment, openNewBooking, lock, access } = useStaff()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(!paletteOpen)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [paletteOpen, setPaletteOpen])
  useEffect(() => {
    if (paletteOpen) {
      setQ('')
      setIdx(0)
      window.setTimeout(() => input.current?.focus(), 30)
    }
  }, [paletteOpen])

  const close = () => setPaletteOpen(false)
  const items = useMemo<Item[]>(() => {
    const s = q.trim().toLowerCase()
    const out: Item[] = []
    const math = calc(s)
    if (math !== null) out.push({ id: 'calc', group: 'Calculate', label: `${q.trim()} = ${math}`, hint: math > 0 && Number.isInteger(math) ? `${Math.floor(math / 60)}h ${math % 60}m` : undefined, run: close })

    if (view && s.length >= 3) {
      const type = APPOINTMENT_TYPES.find((t) => t.name.toLowerCase().includes(s.replace(/^next\s+/, '')) || t.short.toLowerCase().includes(s.replace(/^next\s+/, '')))
      if (type) {
        const slot = findSlots({ appointments: view.appointments, timeOff: view.timeOff }, type.id, { days: 14 })[0]
        out.push({
          id: 'next-' + type.id,
          group: 'Availability',
          label: slot ? `Next free ${type.name}: ${relativeDay(slot.date)} ${formatTime(slot.startMin)}` : `No free ${type.name} in 14 days`,
          hint: slot ? `${chairById(slot.chair_id)?.name} · book →` : undefined,
          run: () => {
            if (slot && access('book') === 'full') openNewBooking({ typeSlug: type.slug })
            close()
          },
        })
      }
    }

    const actions: Item[] = [
      ...STAFF_NAV.map((n) => ({ id: 'nav' + n.to, group: 'Go to', label: n.label, run: () => (navigate(n.to), close()) })),
      ...(access('book') === 'full' ? [{ id: 'new', group: 'Actions', label: 'New booking', hint: 'phone or walk-in', run: () => (openNewBooking(), close()) }] : []),
      { id: 'lock', group: 'Actions', label: 'Lock studio', run: () => (close(), lock('You locked the studio.')) },
      { id: 'site', group: 'Actions', label: 'Open public site', run: () => (navigate('/'), close()) },
    ]
    out.push(...actions.filter((a) => !s || a.label.toLowerCase().includes(s)))

    if (view && s.length >= 2) {
      const pats = [...view.patients.values()].filter((p) => p.full_name.toLowerCase().includes(s) || p.phone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 5)
      out.push(...pats.map((p) => ({ id: 'p' + p.id, group: 'Patients', label: p.full_name, hint: p.phone, run: () => (navigate(`/staff/patients?id=${p.id}`), close()) })))
      const t = today()
      const visits = view.appointments
        .filter((a) => a.booking_code.toLowerCase().includes(s) || (view.patients.get(a.patient_id)?.full_name.toLowerCase().includes(s) && a.start_at.slice(0, 10) >= t))
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
        .slice(0, 5)
      out.push(
        ...visits.map((a) => ({
          id: 'a' + a.id,
          group: 'Visits',
          label: `${view.patients.get(a.patient_id)?.full_name} · ${relativeDay(toWall(a.start_at).date)} ${formatIsoTime(a.start_at)}`,
          hint: a.booking_code,
          run: () => (openAppointment(a.id), close()),
        })),
      )
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, view, access])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setIdx((i) => Math.min(items.length - 1, i + 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setIdx((i) => Math.max(0, i - 1)))
    else if (e.key === 'Enter') items[idx]?.run()
    else if (e.key === 'Escape') close()
  }

  let lastGroup = ''
  return (
    <AnimatePresence>
      {paletteOpen && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-charcoal/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="porcelain-surface fixed inset-x-3 top-[12vh] z-[61] mx-auto max-w-[620px]"
          >
            <div className="flex items-center gap-3 border-b border-bone px-5">
              <svg viewBox="0 0 16 16" className="size-4 text-muted" aria-hidden>
                <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setIdx(0)
                }}
                onKeyDown={onKey}
                placeholder="Search, or try “next whitening”, “ORA-”, “3 x 45”"
                className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-steel"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={items[idx] ? `pi-${items[idx].id}` : undefined}
              />
              <kbd className="font-mono text-[10px] text-steel">Esc</kbd>
            </div>
            <ul id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto py-2">
              {items.length === 0 && <li className="px-5 py-6 text-sm text-muted">No matches. Try a patient name, a booking code or a visit type.</li>}
              {items.map((it, i) => {
                const header = it.group !== lastGroup
                lastGroup = it.group
                return (
                  <li key={it.id} role="presentation">
                    {header && <p className="label px-5 pb-1 pt-3 text-[9.5px]">{it.group}</p>}
                    <button
                      id={`pi-${it.id}`}
                      role="option"
                      aria-selected={i === idx}
                      onMouseEnter={() => setIdx(i)}
                      onClick={it.run}
                      className={`flex w-full items-center justify-between gap-4 px-5 py-2.5 text-left ${i === idx ? 'bg-bone/60' : ''}`}
                    >
                      <span className="truncate">{it.label}</span>
                      {it.hint && <span className="shrink-0 font-mono text-[10px] text-muted">{it.hint}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="label flex gap-4 border-t border-bone px-5 py-2.5 text-[9px]">
              <span>↑↓ move</span>
              <span>↵ open</span>
              <span>esc close</span>
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
