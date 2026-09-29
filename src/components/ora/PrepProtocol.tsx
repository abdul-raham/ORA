import { typeById } from '../../data/appointmentTypes'
import { PREP_PROTOCOLS } from '../../data/prepProtocols'

// Clinic-approved preparation for the booked appointment category.

export default function PrepProtocol({ typeId }: { typeId: string }) {
  const type = typeById(typeId)
  const protocol = type && PREP_PROTOCOLS[type.prep_protocol_key]
  if (!protocol) return null
  return (
    <section aria-labelledby="prep-title">
      <p className="label mb-3">Preparation</p>
      <h3 id="prep-title" className="display mb-6 text-[2rem]">
        {protocol.title}
      </h3>
      <ol className="border-t border-bone">
        {protocol.items.map((item, i) => (
          <li key={item} className="grid grid-cols-[36px_1fr] gap-3 border-b border-bone py-3.5">
            <span className="label pt-0.5">{String(i + 1).padStart(2, '0')}</span>
            <span className="leading-relaxed text-graphite">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
