'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function TermsPage() {
  const { t, language, setLanguage } = useLanguage();
  const s = t.legal.terms;

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

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{s.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">{s.lastUpdated}</p>

        {/* 1 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s1.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s1.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s1.p2}</p>

        {/* 2 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s2.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s2.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s2.p2}</p>

        {/* 3 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s3.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s3.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{s.s3.li1}</li>
          <li>{s.s3.li2}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s3.p2}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s3.p3}</p>

        {/* 4 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s4.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s4.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{s.s4.li1}</li>
          <li>{s.s4.li2}</li>
          <li>{s.s4.li3}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s4.p2}</p>

        {/* 5 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s5.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s5.p1}</p>

        {/* 6 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s6.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s6.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s6.p2}</p>

        {/* 7 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s7.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s7.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{s.s7.li1}</li>
          <li>{s.s7.li2}</li>
          <li>{s.s7.li3}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s7.p2}</p>

        {/* 8 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s8.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s8.p1}</p>

        {/* 9 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s9.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s9.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s9.p2}</p>

        {/* 10 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s10.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s10.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{s.s10.p2}</p>

        {/* 11 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s11.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s11.p1}</p>

        {/* 12 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{s.s12.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.s12.p1}</p>
      </div>
    </div>
  );
}
