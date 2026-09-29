import { typeById, typeBySlug } from '../data/appointmentTypes'
import { CLINICIANS, chairById, clinicianById } from '../data/clinic'
import { bookingCode, uid } from './db/ids'
import { read, resetDemo as resetStore, write } from './db/store'
import { canPlace, findSlots, type FindOptions, type Snapshot } from './scheduling/availability'
import { currentStaff } from './auth'
import { addMinutesIso, formatIsoTime, nowIso, relativeDay, toWall } from './time'
import type {
  Appointment,
  AppointmentEvent,
  AppointmentStatus,
  ConcernId,
  EventStatus,
  EventType,
  IntakeResponse,
  Patient,
  Slot,
} from './types'

// Async API over the local store. Every UI path goes through here, so the
// latency, failure and conflict states are the same ones a hosted backend
// would produce.

export class ApiError extends Error {
  readonly kind: 'unavailable' | 'conflict' | 'not_found' | 'invalid'
  constructor(kind: ApiError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

const outage = () => {
  try {
    return localStorage.getItem('ora.simulateOutage') === '1'
  } catch {
    return false
  }
}

async function call<T>(fn: () => T, latency = 280): Promise<T> {
  await new Promise((r) => setTimeout(r, latency + Math.random() * 180))
  if (outage()) throw new ApiError('unavailable', 'The ORA schedule is unreachable right now.')
  return fn()
}

const snapshot = (): Snapshot => {
  const db = read()
  return { appointments: db.appointments, timeOff: db.time_off }
}

function addEvent(
  appointment_id: string,
  event_type: EventType,
  label: string,
  status: EventStatus,
  extra: Partial<Pick<AppointmentEvent, 'scheduled_for' | 'completed_at' | 'metadata'>> & { actor?: string } = {},
): AppointmentEvent {
  const now = nowIso()
  // Who did it: the signed-in staff member, the patient, or ORA itself.
  const actor =
    extra.actor ??
    (status === 'simulated' || event_type === 'reminder_scheduled' || event_type === 'prep_shared' ? 'ORA' : currentStaff()?.name ?? 'Patient')
  return {
    id: uid('evt'),
    appointment_id,
    event_type,
    label,
    status,
    scheduled_for: extra.scheduled_for ?? null,
    completed_at: extra.completed_at ?? (status === 'done' || status === 'simulated' ? now : null),
    metadata: { ...extra.metadata, actor },
    created_at: now,
    is_demo: true,
  }
}

// ——— Availability ———

export interface ChairFlowData {
  slots: Slot[]
  /** date → chair id → occupied [startMin, endMin] windows, anonymised. */
  busy: Record<string, Record<string, [number, number][]>>
}

export const getAvailability = (typeId: string, opts: FindOptions = {}) =>
  call((): ChairFlowData => {
    const snap = snapshot()
    const slots = findSlots(snap, typeId, opts)
    const busy: ChairFlowData['busy'] = {}
    for (const a of snap.appointments) {
      if (a.id === opts.excludeId || a.status === 'cancelled' || a.status === 'no_show') continue
      const s = toWall(a.start_at)
      const e = toWall(a.end_at)
      ;((busy[s.date] ??= {})[a.chair_id] ??= []).push([s.minutes, e.minutes])
    }
    return { slots, busy }
  }, 420)

// ——— Booking ———

export interface BookingInput {
  typeSlug: string
  slot: Slot
  patient: { full_name: string; phone: string; email: string }
  /** Book for a patient already on file (reception). */
  patientId?: string
  source?: 'online' | 'reception'
  intake: { routing_category: ConcernId; responses: Record<string, unknown>; complete: boolean }
}

export const createBooking = (input: BookingInput) =>
  call(() => {
    const type = typeBySlug(input.typeSlug)
    if (!type) throw new ApiError('invalid', 'Unknown appointment type.')
    const placement = canPlace(snapshot(), {
      type,
      clinician_id: input.slot.clinician_id,
      chair_id: input.slot.chair_id,
      start_at: input.slot.start_at,
    })
    if (!placement.ok) throw new ApiError('conflict', 'That time was just taken. Here are the nearest alternatives.')

    const now = nowIso()
    const source = input.source ?? 'online'
    const existing = input.patientId ? read().patients.find((p) => p.id === input.patientId) : undefined
    const who = source === 'online' ? 'Patient' : currentStaff()?.name ?? 'Reception'
    const patient: Patient = existing ?? {
      id: uid('pat'),
      full_name: input.patient.full_name.trim(),
      phone: input.patient.phone.trim(),
      email: input.patient.email.trim() || null,
      created_at: now,
      is_demo: true,
    }
    const appointment: Appointment = {
      id: uid('apt'),
      booking_code: bookingCode(),
      patient_id: patient.id,
      appointment_type_id: type.id,
      clinician_id: input.slot.clinician_id,
      chair_id: input.slot.chair_id,
      start_at: input.slot.start_at,
      end_at: input.slot.end_at,
      status: 'booked',
      is_demo: true,
      source,
      reschedule_requested: false,
      created_at: now,
      updated_at: now,
    }
    const remindAt = addMinutesIso(appointment.start_at, -24 * 60)
    const events = [
      addEvent(
        appointment.id,
        'intake_received',
        source === 'online' ? `Intake received · ${input.intake.routing_category} route` : 'Booked by reception',
        'done',
        { actor: who },
      ),
      addEvent(appointment.id, 'booking_confirmed', `Visit confirmed · ${chairById(appointment.chair_id)?.name}`, 'done', { actor: who }),
      addEvent(appointment.id, 'confirmation_prepared', `Confirmation prepared for ${patient.phone}`, 'simulated'),
      addEvent(appointment.id, 'prep_shared', 'Pre-visit guidance attached to CarePass', 'done'),
      addEvent(
        appointment.id,
        'reminder_scheduled',
        'Reminder 24h before visit',
        Date.parse(remindAt) > Date.now() ? 'scheduled' : 'simulated',
        { scheduled_for: remindAt },
      ),
    ]
    if (!input.intake.complete)
      events.push(addEvent(appointment.id, 'intake_incomplete', 'Optional intake details skipped', 'attention'))

    write((db) => {
      if (!existing) db.patients.push(patient)
      db.appointments.push(appointment)
      db.intake_responses.push({
        id: uid('int'),
        appointment_id: appointment.id,
        routing_category: input.intake.routing_category,
        responses_json: input.intake.responses,
        complete: input.intake.complete,
        created_at: now,
      })
      db.appointment_events.push(...events)
    })
    return appointment.booking_code
  }, 650)

export interface BookingDetail {
  appointment: Appointment
  patient: Patient
  events: AppointmentEvent[]
}

const detail = (code: string): BookingDetail => {
  const db = read()
  const appointment = db.appointments.find((a) => a.booking_code.toUpperCase() === code.trim().toUpperCase())
  if (!appointment) throw new ApiError('not_found', 'We could not find a visit with that code.')
  const patient = db.patients.find((p) => p.id === appointment.patient_id)!
  const events = db.appointment_events
    .filter((e) => e.appointment_id === appointment.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return { appointment, patient, events }
}

export const getBooking = (code: string) => call(() => detail(code))

export const rescheduleBooking = (code: string, slot: Slot, by: 'patient' | 'reception' = 'patient') =>
  call(() => {
    const { appointment } = detail(code)
    const type = typeById(appointment.appointment_type_id)!
    const ok = canPlace(snapshot(), {
      type,
      clinician_id: slot.clinician_id,
      chair_id: slot.chair_id,
      start_at: slot.start_at,
      excludeId: appointment.id,
    })
    if (!ok.ok) throw new ApiError('conflict', 'That time was just taken — please pick another.')
    const from = `${relativeDay(toWall(appointment.start_at).date)} ${formatIsoTime(appointment.start_at)}`
    const to = `${relativeDay(slot.date)} ${formatIsoTime(slot.start_at)}`
    write((db) => {
      const a = db.appointments.find((x) => x.id === appointment.id)!
      Object.assign(a, {
        start_at: slot.start_at,
        end_at: slot.end_at,
        clinician_id: slot.clinician_id,
        chair_id: slot.chair_id,
        reschedule_requested: false,
        updated_at: nowIso(),
      })
      const remindAt = addMinutesIso(slot.start_at, -24 * 60)
      for (const e of db.appointment_events) {
        if (e.appointment_id !== a.id) continue
        if (e.event_type === 'reminder_scheduled' && e.status === 'scheduled') {
          e.scheduled_for = remindAt
          e.label = 'Reminder 24h before visit · moved'
        }
        if (e.event_type === 'reschedule_requested' && e.status === 'attention') e.status = 'done'
      }
      db.appointment_events.push(
        addEvent(a.id, 'rescheduled', `Rescheduled by ${by} · ${from} → ${to}`, 'done', {
          metadata: { from, to },
          actor: by === 'patient' ? 'Patient' : undefined,
        }),
        addEvent(a.id, 'confirmation_prepared', 'Updated confirmation prepared', 'simulated'),
      )
    })
    return detail(code)
  }, 600)

export const cancelBooking = (code: string, by: 'patient' | 'reception' = 'patient') =>
  call(() => {
    const { appointment } = detail(code)
    write((db) => {
      const a = db.appointments.find((x) => x.id === appointment.id)!
      a.status = 'cancelled'
      a.updated_at = nowIso()
      for (const e of db.appointment_events)
        if (e.appointment_id === a.id && e.status === 'scheduled') e.status = 'done'
      db.appointment_events.push(
        addEvent(a.id, 'cancelled', `Cancelled by ${by} · chair time released`, 'done', { actor: by === 'patient' ? 'Patient' : undefined }),
      )
    })
    return detail(code)
  })

// ——— Staff ———

export interface StaffView {
  appointments: Appointment[]
  patients: Map<string, Patient>
  events: AppointmentEvent[]
  timeOff: Snapshot['timeOff']
  incompleteIntake: Set<string>
  intake: Map<string, IntakeResponse>
}

export const getStaffView = () =>
  call(() => {
    const db = read()
    return {
      appointments: db.appointments,
      patients: new Map(db.patients.map((p) => [p.id, p])),
      events: db.appointment_events,
      timeOff: db.time_off,
      incompleteIntake: new Set(db.intake_responses.filter((r) => !r.complete).map((r) => r.appointment_id)),
      intake: new Map(db.intake_responses.map((r) => [r.appointment_id, r])),
    } satisfies StaffView
  }, 200)

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  arrived: 'Arrived',
  checked_in: 'Checked in',
  in_chair: 'In chair',
  complete: 'Complete',
  cancelled: 'Cancelled',
  no_show: 'Did not attend',
}
export const statusLabel = (s: AppointmentStatus) => STATUS_LABEL[s]

export const setStatus = (id: string, status: AppointmentStatus) =>
  call(() => {
    write((db) => {
      const a = db.appointments.find((x) => x.id === id)
      if (!a) throw new ApiError('not_found', 'Appointment not found.')
      a.status = status
      a.updated_at = nowIso()
      db.appointment_events.push(addEvent(id, 'status_changed', `${STATUS_LABEL[status]} · ${clinicianById(a.clinician_id)?.name}`, 'done'))
    })
  }, 160)

export const moveAppointment = (id: string, chair_id: string, start_at: string, clinician_id?: string) =>
  call(() => {
    const snap = snapshot()
    const a = snap.appointments.find((x) => x.id === id)
    if (!a) throw new ApiError('not_found', 'Appointment not found.')
    const type = typeById(a.appointment_type_id)!
    const clinician = clinician_id ?? a.clinician_id
    const res = canPlace(snap, { type, clinician_id: clinician, chair_id, start_at, excludeId: id })
    if (!res.ok) throw new ApiError('conflict', res.reason)
    const from = `${chairById(a.chair_id)?.name} ${formatIsoTime(a.start_at)}`
    const to = `${chairById(chair_id)?.name} ${formatIsoTime(start_at)}`
    write((db) => {
      const x = db.appointments.find((y) => y.id === id)!
      x.chair_id = chair_id
      x.clinician_id = clinician
      x.start_at = start_at
      x.end_at = addMinutesIso(start_at, type.duration_minutes)
      x.reschedule_requested = false
      x.updated_at = nowIso()
      for (const e of db.appointment_events)
        if (e.appointment_id === id && e.event_type === 'reschedule_requested' && e.status === 'attention') e.status = 'done'
      db.appointment_events.push(
        addEvent(id, 'rescheduled', `Moved by reception · ${from} → ${to}`, 'done'),
        addEvent(id, 'confirmation_prepared', 'Updated confirmation prepared', 'simulated'),
      )
    })
  }, 180)

/** Hands a visit to a colleague who can take the same chair and time. */
export const reassignClinician = (id: string) =>
  call(() => {
    const snap = snapshot()
    const a = snap.appointments.find((x) => x.id === id)
    if (!a) throw new ApiError('not_found', 'Appointment not found.')
    const type = typeById(a.appointment_type_id)!
    const alt = CLINICIANS.find(
      (c) => c.id !== a.clinician_id && canPlace(snap, { type, clinician_id: c.id, chair_id: a.chair_id, start_at: a.start_at, excludeId: id }).ok,
    )
    if (!alt) throw new ApiError('conflict', 'No colleague is free at that time — move the visit on the chair map.')
    const from = clinicianById(a.clinician_id)?.name
    write((db) => {
      const x = db.appointments.find((y) => y.id === id)!
      x.clinician_id = alt.id
      x.updated_at = nowIso()
      db.appointment_events.push(
        addEvent(id, 'rescheduled', `Reassigned · ${from} → ${alt.name}, same time`, 'done'),
        addEvent(id, 'confirmation_prepared', 'Clinician change note prepared for patient', 'simulated'),
      )
    })
    return alt.name
  }, 220)

export const resolveEvent = (eventId: string) =>
  call(() => {
    write((db) => {
      const e = db.appointment_events.find((x) => x.id === eventId)
      if (e) e.status = 'done'
    })
  }, 150)

/** Prepares reminder messages for the selected visits (simulated delivery). */
export const sendReminders = (ids: string[]) =>
  call(() => {
    write((db) => {
      for (const id of ids) {
        const a = db.appointments.find((x) => x.id === id)
        if (!a || a.status === 'cancelled') continue
        db.appointment_events.push(addEvent(id, 'confirmation_prepared', `Reminder prepared for ${formatIsoTime(a.start_at)} visit`, 'simulated'))
      }
    })
    return ids.length
  }, 300)

export const resetDemo = () => call(() => resetStore(), 500)
