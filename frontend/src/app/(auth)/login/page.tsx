'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t.auth.enterCredentials);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t.auth.invalidCredentials;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/20" />
          <div className="absolute bottom-[-80px] right-[-60px] h-80 w-80 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.png" alt="Firmyx" className="h-14 brightness-0 invert" />
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              Financial risk detection<br />for modern businesses.
            </h2>
            <p className="mt-4 text-blue-100/90 leading-relaxed max-w-sm">
              Monitor health metrics, predict bankruptcy risk with Altman Z-Score, and get AI-powered recommendations.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: BarChart3, text: 'Real-time financial health scoring' },
              { icon: TrendingUp, text: 'AI-driven risk predictions & forecasts' },
              { icon: Lock, text: 'Enterprise-grade security & encryption' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-blue-100">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-xs text-blue-200/60">&copy; {new Date().getFullYear()} Firmyx. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-in-up">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <img src="/logo.png" alt="Firmyx" className="h-14 mx-auto dark:hidden" />
            <img src="/logo-dark.png" alt="Firmyx" className="h-14 mx-auto hidden dark:block" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t.auth.tagline}</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {t.auth.signInTitle}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t.auth.subtitle}
            </p>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <span className="text-xs text-red-600 dark:text-red-400">!</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input label={t.auth.email} type="email" placeholder={t.auth.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            <Input label={t.auth.password} type="password" placeholder={t.auth.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <Button type="submit" loading={loading} className="w-full" size="lg">{t.auth.signIn}</Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t.auth.noAccount}{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">{t.auth.createOneFree}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
