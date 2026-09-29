import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ClinicalFooter from '../components/ora/ClinicalFooter'
import { WARM_GRADE, imageSet, imageSrc, type ImageKey } from '../components/ora/EditorialImage'
import VisitDuration from '../components/ora/VisitDuration'
import { APPOINTMENT_TYPES } from '../data/appointmentTypes'
import { PREP_PROTOCOLS } from '../data/prepProtocols'
import { useVisit } from '../store/visitStore'

// Care index: three calm, image-led chapters. Each visit is one line until
// opened, so the page reads as a menu rather than a brochure.

const GROUPS: { title: string; line: string; image: ImageKey; position?: string; slugs: string[] }[] = [
  { title: 'When something hurts or changed', line: 'Seen soon, with time to understand what’s going on.', image: 'chairDetail', slugs: ['comfort-assessment', 'restorative-review', 'gum-care-review'] },
  { title: 'Your smile', line: 'Consultations that start with what you want.', image: 'smile2', position: '50% 25%', slugs: ['smile-consultation', 'whitening-consultation', 'alignment-consultation'] },
  { title: 'Keeping well', line: 'Regular care, for every age.', image: 'model', slugs: ['checkup-hygiene', 'new-patient-examination', 'childrens-visit'] },
]

export default function Care() {
  const navigate = useNavigate()
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
      <header className="mx-auto max-w-[1320px] px-4 pb-8 pt-28 md:px-[4%] md:pt-[170px]">
        <p className="label mb-5">Care</p>
        <h1 className="display max-w-[900px] text-[clamp(2.8rem,6.4vw,6rem)]">Every visit, sized to what it needs.</h1>
        <p className="mt-6 max-w-[440px] text-graphite">Not sure which? You don’t need to be — begin your visit and ORA matches you.</p>
      </header>
      {GROUPS.map((g, i) => (
        <Chapter key={g.title} group={g} index={i} onBegin={begin} />
      ))}
      <ClinicalFooter />
    </>
  )
}

function Chapter({ group, index, onBegin }: { group: (typeof GROUPS)[number]; index: number; onBegin: (slug: string) => void }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-10%', '10%'])
  const clip = useTransform(scrollYProgress, [0, 0.35], reduce ? ['inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'] : ['inset(12% 8% 12% 8%)', 'inset(0% 0% 0% 0%)'])
  const [open, setOpen] = useState<string | null>(null)
  const flip = index % 2 === 1

  return (
    <section ref={ref} className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-16 md:px-[4%] md:py-24 lg:grid-cols-2 lg:gap-20" aria-labelledby={`care-${index}`}>
      <motion.div className={`relative aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-[4/5] ${flip ? 'lg:order-2' : ''}`} style={{ clipPath: clip }}>
        <motion.img
          src={imageSrc(group.image)}
          srcSet={imageSet(group.image)}
          sizes="(min-width:1024px) 50vw, 100vw"
          alt=""
          loading="lazy"
          className="absolute inset-x-0 top-[-10%] h-[120%] w-full object-cover"
          style={{ y, filter: WARM_GRADE, objectPosition: group.position }}
        />
        <span className="label absolute left-4 top-4 bg-porcelain/85 px-2 py-1 text-[9.5px] backdrop-blur">0{index + 1} / 03</span>
      </motion.div>

      <div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 id={`care-${index}`} className="display text-[clamp(2.2rem,4vw,3.6rem)]">
            {group.title}
          </h2>
          <p className="mt-3 text-muted">{group.line}</p>
        </motion.div>

        <ul className="mt-10 border-t border-steel-2">
          {group.slugs.map((slug, k) => {
            const t = APPOINTMENT_TYPES.find((x) => x.slug === slug)!
            const isOpen = open === slug
            return (
              <motion.li
                key={slug}
                className="border-b border-bone"
                initial={reduce ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ delay: 0.1 + k * 0.08, duration: 0.6 }}
              >
                <button className="group flex w-full items-baseline gap-4 py-5 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : slug)}>
                  <span className="flex-1 font-display text-[1.6rem] leading-tight transition-colors group-hover:text-clinic-deep">{t.name}</span>
                  <span className="font-mono text-sm text-muted">{t.duration_minutes}′</span>
                  <motion.span className="text-muted" animate={{ rotate: isOpen ? 45 : 0 }} aria-hidden>
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-6 pb-8">
                        <p className="max-w-[460px] text-graphite">{t.summary}</p>
                        <VisitDuration type={t} />
                        <p className="text-sm text-muted">
                          <span className="label mr-2 text-[10px]">Before you come</span>
                          {PREP_PROTOCOLS[t.prep_protocol_key].items[1] ?? PREP_PROTOCOLS[t.prep_protocol_key].items[0]}
                        </p>
                        <div className="flex flex-wrap items-center gap-6">
                          <button className="btn-primary" onClick={() => onBegin(slug)}>
                            Book this visit →
                          </button>
                          {t.deposit_ngn && <span className="label text-[10px]">₦{t.deposit_ngn.toLocaleString()} deposit</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
