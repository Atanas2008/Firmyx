'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EntryScreen } from '@/components/onboarding/EntryScreen';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthed(true);
      router.replace('/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking && !authed) {
    // Brief check — show nothing while checking auth
    return null;
  }

  if (authed) {
    return <LoadingSpinner fullPage />;
  }

  return <EntryScreen />;
}
