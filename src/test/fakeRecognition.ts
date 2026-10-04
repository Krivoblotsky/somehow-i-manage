import { vi } from 'vitest';

/** A stand-in for the browser's speech recognizer that a test drives by hand. */
export class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  onresult: ((e: { results: unknown[] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  /** What the browser would report: the utterance so far, final or not. */
  say(text: string, isFinal: boolean) {
    const result = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ results: [result] });
    if (isFinal) this.onend?.();
  }
}

/** Installs the fake as window.SpeechRecognition for a test; pair with vi.unstubAllGlobals(). */
export function installFakeRecognition(): void {
  FakeRecognition.instances = [];
  vi.stubGlobal('SpeechRecognition', FakeRecognition);
}
