import { motion, useReducedMotion } from 'motion/react'

// Locally hosted editorial photography (see ASSETS.md). A warm grade brings
// cooler clinic photos into the porcelain palette; images reveal with a clean
// vertical wipe as they enter view.

export const IMAGES = {
  treatmentRoom: { src: 'treatment-room-above', alt: 'A treatment chair seen from above on a warm wooden floor', w: 2400, h: 1600, mids: [1280, 1920] },
  treatmentChair: { src: 'treatment-chair', alt: 'A sculptural dental chair in a bright, quiet treatment room', w: 2400, h: 1600, mids: [1280] },
  chairDetail: { src: 'chair-detail', alt: 'Close detail of a treatment chair headrest in soft light', w: 1024, h: 683 },
  instrumentsArm: { src: 'instruments-arm', alt: 'Dental instruments resting on the arm of a treatment unit', w: 960, h: 640 },
  instrumentMacro: { src: 'instrument-macro', alt: 'A single dental instrument against a pale background', w: 1024, h: 683 },
  smile: { src: 'smile-portrait', alt: 'A woman laughing with a natural, relaxed smile', w: 2400, h: 1600, mids: [1280] },
  smile2: { src: 'smile-portrait-2', alt: 'A woman smiling broadly outdoors', w: 2400, h: 1600, mids: [1280] },
  model: { src: 'dental-model', alt: 'A dental model on a dark surface', w: 1024, h: 683 },
} as const satisfies Record<string, { src: string; alt: string; w: number; h: number; mids?: readonly number[] }>

export type ImageKey = keyof typeof IMAGES

export const imageSrc = (k: ImageKey) => `/images/${IMAGES[k].src}.webp`
export const imageSet = (k: ImageKey) => {
  const img: { src: string; w: number; mids?: readonly number[] } = IMAGES[k]
  const mids = (img.mids ?? []).map((m) => `/images/${img.src}-${m}.webp ${m}w`)
  return [`/images/${img.src}-480.webp 480w`, ...mids, `/images/${img.src}.webp ${img.w}w`].join(', ')
}

export const WARM_GRADE = 'sepia(0.16) saturate(0.86) contrast(1.03) brightness(1.02)'

export default function EditorialImage({
  k,
  className = '',
  sizes = '(min-width: 1024px) 50vw, 100vw',
  eager,
  caption,
  position,
}: {
  k: ImageKey
  className?: string
  sizes?: string
  eager?: boolean
  caption?: string
  position?: string
}) {
  const reduce = useReducedMotion()
  const img = IMAGES[k]
  return (
    <motion.figure
      className={`relative overflow-hidden bg-bone ${className}`}
      initial={reduce ? false : 'hidden'}
      whileInView="shown"
      viewport={{ once: true, margin: '-8% 0px' }}
    >
      <motion.img
        src={imageSrc(k)}
        srcSet={imageSet(k)}
        sizes={sizes}
        width={img.w}
        height={img.h}
        alt={img.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="size-full object-cover"
        style={{ filter: WARM_GRADE, objectPosition: position }}
        variants={{
          hidden: { clipPath: 'inset(0 0 100% 0)', scale: 1.08 },
          shown: { clipPath: 'inset(0 0 0% 0)', scale: 1 },
        }}
        transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/10 to-transparent mix-blend-multiply" aria-hidden />
      {caption && <figcaption className="label absolute bottom-3 left-3 bg-porcelain/85 px-2 py-1 text-[9.5px] backdrop-blur">{caption}</figcaption>}
    </motion.figure>
  )
}
