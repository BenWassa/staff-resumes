import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

const ROLES = ['staff', 'admin'];

export default function UserManagementPanel({ allStaff }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [errors, setErrors] = useState({});
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    apiFetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''));
        setUsers(sorted);
        const initial = {};
        sorted.forEach((u) => {
          initial[u.uid] = { role: u.role ?? 'staff', staff_id: u.staff_id ?? '' };
        });
        setDrafts(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  function setDraft(uid, field, value) {
    setDrafts((prev) => ({ ...prev, [uid]: { ...prev[uid], [field]: value } }));
  }

  async function saveUser(uid) {
    const draft = drafts[uid];
    setSaving((s) => ({ ...s, [uid]: true }));
    setErrors((e) => ({ ...e, [uid]: null }));
    try {
      const res = await apiFetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: draft.role,
          staff_id: draft.staff_id || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, role: draft.role, staff_id: draft.staff_id || null } : u
        )
      );
      setSaved((s) => ({ ...s, [uid]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [uid]: false })), 2000);
    } catch (err) {
      setErrors((e) => ({ ...e, [uid]: err.message }));
    } finally {
      setSaving((s) => ({ ...s, [uid]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading users...
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="py-4 text-sm text-[var(--text-muted)]">No users have signed in yet.</p>;
  }

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const draft = drafts[user.uid] ?? { role: 'staff', staff_id: '' };
        const isSaving = saving[user.uid];
        const isSaved = saved[user.uid];
        const errMsg = errors[user.uid];

        return (
          <div
            key={user.uid}
            className="rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">
                {user.email}
              </span>

              <select
                value={draft.role}
                onChange={(e) => setDraft(user.uid, 'role', e.target.value)}
                className={selectCls}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={draft.staff_id ?? ''}
                onChange={(e) => setDraft(user.uid, 'staff_id', e.target.value)}
                className={`${selectCls} min-w-[180px]`}
              >
                <option value="">- unlinked -</option>
                {allStaff.map((s) => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.display_name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => saveUser(user.uid)}
                disabled={isSaving}
                className="button-primary shrink-0 px-3 py-1.5 text-xs"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>

              {isSaved && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={13} /> Saved
                </span>
              )}
            </div>

            {errMsg && <p className="mt-2 text-xs text-red-500">{errMsg}</p>}
          </div>
        );
      })}
    </div>
  );
}

const selectCls =
  'rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-input)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--blc-red)] transition-colors';
