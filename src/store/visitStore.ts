import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { concernById, type Answers } from '../data/routingRules'
import type { UrgencyTier } from '../data/urgentCare'
import type { Preference } from '../lib/scheduling/availability'
import type { ConcernId, Slot } from '../lib/types'

export const STEPS = ['Concern', 'Details', 'Care match', 'Time', 'Confirm'] as const
export type StepIndex = 0 | 1 | 2 | 3 | 4

export interface PatientDraft {
  full_name: string
  phone: string
  email: string
  firstVisit: '' | 'yes' | 'no'
  pace: '' | 'standard' | 'unhurried'
  note: string
  consent: boolean
}

const EMPTY_PATIENT: PatientDraft = {
  full_name: '',
  phone: '',
  email: '',
  firstVisit: '',
  pace: '',
  note: '',
  consent: false,
}

interface VisitState {
  step: StepIndex
  direction: 1 | -1
  concern: ConcernId | null
  answers: Answers
  /** null until the patient has been through the urgency check. */
  urgency: UrgencyTier | 'clear' | null
  flags: string[]
  typeSlug: string | null
  reasons: string[]
  preference: Preference
  slot: Slot | null
  patient: PatientDraft
  bookingCode: string | null

  go: (step: StepIndex) => void
  back: () => void
  chooseConcern: (id: ConcernId) => void
  answer: (questionId: string, value: string) => void
  setUrgency: (u: VisitState['urgency'], flags?: string[]) => void
  resolveMatch: () => void
  setPreference: (p: Preference) => void
  chooseSlot: (s: Slot | null) => void
  updatePatient: (p: Partial<PatientDraft>) => void
  complete: (code: string) => void
  reset: () => void
}

const initial = {
  step: 0 as StepIndex,
  direction: 1 as const,
  concern: null,
  answers: {},
  urgency: null,
  flags: [],
  typeSlug: null,
  reasons: [],
  preference: 'soonest' as Preference,
  slot: null,
  patient: EMPTY_PATIENT,
  bookingCode: null,
}

export const useVisit = create<VisitState>()(
  persist(
    (set, get) => ({
      ...initial,
      go: (step) => set({ step, direction: step >= get().step ? 1 : -1 }),
      back: () => {
        const s = get().step
        if (s > 0) set({ step: (s - 1) as StepIndex, direction: -1 })
      },
      chooseConcern: (id) =>
        set({
          concern: id,
          answers: {},
          urgency: null,
          flags: [],
          typeSlug: null,
          slot: null,
          step: 1,
          direction: 1,
        }),
      answer: (questionId, value) => {
        const { concern, answers } = get()
        if (!concern) return
        // Changing an earlier answer clears later ones, since they may no
        // longer apply.
        const order = concernById(concern).questions.map((q) => q.id)
        const idx = order.indexOf(questionId)
        const next: Answers = {}
        for (const id of order.slice(0, idx)) if (answers[id]) next[id] = answers[id]
        next[questionId] = value
        set({ answers: next, urgency: null, typeSlug: null, slot: null })
      },
      setUrgency: (urgency, flags = []) => set({ urgency, flags }),
      resolveMatch: () => {
        const { concern, answers } = get()
        if (!concern) return
        const r = concernById(concern).resolve(answers)
        set({
          typeSlug: r.typeSlug,
          reasons: r.reasons,
          preference: r.preferSoonest ? 'soonest' : get().preference,
          slot: null,
          step: 2,
          direction: 1,
        })
      },
      setPreference: (preference) => set({ preference }),
      chooseSlot: (slot) => set({ slot }),
      updatePatient: (p) => set({ patient: { ...get().patient, ...p } }),
      complete: (bookingCode) => set({ bookingCode }),
      reset: () => set({ ...initial, patient: { ...EMPTY_PATIENT } }),
    }),
    {
      name: 'ora.visit',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ step, concern, answers, urgency, flags, typeSlug, reasons, preference, slot, patient, bookingCode }) => ({
        step,
        concern,
        answers,
        urgency,
        flags,
        typeSlug,
        reasons,
        preference,
        slot,
        patient,
        bookingCode,
      }),
    },
  ),
)
