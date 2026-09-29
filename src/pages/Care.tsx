import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import ClinicalFooter from '../components/ora/ClinicalFooter'
import VisitDuration from '../components/ora/VisitDuration'
import { APPOINTMENT_TYPES } from '../data/appointmentTypes'
import { PREP_PROTOCOLS } from '../data/prepProtocols'
import { useVisit } from '../store/visitStore'

const GROUPS: { title: string; line: string; slugs: string[] }[] = [
  { title: 'When something hurts or changed', line: 'Seen soon, with time to understand what’s going on.', slugs: ['comfort-assessment', 'restorative-review', 'gum-care-review'] },
  { title: 'Your smile', line: 'Consultations that start with what you want.', slugs: ['smile-consultation', 'whitening-consultation', 'alignment-consultation'] },
  { title: 'Keeping well', line: 'Regular care, for every age.', slugs: ['checkup-hygiene', 'new-patient-examination', 'childrens-visit'] },
]

export default function Care() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const reset = useVisit((s) => s.reset)
  const chooseConcern = useVisit((s) => s.chooseConcern)
  const answer = useVisit((s) => s.answer)

  const begin = (slug: string) => {
    reset()
    chooseConcern('known')
    answer('type', slug)
    navigate('/visit')
  }

  return (
    <>
      <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-28 md:px-[4%] md:pt-[170px]">
        <p className="label mb-6">Care index</p>
        <h1 className="display max-w-[1000px] text-[clamp(3rem,7vw,6.4rem)]">Every visit, sized to what it needs.</h1>
        <p className="mt-8 max-w-[560px] text-lg leading-relaxed text-graphite">
          Not sure which to choose? You don’t need to. Begin your visit, tell us what brings you in, and ORA will match you to the right starting point.
        </p>

        {GROUPS.map((g, gi) => (
          <section key={g.title} className="mt-28" aria-labelledby={`g-${gi}`}>
            <div className="mb-10 grid gap-4 border-b border-steel-2 pb-6 md:grid-cols-[1fr_1fr]">
              <h2 id={`g-${gi}`} className="display text-[clamp(2rem,3.6vw,3.2rem)]">
                {g.title}
              </h2>
              <p className="text-muted md:pt-3 md:text-right">{g.line}</p>
            </div>
            <div className="grid gap-x-12 gap-y-16 lg:grid-cols-3">
              {g.slugs.map((slug, i) => {
                const t = APPOINTMENT_TYPES.find((x) => x.slug === slug)!
                const prep = PREP_PROTOCOLS[t.prep_protocol_key]
                return (
                  <motion.article
                    key={slug}
                    initial={reduce ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ delay: i * 0.08, duration: 0.7 }}
                    className="flex flex-col"
                  >
                    <p className="label mb-3 text-[10px]">
                      {t.resource_type === 'scanner' ? 'Scanner chair' : 'Treatment chair'}
                      {t.deposit_ngn ? ` · ₦${t.deposit_ngn.toLocaleString()} deposit` : ''}
                    </p>
                    <h3 className="font-display text-[1.9rem] leading-tight">{t.name}</h3>
                    <p className="mt-3 leading-relaxed text-graphite">{t.summary}</p>
                    <div className="mt-8">
                      <VisitDuration type={t} />
                    </div>
                    <p className="mt-6 text-sm text-muted">
                      <span className="label mr-2 text-[10px]">Prep</span>
                      {prep.items[prep.items.length > 2 ? 2 : 0]}
                    </p>
                    <button className="btn-quiet mt-8 self-start" onClick={() => begin(slug)}>
                      Begin with this visit →
                    </button>
                  </motion.article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <ClinicalFooter />
    </>
  )
}
