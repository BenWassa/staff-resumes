import { useEffect, useState } from 'react';
import { collection, getDocs, writeBatch, doc, orderBy, query } from 'firebase/firestore';
import { Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import SortableList from '../SortableList';

const BLANK_EDU = { degree_cert: '', degree_area: '', location: '' };

export default function EducationEditor({ staffId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      const q = query(collection(db, 'staff', staffId, 'education'), orderBy('order'));
      const snap = await getDocs(q);
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, [staffId]);

  function addEntry() {
    const id = `edu_${Date.now()}`;
    setEntries((prev) => [...prev, { id, ...BLANK_EDU }]);
  }

  function updateEntry(id, field, value) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  // SortableList expects { id, label, sublabel }
  const sortableItems = entries.map((e) => ({
    id: e.id,
    label: [e.degree_cert, e.degree_area].filter(Boolean).join(' — ') || 'Untitled entry',
    sublabel: e.location,
  }));

  function handleReorder(reordered) {
    const idOrder = reordered.map((item) => item.id);
    setEntries((prev) => idOrder.map((id) => prev.find((e) => e.id === id)));
  }

  function handleRemove(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSave() {
    setSaveState('saving');
    setErrorMsg('');
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'staff', staffId, 'education');

      // Delete all existing education docs then rewrite
      const existing = await getDocs(colRef);
      existing.docs.forEach((d) => batch.delete(d.ref));

      entries.forEach((entry, i) => {
        const ref = doc(colRef, entry.id);
        batch.set(ref, {
          degree_cert: entry.degree_cert,
          degree_area: entry.degree_area,
          location: entry.location,
          order: i + 1,
        });
      });

      await batch.commit();
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
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inline edit forms */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] p-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <EduField label="Degree / Cert">
                <input
                  type="text"
                  value={entry.degree_cert}
                  onChange={(e) => updateEntry(entry.id, 'degree_cert', e.target.value)}
                  className={inputCls}
                  placeholder="B.Eng."
                />
              </EduField>
              <EduField label="Area of Study">
                <input
                  type="text"
                  value={entry.degree_area}
                  onChange={(e) => updateEntry(entry.id, 'degree_area', e.target.value)}
                  className={inputCls}
                  placeholder="Civil Engineering"
                />
              </EduField>
              <EduField label="Institution / Location">
                <input
                  type="text"
                  value={entry.location}
                  onChange={(e) => updateEntry(entry.id, 'location', e.target.value)}
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

      {/* Reorder + remove */}
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

      {/* Save all */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="bg-[var(--blc-red)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-[var(--radius)] transition-opacity"
        >
          {saveState === 'saving' ? 'Saving…' : 'Save education'}
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
