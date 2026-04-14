import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { CheckCircle2, Loader2 } from 'lucide-react';

const ROLES = ['staff', 'admin'];

export default function UserManagementPanel({ allStaff }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // uid → true
  const [saved, setSaved] = useState({}); // uid → true
  const [errors, setErrors] = useState({}); // uid → message
  const [drafts, setDrafts] = useState({}); // uid → { role, staff_id }

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
      // Update local user list
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
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-8">
        <Loader2 size={16} className="animate-spin" /> Loading users…
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-4">
        No users have signed in yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => {
        const draft = drafts[user.uid] ?? { role: 'staff', staff_id: '' };
        const isSaving = saving[user.uid];
        const isSaved = saved[user.uid];
        const errMsg = errors[user.uid];

        return (
          <div
            key={user.uid}
            className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Email */}
              <span className="text-sm text-[var(--text-primary)] min-w-0 flex-1 truncate">
                {user.email}
              </span>

              {/* Role selector */}
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

              {/* Staff link selector */}
              <select
                value={draft.staff_id ?? ''}
                onChange={(e) => setDraft(user.uid, 'staff_id', e.target.value)}
                className={`${selectCls} min-w-[160px]`}
              >
                <option value="">— unlinked —</option>
                {allStaff.map((s) => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.display_name}
                  </option>
                ))}
              </select>

              {/* Save button */}
              <button
                type="button"
                onClick={() => saveUser(user.uid)}
                disabled={isSaving}
                className="bg-[var(--blc-red)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-[var(--radius)] transition-opacity shrink-0"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>

              {isSaved && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle2 size={13} /> Saved
                </span>
              )}
            </div>

            {errMsg && <p className="text-xs text-red-400 mt-1">{errMsg}</p>}
          </div>
        );
      })}
    </div>
  );
}

const selectCls =
  'bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--blc-red)] transition-colors';
