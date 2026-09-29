import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import ChairFlow from '../components/ora/ChairFlow'
import { validName, validPhone } from '../components/ora/IntakeFold'
import { APPOINTMENT_TYPES, typeBySlug } from '../data/appointmentTypes'
import { ApiError, createBooking } from '../lib/api'
import type { Preference } from '../lib/scheduling/availability'
import { formatDay, formatTime } from '../lib/time'
import type { Patient, Slot } from '../lib/types'
import { useStaff } from './StaffContext'

// Reception booking for phone calls and walk-ins. The same availability engine
// as online booking, laid out as a side sheet so the schedule stays in view.

const STEPS = ['Patient', 'Visit', 'Time', 'Confirm'] as const

export default function NewBookingSheet() {
  const { newBooking, closeNewBooking, view, openByCode } = useStaff()
  const [step, setStep] = useState(0)
  const [query, setQuery] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [fresh, setFresh] = useState({ full_name: '', phone: '', email: '' })
  const [typeSlug, setTypeSlug] = useState<string | null>(newBooking?.typeSlug ?? null)
  const [pref, setPref] = useState<Preference>('soonest')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (newBooking?.patientId && view) setPatient(view.patients.get(newBooking.patientId) ?? null)
  }, [newBooking, view])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeNewBooking()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [closeNewBooking])

  const matches = useMemo(() => {
    const s = query.trim().toLowerCase()
    if (!view || s.length < 2) return []
    return [...view.patients.values()].filter((p) => p.full_name.toLowerCase().includes(s) || p.phone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 6)
  }, [query, view])

  const patientReady = !!patient || (validName(fresh.full_name) && validPhone(fresh.phone))
  const type = typeSlug ? typeBySlug(typeSlug) : null
  const canNext = [patientReady, !!type, !!slot, true][step]

  const confirm = async () => {
    if (!type || !slot) return
    setBusy(true)
    setError(null)
    try {
      const code = await createBooking({
        typeSlug: type.slug,
        slot,
        source: 'reception',
        patientId: patient?.id,
        patient: patient ? { full_name: patient.full_name, phone: patient.phone, email: patient.email ?? '' } : fresh,
        intake: { routing_category: 'known', responses: { booked_by: 'reception' }, complete: true },
      })
      closeNewBooking()
      openByCode(code)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the booking.')
      if (e instanceof ApiError && e.kind === 'conflict') {
        setSlot(null)
        setStep(2)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-charcoal/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeNewBooking} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="New booking"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 240, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[860px] flex-col border-l border-bone bg-porcelain"
      >
        <div className="flex items-center justify-between border-b border-bone px-6 py-4">
          <div>
            <p className="label">New booking · reception</p>
            <ol className="mt-2 flex gap-5" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    disabled={i > step}
                    onClick={() => setStep(i)}
                    aria-current={i === step ? 'step' : undefined}
                    className={`font-mono text-[11px] uppercase tracking-[0.12em] ${i === step ? 'text-charcoal' : i < step ? 'text-clinic-deep underline underline-offset-4' : 'text-steel'}`}
                  >
                    0{i + 1} {s}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <button className="btn-quiet" onClick={closeNewBooking}>
            Close ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {step === 0 && (
            <div className="max-w-[560px]">
              <h2 className="display mb-8 text-[2.6rem]">Who is the visit for?</h2>
              {patient ? (
                <div className="flex items-center justify-between border-y border-bone py-4">
                  <div>
                    <p className="font-display text-2xl">{patient.full_name}</p>
                    <p className="font-mono text-sm text-muted">{patient.phone}</p>
                  </div>
                  <button className="btn-quiet" onClick={() => setPatient(null)}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="label mb-1 block text-[10px]">Find a patient on file</span>
                    <input className="field" autoFocus placeholder="Name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </label>
                  {matches.length > 0 && (
                    <ul className="mt-2 border-t border-bone">
                      {matches.map((p) => (
                        <li key={p.id}>
                          <button className="flex w-full justify-between border-b border-bone py-3 text-left hover:bg-ivory" onClick={() => setPatient(p)}>
                            <span>{p.full_name}</span>
                            <span className="font-mono text-xs text-muted">{p.phone}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="label mb-4 mt-10">Or a new patient</p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <input className="field" placeholder="Full name" aria-label="Full name" value={fresh.full_name} onChange={(e) => setFresh({ ...fresh, full_name: e.target.value })} />
                    <input className="field font-mono" placeholder="+234 …" aria-label="Mobile number" inputMode="tel" value={fresh.phone} onChange={(e) => setFresh({ ...fresh, phone: e.target.value })} />
                    <input className="field sm:col-span-2" placeholder="Email (optional)" aria-label="Email, optional" value={fresh.email} onChange={(e) => setFresh({ ...fresh, email: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="display mb-8 text-[2.6rem]">Which visit?</h2>
              <ul role="radiogroup" className="grid gap-x-8 sm:grid-cols-2">
                {APPOINTMENT_TYPES.filter((t) => t.active).map((t) => (
                  <li key={t.id} className="border-b border-bone">
                    <button role="radio" aria-checked={typeSlug === t.slug} onClick={() => {
                      setTypeSlug(t.slug)
                      setSlot(null)
                    }} className="flex w-full items-center gap-3 py-3.5 text-left">
                      <span className={`size-2.5 rounded-full border ${typeSlug === t.slug ? 'border-clinic bg-clinic' : 'border-steel'}`} />
                      <span className="flex-1">{t.name}</span>
                      <span className="font-mono text-xs text-muted">{t.duration_minutes}′{t.resource_type === 'scanner' ? ' · scan' : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 2 && type && (
            <div>
              <h2 className="display mb-8 text-[2.6rem]">{type.name}</h2>
              <ChairFlow typeSlug={type.slug} preference={pref} onPreference={setPref} selected={slot} onSelect={setSlot} />
            </div>
          )}

          {step === 3 && type && slot && (
            <div className="max-w-[560px]">
              <h2 className="display mb-8 text-[2.6rem]">Confirm the booking.</h2>
              <dl className="border-t border-bone">
                {[
                  ['Patient', patient?.full_name ?? fresh.full_name],
                  ['Phone', patient?.phone ?? fresh.phone],
                  ['Visit', `${type.name} · ${type.duration_minutes} min`],
                  ['When', `${formatDay(slot.date, 'long')} · ${formatTime(slot.startMin)}`],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[100px_1fr] border-b border-bone py-3">
                    <dt className="label text-[10px]">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted">ORA will prepare the confirmation and schedule the reminder. In this demo, nothing is sent.</p>
              {error && (
                <p role="alert" className="mt-4 text-sm text-alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-bone px-6 py-4">
          <button className="btn-quiet disabled:opacity-30" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
          {step < 3 ? (
            <button className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue →
            </button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={confirm}>
              {busy ? 'Booking…' : 'Book visit →'}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  )
}
