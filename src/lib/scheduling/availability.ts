import { typeById } from '../../data/appointmentTypes'
import { CHAIRS, CLINIC, CLINICIANS, chairById, clinicianById } from '../../data/clinic'
import { addDays, toIso, wallNow, weekday } from '../time'
import type { Appointment, AppointmentType, Slot, TimeOff } from '../types'

// Deterministic, resource-aware availability. A start time is only offered when
// a capable clinician is working and free, a compatible chair is free (with
// turnover), the clinician is not on time off, and the visit fits inside both
// clinic and clinician hours.

export interface Snapshot {
  appointments: Appointment[]
  timeOff: TimeOff[]
}

export type Preference = 'soonest' | 'morning' | 'afternoon' | 'late' | 'saturday'

export const PREFERENCES: { id: Preference; label: string }[] = [
  { id: 'soonest', label: 'Soonest' },
  { id: 'morning', label: 'Mornings' },
  { id: 'afternoon', label: 'Afternoons' },
  { id: 'late', label: 'After 4pm' },
  { id: 'saturday', label: 'Saturdays' },
]

const holds = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'no_show'
const overlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1
const MIN = 60000

export interface PlacementInput {
  type: AppointmentType
  clinician_id: string
  chair_id: string
  start_at: string
  excludeId?: string
}

export type PlacementResult = { ok: true } | { ok: false; reason: string }

export function canPlace(snap: Snapshot, p: PlacementInput): PlacementResult {
  const clinician = clinicianById(p.clinician_id)
  const chair = chairById(p.chair_id)
  if (!clinician?.active) return { ok: false, reason: 'Clinician unavailable' }
  if (!chair?.active) return { ok: false, reason: 'Chair inactive' }
  if (!clinician.capability_tags.includes(p.type.capability))
    return { ok: false, reason: `${clinician.name} doesn't take this visit type` }
  if (!chair.resources.includes(p.type.resource_type))
    return { ok: false, reason: `${chair.name} has no intraoral scanner` }

  const start = Date.parse(p.start_at)
  const end = start + p.type.duration_minutes * MIN
  const date = p.start_at.slice(0, 10)
  const startMin = Number(p.start_at.slice(11, 13)) * 60 + Number(p.start_at.slice(14, 16))
  const endMin = startMin + p.type.duration_minutes
  const day = weekday(date)

  const clinic = CLINIC.hours[day]
  if (!clinic || startMin < clinic[0] || endMin > clinic[1]) return { ok: false, reason: 'Outside studio hours' }
  const own = clinician.hours[day]
  if (!own || startMin < own[0] || endMin > own[1]) return { ok: false, reason: `${clinician.name} isn't working then` }

  for (const off of snap.timeOff) {
    if (off.clinician_id === p.clinician_id && overlap(start, end, Date.parse(off.start_at), Date.parse(off.end_at)))
      return { ok: false, reason: `${clinician.name} is on time off` }
  }

  const turnover = CLINIC.turnoverMinutes * MIN
  for (const a of snap.appointments) {
    if (a.id === p.excludeId || !holds(a)) continue
    const s = Date.parse(a.start_at)
    const e = Date.parse(a.end_at)
    if (a.clinician_id === p.clinician_id && overlap(start, end, s, e))
      return { ok: false, reason: `${clinician.name} is with another patient` }
    if (a.chair_id === p.chair_id && overlap(start, end + turnover, s, e + turnover))
      return { ok: false, reason: `${chair.name} is occupied` }
  }
  return { ok: true }
}

export interface FindOptions {
  fromDate?: string
  days?: number
  excludeId?: string
  nowMs?: number
}

export function findSlots(snap: Snapshot, typeId: string, opts: FindOptions = {}): Slot[] {
  const type = typeById(typeId)
  if (!type) return []
  const nowMs = opts.nowMs ?? Date.now()
  const from = opts.fromDate ?? wallNow().date
  const days = opts.days ?? CLINIC.horizonDays
  const earliest = nowMs + CLINIC.leadMinutes * MIN

  const clinicians = CLINICIANS.filter((c) => c.active && c.capability_tags.includes(type.capability))
  // Keep the scanner chair free for scan visits where possible.
  const chairs = CHAIRS.filter((c) => c.active && c.resources.includes(type.resource_type)).sort(
    (a, b) => a.resources.length - b.resources.length,
  )
  const slots: Slot[] = []

  for (let i = 0; i < days; i++) {
    const date = addDays(from, i)
    const hours = CLINIC.hours[weekday(date)]
    if (!hours) continue
    // Spread load: least-booked clinician that day is tried first.
    const load = new Map(clinicians.map((c) => [c.id, 0]))
    for (const a of snap.appointments) {
      if (holds(a) && a.start_at.startsWith(date) && load.has(a.clinician_id))
        load.set(a.clinician_id, load.get(a.clinician_id)! + 1)
    }
    const ordered = [...clinicians].sort((a, b) => load.get(a.id)! - load.get(b.id)!)

    for (let m = hours[0]; m + type.duration_minutes <= hours[1]; m += CLINIC.slotStepMinutes) {
      const start_at = toIso(date, m)
      if (Date.parse(start_at) < earliest) continue
      found: for (const c of ordered) {
        for (const ch of chairs) {
          const res = canPlace(snap, { type, clinician_id: c.id, chair_id: ch.id, start_at, excludeId: opts.excludeId })
          if (res.ok) {
            slots.push({
              date,
              startMin: m,
              start_at,
              end_at: toIso(date, m + type.duration_minutes),
              clinician_id: c.id,
              chair_id: ch.id,
            })
            break found
          }
        }
      }
    }
  }
  return slots
}

export const matchesPreference = (s: Slot, pref: Preference) => {
  switch (pref) {
    case 'morning':
      return s.startMin < 720
    case 'afternoon':
      return s.startMin >= 720 && s.startMin < 960
    case 'late':
      return s.startMin >= 960
    case 'saturday':
      return weekday(s.date) === 6
    default:
      return true
  }
}

/**
 * A short, varied list of the best feasible times: never more than one per
 * half-day, so the patient sees genuine choice rather than 15-minute noise.
 */
export function bestTimes(slots: Slot[], pref: Preference, count = 5): Slot[] {
  const picked: Slot[] = []
  const seen = new Set<string>()
  for (const s of slots) {
    if (!matchesPreference(s, pref)) continue
    const key = `${s.date}-${s.startMin < 780 ? 'am' : 'pm'}`
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(s)
    if (picked.length === count) break
  }
  return picked
}

/** Resource summary for ClinicianMatch: who and what can take this visit. */
export function capacityFor(type: AppointmentType) {
  return {
    clinicians: CLINICIANS.filter((c) => c.active && c.capability_tags.includes(type.capability)),
    chairs: CHAIRS.filter((c) => c.active && c.resources.includes(type.resource_type)),
  }
}
