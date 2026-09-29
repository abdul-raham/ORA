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
| `/` | Studio intro, photographic smile-aperture hero, studio, visit story, smile goals, care |
| `/visit` | Booking flow: OralCompass → ConcernLens → UrgencyGate → CareMatch → ChairFlow → IntakeFold → CarePass |
| `/manage/:bookingCode` | CarePass, preparation, self-service reschedule and cancel |
| `/care` | Care index built from the appointment configuration |
| `/staff` | Studio workspace — Today (ClinicPulse, ChairMap, PatientApproach, ReceptionCommand) |
| `/staff/bookings` | Bookings ledger — search, filter tokens, saved views, bulk actions, CSV export |
| `/staff/patients` | Patient directory and visit history |
| `/staff/activity` | Activity stream and audit timeline |

## Studio access

The staff workspace is never a separate login page. Signed out, the real studio
stays in view but dormant — structure visible, patient names, phones and codes
redacted — and wakes in layers: identity wakes navigation, the passphrase wakes
the data, the second factor wakes controls and removes redaction. After 10
minutes idle, or via **Lock studio**, it goes dormant in place and resumes
exactly where it was with the passphrase alone.

Demo accounts (passphrase `porcelain`, authenticator code `240118`):

- `frontdesk@ora.studio` — Front desk (demo reset needs approval)
- `manager@ora.studio` — Practice manager (full access)
- `dr.okafor@ora.studio` — Clinician (view and status only)

Controls stay visible for every role and explain themselves when read-only or
approval-bound. The account menu has **Reset demo data** and **Simulate backend
outage** (shows the live status layer and honest retry states). Press
`Ctrl/⌘ K` anywhere in the studio for the command palette — try “next whitening”.

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
