import DOMPurify from 'dompurify'

export function sanitizeSvg(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|data|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })
}