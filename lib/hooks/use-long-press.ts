'use client';

import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  delay?: number;
  moveThreshold?: number;
}

/**
 * Detects press-and-hold on both mobile (touch) and desktop (mouse).
 * Cancels if finger/cursor moves significantly.
 * Provides haptic feedback on mobile if available.
 */
export function useLongPress(
  callback: () => void,
  { delay = 500, moveThreshold = 10 }: UseLongPressOptions = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    triggeredRef.current = false;
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      startPosRef.current = { x, y };
      triggeredRef.current = false;
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
        callback();
      }, delay);
    },
    [callback, delay]
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return;
      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
      }
    },
    [clear, moveThreshold]
  );

  const handlers = {
    onTouchStart: useCallback(
      (e: React.TouchEvent) => {
        const touch = e.touches[0];
        start(touch.clientX, touch.clientY);
      },
      [start]
    ),
    onTouchMove: useCallback(
      (e: React.TouchEvent) => {
        const touch = e.touches[0];
        move(touch.clientX, touch.clientY);
      },
      [move]
    ),
    onTouchEnd: useCallback(() => {
      clear();
    }, [clear]),
    onMouseDown: useCallback(
      (e: React.MouseEvent) => {
        start(e.clientX, e.clientY);
      },
      [start]
    ),
    onMouseMove: useCallback(
      (e: React.MouseEvent) => {
        move(e.clientX, e.clientY);
      },
      [move]
    ),
    onMouseUp: useCallback(() => {
      clear();
    }, [clear]),
    onMouseLeave: useCallback(() => {
      clear();
    }, [clear]),
  };

  return handlers;
}
