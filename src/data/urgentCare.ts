// Static, clinic-approved urgent guidance. This is configuration, not generated
// advice: the wording below is shown verbatim and only when a patient selects a
// configured flag. Review reference and date are shown with the guidance.

export type UrgencyTier = 'emergency' | 'same-day'

export interface RedFlag {
  id: string
  label: string
  tier: UrgencyTier
}

export const URGENT_REVIEW = { reference: 'ORA-UG-01', reviewed: 'Reviewed by the ORA clinical lead · Sep 2026' }

export const RED_FLAGS: RedFlag[] = [
  { id: 'breathing', label: 'Difficulty breathing, swallowing or opening your mouth', tier: 'emergency' },
  { id: 'swelling', label: 'Swelling of the face, jaw or neck that is spreading or affecting your eye', tier: 'emergency' },
  { id: 'bleeding', label: "Bleeding from the mouth that won't stop with firm pressure", tier: 'emergency' },
  { id: 'injury', label: 'A tooth knocked out, or an injury to the face or mouth', tier: 'same-day' },
  { id: 'fever', label: 'A fever together with tooth pain or swelling', tier: 'same-day' },
  { id: 'uncontrolled', label: "Severe pain that isn't eased by the pain relief you would normally use", tier: 'same-day' },
]

export const URGENT_GUIDANCE: Record<UrgencyTier, { title: string; lead: string; steps: string[] }> = {
  emergency: {
    title: 'Please get help now.',
    lead: 'What you selected needs to be seen urgently, and not through online booking.',
    steps: [
      'Call 112 or go to the nearest hospital emergency department now.',
      'If you can, bring a list of any medicines you take.',
      'Once you are safe, call the studio and we will arrange follow-up care with you.',
    ],
  },
  'same-day': {
    title: 'Please call us now.',
    lead: 'What you selected should be spoken about with our team today, rather than booked online.',
    steps: [
      'Call the ORA urgent line — a clinician will call you back the same day.',
      'For a knocked-out adult tooth, hold it by the crown (not the root) and keep it in milk while you call.',
      'If things get worse, or you feel unwell, go to the nearest emergency department.',
    ],
  },
}
