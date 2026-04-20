import { useEffect, useRef } from 'react';

/**
 * Declarative setInterval that respects the latest callback without restarting the timer.
 * Pass `delay === null` to pause.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => saved.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
}
