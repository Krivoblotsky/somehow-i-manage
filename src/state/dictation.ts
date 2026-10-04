import { useCallback, useEffect, useRef, useState } from 'react';
import { dictationSupported, startDictation } from '../speech/dictation';

const ERROR_SHOWN_MS = 3500;

/**
 * One dictation at a time for a text field: `toggle` starts listening or stops early; text
 * arrives through `onText` as the browser firms it up; errors are worded for people and clear
 * themselves. Stops when the component goes away.
 */
export function useDictation(onText: (text: string, isFinal: boolean) => void) {
  const supported = dictationSupported();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });
  useEffect(() => () => stopRef.current?.(), []);

  const start = useCallback(() => {
    if (!supported || stopRef.current) return;
    setError(null);
    setListening(true);
    stopRef.current = startDictation({
      onText: (text, isFinal) => onTextRef.current(text, isFinal),
      onError: (message) => {
        setError(message);
        window.setTimeout(
          () => setError((current) => (current === message ? null : current)),
          ERROR_SHOWN_MS,
        );
      },
      onEnd: () => {
        stopRef.current = null;
        setListening(false);
      },
    });
  }, [supported]);

  const toggle = useCallback(() => {
    if (stopRef.current) stopRef.current();
    else start();
  }, [start]);

  return { supported, listening, error, toggle };
}
