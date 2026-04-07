'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'firmyx_onboarding';

export type OnboardingStep = 'entry' | 'demo' | 'tour' | 'upload' | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  hasSeenTour: boolean;
  selectedDemo?: string;
}

const DEFAULT_STATE: OnboardingState = {
  step: 'entry',
  hasSeenTour: false,
};

function load(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  useEffect(() => {
    setState(load());
  }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const goTo = useCallback((step: OnboardingStep) => {
    update({ step });
  }, [update]);

  const completeTour = useCallback(() => {
    update({ hasSeenTour: true, step: 'upload' });
  }, [update]);

  const skipTour = useCallback(() => {
    update({ hasSeenTour: true, step: 'upload' });
  }, [update]);

  const completeOnboarding = useCallback(() => {
    update({ step: 'complete' });
  }, [update]);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    save(DEFAULT_STATE);
  }, []);

  return {
    ...state,
    goTo,
    completeTour,
    skipTour,
    completeOnboarding,
    reset,
  };
}
