import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  getCachedStaffProfile,
  loadStaffProfile,
  saveStaffProfile,
} from '../../utils/staffProfileApi';

const TITLE_OPTIONS = [
  'Partner',
  'Senior Engagement Manager',
  'Senior Consultant',
  'Associate Consultant',
];

export default function BioEditor({ staffId }) {
  const [fields, setFields] = useState({
    first_name: '',
    last_name: '',
    title: '',
    summary: '',
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const summaryRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    const applyData = (data) => {
      setFields({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        title: data.title ?? '',
        summary: data.summary ?? '',
      });
    };

    async function load() {
      const cached = getCachedStaffProfile(staffId);
      if (cached) {
        applyData(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setErrorMsg('');

      try {
        const data = await loadStaffProfile(staffId);
        if (!isActive) {
          return;
        }
        applyData(data);
      } catch {
        if (isActive) {
          setErrorMsg('Could not load this profile.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }
    load();

    return () => {
      isActive = false;
    };
  }, [staffId]);

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.style.height = 'auto';
      summaryRef.current.style.height = `${summaryRef.current.scrollHeight}px`;
    }
  }, [fields.summary]);

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveState('saving');
    setErrorMsg('');
    try {
      const data = await saveStaffProfile(staffId, {
        first_name: fields.first_name,
        last_name: fields.last_name,
        title: fields.title,
        summary: fields.summary,
      });
      setFields({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        title: data.title ?? '',
        summary: data.summary ?? '',
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err.message || 'Save failed. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-8">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    );
  }

  const isCustomTitle = fields.title && !TITLE_OPTIONS.includes(fields.title);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Field label="First name">
          <input
            type="text"
            required
            value={fields.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            className="input-field"
          />
        </Field>
        <Field label="Last name">
          <input
            type="text"
            required
            value={fields.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            className="input-field"
          />
        </Field>
      </div>

      <Field label="Title">
        <div className="relative">
          <select
            value={TITLE_OPTIONS.includes(fields.title) ? fields.title : '__custom__'}
            onChange={(e) => {
              if (e.target.value !== '__custom__') set('title', e.target.value);
            }}
            className="input-field appearance-none"
          >
            {TITLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="__custom__">Other...</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-muted)]">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {(isCustomTitle || fields.title === '') && (
          <input
            type="text"
            placeholder="Enter custom title"
            value={fields.title}
            onChange={(e) => set('title', e.target.value)}
            className="input-field mt-3"
          />
        )}
      </Field>

      <Field label="Bio / Summary" hint="This text appears verbatim in the resume template.">
        <textarea
          ref={summaryRef}
          value={fields.summary}
          onChange={(e) => set('summary', e.target.value)}
          rows={4}
          className="input-field resize-none overflow-hidden leading-relaxed"
          placeholder="Write a 2-3 sentence professional summary..."
        />
      </Field>

      <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-main)] mt-8">
        <button
          type="submit"
          disabled={saveState === 'saving'}
          className="button-primary min-w-[140px]"
        >
          {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>

        {saveState === 'saved' && (
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-main)]">
            <CheckCircle2 size={16} /> Update Successful
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-sm font-medium text-[var(--text-danger)]">
            {errorMsg}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <label className="eyebrow-label">
        {label}
      </label>
      {hint && <p className="text-xs text-[var(--text-muted)] italic">{hint}</p>}
      {children}
    </div>
  );
}
