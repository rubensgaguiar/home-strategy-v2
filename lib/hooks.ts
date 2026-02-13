'use client';

import { useState, useCallback, useEffect } from 'react';
import { DayOfWeek } from './types';

function getDatePrefix(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getKey(day: DayOfWeek): string {
  return `hs-checks-${getDatePrefix()}-${day}`;
}

function loadChecks(day: DayOfWeek): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getKey(day));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveChecks(day: DayOfWeek, checks: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getKey(day), JSON.stringify([...checks]));
}

export function useChecks(selectedDay: DayOfWeek) {
  const [checks, setChecks] = useState<Set<string>>(new Set());

  // Reload when day changes
  useEffect(() => {
    setChecks(loadChecks(selectedDay));
  }, [selectedDay]);

  const toggle = useCallback((taskId: string) => {
    setChecks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      saveChecks(selectedDay, next);
      return next;
    });
  }, [selectedDay]);

  const check = useCallback((taskId: string) => {
    setChecks((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      saveChecks(selectedDay, next);
      return next;
    });
  }, [selectedDay]);

  const isChecked = useCallback(
    (taskId: string) => checks.has(taskId),
    [checks]
  );

  return { checks, toggle, check, isChecked, checkedCount: checks.size };
}
