import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ClinicalFooter from '../components/ora/ClinicalFooter'
import EditorialImage, { WARM_GRADE, imageSet, imageSrc, type ImageKey } from '../components/ora/EditorialImage'
import { OcclusionArch } from '../components/ora/OcclusionPath'
import SmileApertureHero from '../components/ora/SmileApertureHero'
import SmileGoal from '../components/ora/SmileGoal'
import type { Curve } from '../lib/arch'
import ScrollWords from '../motion/ScrollWords'
import { STEPS, useVisit } from '../store/visitStore'

const Reveal = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function Home() {
  return (
    <>
      <SmileApertureHero />
      <Studio />
      <HowItBegins />
      <Smile />
      <CareDoors />
      <ClinicalFooter />
    </>
  )
}

function Studio() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const drift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60])
  return (
    <section ref={ref} id="studio" className="scroll-mt-28 px-4 py-24 md:px-[5%] md:py-36">
      <div className="grid items-end gap-10 lg:grid-cols-12">
        <EditorialImage k="treatmentChair" className="aspect-[4/3] lg:col-span-7" sizes="(min-width:1024px) 58vw, 100vw" caption="Chair 02 · treatment room" />
        <div className="lg:col-span-5 lg:pb-6">
          <Reveal>
            <p className="label mb-5">01 — Studio</p>
            <h2 className="display text-[clamp(2.6rem,5.2vw,5rem)]">
              <ScrollWords text="A studio, not a waiting room." />
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="mt-12 grid grid-cols-3 border-t border-steel-2">
              {[
                ['03', 'chairs'],
                ['04', 'clinicians'],
                ['0', 'double-booking'],
              ].map(([n, l]) => (
                <div key={l} className="pt-4">
                  <dt className="font-display text-4xl">{n}</dt>
                  <dd className="label mt-1 text-[10px]">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
      <motion.div style={{ y: drift }} className="mt-10 grid grid-cols-2 gap-4 md:ml-[42%] md:mt-[-4rem] md:w-[58%]">
        <EditorialImage k="chairDetail" className="aspect-[4/5]" sizes="30vw" />
        <EditorialImage k="instrumentMacro" className="mt-12 aspect-[4/5]" sizes="30vw" position="40% 50%" />
      </motion.div>
    </section>
  )
}

const HOW_ARCH: Curve = [
  [80, 250],
  [96, 30],
  [504, 30],
  [520, 250],
]
const STEP_LINE = ['In your own words', 'Only what matters', 'The right visit', 'A real free chair', 'Confirmed']
const MESSAGE = 'hi 👋 one tooth hurts. can I come in this week?'

/**
 * Scroll-driven: the section pins, the patient's message types itself, then
 * each stretch of scroll advances the arch one step until ORA replies with a
 * confirmed visit.
 */
function HowItBegins() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [step, setStep] = useState(reduce ? 4 : 0)
  const [typed, setTyped] = useState(reduce ? MESSAGE.length : 0)
  const [done, setDone] = useState(!!reduce)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduce) return
    setTyped(Math.round(Math.min(1, v / 0.14) * MESSAGE.length))
    setStep(Math.min(4, Math.max(0, Math.floor((v - 0.16) / 0.15))))
    setDone(v > 0.84)
  })
  const rail = useTransform(scrollYProgress, [0.14, 0.9], [0, 1])
  const chars = [...MESSAGE]

  return (
    <section ref={ref} id="visit" className="relative bg-ivory" style={{ height: reduce ? 'auto' : '460vh' }}>
      <div className={`${reduce ? 'py-24' : 'sticky top-0 h-[100svh]'} flex flex-col justify-center overflow-hidden px-4 pt-16 md:px-[5%] md:pt-20`}>
        <div className="mb-6 flex items-end justify-between gap-6 md:mb-10">
          <div>
            <p className="label mb-3">02 — Visit</p>
            <h2 className="display max-w-[860px] text-[clamp(2.2rem,5vw,4.8rem)]">One message in. One visit out.</h2>
          </div>
          <p className="label hidden text-right md:block">Scroll ↓</p>
        </div>

        <div className="grid items-center gap-6 md:gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="max-w-[400px] space-y-3 lg:max-w-[480px]">
            <p className="label text-[10px]">09:02 · WhatsApp</p>
            <p className="min-h-[88px] rounded-[22px] rounded-bl-md bg-porcelain px-5 py-4 font-mono text-[14px] leading-relaxed shadow-[0_20px_40px_-28px_rgba(0,0,0,0.4)] md:px-6 md:py-5 md:text-[15px] lg:text-[17px]">
              {chars.slice(0, typed).join('')}
              {typed < chars.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-charcoal" />}
            </p>
            <AnimatePresence>
              {done && (
                <motion.p
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="ml-auto max-w-[330px] rounded-[22px] rounded-br-md bg-charcoal px-5 py-4 text-[14px] leading-relaxed text-ivory md:text-[15px] lg:max-w-[380px] lg:text-[16px]"
                >
                  <span className="label mb-1 block text-[9.5px] !text-clinic-soft">ORA · 09:05</span>
                  You’re booked — Comfort &amp; Assessment Visit, Thu 10:30, Chair 02. Your CarePass is ready.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="relative mx-auto w-full max-w-[640px] lg:max-w-[760px]">
            <svg viewBox="0 0 600 290" className="w-full" aria-hidden>
              <OcclusionArch step={done ? 5 : step} curve={HOW_ARCH} labelSize={26} labels={false} />
            </svg>
            <div className="absolute inset-x-0 bottom-[4%] text-center" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <p className="label text-[10px]">
                    0{step + 1} · {STEPS[step]}
                  </p>
                  <p className="mt-1 font-display text-[clamp(1.5rem,3vw,2.4rem)]">{STEP_LINE[step]}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {!reduce && (
          <div className="mt-8 md:mt-12">
            <div className="h-px w-full bg-steel-2">
              <motion.div className="h-px origin-left bg-clinic" style={{ scaleX: rail }} />
            </div>
            <div className="mt-2 flex justify-between">
              {STEPS.map((s, i) => (
                <span key={s} className={`label text-[9px] transition-colors ${i <= step && typed === chars.length ? 'text-charcoal' : 'text-steel'}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Smile() {
  const navigate = useNavigate()
  const chooseConcern = useVisit((s) => s.chooseConcern)
  const answer = useVisit((s) => s.answer)
  const reset = useVisit((s) => s.reset)
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-8%', '8%'])
  return (
    <section ref={ref} id="smile" className="relative scroll-mt-20 overflow-hidden">
      <div className="relative h-[78svh] min-h-[520px]">
        <motion.img
          src={imageSrc('smile')}
          srcSet={imageSet('smile')}
          sizes="100vw"
          alt="A woman laughing with a natural, relaxed smile"
          loading="lazy"
          className="absolute inset-0 h-[116%] w-full object-cover"
          style={{ y, top: '-8%', filter: WARM_GRADE, objectPosition: '32% 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/55 via-charcoal/10 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-[170px] md:px-[5%] md:pb-[190px]">
          <Reveal>
            <p className="label mb-4 !text-ivory/80">03 — Smile</p>
            <h2 className="display max-w-[640px] text-[clamp(2.6rem,5.6vw,5.4rem)] text-ivory">Start with the conversation.</h2>
          </Reveal>
        </div>
      </div>
      {/* Shade tabs rise out of the photograph's lower edge, like teeth along a gum line. */}
      <div className="relative z-10 -mt-[128px] px-4 pb-24 md:px-[5%]">
        <div className="mx-auto max-w-[900px]">
          <SmileGoal
            onChange={(g) => {
              reset()
              chooseConcern('smile')
              answer('goal', g)
              navigate('/visit')
            }}
          />
        </div>
        <p className="label mt-4 text-center text-[10px]">Pick a shade tab to begin</p>
      </div>
    </section>
  )
}

const DOORS: { k: ImageKey; title: string; visits: string[]; position?: string }[] = [
  { k: 'chairDetail', title: 'When something hurts', visits: ['Comfort & Assessment', 'Restorative Review', 'Gum Care Review'] },
  { k: 'smile2', title: 'Your smile', visits: ['Smile Consultation', 'Whitening', 'Alignment'], position: '50% 25%' },
  { k: 'model', title: 'Keeping well', visits: ['Check-up & Hygiene', 'New Patient Exam', "Children's Visit"] },
]

function CareDoors() {
  return (
    <section className="px-4 py-24 md:px-[5%] md:py-32">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <p className="label mb-5">04 — Care</p>
          <h2 className="display text-[clamp(2.4rem,4.6vw,4.2rem)]">
            <ScrollWords text="Nine ways to begin." />
          </h2>
        </Reveal>
        <Link to="/care" className="btn-quiet">
          All care →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {DOORS.map((d, i) => (
          <Reveal key={d.title} delay={i * 0.08}>
            <Link to="/care" className="group relative block aspect-[3/4] overflow-hidden">
              <img
                src={imageSrc(d.k)}
                srcSet={imageSet(d.k)}
                sizes="(min-width:768px) 33vw, 100vw"
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                style={{ filter: WARM_GRADE, objectPosition: d.position }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                <p className="label mb-2 !text-ivory/70">0{i + 1}</p>
                <p className="font-display text-3xl">{d.title}</p>
                <ul className="mt-3 max-h-0 overflow-hidden text-sm text-ivory/85 opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100 group-focus-visible:max-h-24 group-focus-visible:opacity-100">
                  {d.visits.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
