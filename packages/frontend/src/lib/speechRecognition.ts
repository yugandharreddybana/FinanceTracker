/** Chromium ships `webkitSpeechRecognition`; newer builds may alias `SpeechRecognition`. Prefer webkit. */
export function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

/**
 * Do not open getUserMedia before SpeechRecognition — stopping that stream immediately
 * breaks voice capture on some Windows/Chrome setups. The speech API triggers its own mic permission.
 */
export function pickSpeechRecognitionLang(): string {
  const raw = (navigator.language || 'en-US').trim();
  const lower = raw.toLowerCase();
  if (/^[a-z]{2}-[a-z]{2}$/.test(lower)) return raw;
  if (/^[a-z]{2}$/.test(lower)) return `${lower}-US`;
  return 'en-US';
}

export type SpeechSessionAccum = { prefix: string };

export function resetSpeechSessionAccum(): SpeechSessionAccum {
  return { prefix: '' };
}

/**
 * Concatenating full `SpeechRecognitionResultList` on every `result` repeats prior finals in Chromium.
 * Only process from `resultIndex`, append finalized segments to `prefix`, and append one interim tail.
 */
export function buildLiveCaptionFromSpeechEvent(accum: SpeechSessionAccum, ev: SpeechRecognitionEvent): string {
  let display = accum.prefix;
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const res = ev.results[i];
    const piece = res[0]?.transcript ?? '';
    if (res.isFinal) {
      accum.prefix += piece;
      display = accum.prefix;
    } else {
      display = accum.prefix + piece;
    }
  }
  return display.replace(/\s+/g, ' ').trim();
}

/** @deprecated Prefer `buildLiveCaptionFromSpeechEvent` for live captions; this duplicates text on Chromium. */
export function concatSpeechResults(results: SpeechRecognitionResultList): string {
  let out = '';
  for (let i = 0; i < results.length; i++) {
    out += results[i][0]?.transcript ?? '';
  }
  return out;
}
