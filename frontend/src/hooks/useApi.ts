'use client';

import { useState, useCallback } from 'react';
import type { AxiosError } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  apiFn: (...args: unknown[]) => Promise<{ data: T }>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const response = await apiFn(...args);
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (err) {
        const axiosErr = err as AxiosError<{ detail: string }>;
        const message =
          axiosErr.response?.data?.detail ??
          axiosErr.message ??
          'An unexpected error occurred';
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
