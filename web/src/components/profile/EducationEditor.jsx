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
    <div className="space-y-6">
      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry._id}
            className="panel-surface bg-[var(--bg-card)] p-6"
          >
            <div className="grid grid-cols-3 gap-6">
              <EduField label="Degree / Cert">
                <input
                  type="text"
                  value={entry.degree_cert}
                  onChange={(e) => updateEntry(entry._id, 'degree_cert', e.target.value)}
                  className="input-field"
                  placeholder="B.Eng."
                />
              </EduField>
              <EduField label="Area of Study">
                <input
                  type="text"
                  value={entry.degree_area}
                  onChange={(e) => updateEntry(entry._id, 'degree_area', e.target.value)}
                  className="input-field"
                  placeholder="Civil Engineering"
                />
              </EduField>
              <EduField label="Institution / Location">
                <input
                  type="text"
                  value={entry.location}
                  onChange={(e) => updateEntry(entry._id, 'location', e.target.value)}
                  className="input-field"
                  placeholder="University of Calgary"
                />
              </EduField>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-hover)] p-8 text-center">
            <p className="text-sm font-medium text-[var(--text-muted)]">No education entries yet.</p>
          </div>
        )}
      </div>

      {entries.length > 1 && (
        <div className="rounded-xl border border-[var(--border-main)] bg-white p-6">
          <p className="eyebrow-label mb-4">
            Drag to reorder
          </p>
          <SortableList items={sortableItems} onReorder={handleReorder} onRemove={handleRemove} />
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-6 border-t border-[var(--border-main)] mt-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={addEntry}
            className="button-secondary"
          >
            <Plus size={16} /> Add Entry
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="button-primary min-w-[140px]"
          >
            {saveState === 'saving' ? 'Saving...' : 'Save Education'}
          </button>
        </div>

        <div>
          {saveState === 'saved' && (
            <span className="flex items-center gap-2 text-sm font-semibold text-green-600">
              <CheckCircle2 size={16} /> Update Successful
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-sm font-medium text-[var(--accent-main)]">
              {errorMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EduField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="eyebrow-label">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'input-field';

function makeId(index) {
  return `${crypto.randomUUID()}_${index}`;
}
