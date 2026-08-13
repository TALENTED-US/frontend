const TIMEZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i

function parseApiDateTime(value) {
  if (!value) return null

  const normalized = String(value).trim().replace(' ', 'T')
  const timestamp = TIMEZONE_SUFFIX_PATTERN.test(normalized) ? normalized : `${normalized}Z`
  const date = new Date(timestamp)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatKoreanDateTime(value, { includeSeconds = false } = {}) {
  if (!value) return '기록 없음'

  const date = parseApiDateTime(value)
  if (!date) return String(value)

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  })
    .format(date)
    .replace(/\.$/, '')
}
