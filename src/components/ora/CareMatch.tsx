import { typeBySlug } from '../../data/appointmentTypes'
import ScanResolve from '../../motion/ScanResolve'
import ClinicianMatch from './ClinicianMatch'
import VisitDuration from './VisitDuration'

// Assembles the starting appointment and explains why it's the right place to
// begin — in the patient's own words, without naming a condition.

export default function CareMatch({
  typeSlug,
  reasons,
  onContinue,
  onChooseDifferent,
}: {
  typeSlug: string
  reasons: string[]
  onContinue: () => void
  onChooseDifferent: () => void
}) {
  const type = typeBySlug(typeSlug)
  if (!type) return null
  return (
    <div className="grid gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
      <div>
        <p className="label mb-5">Your starting appointment</p>
        <ScanResolve>
          <h2 className="display text-[clamp(2.7rem,6vw,5.4rem)]">{type.name}</h2>
        </ScanResolve>
        <p className="mt-6 max-w-[540px] text-lg leading-relaxed text-graphite">{type.summary}</p>

        <div className="mt-12">
          <p className="label mb-4">Why this is the right place to start</p>
          <ol className="space-y-4 border-l border-steel-2 pl-6">
            {reasons.map((r, i) => (
              <li key={i} className="relative leading-relaxed">
                <span className="absolute -left-[27px] top-2 size-[5px] rounded-full bg-charcoal" aria-hidden />
                {r}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-10 max-w-[540px] border-t border-bone pt-5 text-sm leading-relaxed text-muted">
          This is a booking starting point, not a diagnosis. Your clinician will listen, take a look and talk you through anything they find.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <button className="btn-primary" onClick={onContinue}>
            Find a time <span aria-hidden>→</span>
          </button>
          <button className="btn-quiet" onClick={onChooseDifferent}>
            Choose a different appointment
          </button>
        </div>
      </div>

      <aside className="space-y-12 lg:pt-10">
        <VisitDuration type={type} />
        <ClinicianMatch type={type} />
        {type.deposit_ngn && (
          <p className="border-l-2 border-clinic pl-4 text-sm leading-relaxed text-graphite">
            A ₦{type.deposit_ngn.toLocaleString()} deposit secures this consultation and is deducted from any treatment. In this demo, no payment is taken.
          </p>
        )}
      </aside>
    </div>
  )
}
