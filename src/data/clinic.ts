import type { Chair, Clinician } from '../lib/types'

export const CLINIC = {
  name: 'ORA Dental Studio',
  address: ['14 Adeola Odeku Street', 'Victoria Island, Lagos'],
  coordinates: '06°25′52″N  03°25′18″E',
  phone: '+234 201 555 0142',
  phoneHref: 'tel:+2342015550142',
  urgentLine: '+234 201 555 0199',
  urgentLineHref: 'tel:+2342015550199',
  email: 'visit@ora.studio',
  hoursLabel: [
    ['Mon — Fri', '08:00 — 18:00'],
    ['Saturday', '09:00 — 14:00'],
    ['Sunday', 'Closed'],
  ] as const,
  /** Weekday (0 = Sunday) → [open, close] minutes in clinic time. */
  hours: {
    1: [480, 1080],
    2: [480, 1080],
    3: [480, 1080],
    4: [480, 1080],
    5: [480, 1080],
    6: [540, 840],
  } as Partial<Record<number, [number, number]>>,
  /** Chair cleaning/reset time held after every visit. */
  turnoverMinutes: 10,
  /** Online bookings must start at least this far from now. */
  leadMinutes: 60,
  slotStepMinutes: 15,
  horizonDays: 14,
}

export const CHAIRS: Chair[] = [
  { id: 'chair-01', name: 'Chair 01', resources: ['standard'], active: true },
  { id: 'chair-02', name: 'Chair 02', resources: ['standard'], active: true },
  { id: 'chair-03', name: 'Chair 03', resources: ['standard', 'scanner'], active: true },
]

export const CLINICIANS: Clinician[] = [
  {
    id: 'clin-okafor',
    name: 'Dr. Adaeze Okafor',
    title: 'Dentist',
    capability_tags: ['general', 'restorative', 'cosmetic'],
    active: true,
    hours: { 1: [480, 1020], 2: [480, 1020], 3: [480, 1020], 4: [480, 1020], 5: [480, 960] },
  },
  {
    id: 'clin-bello',
    name: 'Dr. Tunde Bello',
    title: 'Dentist · Orthodontics',
    capability_tags: ['general', 'orthodontic', 'paediatric'],
    active: true,
    hours: { 1: [600, 1080], 3: [600, 1080], 4: [600, 1080], 5: [600, 1080], 6: [540, 840] },
  },
  {
    id: 'clin-nwosu',
    name: 'Dr. Ifeoma Nwosu',
    title: 'Dentist · Gum health',
    capability_tags: ['general', 'periodontal', 'cosmetic', 'restorative'],
    active: true,
    hours: { 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1080], 6: [540, 840] },
  },
  {
    id: 'clin-adeyemi',
    name: 'Kemi Adeyemi',
    title: 'Dental hygienist',
    capability_tags: ['hygiene'],
    active: true,
    hours: { 1: [480, 1080], 2: [480, 1080], 3: [480, 960], 4: [480, 1080], 5: [480, 1080], 6: [540, 840] },
  },
]

export const chairById = (id: string) => CHAIRS.find((c) => c.id === id)
export const clinicianById = (id: string) => CLINICIANS.find((c) => c.id === id)
