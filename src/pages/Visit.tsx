import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AutomationTrace from '../components/ora/AutomationTrace'
import CareMatch from '../components/ora/CareMatch'
import CarePass from '../components/ora/CarePass'
import ChairFlow, { ErrorState } from '../components/ora/ChairFlow'
import ConcernLens from '../components/ora/ConcernLens'
import DepositConfirm from '../components/ora/DepositConfirm'
import EditorialImage from '../components/ora/EditorialImage'
import IntakeFold, { intakeComplete, intakeReady } from '../components/ora/IntakeFold'
import OcclusionPath from '../components/ora/OcclusionPath'
import OralCompass from '../components/ora/OralCompass'
import PrepProtocol from '../components/ora/PrepProtocol'
import UrgencyGate, { UrgencyCheck } from '../components/ora/UrgencyGate'
import VisitBrief from '../components/ora/VisitBrief'
import { concernById, isLensComplete } from '../data/routingRules'
import { ApiError, createBooking, getBooking, type BookingDetail } from '../lib/api'
import { STEPS, type StepIndex, useVisit } from '../store/visitStore'

const TITLES: Record<StepIndex, string> = {
  0: 'What brings you to ORA?',
  1: 'Tell us a little more.',
  2: 'Here’s where to begin.',
  3: 'Choose a time that works.',
  4: 'Confirm your visit.',
}

export default function Visit() {
  const v = useVisit()
  const reduce = useReducedMotion()
  const [checking, setChecking] = useState(false)

  // Guard against a restored draft that skipped a prerequisite.
  useEffect(() => {
    if (v.bookingCode) return
    if (v.step >= 1 && !v.concern) v.go(0)
    else if (v.step >= 2 && !v.typeSlug) v.go(1)
    else if (v.step >= 4 && !v.slot) v.go(3)
  }, [v])

  useEffect(() => setChecking(false), [v.step, v.concern])

  const concern = v.concern ? concernById(v.concern) : null
  const lensDone = concern ? isLensComplete(concern, v.answers) : false

  const afterLens = () => {
    if (concern?.urgencyCheck(v.answers) && v.urgency !== 'clear') setChecking(true)
    else v.resolveMatch()
  }

  if (v.bookingCode) return <Frame><Confirmed code={v.bookingCode} /></Frame>

  const gated = v.urgency === 'emergency' || v.urgency === 'same-day'

  return (
    <Frame>
      <div className="md:hidden">
        <OcclusionPath step={v.step} onSelect={(i) => v.go(i as StepIndex)} maxReachable={v.step} />
      </div>
      <AnimatePresence mode="wait" custom={v.direction}>
        <motion.div
          key={v.step + (gated ? '-gate' : '') + (checking ? '-check' : '')}
          custom={v.direction}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: v.direction * 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: v.direction * -36 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {gated ? (
            <UrgencyGate tier={v.urgency as 'emergency'} onBack={() => v.setUrgency(null)} />
          ) : (
            <>
              <StepHeader step={v.step} />
              {v.step === 0 && <OralCompass value={v.concern} onChoose={v.chooseConcern} />}
              {v.step === 1 && concern && (
                <div className="max-w-[920px]">
                  {checking ? (
                    <UrgencyCheck
                      onClear={() => {
                        v.setUrgency('clear')
                        setChecking(false)
                        if (lensDone) v.resolveMatch()
                      }}
                      onFlag={(tier, flags) => v.setUrgency(tier, flags)}
                    />
                  ) : (
                    <ConcernLens concern={concern.id} onComplete={afterLens} />
                  )}
                </div>
              )}
              {v.step === 2 && v.typeSlug && (
                <CareMatch
                  typeSlug={v.typeSlug}
                  reasons={v.reasons}
                  onContinue={() => v.go(3)}
                  onChooseDifferent={() => v.chooseConcern('known')}
                />
              )}
              {v.step === 3 && v.typeSlug && (
                <div>
                  <ChairFlow
                    typeSlug={v.typeSlug}
                    preference={v.preference}
                    onPreference={v.setPreference}
                    selected={v.slot}
                    onSelect={v.chooseSlot}
                  />
                  <div className="sticky bottom-0 z-10 -mx-4 mt-10 flex items-center justify-between gap-4 border-t border-bone bg-porcelain/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
                    <p className="text-sm text-muted">{v.slot ? 'We’ll hold this time while you confirm.' : 'Choose one of the times above.'}</p>
                    <button className="btn-primary" disabled={!v.slot} onClick={() => v.go(4)}>
                      Continue <span aria-hidden>→</span>
                    </button>
                  </div>
                </div>
              )}
              {v.step === 4 && v.typeSlug && v.slot && <ConfirmStep />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {!gated && v.step > 0 && (
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-bone pt-5">
          <button className="btn-quiet" onClick={v.back}>
            ← Back
          </button>
          {v.step <= 2 && v.concern && !checking && (
            <button
              className="label underline decoration-steel-2 underline-offset-4 hover:text-alert"
              onClick={() => {
                if (v.step !== 1) v.go(1)
                window.setTimeout(() => setChecking(true), 0)
              }}
            >
              Is this urgent?
            </button>
          )}
        </div>
      )}
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-[100svh] max-w-[1320px] px-4 pb-24 pt-20 md:px-[4%] md:pt-[150px]">{children}</div>
}

function StepHeader({ step }: { step: StepIndex }) {
  return (
    <header className="mb-10 mt-4 md:mb-14">
      <p className="label mb-4">
        0{step + 1} — {STEPS[step]}
      </p>
      <h1 className="display text-[clamp(2.6rem,6.2vw,5.6rem)]">{TITLES[step]}</h1>
    </header>
  )
}

function ConfirmStep() {
  const v = useVisit()
  const reduce = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ message: string; conflict: boolean } | null>(null)
  const [collapsing, setCollapsing] = useState(false)

  const confirm = async () => {
    if (!v.typeSlug || !v.slot || !v.concern) return
    setBusy(true)
    setError(null)
    try {
      const code = await createBooking({
        typeSlug: v.typeSlug,
        slot: v.slot,
        patient: v.patient,
        intake: {
          routing_category: v.concern,
          responses: { ...v.answers, firstVisit: v.patient.firstVisit, pace: v.patient.pace, note: v.patient.note },
          complete: intakeComplete(v.patient),
        },
      })
      setCollapsing(true)
      window.setTimeout(() => {
        window.scrollTo({ top: 0 })
        v.complete(code)
      }, reduce ? 0 : 420)
    } catch (e) {
      setBusy(false)
      if (e instanceof ApiError) setError({ message: e.message, conflict: e.kind === 'conflict' })
      else setError({ message: 'Something went wrong. Nothing was booked.', conflict: false })
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
      <motion.div animate={collapsing ? { opacity: 0, x: 60, scale: 0.94 } : { opacity: 1 }} transition={{ duration: 0.4 }}>
        <IntakeFold value={v.patient} onChange={v.updatePatient} />
      </motion.div>
      <div className="space-y-6 lg:sticky lg:top-36 lg:self-start">
        <VisitBrief typeSlug={v.typeSlug!} slot={v.slot!} patientName={v.patient.full_name || undefined} onEdit={(s) => v.go(s)} />
        <motion.div animate={collapsing ? { opacity: 0, y: -30 } : { opacity: 1 }}>
          <DepositConfirm typeSlug={v.typeSlug!} ready={intakeReady(v.patient)} busy={busy} error={error?.message ?? null} onConfirm={confirm} />
          {error?.conflict && (
            <button
              className="btn-quiet mt-4"
              onClick={() => {
                v.chooseSlot(null)
                v.go(3)
              }}
            >
              See the nearest available times →
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function Confirmed({ code }: { code: string }) {
  const reset = useVisit((s) => s.reset)
  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    getBooking(code)
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load your visit.'))
  }
  useEffect(load, [code])

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <LayoutGroup>
      <div className="grid gap-14 pt-4 lg:grid-cols-[440px_1fr] lg:gap-20">
        <div>
          {detail ? (
            <CarePass appointment={detail.appointment} patient={detail.patient} events={detail.events} animateIn />
          ) : (
            <motion.div layoutId="carepass" className="porcelain-surface mx-auto h-[620px] w-full max-w-[440px]" />
          )}
          <p className="mt-4 text-center text-xs text-muted">Screenshot this pass, or keep the code: {code}</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-14">
          <div>
            <p className="label mb-4">06 — Confirmed</p>
            <h1 className="display text-[clamp(2.6rem,5.6vw,5rem)]">
              That’s it. <br />
              We’ll take it from here.
            </h1>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              <Link to={`/manage/${code}`} className="btn-primary">
                Manage or reschedule <span aria-hidden>→</span>
              </Link>
              <Link to="/" onClick={reset} className="btn-quiet">
                Back to ORA
              </Link>
            </div>
          </div>
          <EditorialImage k="treatmentChair" className="aspect-[16/7]" sizes="(min-width:1024px) 55vw, 100vw" caption="Your chair is ready" />
          {detail && <AutomationTrace events={detail.events} title="What ORA handled for you" />}
          {detail && <PrepProtocol typeId={detail.appointment.appointment_type_id} />}
        </motion.div>
      </div>
    </LayoutGroup>
  )
}
