'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function PrivacyPage() {
  const { t, language, setLanguage } = useLanguage();
  const p = t.legal.privacy;

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

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{p.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">{p.lastUpdated}</p>

        {/* 1 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s1.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s1.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s1.li1}</li>
          <li>{p.s1.li2}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{p.s1.p2}</p>

        {/* 2 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s2.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s2.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s2.li1}</li>
          <li>{p.s2.li2}</li>
        </ul>

        {/* 3 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s3.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s3.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s3.li1}</li>
          <li>{p.s3.li2}</li>
          <li>{p.s3.li3}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{p.s3.p2}</p>

        {/* 4 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s4.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s4.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s4.li1}</li>
          <li>{p.s4.li2}</li>
          <li>{p.s4.li3}</li>
        </ul>

        {/* 5 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s5.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s5.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{p.s5.p2}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s5.li1}</li>
          <li>{p.s5.li2}</li>
        </ul>

        {/* 6 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s6.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s6.p1}</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{p.s6.p2}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s6.li1}</li>
          <li>{p.s6.li2}</li>
        </ul>

        {/* 7 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s7.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s7.p1}</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300 mt-2">
          <li>{p.s7.li1}</li>
          <li>{p.s7.li2}</li>
          <li>{p.s7.li3}</li>
          <li>{p.s7.li4}</li>
          <li>{p.s7.li5}</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">{p.s7.p2}</p>

        {/* 8 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{p.s8.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{p.s8.p1}</p>
      </div>
    </div>
  );
}
