import Sanscript from '@indic-transliteration/sanscript'
import type { ActiveLines, LrcLine } from '../types/lyrics'
import type { LyricsScriptMode } from '../types/settings'

const DEVANAGARI_RE = /[\u0900-\u097F]/
const GURMUKHI_RE = /[\u0A00-\u0A7F]/
const BENGALI_RE = /[\u0980-\u09FF]/
const TAMIL_RE = /[\u0B80-\u0BFF]/
const TELUGU_RE = /[\u0C00-\u0C7F]/
const KANNADA_RE = /[\u0C80-\u0CFF]/
const MALAYALAM_RE = /[\u0D00-\u0D7F]/
const GUJARATI_RE = /[\u0A80-\u0AFF]/
const ORIYA_RE = /[\u0B00-\u0B7F]/

const SCRIPT_DETECTORS: Array<{ re: RegExp; scheme: string }> = [
  { re: GURMUKHI_RE, scheme: 'gurmukhi' },
  { re: DEVANAGARI_RE, scheme: 'devanagari' },
  { re: BENGALI_RE, scheme: 'bengali' },
  { re: TAMIL_RE, scheme: 'tamil' },
  { re: TELUGU_RE, scheme: 'telugu' },
  { re: KANNADA_RE, scheme: 'kannada' },
  { re: MALAYALAM_RE, scheme: 'malayalam' },
  { re: GUJARATI_RE, scheme: 'gujarati' },
  { re: ORIYA_RE, scheme: 'oriya' }
]

function getIndicScheme(text: string): string | null {
  for (const { re, scheme } of SCRIPT_DETECTORS) {
    if (re.test(text)) return scheme
  }
  return null
}

/** Convert ITRANS output to simpler Latin letters (Hinglish-style readability). */
function toReadableRoman(itrans: string): string {
  let result = itrans
    .replace(/~N/gi, 'n')
    .replace(/\.N/gi, 'n')
    .replace(/\.M/gi, 'n')
    .replace(/\.H/gi, 'h')
    .replace(/\./g, '')
    .replace(/A/g, 'a')
    .replace(/I/g, 'i')
    .replace(/U/g, 'u')
    .replace(/E/g, 'e')
    .replace(/O/g, 'o')

  return result.replace(/\s+/g, ' ').trim()
}

export function transliterateForDisplay(text: string, mode: LyricsScriptMode): string {
  if (mode === 'original' || !text.trim()) return text

  const scheme = getIndicScheme(text)
  if (!scheme) return text

  try {
    return toReadableRoman(Sanscript.t(text, scheme, 'itrans'))
  } catch {
    return text
  }
}

function applyToLine(line: LrcLine | null, mode: LyricsScriptMode): LrcLine | null {
  if (!line) return null

  return {
    ...line,
    text: transliterateForDisplay(line.text, mode),
    words: line.words?.map((word) => ({
      ...word,
      text: transliterateForDisplay(word.text, mode)
    }))
  }
}

export function applyLyricsScriptToActiveLines(
  lines: ActiveLines,
  mode: LyricsScriptMode
): ActiveLines {
  if (mode === 'original') return lines

  return {
    ...lines,
    prev: applyToLine(lines.prev, mode),
    current: applyToLine(lines.current, mode),
    next: applyToLine(lines.next, mode)
  }
}
