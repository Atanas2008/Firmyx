'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account information."
      />

      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Full name</p>
            <p className="text-base font-medium text-gray-900">
              {user?.full_name ?? '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium text-gray-900">
              {user?.email ?? '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="text-base font-medium capitalize text-gray-900">
              {user?.role ?? '—'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
