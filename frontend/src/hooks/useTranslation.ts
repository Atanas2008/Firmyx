'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { translateApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Translates an array of dynamic strings (e.g. AI summaries, recommendations)
 * when the UI language is not English.
 *
 * Returns the original strings when language is 'en', and translated versions
 * when language is 'bg' (or any future non-English language).
 *
 * Uses a simple in-memory cache keyed by the joined input + target language.
 */

const translationCache = new Map<string, string[]>();

export function useTranslation(texts: string[]) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState<string[]>(texts);
  const [loading, setLoading] = useState(false);
  const prevKey = useRef('');

  const cacheKey = `${language}::${texts.join('||')}`;

  const doTranslate = useCallback(async () => {
    if (language === 'en' || texts.length === 0 || texts.every((t) => !t.trim())) {
      setTranslated(texts);
      return;
    }

    // Check cache
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslated(cached);
      return;
    }

    setLoading(true);
    try {
      const res = await translateApi.translate(texts, language);
      const result = res.data.translations;
      translationCache.set(cacheKey, result);
      setTranslated(result);
    } catch {
      // Fallback to original text on error
      setTranslated(texts);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, language, texts]);

  useEffect(() => {
    if (prevKey.current !== cacheKey) {
      prevKey.current = cacheKey;
      doTranslate();
    }
  }, [cacheKey, doTranslate]);

  return { translated, loading };
}
