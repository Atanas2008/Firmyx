'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Zap, ArrowRight, Upload, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function EntryScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Firmyx" className="h-20 dark:hidden" />
          <img src="/logo-dark.png" alt="Firmyx" className="h-20 hidden dark:block" />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'bg' : 'en')}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className={language === 'en' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>EN</span>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className={language === 'bg' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>BG</span>
          </button>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            {t.auth.signIn}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-gray-900 dark:bg-gray-100 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            {t.auth.createAccount}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 mb-6">
            <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{t.onboarding.badge}</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl leading-[1.1]">
            {t.onboarding.headline}
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            {t.onboarding.subheadline}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push('/demo')}
              className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 transition-all"
            >
              <BarChart3 className="h-4 w-4" />
              {t.onboarding.tryDemo}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <Upload className="h-4 w-4" />
              {t.onboarding.uploadYourData}
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>{t.onboarding.trustSignal1}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>{t.onboarding.trustSignal2}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              <span>{t.onboarding.trustSignal3}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
