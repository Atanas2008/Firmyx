'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shield, Lock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import type { AdminUser } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const PAGE_SIZE = 50;
const STORAGE_KEY = 'firmyx-admin-secret';

export default function AdminPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Secret gate
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [secretError, setSecretError] = useState('');
  const [secretLoading, setSecretLoading] = useState(false);
  const [checkingSecret, setCheckingSecret] = useState(true);

  // User list state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Modal state
  const [modalType, setModalType] = useState<'password' | 'email' | null>(null);
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Check if secret is already stored
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Validate the stored secret with a test request
      adminApi.listUsers(0, 1).then(() => {
        setSecretUnlocked(true);
        setCheckingSecret(false);
      }).catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setCheckingSecret(false);
      });
    } else {
      setCheckingSecret(false);
    }
  }, []);

  const handleSecretSubmit = async () => {
    if (!secretInput.trim()) return;
    setSecretLoading(true);
    setSecretError('');
    // Store temporarily to let adminHeaders() pick it up
    localStorage.setItem(STORAGE_KEY, secretInput.trim());
    try {
      await adminApi.listUsers(0, 1);
      setSecretUnlocked(true);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setSecretError(t.admin.secretError);
    } finally {
      setSecretLoading(false);
    }
  };

  const loadUsers = useCallback(async () => {
    if (!secretUnlocked) return;
    setLoading(true);
    try {
      const { data } = await adminApi.listUsers(page * PAGE_SIZE, PAGE_SIZE, debouncedSearch || undefined);
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      setErrorMsg(t.admin.operationFailed);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, secretUnlocked, t.admin.operationFailed]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Guard: only admin
  if (!user || user.role !== 'admin') return null;

  // Show loading while checking stored secret
  if (checkingSecret) {
    return <div className="py-20"><LoadingSpinner /></div>;
  }

  // Secret gate UI
  if (!secretUnlocked) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-full max-w-md">
          <Card>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{t.admin.enterSecretTitle}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.admin.enterSecretDesc}</p>
            </div>
            <Input
              type="password"
              placeholder={t.admin.secretPlaceholder}
              value={secretInput}
              onChange={(e) => { setSecretInput(e.target.value); setSecretError(''); }}
              error={secretError}
              onKeyDown={(e) => e.key === 'Enter' && handleSecretSubmit()}
              autoFocus
            />
            <div className="mt-4">
              <Button
                className="w-full"
                onClick={handleSecretSubmit}
                loading={secretLoading}
                disabled={!secretInput.trim()}
              >
                {t.admin.unlock}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const flash = (msg: string, isError = false) => {
    if (isError) { setErrorMsg(msg); setSuccessMsg(''); }
    else { setSuccessMsg(msg); setErrorMsg(''); }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
  };

  const handleResetPassword = async () => {
    if (!modalUserId || !modalValue) return;
    setModalLoading(true);
    try {
      await adminApi.resetPassword(modalUserId, modalValue);
      flash(t.admin.passwordResetSuccess);
      setModalType(null);
    } catch {
      flash(t.admin.operationFailed, true);
    } finally {
      setModalLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!modalUserId || !modalValue) return;
    setModalLoading(true);
    try {
      await adminApi.changeEmail(modalUserId, modalValue);
      flash(t.admin.emailChangedSuccess);
      setModalType(null);
      loadUsers();
    } catch {
      flash(t.admin.operationFailed, true);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmToggleUser) return;
    setToggleLoading(true);
    try {
      if (confirmToggleUser.is_active) {
        await adminApi.deactivateUser(confirmToggleUser.id);
        flash(t.admin.userDeactivated);
      } else {
        await adminApi.activateUser(confirmToggleUser.id);
        flash(t.admin.userActivated);
      }
      setConfirmToggleUser(null);
      loadUsers();
    } catch {
      flash(t.admin.operationFailed, true);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteUser(confirmDeleteId);
      flash(t.admin.userDeleted);
      setConfirmDeleteId(null);
      loadUsers();
    } catch {
      flash(t.admin.operationFailed, true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.admin.title}</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t.admin.totalUsers}: {total}
        </span>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Search */}
      <Card className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.admin.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-50 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : users.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t.admin.noUsers}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.name}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.email}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.role}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.status}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.analysesUsed}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.created}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-gray-50">{u.full_name}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {u.is_active ? t.admin.active : t.admin.inactive}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="text-gray-600 dark:text-gray-300 text-xs">{u.analyses_count}</span>
                      {' '}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_unlocked
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      }`}>
                        {u.is_unlocked ? t.admin.unlocked : t.admin.locked}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setModalType('password'); setModalUserId(u.id); setModalValue(''); }}
                        >
                          {t.admin.resetPassword}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setModalType('email'); setModalUserId(u.id); setModalValue(u.email); }}
                        >
                          {t.admin.changeEmail}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmToggleUser(u)}
                        >
                          {u.is_active ? t.admin.deactivate : t.admin.activate}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              if (u.is_unlocked) {
                                await adminApi.lockUser(u.id);
                                flash(t.admin.userLocked);
                              } else {
                                await adminApi.unlockUser(u.id);
                                flash(t.admin.userUnlocked);
                              }
                              loadUsers();
                            } catch { flash(t.admin.operationFailed, true); }
                          }}
                        >
                          {u.is_unlocked ? t.admin.lockUser : t.admin.unlockUser}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteId(u.id)}
                        >
                          {t.admin.deleteUser}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-3">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {t.admin.prev}
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              {t.admin.next}
            </Button>
          </div>
        )}
      </Card>

      {/* Reset Password Modal */}
      {modalType === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">{t.admin.resetPassword}</h3>
            <Input
              label={t.admin.newPassword}
              type="password"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setModalType(null)} disabled={modalLoading}>
                {t.common.cancel}
              </Button>
              <Button size="sm" onClick={handleResetPassword} loading={modalLoading} disabled={!modalValue || modalValue.length < 8}>
                {t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {modalType === 'email' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">{t.admin.changeEmail}</h3>
            <Input
              label={t.admin.newEmail}
              type="email"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setModalType(null)} disabled={modalLoading}>
                {t.common.cancel}
              </Button>
              <Button size="sm" onClick={handleChangeEmail} loading={modalLoading} disabled={!modalValue}>
                {t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirm Dialog */}
      <ConfirmDialog
        open={confirmToggleUser !== null}
        title={confirmToggleUser?.is_active ? t.admin.deactivate : t.admin.activate}
        description={confirmToggleUser?.is_active ? t.admin.userDeactivated : t.admin.userActivated}
        variant="warning"
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggleUser(null)}
        loading={toggleLoading}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={t.admin.confirmDeleteTitle}
        description={t.admin.confirmDeleteDesc}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
