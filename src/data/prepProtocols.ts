// Clinic-approved pre-visit information, keyed by appointment type.

export interface PrepProtocol {
  title: string
  items: string[]
}

const ARRIVE = 'Arrive 10 minutes early so check-in feels unhurried.'
const MEDS = 'Bring a list of any medicines you take, or photos of the labels.'

export const PREP_PROTOCOLS: Record<string, PrepProtocol> = {
  comfort: {
    title: 'Before your Comfort & Assessment Visit',
    items: [ARRIVE, MEDS, 'Note when the discomfort happens — it helps the conversation.', 'Take your usual pain relief if you need it, and tell us what you took.'],
  },
  restorative: {
    title: 'Before your Restorative Review',
    items: [ARRIVE, MEDS, 'If a piece of filling, crown or tooth came away, bring it in a clean container.', 'Avoid chewing hard food on that side until you are seen.'],
  },
  gum: {
    title: 'Before your Gum Care Review',
    items: [ARRIVE, MEDS, 'Keep brushing gently as usual, including the areas that bleed.', 'Bring the toothbrush and any interdental brushes you use.'],
  },
  smile: {
    title: 'Before your Smile Consultation',
    items: [ARRIVE, 'Bring photos of smiles you like, if you have any — no pressure if not.', 'Think about any dates or events you are working towards.', 'Your digital scan is quick and needs no preparation.'],
  },
  whitening: {
    title: 'Before your Whitening Consultation',
    items: [ARRIVE, 'Skip lipstick or tinted lip balm so we can see your natural shade.', 'Tell us about any sensitivity you notice with hot or cold drinks.'],
  },
  alignment: {
    title: 'Before your Alignment Consultation',
    items: [ARRIVE, 'Brush before you come — the digital scan works best on clean teeth.', 'Bring any previous brace or retainer records if you have them.'],
  },
  hygiene: {
    title: 'Before your Check-up & Hygiene Visit',
    items: [ARRIVE, MEDS, 'Brush and floss as normal on the day.'],
  },
  newPatient: {
    title: 'Before your New Patient Examination',
    items: [ARRIVE, MEDS, 'Bring any previous dental records or X-rays if you have them.', 'It is fine if it has been a long time — no judgement, just a fresh start.'],
  },
  child: {
    title: "Before your child's visit",
    items: [ARRIVE, 'A parent or guardian needs to stay for the whole visit.', 'Bring a favourite toy if it helps them feel at ease.', "Describe the visit simply — we'll count and check teeth together."],
  },
}
