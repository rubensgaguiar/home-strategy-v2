'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CompletionStatus, DbTaskCompletion } from '@/lib/types';

/**
 * API-backed completion tracking. Replaces localStorage-based useChecks.
 * Provides optimistic updates with rollback on error.
 */
export function useCompletions(date: string) {
  const [completions, setCompletions] = useState<Map<number, DbTaskCompletion>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const pendingRef = useRef<Set<number>>(new Set());

  // Fetch completions for the given date (initial + polling every 30s)
  useEffect(() => {
    let cancelled = false;

    async function load(isInitial = false) {
      try {
        if (isInitial) setIsLoading(true);
        const res = await fetch(`/api/completions?date=${date}`);
        if (!res.ok) throw new Error(`Failed to fetch completions: ${res.status}`);
        const data: DbTaskCompletion[] = await res.json();
        if (!cancelled) {
          // Only update if no pending writes to avoid clobbering optimistic state
          if (pendingRef.current.size === 0) {
            const map = new Map<number, DbTaskCompletion>();
            data.forEach((c) => { if (c.taskId !== null) map.set(c.taskId, c); });
            setCompletions(map);
          }
        }
      } catch (err) {
        console.error('Failed to load completions:', err);
      } finally {
        if (!cancelled && isInitial) setIsLoading(false);
      }
    }

    load(true);

    // Poll every 30 seconds for real-time sync between users
    const interval = setInterval(() => load(false), 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [date]);

  const getStatus = useCallback(
    (taskId: number): CompletionStatus | null => {
      return completions.get(taskId)?.status ?? null;
    },
    [completions]
  );

  const isChecked = useCallback(
    (taskId: number): boolean => {
      return completions.get(taskId)?.status === 'done';
    },
    [completions]
  );

  const markStatus = useCallback(
    async (taskId: number, status: CompletionStatus, notes?: string) => {
      // Prevent double-tap while a request is in flight for this task
      if (pendingRef.current.has(taskId)) return;
      pendingRef.current.add(taskId);

      // Optimistic update
      const previous = completions.get(taskId);
      setCompletions((prev) => {
        const next = new Map(prev);
        next.set(taskId, {
          id: previous?.id ?? -1,
          taskId,
          date,
          status,
          userEmail: '',
          notes: notes || null,
          createdAt: new Date(),
        });
        return next;
      });

      try {
        const res = await fetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, date, status, notes: notes || null }),
        });
        if (!res.ok) throw new Error(`Failed to save completion: ${res.status}`);
        const saved: DbTaskCompletion = await res.json();
        setCompletions((prev) => {
          const next = new Map(prev);
          next.set(taskId, saved);
          return next;
        });
      } catch (err) {
        console.error('Failed to save completion:', err);
        // Rollback
        setCompletions((prev) => {
          const next = new Map(prev);
          if (previous) {
            next.set(taskId, previous);
          } else {
            next.delete(taskId);
          }
          return next;
        });
      } finally {
        pendingRef.current.delete(taskId);
      }
    },
    [completions, date]
  );

  const markDone = useCallback(
    (taskId: number, notes?: string) => markStatus(taskId, 'done', notes),
    [markStatus]
  );

  const markNotDone = useCallback(
    (taskId: number, notes?: string) => markStatus(taskId, 'not_done', notes),
    [markStatus]
  );

  const getNotes = useCallback(
    (taskId: number): string | null => {
      return completions.get(taskId)?.notes ?? null;
    },
    [completions]
  );

  const undo = useCallback(
    async (taskId: number) => {
      const completion = completions.get(taskId);
      if (!completion || completion.id === -1) return;

      // Optimistic removal
      setCompletions((prev) => {
        const next = new Map(prev);
        next.delete(taskId);
        return next;
      });

      try {
        const res = await fetch(`/api/completions/${completion.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Failed to undo completion: ${res.status}`);
      } catch (err) {
        console.error('Failed to undo completion:', err);
        // Rollback
        setCompletions((prev) => {
          const next = new Map(prev);
          next.set(taskId, completion);
          return next;
        });
      }
    },
    [completions]
  );

  return {
    completions,
    isLoading,
    isChecked,
    getStatus,
    getNotes,
    markDone,
    markNotDone,
    undo,
  };
}
