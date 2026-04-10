'use client';

import { useEffect } from 'react';

export function HydrationReveal() {
  useEffect(() => {
    document.documentElement.classList.remove('no-fouc');
  }, []);
  return null;
}
