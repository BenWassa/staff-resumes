import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';
import SortableList from '../SortableList';

const BLANK_EDU = { degree_cert: '', degree_area: '', location: '' };

export default function EducationEditor({ staffId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/people/${encodeURIComponent(staffId)}/data`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to load education.');
        }
        setEntries((data.education ?? []).map((entry, index) => ({ _id: makeId(index), ...entry })));
      } catch {
        setErrorMsg('Could not load education entries.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [staffId]);

  function addEntry() {
    setEntries((prev) => [...prev, { _id: makeId(prev.length), ...BLANK_EDU }]);
  }

  function updateEntry(id, field, value) {
    setEntries((prev) => prev.map((e) => (e._id === id ? { ...e, [field]: value } : e)));
  }

  const sortableItems = entries.map((e) => ({
    id: e._id,
    label: [e.degree_cert, e.degree_area].filter(Boolean).join(' - ') || 'Untitled entry',
    sublabel: e.location,
  }));

  function handleReorder(reordered) {
    const next = reordered
      .map((item) => entries.find((entry) => entry._id === item.id))
      .filter(Boolean);
    setEntries(next);
  }

  function handleRemove(id) {
    setEntries((prev) => prev.filter((entry) => entry._id !== id));
  }

  async function handleSave() {
    setSaveState('saving');
    setErrorMsg('');
    try {
      const response = await apiFetch(`/api/people/${encodeURIComponent(staffId)}/data`, {
        method: 'PUT',
        body: JSON.stringify({
          education: entries.map((entry) => {
            const rest = { ...entry };
            delete rest._id;
            return rest;
          }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Save failed. Please try again.');
      }
      setEntries((data.education ?? []).map((entry, index) => ({ _id: makeId(index), ...entry })));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setErrorMsg('Save failed. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-8">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry._id}
            className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] p-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <EduField label="Degree / Cert">
                <input
                  type="text"
                  value={entry.degree_cert}
                  onChange={(e) => updateEntry(entry._id, 'degree_cert', e.target.value)}
                  className={inputCls}
                  placeholder="B.Eng."
                />
              </EduField>
              <EduField label="Area of Study">
                <input
                  type="text"
                  value={entry.degree_area}
                  onChange={(e) => updateEntry(entry._id, 'degree_area', e.target.value)}
                  className={inputCls}
                  placeholder="Civil Engineering"
                />
              </EduField>
              <EduField label="Institution / Location">
                <input
                  type="text"
                  value={entry.location}
                  onChange={(e) => updateEntry(entry._id, 'location', e.target.value)}
                  className={inputCls}
                  placeholder="University of Calgary"
                />
              </EduField>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-2">No education entries yet.</p>
        )}
      </div>

      {entries.length > 1 && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider font-medium">
            Drag to reorder
          </p>
          <SortableList items={sortableItems} onReorder={handleReorder} onRemove={handleRemove} />
        </div>
      )}

      <button
        type="button"
        onClick={addEntry}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1"
      >
        <Plus size={15} /> Add education entry
      </button>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="bg-[var(--blc-red)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-[var(--radius)] transition-opacity"
        >
          {saveState === 'saving' ? 'Saving...' : 'Save education'}
        </button>
        {saveState === 'saved' && (
          <span className="flex items-center gap-1.5 text-sm text-green-500">
            <CheckCircle2 size={15} /> Saved
          </span>
        )}
        {saveState === 'error' && <span className="text-sm text-red-400">{errorMsg}</span>}
      </div>
    </div>
  );
}

function EduField({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--blc-red)] transition-colors';

function makeId(index) {
  return `${crypto.randomUUID()}_${index}`;
}
