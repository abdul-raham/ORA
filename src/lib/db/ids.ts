const CODE_CHARS = 'ACDEFHJKMNPQRTUVWXY3479'

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const bookingCode = (rand: () => number = Math.random) =>
  `ORA-${Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('')}`
