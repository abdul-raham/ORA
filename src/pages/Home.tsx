import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ClinicalFooter from '../components/ora/ClinicalFooter'
import EditorialImage, { WARM_GRADE, imageSet, imageSrc, type ImageKey } from '../components/ora/EditorialImage'
import { OcclusionArch } from '../components/ora/OcclusionPath'
import SmileApertureHero from '../components/ora/SmileApertureHero'
import SmileGoal from '../components/ora/SmileGoal'
import type { Curve } from '../lib/arch'
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
              A studio,
              <br />
              <em className="font-light">not</em> a waiting room.
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

function HowItBegins() {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!auto || !inView || reduce) return
    const t = window.setInterval(() => setStep((s) => (s + 1) % 5), 1700)
    return () => window.clearInterval(t)
  }, [auto, inView, reduce])

  return (
    <section id="visit" className="scroll-mt-28 bg-ivory px-4 py-24 md:px-[5%] md:py-36">
      <Reveal className="mb-16 md:mb-20">
        <p className="label mb-5">02 — Visit</p>
        <h2 className="display max-w-[860px] text-[clamp(2.6rem,5.2vw,5rem)]">One message in. One visit out.</h2>
      </Reveal>
      <div ref={ref} className="grid items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <div className="relative max-w-[380px]">
            <p className="label mb-4 text-[10px]">09:02 · WhatsApp</p>
            <p className="rounded-[22px] rounded-bl-md bg-porcelain px-6 py-5 font-mono text-[15px] leading-relaxed shadow-[0_20px_40px_-28px_rgba(0,0,0,0.4)]">
              hi 👋 one tooth hurts.
              <br />
              can I come in this week?
            </p>
            <p className="mt-6 text-sm text-muted">Usually that starts hours of back-and-forth. At ORA it starts here →</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div onMouseEnter={() => setAuto(false)} className="relative">
            <svg viewBox="0 0 600 290" className="w-full" aria-hidden>
              <OcclusionArch step={step} curve={HOW_ARCH} labelSize={26} labels={false} />
            </svg>
            <div className="absolute inset-x-0 bottom-[6%] text-center" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                  <p className="label text-[10px]">
                    0{step + 1} · {STEPS[step]}
                  </p>
                  <p className="mt-1 font-display text-[clamp(1.6rem,3vw,2.4rem)]">{STEP_LINE[step]}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Booking steps">
            {STEPS.map((s, i) => (
              <button
                key={s}
                role="tab"
                aria-selected={step === i}
                aria-label={s}
                onClick={() => (setAuto(false), setStep(i))}
                className={`h-[3px] w-8 transition-colors ${step === i ? 'bg-clinic' : 'bg-steel-2 hover:bg-steel'}`}
              />
            ))}
          </div>
        </Reveal>
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
        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-16 md:px-[5%] md:pb-24">
          <Reveal>
            <p className="label mb-4 !text-ivory/80">03 — Smile</p>
            <h2 className="display max-w-[640px] text-[clamp(2.6rem,5.6vw,5.4rem)] text-ivory">Start with the conversation.</h2>
          </Reveal>
        </div>
      </div>
      <div className="relative z-10 -mt-10 px-4 pb-24 md:px-[5%]">
        <div className="mx-auto max-w-[900px] bg-porcelain px-4 pt-2 md:px-8">
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
          <h2 className="display text-[clamp(2.4rem,4.6vw,4.2rem)]">Nine ways to begin.</h2>
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
