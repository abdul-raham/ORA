import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ClinicalFooter from '../components/ora/ClinicalFooter'
import { OcclusionArch } from '../components/ora/OcclusionPath'
import SmileApertureHero from '../components/ora/SmileApertureHero'
import SmileGoal from '../components/ora/SmileGoal'
import { APPOINTMENT_TYPES } from '../data/appointmentTypes'
import type { Curve } from '../lib/arch'
import { STEPS, useVisit } from '../store/visitStore'

const Reveal = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
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
      <CareIndex />
      <ClinicalFooter />
    </>
  )
}

function Studio() {
  return (
    <section id="studio" className="scroll-mt-28 border-t border-bone px-4 py-28 md:px-[6%] md:py-40">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="label mb-6">01 — Studio</p>
          <h2 className="display text-[clamp(2.8rem,6vw,5.8rem)]">
            A studio,
            <br />
            <em className="font-light">not</em> a waiting room.
          </h2>
        </Reveal>
        <Reveal className="lg:pt-16">
          <p className="max-w-[520px] text-xl leading-relaxed text-graphite">
            Three treatment chairs, four clinicians and a schedule built around the time each visit actually needs. No double-booking, no rushing, no guessing what to ask for.
          </p>
          <dl className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              ['Time that fits', 'Every appointment is sized to what it involves — and the chair reset is held too.'],
              ['Heard first', 'Visits start with listening. Nothing is decided before you arrive.'],
              ['Precise', 'Digital scanning where it helps, clear explanations everywhere.'],
            ].map(([k, v], i) => (
              <div key={k} className="border-t border-steel-2 pt-4">
                <dt className="label mb-2 text-[10px]">0{i + 1}</dt>
                <dd>
                  <span className="block font-display text-xl">{k}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted">{v}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
      <Reveal className="mt-24">
        <ChairLanes />
      </Reveal>
    </section>
  )
}

/** Quiet illustration of the studio day: three chair lanes, visits fitting their time. */
function ChairLanes() {
  const lanes = [
    [
      [0, 12],
      [15, 30],
      [34, 44],
      [60, 78],
      [82, 95],
    ],
    [
      [4, 22],
      [26, 38],
      [48, 66],
      [70, 80],
    ],
    [
      [0, 18],
      [30, 48],
      [52, 60],
      [66, 86],
    ],
  ]
  return (
    <figure aria-label="Illustration: a day across three treatment chairs">
      <div className="space-y-3">
        {lanes.map((blocks, i) => (
          <div key={i} className="grid grid-cols-[88px_1fr] items-center gap-4">
            <span className="label text-[10px]">Chair 0{i + 1}</span>
            <div className="relative h-14 border-y border-steel-2">
              {blocks.map(([s, e], k) => (
                <motion.span
                  key={k}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + (i * 5 + k) * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="porcelain-surface absolute inset-y-1.5 origin-left"
                  style={{ left: `${s}%`, width: `${e - s - 0.8}%` }}
                />
              ))}
              {i === 1 && <span className="absolute inset-y-0 w-px bg-clinic" style={{ left: '43%' }} aria-hidden />}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="label mt-4 text-right text-[10px]">08:00 ——— a studio day ——— 18:00</figcaption>
    </figure>
  )
}

const HOW_ARCH: Curve = [
  [80, 250],
  [96, 30],
  [504, 30],
  [520, 250],
]
const STEP_TEXT = [
  'Tell us what brings you in — in your words, not medical ones.',
  'A few short questions, only the ones that change your booking.',
  'ORA chooses the right starting appointment and explains why.',
  'You see real times where a suitable clinician and chair are free.',
  'Confirm in seconds. Your CarePass and preparation arrive with it.',
]

function HowItBegins() {
  const [step, setStep] = useState(0)
  return (
    <section id="visit" className="scroll-mt-28 bg-ivory px-4 py-28 md:px-[6%] md:py-40">
      <Reveal>
        <p className="label mb-6">02 — Visit</p>
        <h2 className="display max-w-[900px] text-[clamp(2.8rem,6vw,5.8rem)]">From “one tooth hurts” to a confirmed visit.</h2>
      </Reveal>
      <div className="mt-20 grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <Reveal>
          <p className="label mb-5 text-alert">Before</p>
          <ol className="space-y-3 font-mono text-[13px]">
            {[
              ['09:02', 'hi. can I book? one tooth hurts'],
              ['09:40', 'Hello! Which tooth, and for how long?'],
              ['10:15', 'bottom left. few days'],
              ['10:16', 'ok. what days work for you?'],
              ['11:52', 'is thursday free?'],
              ['12:30', 'Thursday is full. Friday 3pm?'],
              ['14:05', '…'],
            ].map(([t, m], i) => (
              <li key={i} className={`flex gap-4 ${i % 2 ? 'text-muted' : ''}`}>
                <span className="w-12 shrink-0 text-steel">{t}</span>
                <span>{m}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-bone pt-4 text-sm text-muted">7 messages, 5 hours, and still no visit — plus a receptionist pulled away from the patients in front of them.</p>
        </Reveal>
        <Reveal>
          <p className="label mb-5 text-clinic">After</p>
          <div className="grid items-center gap-8 md:grid-cols-[1fr_1fr]">
            <svg viewBox="0 0 600 290" className="w-full" aria-hidden>
              <OcclusionArch step={step} curve={HOW_ARCH} labelSize={26} labels={false} />
            </svg>
            <ol>
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    onMouseEnter={() => setStep(i)}
                    onFocus={() => setStep(i)}
                    onClick={() => setStep(i)}
                    aria-pressed={step === i}
                    className={`w-full border-b border-bone py-3 text-left transition-colors ${step === i ? 'text-charcoal' : 'text-muted'}`}
                  >
                    <span className="label mr-3 text-[10px]">0{i + 1}</span>
                    <span className="font-display text-lg">{s}</span>
                    {step === i && <span className="mt-1 block text-sm leading-relaxed text-graphite">{STEP_TEXT[i]}</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-8 border-t border-bone pt-4 text-sm text-graphite">About three minutes. Reception only steps in when something genuinely needs a person.</p>
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
  return (
    <section id="smile" className="scroll-mt-28 px-4 py-28 md:px-[6%] md:py-40">
      <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="label mb-6">03 — Smile</p>
          <h2 className="display text-[clamp(2.8rem,6vw,5.8rem)]">Start with the conversation.</h2>
          <p className="mt-8 max-w-[440px] text-lg leading-relaxed text-graphite">
            Colour, alignment, shape or a gap — choose what you'd like to talk about. A consultation is a conversation, never a commitment.
          </p>
        </Reveal>
        <Reveal className="lg:pt-24">
          <SmileGoal
            onChange={(g) => {
              reset()
              chooseConcern('smile')
              answer('goal', g)
              navigate('/visit')
            }}
          />
          <p className="label mt-4 text-[10px]">Choose a shade tab to begin a smile visit</p>
        </Reveal>
      </div>
    </section>
  )
}

function CareIndex() {
  return (
    <section className="border-t border-bone px-4 py-28 md:px-[6%]">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <p className="label mb-6">04 — Care</p>
          <h2 className="display text-[clamp(2.4rem,4.5vw,4.2rem)]">Nine ways to begin.</h2>
        </Reveal>
        <Link to="/care" className="btn-quiet">
          The full care index →
        </Link>
      </div>
      <ol className="border-t border-steel-2">
        {APPOINTMENT_TYPES.map((t, i) => (
          <li key={t.id} className="grid grid-cols-[40px_1fr_auto] items-baseline gap-4 border-b border-bone py-4 md:grid-cols-[60px_1fr_1.2fr_auto]">
            <span className="label text-[10px]">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-display text-xl md:text-2xl">{t.name}</span>
            <span className="hidden text-sm text-muted md:block">{t.summary}</span>
            <span className="font-mono text-sm">{t.duration_minutes}′</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
