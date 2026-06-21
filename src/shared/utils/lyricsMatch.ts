export function normalizeTitleForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?official.*?\)/gi, '')
    .replace(/\[.*?official.*?\]/gi, '')
    .replace(/[^a-z0-9\u0900-\u097F\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function titleMatches(requested: string, candidate: string | undefined): boolean {
  if (!candidate?.trim()) return false

  const a = normalizeTitleForMatch(requested)
  const b = normalizeTitleForMatch(candidate)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true

  const tokensA = a.split(/\s+/).filter((token) => token.length > 2)
  const tokensB = b.split(/\s+/).filter((token) => token.length > 2)
  if (!tokensA.length || !tokensB.length) return false

  const overlap = tokensA.filter((token) => tokensB.includes(token)).length
  return overlap / Math.min(tokensA.length, tokensB.length) >= 0.5
}

export function artistMatches(requested: string, candidate: string | undefined): boolean {
  if (!requested.trim()) return true
  if (!candidate?.trim()) return false
  if (titleMatches(requested, candidate)) return true

  const a = normalizeTitleForMatch(requested).replace(/\s+/g, '')
  const b = normalizeTitleForMatch(candidate).replace(/\s+/g, '')
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export function buildArtistCandidates(rawArtist: string): string[] {
  const trimmed = rawArtist.trim()
  if (!trimmed || trimmed.toLowerCase() === 'youtube') return []

  const candidates = new Set<string>([trimmed])

  const compact = trimmed.replace(/\s+/g, '')
  if (/^[A-Z0-9]+$/i.test(compact) && compact.length >= 4) {
    const splitMatch = compact.match(/^([A-Z]{1,5})([A-Z].*)$/i)
    if (splitMatch) {
      const first = splitMatch[1].toUpperCase()
      const rest = splitMatch[2]
      candidates.add(`${first} ${rest.charAt(0).toUpperCase()}${rest.slice(1).toLowerCase()}`)
      candidates.add(`${first} ${rest}`)
    }
  }

  const camelSplit = trimmed.replace(/([a-z])([A-Z])/g, '$1 $2')
  if (camelSplit !== trimmed) candidates.add(camelSplit)

  return [...candidates].filter(Boolean)
}

/** Pull performer names embedded in YouTube-style titles (e.g. "Song – Artist | Official Video"). */
export function extractArtistCandidatesFromTitle(rawTitle: string): string[] {
  const candidates = new Set<string>()
  const cleaned = rawTitle
    .replace(/\(.*?official.*?\)/gi, '')
    .replace(/\[.*?official.*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  for (const sep of [' – ', ' - ', ' — ', ': ']) {
    if (!cleaned.includes(sep)) continue
    const [, second] = cleaned.split(sep).map((part) => part.trim())
    if (!second) continue
    const artistPart = second.split('|')[0]?.trim()
    if (artistPart && artistPart.length >= 2) {
      candidates.add(artistPart)
      for (const nested of buildArtistCandidates(artistPart)) {
        candidates.add(nested)
      }
    }
  }

  return [...candidates].filter(Boolean)
}

export function durationMatches(
  candidateSec: number | undefined,
  targetMs?: number,
  toleranceMs = 45_000
): boolean {
  if (!targetMs || targetMs <= 0 || !candidateSec) return true
  return Math.abs(Math.round(candidateSec * 1000) - targetMs) <= toleranceMs
}
