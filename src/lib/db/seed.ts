import { APPOINTMENT_TYPES } from '../../data/appointmentTypes'
import { CHAIRS, CLINIC, CLINICIANS } from '../../data/clinic'
import { canPlace } from '../scheduling/availability'
import { addDays, addMinutesIso, toIso, wallNow, weekday } from '../time'
import type { Appointment, AppointmentEvent, IntakeResponse, Patient, TimeOff } from '../types'
import { bookingCode, uid } from './ids'

// Builds a believable, deterministic schedule around "today". The same day
// always produces the same seed, and roughly half of each chair's time is left
// open so demonstration slots are always available.

const NAMES = [
  'Amaka Obi', 'Chinedu Eze', 'Folake Adebayo', 'Ibrahim Musa', 'Zainab Bello', 'Tolu Ogunleye',
  'Ngozi Uche', 'Segun Alade', 'Halima Yusuf', 'Emeka Nnamdi', 'Funmi Coker', 'Kelechi Ibe',
  'Bisi Martins', 'Yemi Afolabi', 'Aisha Lawal', 'David Okon', 'Ruth Akpan', 'Samuel Etim',
  'Chioma Nwankwo', 'Musa Danjuma', 'Temi Oyelaran', 'Lara Williams', 'Obinna Chukwu', 'Hauwa Garba',
  'Kunle Bankole', 'Efe Omoregie', 'Nneka Okeke', 'Tobi Salami', 'Uche Madu', 'Sade Ajayi',
]

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)

export interface SeedData {
  patients: Patient[]
  appointments: Appointment[]
  intake_responses: IntakeResponse[]
  appointment_events: AppointmentEvent[]
  time_off: TimeOff[]
}

export function buildSeed(day: string, nowMs: number): SeedData {
  const rand = mulberry32(hash(day))
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  const createdAt = toIso(addDays(day, -7), 600)

  const patients: Patient[] = NAMES.map((full_name, i) => ({
    id: `pat-seed-${i}`,
    full_name,
    phone: `+234 80${(i % 9) + 1} ${String(3000 + i * 137).slice(0, 3)} ${String(1000 + i * 71).slice(0, 4)}`,
    email: i % 3 === 0 ? null : `${full_name.split(' ')[0].toLowerCase()}@example.com`,
    created_at: createdAt,
    is_demo: false,
  }))

  const appointments: Appointment[] = []
  const time_off: TimeOff[] = []
  const snap = { appointments, timeOff: time_off }

  for (let d = -1; d < CLINIC.horizonDays; d++) {
    const date = addDays(day, d)
    const hours = CLINIC.hours[weekday(date)]
    if (!hours) continue
    const busy = d <= 0 ? 0.35 : 0.5 // today is busier than the days ahead
    for (const chair of CHAIRS) {
      let cursor = hours[0]
      while (cursor < hours[1] - 30) {
        if (rand() < busy) {
          cursor += 15 * (2 + Math.floor(rand() * 5))
          continue
        }
        const types = APPOINTMENT_TYPES.filter((t) => chair.resources.includes(t.resource_type))
        const type = pick(types)
        const start_at = toIso(date, cursor)
        const clinician = CLINICIANS.find(
          (c) => canPlace(snap, { type, clinician_id: c.id, chair_id: chair.id, start_at }).ok,
        )
        if (!clinician) {
          cursor += 15
          continue
        }
        const end_at = addMinutesIso(start_at, type.duration_minutes)
        appointments.push({
          id: uid('apt'),
          booking_code: bookingCode(rand),
          patient_id: pick(patients).id,
          appointment_type_id: type.id,
          clinician_id: clinician.id,
          chair_id: chair.id,
          start_at,
          end_at,
          status: 'booked',
          is_demo: false,
          source: rand() < 0.7 ? 'online' : 'reception',
          reschedule_requested: false,
          created_at: createdAt,
          updated_at: createdAt,
        })
        cursor += type.duration_minutes + CLINIC.turnoverMinutes
        cursor = Math.ceil(cursor / 15) * 15
      }
    }
  }

  // Statuses relative to the current moment: the past is complete, the
  // present is in the chair, and arrivals are trickling in.
  let lateAssigned = false
  for (const a of appointments.sort((x, y) => x.start_at.localeCompare(y.start_at))) {
    const s = Date.parse(a.start_at)
    const e = Date.parse(a.end_at)
    if (e <= nowMs) a.status = rand() < 0.05 ? 'no_show' : 'complete'
    else if (s <= nowMs) {
      if (!lateAssigned && nowMs - s <= 40 * 60000 && nowMs - s >= 8 * 60000) {
        lateAssigned = true // left as booked: this patient is running late
      } else a.status = 'in_chair'
    } else if (s - nowMs <= 20 * 60000) a.status = rand() < 0.5 ? 'checked_in' : 'arrived'
  }

  // A clinician's late-notice time off tomorrow creates one genuine conflict for
  // reception to resolve.
  const tomorrow = [1, 2, 3].map((n) => addDays(day, n)).find((dt) => CLINIC.hours[weekday(dt)])
  if (tomorrow) {
    const clash = appointments.find((a) => a.start_at.startsWith(tomorrow) && a.status === 'booked')
    if (clash) {
      time_off.push({
        id: uid('off'),
        clinician_id: clash.clinician_id,
        start_at: clash.start_at,
        end_at: addMinutesIso(clash.start_at, 120),
        reason: 'Late-notice absence',
      })
    }
  }

  const upcoming = appointments.filter((a) => Date.parse(a.start_at) > nowMs && a.status === 'booked')
  const intake_responses: IntakeResponse[] = []
  const appointment_events: AppointmentEvent[] = []
  // A realistic handful of exceptions: a few missing forms in the next few
  // days and a couple of patients asking reception to call.
  let incompleteLeft = 3
  let reschedLeft = 2
  upcoming.forEach((a, i) => {
    const soon = Date.parse(a.start_at) - nowMs < 3 * 86400000
    const incomplete = soon && i % 4 === 1 && incompleteLeft-- > 0
    intake_responses.push({
      id: uid('int'),
      appointment_id: a.id,
      routing_category: 'routine',
      responses_json: {},
      complete: !incomplete,
      created_at: a.created_at,
    })
    if (i % 7 === 3 && reschedLeft-- > 0) a.reschedule_requested = true
  })

  for (const a of appointments) {
    const ev = (e: Omit<AppointmentEvent, 'id' | 'appointment_id' | 'created_at' | 'is_demo' | 'metadata'>) =>
      appointment_events.push({ ...e, id: uid('evt'), appointment_id: a.id, created_at: a.created_at, is_demo: false, metadata: {} })
    const remindAt = addMinutesIso(a.start_at, -24 * 60)
    ev({ event_type: 'booking_confirmed', label: 'Visit confirmed', status: 'done', scheduled_for: null, completed_at: a.created_at })
    ev({ event_type: 'confirmation_prepared', label: 'Confirmation message prepared', status: 'simulated', scheduled_for: null, completed_at: a.created_at })
    ev({
      event_type: 'reminder_scheduled',
      label: 'Reminder 24h before visit',
      status: Date.parse(remindAt) > nowMs ? 'scheduled' : 'simulated',
      scheduled_for: remindAt,
      completed_at: Date.parse(remindAt) > nowMs ? null : remindAt,
    })
    const intake = intake_responses.find((r) => r.appointment_id === a.id)
    if (intake && !intake.complete)
      ev({ event_type: 'intake_incomplete', label: 'Medical history form not returned', status: 'attention', scheduled_for: null, completed_at: null })
    if (a.reschedule_requested)
      ev({ event_type: 'reschedule_requested', label: 'Patient asked reception to call about a new time', status: 'attention', scheduled_for: null, completed_at: null })
  }

  return { patients, appointments, intake_responses, appointment_events, time_off }
}

export const seedDay = () => wallNow().date
