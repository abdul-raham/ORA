import { buildSeed, seedDay, type SeedData } from './seed'

// Browser-persisted store. Seed records are regenerated each clinic day so the
// schedule always sits around "now"; records created through the demo
// (is_demo = true) survive regeneration until a demo reset.

const KEY = 'ora.db.v1'
const CHANNEL = 'ora-db'

export interface DB extends SeedData {
  version: 1
  seedDate: string
}

let cache: DB | null = null
const listeners = new Set<() => void>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null

channel?.addEventListener('message', () => {
  cache = null
  listeners.forEach((l) => l())
})

function fresh(keep?: DB): DB {
  const seed = buildSeed(seedDay(), Date.now())
  const demo = <T extends { is_demo: boolean }>(xs: T[] | undefined) => (xs ?? []).filter((x) => x.is_demo)
  const demoAppointmentIds = new Set(demo(keep?.appointments).map((a) => a.id))
  return {
    version: 1,
    seedDate: seedDay(),
    patients: [...seed.patients, ...demo(keep?.patients)],
    appointments: [...seed.appointments, ...demo(keep?.appointments)],
    intake_responses: [
      ...seed.intake_responses,
      ...(keep?.intake_responses ?? []).filter((r) => demoAppointmentIds.has(r.appointment_id)),
    ],
    appointment_events: [...seed.appointment_events, ...demo(keep?.appointment_events)],
    time_off: seed.time_off,
  }
}

export function read(): DB {
  if (cache && cache.seedDate === seedDay()) return cache
  let stored: DB | null = null
  try {
    const raw = localStorage.getItem(KEY)
    stored = raw ? (JSON.parse(raw) as DB) : null
  } catch {
    stored = null
  }
  cache = stored && stored.version === 1 && stored.seedDate === seedDay() ? stored : fresh(stored ?? undefined)
  if (cache !== stored) persist(cache)
  return cache
}

function persist(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // Storage full or blocked: the session still works from memory.
  }
}

export function write(mutate: (db: DB) => void) {
  const db = read()
  mutate(db)
  cache = { ...db }
  persist(cache)
  channel?.postMessage('changed')
  listeners.forEach((l) => l())
}

/** Removes every record created through the demo and rebuilds the seed. */
export function resetDemo() {
  cache = fresh()
  persist(cache)
  channel?.postMessage('changed')
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
