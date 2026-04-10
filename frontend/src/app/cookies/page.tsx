'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function CookiesPage() {
  const { t, language, setLanguage } = useLanguage();
  const c = t.legal.cookies;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/">
            <img src="/logo.png" alt="Firmyx" className="h-20 dark:hidden" />
            <img src="/logo-dark.png" alt="Firmyx" className="h-20 hidden dark:block" />
          </Link>
          <button
            onClick={() => setLanguage(language === 'en' ? 'bg' : 'en')}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className={language === 'en' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>EN</span>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className={language === 'bg' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>BG</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{c.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">{c.lastUpdated}</p>

        {/* 1 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{c.s1.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.s1.p1}</p>

        {/* 2 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{c.s2.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.s2.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{c.s2.li1}</li>
          <li>{c.s2.li2}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{c.s2.p2}</p>

        {/* 3 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{c.s3.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.s3.p1}</p>

        {/* 4 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{c.s4.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.s4.p1}</p>

        {/* 5 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{c.s5.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.s5.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{c.s5.p2}</p>

        {/* 6 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{c.s6.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.s6.p1}</p>

        {/* Back link */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 flex gap-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
