# ORA° Dental Studio

Appointment routing and scheduling for a private dental studio in Victoria
Island, Lagos. A patient says what brings them in; ORA routes the concern to the
right starting appointment — without diagnosing — finds a genuinely feasible
clinician, chair and time, confirms the visit, and lets reception focus only on
exceptions.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run lint
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | Editorial landing — SmileApertureHero, studio, visit story, smile goals |
| `/visit` | Booking flow: OralCompass → ConcernLens → UrgencyGate → CareMatch → ChairFlow → IntakeFold → CarePass |
| `/manage/:bookingCode` | CarePass, preparation, self-service reschedule and cancel |
| `/care` | Care index built from the appointment configuration |
| `/staff/login` | IdentityImpression staff sign-in |
| `/staff` | ClinicPulse, ChairMap, PatientApproach, ReceptionCommand, AutomationTrace |

## Demo access

Staff accounts (passphrase `porcelain`):

- `frontdesk@ora.studio` — Front desk
- `manager@ora.studio` — Practice manager
- `dr.okafor@ora.studio` — Clinician

The login screen offers one-tap demo access. The staff menu (top right) has
**Reset demo data** — it removes every record created through the demo and
restores the seed schedule — and **Simulate backend outage**, to show the
honest error and retry states.

## How it works

- **Routing** — `src/data/routingRules.ts` holds every question, answer and
  reason a patient reads. Rules choose an appointment category; they never name
  a condition. Urgent flags and their guidance are static configuration in
  `src/data/urgentCare.ts`.
- **Availability** — `src/lib/scheduling/availability.ts` only offers a start
  time when a clinician with the right capability is working and free, a
  compatible chair (standard or scanner) is free including its reset window,
  there is no time off, and the visit fits clinic hours. The same engine powers
  booking, patient rescheduling and staff drag-to-move.
- **Persistence** — `src/lib/api.ts` is an async API over a browser store
  (`src/lib/db`) whose records mirror the schema below. Seed data regenerates
  around each clinic day; demo-created records carry `is_demo = true`. Changes
  sync live across open tabs, so a booking made in one tab appears on the staff
  ChairMap in another.
- **Real vs simulated** — routing, matching, availability, bookings,
  reschedules, staff schedule and automation events are real. Message delivery
  and deposit settlement are simulated and labelled "Demo · not sent" / "not
  charged".

### Schema

`patients`, `appointment_types`, `clinicians`, `chairs`, `appointments`,
`intake_responses`, `appointment_events`, `clinician_time_off` — see
`src/lib/types.ts`. Appointment types, clinicians and chairs are configuration
in `src/data`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Motion, Zustand, React Router.
All times are clinic time (West Africa Time, UTC+1). Every signature motion has
a `prefers-reduced-motion` alternative.
