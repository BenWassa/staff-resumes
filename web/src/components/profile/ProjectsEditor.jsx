import { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../firebase';

const BLANK_PROJECT = {
  key: '',
  client: '',
  title: '',
  description: '',
  start_date: '',
  end_date: '',
};

export default function ProjectsEditor({ staffId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null); // key pending confirm
  const [adding, setAdding] = useState(false);
  const [newProject, setNewProject] = useState(BLANK_PROJECT);
  const [addSaving, setAddSaving] = useState(false);
  const [errors, setErrors] = useState({}); // key → message

  useEffect(() => {
    async function load() {
      const q = query(collection(db, 'staff', staffId, 'projects'), orderBy('order'));
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d, i) => ({ ...d.data(), _order: i }));
      setProjects(loaded);
      setLoading(false);
    }
    load();
  }, [staffId]);

  function updateField(key, field, value) {
    setProjects((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  }

  async function saveProject(project) {
    setSavingKey(project.key);
    setErrors((e) => ({ ...e, [project.key]: null }));
    try {
      const order = projects.findIndex((p) => p.key === project.key) + 1;
      await setDoc(doc(db, 'staff', staffId, 'projects', project.key), {
        ...project,
        order,
        updated_at: new Date(),
      });
      setSavedKey(project.key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      setErrors((e) => ({ ...e, [project.key]: 'Save failed. Try again.' }));
    } finally {
      setSavingKey(null);
    }
  }

  async function confirmDelete(key) {
    try {
      await deleteDoc(doc(db, 'staff', staffId, 'projects', key));
      setProjects((prev) => prev.filter((p) => p.key !== key));
    } catch {
      setErrors((e) => ({ ...e, [key]: 'Delete failed. Try again.' }));
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleAddProject() {
    if (!newProject.key.trim()) return;
    setAddSaving(true);
    try {
      const order = projects.length + 1;
      const proj = { ...newProject, order, date_range: '', updated_at: new Date() };
      await setDoc(doc(db, 'staff', staffId, 'projects', newProject.key), proj);
      setProjects((prev) => [...prev, proj]);
      setNewProject(BLANK_PROJECT);
      setAdding(false);
      setExpandedKey(newProject.key);
    } catch {
      // leave form open so they can retry
    } finally {
      setAddSaving(false);
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
    <div className="space-y-3">
      {projects.length === 0 && !adding && (
        <p className="text-sm text-[var(--text-muted)] py-4">
          No projects yet. Add your first one below.
        </p>
      )}

      {projects.map((project) => {
        const isOpen = expandedKey === project.key;
        const isSaving = savingKey === project.key;
        const isSaved = savedKey === project.key;
        const isDeletePending = deletingKey === project.key;
        const errMsg = errors[project.key];

        return (
          <div
            key={project.key}
            className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] overflow-hidden"
          >
            {/* Row header */}
            <button
              type="button"
              onClick={() => setExpandedKey(isOpen ? null : project.key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {project.title || (
                    <span className="italic text-[var(--text-muted)]">Untitled project</span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {project.client}
                  {project.client && project.key ? ' · ' : ''}
                  {project.key}
                </p>
              </div>
              {isOpen ? (
                <ChevronUp size={16} className="shrink-0 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown size={16} className="shrink-0 text-[var(--text-muted)]" />
              )}
            </button>

            {/* Expanded form */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)]">
                <div className="pt-3 grid grid-cols-2 gap-3">
                  <ProjectField
                    label="Project Key"
                    hint="Used to match projects in resumes — changing it may break saved sessions."
                  >
                    <input
                      type="text"
                      value={project.key}
                      readOnly
                      className={`${inputCls} opacity-60 cursor-not-allowed`}
                    />
                  </ProjectField>
                  <ProjectField label="Client">
                    <input
                      type="text"
                      value={project.client}
                      onChange={(e) => updateField(project.key, 'client', e.target.value)}
                      className={inputCls}
                    />
                  </ProjectField>
                </div>

                <ProjectField label="Project Title">
                  <input
                    type="text"
                    value={project.title}
                    onChange={(e) => updateField(project.key, 'title', e.target.value)}
                    className={inputCls}
                  />
                </ProjectField>

                <ProjectField label="Description" hint="Exact text that appears in the resume.">
                  <textarea
                    value={project.description}
                    onChange={(e) => updateField(project.key, 'description', e.target.value)}
                    rows={4}
                    className={`${inputCls} resize-y`}
                  />
                </ProjectField>

                <div className="grid grid-cols-2 gap-3">
                  <ProjectField label="Start Date" hint='e.g. "Jan 2023"'>
                    <input
                      type="text"
                      value={project.start_date}
                      onChange={(e) => updateField(project.key, 'start_date', e.target.value)}
                      className={inputCls}
                      placeholder="Jan 2023"
                    />
                  </ProjectField>
                  <ProjectField label="End Date" hint="Leave blank if ongoing">
                    <input
                      type="text"
                      value={project.end_date}
                      onChange={(e) => updateField(project.key, 'end_date', e.target.value)}
                      className={inputCls}
                      placeholder="Dec 2024"
                    />
                  </ProjectField>
                </div>

                {errMsg && <p className="text-xs text-red-400">{errMsg}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => saveProject(project)}
                    disabled={isSaving}
                    className="bg-[var(--blc-red)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-[var(--radius)] transition-opacity"
                  >
                    {isSaving ? 'Saving…' : 'Save project'}
                  </button>

                  {isSaved && (
                    <span className="flex items-center gap-1.5 text-sm text-green-500">
                      <CheckCircle2 size={14} /> Saved
                    </span>
                  )}

                  <div className="ml-auto">
                    {isDeletePending ? (
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-[var(--text-muted)]">Delete this project?</span>
                        <button
                          type="button"
                          onClick={() => confirmDelete(project.key)}
                          className="text-red-400 hover:text-red-300 font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingKey(null)}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingKey(project.key)}
                        className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add new project */}
      {adding ? (
        <div className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] p-4 space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">New project</p>
          <div className="grid grid-cols-2 gap-3">
            <ProjectField label="Project Key *" hint="Unique identifier, e.g. ANAHEIM-2024">
              <input
                type="text"
                value={newProject.key}
                onChange={(e) => setNewProject((p) => ({ ...p, key: e.target.value }))}
                className={inputCls}
                placeholder="CLIENT-YEAR"
                autoFocus
              />
            </ProjectField>
            <ProjectField label="Client">
              <input
                type="text"
                value={newProject.client}
                onChange={(e) => setNewProject((p) => ({ ...p, client: e.target.value }))}
                className={inputCls}
              />
            </ProjectField>
          </div>
          <ProjectField label="Project Title">
            <input
              type="text"
              value={newProject.title}
              onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))}
              className={inputCls}
            />
          </ProjectField>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddProject}
              disabled={!newProject.key.trim() || addSaving}
              className="bg-[var(--blc-red)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-[var(--radius)] transition-opacity"
            >
              {addSaving ? 'Adding…' : 'Add project'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewProject(BLANK_PROJECT);
              }}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-2"
        >
          <Plus size={15} /> Add project
        </button>
      )}
    </div>
  );
}

function ProjectField({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </label>
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--blc-red)] transition-colors';
