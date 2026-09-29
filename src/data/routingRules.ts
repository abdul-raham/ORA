import type { ConcernId, Region, SmileGoalId } from '../lib/types'
import { APPOINTMENT_TYPES } from './appointmentTypes'

// Routing configuration. Everything a patient reads during routing lives here
// so wording can be reviewed by the clinic in one place. These rules choose a
// booking starting point only; they never name a condition.

export type Answers = Record<string, string>

export interface Option {
  id: string
  label: string
  hint?: string
}

export interface Question {
  id: string
  kind: 'choice' | 'map' | 'goal' | 'type'
  prompt: string
  help?: string
  options?: Option[]
  when?: (a: Answers) => boolean
}

export interface Resolution {
  typeSlug: string
  reasons: string[]
  preferSoonest: boolean
}

export interface ConcernConfig {
  id: ConcernId
  index: string
  label: string
  line: string
  questions: Question[]
  urgencyCheck: (a: Answers) => boolean
  resolve: (a: Answers) => Resolution
}

export const REGION_LABELS: Record<Region, string> = {
  'upper-right': 'upper right',
  'upper-front': 'upper front',
  'upper-left': 'upper left',
  'lower-right': 'lower right',
  'lower-front': 'lower front',
  'lower-left': 'lower left',
  unsure: 'not sure / more than one place',
}

export const SMILE_GOALS: { id: SmileGoalId; label: string; line: string }[] = [
  { id: 'colour', label: 'Colour', line: 'Brighter or more even shade' },
  { id: 'alignment', label: 'Alignment', line: 'Straighter or better spaced' },
  { id: 'shape', label: 'Shape & edges', line: 'Chips, wear or uneven edges' },
  { id: 'missing', label: 'A missing tooth', line: 'Filling a gap' },
  { id: 'general', label: 'Not sure yet', line: 'A general smile conversation' },
]

const WHO: Question = {
  id: 'patient',
  kind: 'choice',
  prompt: 'Who is the visit for?',
  options: [
    { id: 'me', label: 'Me' },
    { id: 'child', label: 'My child', hint: 'Under 12' },
  ],
}

const region = (prompt: string, when?: Question['when']): Question => ({
  id: 'region',
  kind: 'map',
  prompt,
  help: 'A general area is enough — this only helps us prepare the right visit.',
  when,
})

const regionText = (a: Answers) =>
  a.region && a.region !== 'unsure' ? `the ${REGION_LABELS[a.region as Region]} area` : 'your mouth'

const label = (q: Question, id: string | undefined) =>
  q.options?.find((o) => o.id === id)?.label.toLowerCase() ?? ''

const PAIN_SINCE: Question = {
  id: 'since',
  kind: 'choice',
  prompt: 'How long has it been going on?',
  options: [
    { id: 'today', label: 'Started today' },
    { id: 'days', label: 'A few days' },
    { id: 'week', label: 'Over a week' },
    { id: 'onoff', label: 'It comes and goes' },
  ],
}

const CHANGED_WHAT: Question = {
  id: 'what',
  kind: 'choice',
  prompt: 'What has changed?',
  options: [
    { id: 'filling', label: 'A filling or crown came out or feels loose' },
    { id: 'chipped', label: 'A tooth chipped or broke' },
    { id: 'gums', label: 'Gums bleed, feel tender or look different' },
    { id: 'other', label: 'Something else feels or looks different' },
  ],
}

const ROUTINE_LAST: Question = {
  id: 'last',
  kind: 'choice',
  prompt: 'When was your last dental visit?',
  options: [
    { id: 'recent', label: 'Within the last year' },
    { id: 'one-two', label: '1 — 2 years ago' },
    { id: 'long', label: 'More than 2 years ago' },
    { id: 'unsure', label: "I can't remember" },
  ],
}

export const CONCERNS: ConcernConfig[] = [
  {
    id: 'pain',
    index: '01',
    label: 'Pain / Discomfort',
    line: 'Something hurts, aches or feels sensitive.',
    questions: [WHO, region('Where do you notice it?'), PAIN_SINCE],
    urgencyCheck: () => true,
    resolve: (a) =>
      a.patient === 'child'
        ? {
            typeSlug: 'childrens-visit',
            preferSoonest: true,
            reasons: [
              `You told us your child has discomfort in ${regionText(a)}.`,
              "A Children's Visit is paced for young patients and leaves time for your questions.",
              'We will show the soonest suitable times first.',
            ],
          }
        : {
            typeSlug: 'comfort-assessment',
            preferSoonest: true,
            reasons: [
              `You told us about discomfort in ${regionText(a)} — ${label(PAIN_SINCE, a.since)}.`,
              'A Comfort & Assessment Visit sets aside time to listen, take a careful look and explain what the clinician finds.',
              'We will show the soonest suitable times first.',
            ],
          },
  },
  {
    id: 'changed',
    index: '02',
    label: 'Something Changed',
    line: "A filling, crown, tooth or gum isn't as it was.",
    questions: [
      CHANGED_WHAT,
      region('Where is it?', (a) => a.what !== 'gums'),
      {
        id: 'since',
        kind: 'choice',
        prompt: 'When did you notice it?',
        options: [
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This week' },
          { id: 'while', label: 'A while ago' },
        ],
      },
    ],
    urgencyCheck: () => true,
    resolve: (a) => {
      if (a.what === 'gums')
        return {
          typeSlug: 'gum-care-review',
          preferSoonest: false,
          reasons: [
            'You mentioned a change in your gums.',
            'A Gum Care Review is led by a clinician who focuses on gum health.',
            'It includes a home-care plan you can start straight away.',
          ],
        }
      if (a.what === 'filling' || a.what === 'chipped')
        return {
          typeSlug: 'restorative-review',
          preferSoonest: true,
          reasons: [
            `You told us ${label(CHANGED_WHAT, a.what)} in ${regionText(a)}.`,
            'A Restorative Review is booked with a clinician who repairs and restores teeth.',
            'Any treatment is discussed with you at the visit — nothing is decided in advance.',
          ],
        }
      return {
        typeSlug: 'comfort-assessment',
        preferSoonest: false,
        reasons: [
          `You noticed something different in ${regionText(a)}.`,
          'A Comfort & Assessment Visit gives the clinician time to take a proper look.',
          'You will leave knowing what, if anything, is needed next.',
        ],
      }
    },
  },
  {
    id: 'smile',
    index: '03',
    label: 'My Smile',
    line: "Colour, alignment, shape or a gap you'd like to talk about.",
    questions: [
      { id: 'goal', kind: 'goal', prompt: 'What would you most like to talk about?' },
      {
        id: 'timeline',
        kind: 'choice',
        prompt: 'Are you working towards a date?',
        options: [
          { id: 'none', label: 'No particular date' },
          { id: 'event', label: 'An event in the next 3 months' },
          { id: 'exploring', label: 'Just exploring' },
        ],
      },
    ],
    urgencyCheck: () => false,
    resolve: (a) => {
      const soon = a.timeline === 'event'
      const tail = soon
        ? 'Because you have a date in mind, we will show the earliest times first.'
        : 'Nothing is decided at a consultation — it is a conversation, not a commitment.'
      if (a.goal === 'colour')
        return {
          typeSlug: 'whitening-consultation',
          preferSoonest: soon,
          reasons: ['You would like to talk about the colour of your teeth.', 'A Whitening Consultation checks your shade and whether whitening suits you.', tail],
        }
      if (a.goal === 'alignment')
        return {
          typeSlug: 'alignment-consultation',
          preferSoonest: soon,
          reasons: ['You would like to talk about alignment.', 'An Alignment Consultation includes a digital scan, so it is booked in our scanner chair.', tail],
        }
      return {
        typeSlug: 'smile-consultation',
        preferSoonest: soon,
        reasons: ['You would like to talk about your smile.', 'A Smile Consultation includes a digital scan and time to go through options and costs.', tail],
      }
    },
  },
  {
    id: 'routine',
    index: '04',
    label: 'Routine Care',
    line: "Check-up, hygiene or it's simply been a while.",
    questions: [WHO, { ...ROUTINE_LAST, when: (a) => a.patient !== 'child' }],
    urgencyCheck: () => false,
    resolve: (a) => {
      if (a.patient === 'child')
        return {
          typeSlug: 'childrens-visit',
          preferSoonest: false,
          reasons: ["This is a routine visit for your child.", "A Children's Visit is short, calm and paced for young patients.", 'Parents are welcome in the room throughout.'],
        }
      if (a.last === 'long' || a.last === 'unsure')
        return {
          typeSlug: 'new-patient-examination',
          preferSoonest: false,
          reasons: ["It has been a while since your last visit — that's completely fine.", 'A New Patient Examination gives the time for a thorough first look and a clear plan.', 'Hygiene can be booked afterwards if it is recommended.'],
        }
      return {
        typeSlug: 'checkup-hygiene',
        preferSoonest: false,
        reasons: ['You are keeping up with regular care.', 'A Check-up & Hygiene Visit combines your check-up with a professional clean.', 'It is led by our hygienist.'],
      }
    },
  },
  {
    id: 'known',
    index: '05',
    label: 'I Know What I Need',
    line: 'Choose your appointment directly.',
    questions: [
      {
        id: 'type',
        kind: 'type',
        prompt: 'Which appointment would you like?',
        options: APPOINTMENT_TYPES.filter((t) => t.active).map((t) => ({
          id: t.slug,
          label: t.name,
          hint: `${t.duration_minutes} min`,
        })),
      },
    ],
    urgencyCheck: (a) => a.type === 'comfort-assessment' || a.type === 'restorative-review',
    resolve: (a) => ({
      typeSlug: a.type,
      preferSoonest: false,
      reasons: ['You chose this appointment directly.', 'We have matched it to a clinician and chair that can take it.', 'If it turns out a different visit suits you better, reception will adjust it with you.'],
    }),
  },
]

export const concernById = (id: ConcernId) => CONCERNS.find((c) => c.id === id)!

/** Questions currently visible for the given answers, in order. */
export const visibleQuestions = (c: ConcernConfig, a: Answers) => c.questions.filter((q) => !q.when || q.when(a))

export const isLensComplete = (c: ConcernConfig, a: Answers) => visibleQuestions(c, a).every((q) => !!a[q.id])
