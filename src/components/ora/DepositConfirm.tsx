import { typeBySlug } from '../../data/appointmentTypes'

// Confirmation action. Visits with a deposit show it clearly as simulated —
// the demo never implies a real payment was taken.

export default function DepositConfirm({
  typeSlug,
  ready,
  busy,
  error,
  onConfirm,
}: {
  typeSlug: string
  ready: boolean
  busy: boolean
  error: string | null
  onConfirm: () => void
}) {
  const type = typeBySlug(typeSlug)!
  return (
    <div className="space-y-5">
      {type.deposit_ngn ? (
        <div className="flex items-start justify-between gap-4 border-y border-bone py-4">
          <div>
            <p className="font-medium">Consultation deposit</p>
            <p className="mt-1 text-sm text-muted">Deducted from any treatment. Refundable up to 24 hours before.</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl">₦{type.deposit_ngn.toLocaleString()}</p>
            <p className="label mt-1 text-[9.5px] text-clinic-deep">Demo · not charged</p>
          </div>
        </div>
      ) : (
        <p className="border-y border-bone py-4 text-sm text-muted">No deposit needed. Free to reschedule or cancel up to 24 hours before.</p>
      )}
      {error && (
        <p role="alert" className="border-l-2 border-alert pl-3 text-sm text-alert">
          {error}
        </p>
      )}
      <button className="btn-primary w-full justify-between !py-5" disabled={!ready || busy} onClick={onConfirm}>
        <span>{busy ? 'Securing your chair time…' : type.deposit_ngn ? 'Confirm visit · demo deposit' : 'Confirm visit'}</span>
        <span aria-hidden>{busy ? '···' : '→'}</span>
      </button>
      {!ready && <p className="text-center text-xs text-muted">Add your name, number and consent to confirm.</p>}
    </div>
  )
}
