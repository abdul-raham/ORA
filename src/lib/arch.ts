// Cubic-bezier geometry for the anatomical arch shapes shared by
// DentalArchNav, OcclusionPath and SmileMap.

export type Pt = [number, number]
export type Curve = [Pt, Pt, Pt, Pt]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

export const pointAt = ([p0, p1, p2, p3]: Curve, t: number): Pt => {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]
}

export const tangentAt = ([p0, p1, p2, p3]: Curve, t: number): Pt => {
  const u = 1 - t
  const x = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
  const y = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
  const len = Math.hypot(x, y) || 1
  return [x / len, y / len]
}

/** Unit normal pointing to the left of the direction of travel. */
export const normalAt = (c: Curve, t: number): Pt => {
  const [x, y] = tangentAt(c, t)
  return [y, -x]
}

export const angleAt = (c: Curve, t: number) => {
  const [x, y] = tangentAt(c, t)
  return (Math.atan2(y, x) * 180) / Math.PI
}

export const lerpCurve = (a: Curve, b: Curve, t: number): Curve =>
  [lerpPt(a[0], b[0], t), lerpPt(a[1], b[1], t), lerpPt(a[2], b[2], t), lerpPt(a[3], b[3], t)]

export const curveD = ([p0, p1, p2, p3]: Curve) =>
  `M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} C ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}, ${p3[0].toFixed(2)} ${p3[1].toFixed(2)}`

/** Portion of a curve between t0 and t1 (de Casteljau). */
export const subCurve = (c: Curve, t0: number, t1: number): Curve => {
  const split = ([p0, p1, p2, p3]: Curve, t: number): [Curve, Curve] => {
    const a = lerpPt(p0, p1, t)
    const b = lerpPt(p1, p2, t)
    const cc = lerpPt(p2, p3, t)
    const d = lerpPt(a, b, t)
    const e = lerpPt(b, cc, t)
    const f = lerpPt(d, e, t)
    return [
      [p0, a, d, f],
      [f, e, cc, p3],
    ]
  }
  const right = split(c, t0)[1]
  return split(right, (t1 - t0) / (1 - t0 || 1))[0]
}

/** Closed band of the given width following the curve between t0 and t1. */
export const bandPath = (c: Curve, t0: number, t1: number, width: number, taper = 0) => {
  const steps = 24
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps
    const [x, y] = pointAt(c, t)
    const [nx, ny] = normalAt(c, t)
    // Optional taper narrows the band towards the ends of the whole arch.
    const w = (width / 2) * (1 - taper * Math.abs(t - 0.5) * 2)
    outer.push([x + nx * w, y + ny * w])
    inner.push([x - nx * w, y - ny * w])
  }
  const pts = [...outer, ...inner.reverse()]
  return `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`
}

// Shared shapes (header viewBox 1200 × 120).
export const NAV_ARCH: Curve = [
  [300, 38],
  [520, 90],
  [720, 90],
  [940, 38],
]
export const BOOK_ARCH: Curve = [
  [512, 108],
  [522, 14],
  [678, 14],
  [688, 108],
]
