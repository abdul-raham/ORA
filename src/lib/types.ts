// Domain model. Field names mirror the persistence schema so a hosted
// database can replace the local store without reshaping records.

export type Capability =
  | 'general'
  | 'restorative'
  | 'cosmetic'
  | 'orthodontic'
  | 'hygiene'
  | 'periodontal'
  | 'paediatric'

export type ResourceType = 'standard' | 'scanner'

export interface AppointmentType {
  id: string
  slug: string
  name: string
  short: string
  duration_minutes: number
  resource_type: ResourceType
  capability: Capability
  active: boolean
  prep_protocol_key: string
  deposit_ngn: number | null
  /** How the visit time is spent, for VisitDuration. Minutes must sum to duration. */
  phases: { label: string; minutes: number }[]
  summary: string
}

export interface Clinician {
  id: string
  name: string
  title: string
  capability_tags: Capability[]
  active: boolean
  /** Weekday (0 = Sunday) → [openMinute, closeMinute] in clinic time. */
  hours: Partial<Record<number, [number, number]>>
}

export interface Chair {
  id: string
  name: string
  resources: ResourceType[]
  active: boolean
}

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'checked_in'
  | 'in_chair'
  | 'complete'
  | 'cancelled'
  | 'no_show'

export interface Patient {
  id: string
  full_name: string
  phone: string
  email: string | null
  created_at: string
  is_demo: boolean
}

export interface Appointment {
  id: string
  booking_code: string
  patient_id: string
  appointment_type_id: string
  clinician_id: string
  chair_id: string
  start_at: string
  end_at: string
  status: AppointmentStatus
  is_demo: boolean
  source: 'online' | 'reception' | 'seed'
  reschedule_requested: boolean
  created_at: string
  updated_at: string
}

export interface IntakeResponse {
  id: string
  appointment_id: string
  routing_category: ConcernId
  responses_json: Record<string, unknown>
  complete: boolean
  created_at: string
}

export type EventStatus = 'done' | 'scheduled' | 'simulated' | 'attention'

export type EventType =
  | 'intake_received'
  | 'booking_confirmed'
  | 'confirmation_prepared'
  | 'reminder_scheduled'
  | 'prep_shared'
  | 'rescheduled'
  | 'cancelled'
  | 'status_changed'
  | 'reschedule_requested'
  | 'intake_incomplete'

export interface AppointmentEvent {
  id: string
  appointment_id: string
  event_type: EventType
  label: string
  status: EventStatus
  scheduled_for: string | null
  completed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  is_demo: boolean
}

export interface TimeOff {
  id: string
  clinician_id: string
  start_at: string
  end_at: string
  reason: string
}

export type ConcernId = 'pain' | 'changed' | 'smile' | 'routine' | 'known'

export type Region =
  | 'upper-right'
  | 'upper-front'
  | 'upper-left'
  | 'lower-right'
  | 'lower-front'
  | 'lower-left'
  | 'unsure'

export type SmileGoalId = 'colour' | 'alignment' | 'shape' | 'missing' | 'general'

export interface Slot {
  date: string
  startMin: number
  start_at: string
  end_at: string
  clinician_id: string
  chair_id: string
}

export interface StaffUser {
  email: string
  name: string
  role: 'Front desk' | 'Practice manager' | 'Clinician'
}
