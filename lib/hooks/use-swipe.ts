'use client';

import { useCallback, useRef } from 'react';

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/**
 * Detects horizontal swipe gestures on touch and mouse.
 * Returns event handlers to attach to the swipeable element.
 */
export function useSwipe({ threshold = 50, onSwipeLeft, onSwipeRight }: UseSwipeOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);

  const handleStart = useCallback((x: number, y: number) => {
    startXRef.current = x;
    startYRef.current = y;
  }, []);

  const handleEnd = useCallback(
    (x: number) => {
      if (startXRef.current === null) return;
      const dx = x - startXRef.current;
      if (Math.abs(dx) >= threshold) {
        if (dx > 0 && onSwipeRight) onSwipeRight();
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
      }
      startXRef.current = null;
      startYRef.current = null;
    },
    [threshold, onSwipeLeft, onSwipeRight]
  );

  return {
    onTouchStart: useCallback(
      (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY),
      [handleStart]
    ),
    onTouchEnd: useCallback(
      (e: React.TouchEvent) => handleEnd(e.changedTouches[0].clientX),
      [handleEnd]
    ),
    onMouseDown: useCallback(
      (e: React.MouseEvent) => handleStart(e.clientX, e.clientY),
      [handleStart]
    ),
    onMouseUp: useCallback(
      (e: React.MouseEvent) => handleEnd(e.clientX),
      [handleEnd]
    ),
  };
}
