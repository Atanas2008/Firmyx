'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, BarChart3, TrendingUp, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = t.validation.required;
    if (!form.email.includes('@')) errs.email = t.validation.emailInvalid;
    if (form.password.length < 8) errs.password = t.validation.passwordMin;
    else if (!/[A-Z]/.test(form.password)) errs.password = t.validation.passwordUppercase;
    else if (!/[a-z]/.test(form.password)) errs.password = t.validation.passwordLowercase;
    else if (!/\d/.test(form.password)) errs.password = t.validation.passwordDigit;
    if (form.password !== form.confirmPassword) errs.confirmPassword = t.validation.passwordMismatch;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({ full_name: form.full_name, email: form.email, password: form.password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      let msg: string;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((e: { msg?: string }) => e.msg ?? '').filter(Boolean).join(' ');
      } else {
        msg = t.auth.registrationFailed;
      }
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center animate-scale-in">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.auth.accountCreated}</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{t.auth.redirecting}</p>
        </div>
      </div>
    );
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
            <img src="/logo.png" alt="Firmyx" className="h-20 brightness-0 invert" />
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              {t.authBranding.registerHeadline}
            </h2>
            <p className="mt-4 text-blue-100/90 leading-relaxed max-w-sm">
              {t.authBranding.registerSubtext}
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: BarChart3, text: t.authBranding.feature1 },
              { icon: TrendingUp, text: t.authBranding.feature2 },
              { icon: Lock, text: t.authBranding.feature3 },
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
            <img src="/logo.png" alt="Firmyx" className="h-16 mx-auto dark:hidden" />
            <img src="/logo-dark.png" alt="Firmyx" className="h-16 mx-auto hidden dark:block" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.auth.createAccountTitle}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t.auth.registerSubtitle}</p>
          </div>

          {apiError && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <span className="text-xs text-red-600 dark:text-red-400">!</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input label={t.auth.fullName} type="text" placeholder={t.auth.namePlaceholder} value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} error={errors.full_name} autoComplete="name" required />
            <Input label={t.auth.email} type="email" placeholder={t.auth.registerEmailPlaceholder} value={form.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} autoComplete="email" required />
            <Input label={t.auth.password} type="password" placeholder={t.auth.minChars} value={form.password} onChange={(e) => setField('password', e.target.value)} error={errors.password} autoComplete="new-password" required />
            <Input label={t.auth.confirmPassword} type="password" placeholder={t.auth.repeatPassword} value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} error={errors.confirmPassword} autoComplete="new-password" required />
            <Button type="submit" loading={loading} className="w-full" size="lg">{t.auth.createAccount}</Button>
          </form>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
            {t.auth.agreeToTerms}{' '}
            <Link href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">{t.auth.termsLink}</Link>{' '}
            {t.common.and}{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">{t.auth.privacyLink}</Link>.
          </p>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t.auth.hasAccount}{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">{t.auth.signIn}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
