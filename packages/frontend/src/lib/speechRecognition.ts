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

/** Concatenate every hypothesis in this session (interim + final) — reliable live captions in Chromium. */
export function concatSpeechResults(results: SpeechRecognitionResultList): string {
  let out = '';
  for (let i = 0; i < results.length; i++) {
    out += results[i][0]?.transcript ?? '';
  }
  return out;
}
