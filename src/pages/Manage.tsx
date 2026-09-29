import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AutomationTrace from '../components/ora/AutomationTrace'
import CarePass from '../components/ora/CarePass'
import { ErrorState } from '../components/ora/ChairFlow'
import ClinicalFooter from '../components/ora/ClinicalFooter'
import EditorialImage from '../components/ora/EditorialImage'
import PrepProtocol from '../components/ora/PrepProtocol'
import VisitRescheduler from '../components/ora/VisitRescheduler'
import { CLINIC } from '../data/clinic'
import { ApiError, cancelBooking, getBooking, type BookingDetail } from '../lib/api'

export default function Manage() {
  const { bookingCode } = useParams()
  return (
    <>
      <div className="mx-auto min-h-[80svh] max-w-[1320px] px-4 pb-16 pt-24 md:px-[4%] md:pt-[150px]">
        {bookingCode ? <ManageVisit code={bookingCode} /> : <Lookup />}
      </div>
      <ClinicalFooter />
    </>
  )
}

function Lookup() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    const normal = c.startsWith('ORA-') ? c : `ORA-${c}`
    setBusy(true)
    setError(null)
    try {
      await getBooking(normal)
      navigate(`/manage/${normal}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not look that up right now.')
      setBusy(false)
    }
  }
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
    <div className="max-w-[640px]">
      <p className="label mb-4">Manage a visit</p>
      <h1 className="display text-[clamp(2.8rem,6vw,5.4rem)]">Find your CarePass.</h1>
      <p className="mt-5 text-lg text-graphite">Enter the booking code from your confirmation.</p>
      <form onSubmit={submit} className="mt-10 flex flex-wrap items-end gap-6">
        <label className="min-w-[240px] flex-1">
          <span className="label mb-1 block text-[10px]">Booking code</span>
          <input
            className="field font-mono uppercase tracking-[0.12em]"
            placeholder="ORA-XXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            spellCheck={false}
          />
        </label>
        <button className="btn-primary" disabled={code.trim().length < 5 || busy}>
          {busy ? 'Looking…' : 'Open'} <span aria-hidden>→</span>
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
      <EditorialImage k="treatmentRoom" className="aspect-[4/3] lg:aspect-[4/5]" sizes="(min-width:1024px) 45vw, 100vw" eager position="55% 50%" />
    </div>
  )
}

function ManageVisit({ code }: { code: string }) {
  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view')
  const [flash, setFlash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError(null)
    getBooking(code)
      .then(setDetail)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load this visit.'))
  }, [code])
  useEffect(load, [load])

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!detail) return <p className="label">Opening CarePass…</p>

  const { appointment } = detail
  const past = Date.parse(appointment.end_at) < Date.now()
  const closed = appointment.status === 'cancelled' || appointment.status === 'complete' || past

  const cancel = async () => {
    setBusy(true)
    try {
      setDetail(await cancelBooking(code))
      setFlash('Your visit is cancelled and the chair time has been released.')
      setMode('view')
    } catch (e) {
      setFlash(e instanceof ApiError ? e.message : 'Could not cancel right now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[440px_1fr] lg:gap-20">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <motion.div key={appointment.updated_at} initial={{ scale: 0.97, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
          <CarePass appointment={appointment} patient={detail.patient} events={detail.events} />
        </motion.div>
      </div>
      <div className="min-w-0">
        <AnimatePresence>
          {flash && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 border-l-2 border-clinic bg-clinic-soft/50 px-4 py-3 text-clinic-deep"
            >
              {flash}
            </motion.p>
          )}
        </AnimatePresence>

        {mode === 'reschedule' ? (
          <VisitRescheduler
            detail={detail}
            onCancel={() => setMode('view')}
            onDone={(d) => {
              setDetail(d)
              setMode('view')
              setFlash('Moved. Your CarePass, reminder and the studio schedule are updated.')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ) : (
          <div className="space-y-14">
            <div>
              <p className="label mb-4">Your visit</p>
              <h1 className="display text-[clamp(2.6rem,5.4vw,4.8rem)]">{closed ? 'This visit is closed.' : 'Need to change something?'}</h1>
              {!closed && (
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <button className="btn-primary" onClick={() => setMode('reschedule')}>
                    Reschedule <span aria-hidden>→</span>
                  </button>
                  {mode === 'cancel' ? (
                    <span className="flex flex-wrap items-center gap-4">
                      <span className="text-sm">Cancel this visit?</span>
                      <button className="btn-quiet !border-alert !text-alert" onClick={cancel} disabled={busy}>
                        {busy ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button className="btn-quiet" onClick={() => setMode('view')}>
                        Keep it
                      </button>
                    </span>
                  ) : (
                    <button className="btn-quiet" onClick={() => setMode('cancel')}>
                      Cancel visit
                    </button>
                  )}
                </div>
              )}
              <p className="mt-6 text-sm text-muted">
                Questions? Call {CLINIC.phone}. For anything urgent, call {CLINIC.urgentLine}.
              </p>
            </div>
            {!closed && <PrepProtocol typeId={appointment.appointment_type_id} />}
            <AutomationTrace events={[...detail.events].reverse()} />
          </div>
        )}
      </div>
    </div>
  )
}
