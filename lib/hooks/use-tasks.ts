'use client';

import { useState, useEffect, useCallback } from 'react';
import { TaskComplete } from '@/lib/types';

/**
 * Fetches all tasks with recurrences, steps, and protocols from the API.
 * Replaces the hardcoded import from lib/tasks.ts.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<TaskComplete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, isLoading, error, refetch: fetchTasks };
}
