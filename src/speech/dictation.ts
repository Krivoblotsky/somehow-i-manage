/**
 * Dictation through the browser's own speech recognition (Safari via Apple, Chrome via Google):
 * no backend, no model, no audio kept. Firefox has none, so the mic is simply not offered there.
 */

interface RecognitionResult extends ArrayLike<{ transcript: string }> {
  isFinal: boolean;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const dictationSupported = (): boolean => recognitionCtor() !== null;

export interface DictationHandlers {
  /** BCP 47 tag; defaults to the browser's language. */
  lang?: string;
  /** The whole utterance so far; `isFinal` once the browser has settled on it. */
  onText(text: string, isFinal: boolean): void;
  onError(message: string): void;
  /** Always last, whether it stopped by itself, was stopped, or failed. */
  onEnd(): void;
}

/** The browser's error codes, said plainly. */
export function describeDictationError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied. Allow it in the browser’s site settings.';
    case 'no-speech':
      return 'Didn’t catch anything.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'Speech recognition needs an internet connection.';
    case 'language-not-supported':
      return 'This language isn’t available for dictation here.';
    default:
      return 'Dictation stopped unexpectedly.';
  }
}

/**
 * Listens for one utterance (it stops by itself after a pause) and reports the text as it firms
 * up. Returns a function that stops early; `onEnd` still fires.
 */
export function startDictation(handlers: DictationHandlers): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError(describeDictationError('language-not-supported'));
    handlers.onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = handlers.lang ?? navigator.language ?? 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const results = Array.from(e.results);
    const text = results
      .map((r) => r[0]?.transcript ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    const isFinal = results.length > 0 && results.every((r) => r.isFinal);
    handlers.onText(text, isFinal);
  };
  rec.onerror = (e) => {
    if (e.error !== 'aborted') handlers.onError(describeDictationError(e.error));
  };
  rec.onend = () => handlers.onEnd();
  rec.start();
  return () => rec.stop();
}
