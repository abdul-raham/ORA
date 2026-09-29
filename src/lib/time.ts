// Clinic wall-clock helpers. ORA runs on West Africa Time (UTC+1, no DST), so
// every stored timestamp carries an explicit +01:00 offset and every display is
// computed from that, whatever the viewer's own timezone.

const OFFSET_MS = 60 * 60 * 1000

export interface Wall {
  date: string
  minutes: number
}

export const pad = (n: number) => String(n).padStart(2, '0')

const wallFromMs = (t: number): Wall => {
  const d = new Date(t + OFFSET_MS)
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  }
}

export const wallNow = (): Wall => wallFromMs(Date.now())
export const toWall = (iso: string): Wall => wallFromMs(Date.parse(iso))
export const today = () => wallNow().date

export const toIso = (date: string, minutes: number) =>
  `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00+01:00`

export const nowIso = () => {
  const w = wallFromMs(Date.now())
  const s = new Date(Date.now() + OFFSET_MS).getUTCSeconds()
  return `${w.date}T${pad(Math.floor(w.minutes / 60))}:${pad(w.minutes % 60)}:${pad(s)}+01:00`
}

const dateUtc = (date: string) => new Date(`${date}T12:00:00Z`)

export const addDays = (date: string, n: number) => {
  const d = dateUtc(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const weekday = (date: string) => dateUtc(date).getUTCDay()

export const addMinutesIso = (iso: string, minutes: number) => {
  const w = wallFromMs(Date.parse(iso) + minutes * 60000)
  return toIso(w.date, w.minutes)
}

export const formatTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
export const formatIsoTime = (iso: string) => formatTime(toWall(iso).minutes)

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const formatDay = (date: string, style: 'short' | 'long' = 'short') => {
  const d = dateUtc(date)
  const day = DAYS[d.getUTCDay()]
  const month = MONTHS[d.getUTCMonth()]
  return style === 'long'
    ? `${day} ${d.getUTCDate()} ${month}`
    : `${day.slice(0, 3)} ${d.getUTCDate()} ${month.slice(0, 3)}`
}

export const relativeDay = (date: string, style: 'short' | 'long' = 'short') => {
  const t = today()
  if (date === t) return 'Today'
  if (date === addDays(t, 1)) return 'Tomorrow'
  return formatDay(date, style)
}

export const weekdayName = (date: string) => DAYS[weekday(date)]

export const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60000)
