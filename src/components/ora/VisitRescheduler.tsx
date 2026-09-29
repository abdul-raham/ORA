import { useState } from 'react'
import { typeById } from '../../data/appointmentTypes'
import { ApiError, rescheduleBooking, type BookingDetail } from '../../lib/api'
import type { Preference } from '../../lib/scheduling/availability'
import { formatDay, formatIsoTime, formatTime, toWall } from '../../lib/time'
import type { Slot } from '../../lib/types'
import ChairFlow from './ChairFlow'

// Self-service rescheduling on the same availability engine as booking. The
// patient's current slot is excluded from conflict checks so nearby times show.

export default function VisitRescheduler({ detail, onDone, onCancel }: { detail: BookingDetail; onDone: (d: BookingDetail) => void; onCancel: () => void }) {
  const type = typeById(detail.appointment.appointment_type_id)!
  const [pref, setPref] = useState<Preference>('soonest')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = toWall(detail.appointment.start_at)

  const move = async () => {
    if (!slot) return
    setBusy(true)
    setError(null)
    try {
      onDone(await rescheduleBooking(detail.appointment.booking_code, slot))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not move your visit. Nothing has changed.')
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="resched-title">
      <p className="label mb-3">Reschedule</p>
      <h2 id="resched-title" className="display mb-3 text-[clamp(2rem,4vw,3.2rem)]">
        Move your {type.short.toLowerCase()}.
      </h2>
      <p className="mb-10 text-muted">
        Currently {formatDay(current.date, 'long')} at {formatIsoTime(detail.appointment.start_at)}. Your clinician may change if another is free at the new time.
      </p>
      <ChairFlow
        typeSlug={type.slug}
        preference={pref}
        onPreference={setPref}
        selected={slot}
        onSelect={setSlot}
        excludeId={detail.appointment.id}
      />
      {error && (
        <p role="alert" className="mt-6 border-l-2 border-alert pl-3 text-sm text-alert">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 z-10 -mx-4 mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-bone bg-porcelain/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0">
        <button className="btn-quiet" onClick={onCancel}>
          Keep current time
        </button>
        <button className="btn-primary" disabled={!slot || busy} onClick={move}>
          {busy ? 'Moving…' : slot ? `Move to ${formatDay(slot.date)} ${formatTime(slot.startMin)}` : 'Choose a new time'}
        </button>
      </div>
    </section>
  )
}
