'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.';
    if (!form.email.includes('@')) errs.email = 'Enter a valid email.';
    if (form.password.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            Account created!
          </h2>
          <p className="mt-2 text-gray-500">
            Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">FirmShield</h1>
          <p className="mt-1 text-sm text-gray-500">
            Start protecting your business today
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-xl border border-gray-100 p-8">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">
            Create your account
          </h2>

          {apiError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              error={errors.full_name}
              autoComplete="name"
              required
            />
            <Input
              label="Email address"
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />
            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
