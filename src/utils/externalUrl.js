export function normalizeExternalUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''

  if (/^https?:\/\//i.test(url)) return url
  if (/^\/\//.test(url)) return `https:${url}`
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#]|$)/i.test(url)) return `https://${url}`

  return ''
}
