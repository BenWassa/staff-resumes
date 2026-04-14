import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

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
  const [deletingKey, setDeletingKey] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newProject, setNewProject] = useState(BLANK_PROJECT);
  const [addSaving, setAddSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/people/${encodeURIComponent(staffId)}/data`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to load projects.');
        }
        setProjects(data.projects ?? []);
      } catch {
        setErrors({ load: 'Could not load projects.' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [staffId]);

  function updateField(key, field, value) {
    setProjects((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  }

  async function saveProjects(nextProjects) {
    const response = await apiFetch(`/api/people/${encodeURIComponent(staffId)}/data`, {
      method: 'PUT',
      body: JSON.stringify({ projects: nextProjects }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Save failed. Try again.');
    }
    return data.projects ?? [];
  }

  async function saveProject(project) {
    setSavingKey(project.key);
    setErrors((e) => ({ ...e, [project.key]: null }));
    try {
      const nextProjects = projects.map((p) => (p.key === project.key ? project : p));
      const savedProjects = await saveProjects(nextProjects);
      setProjects(savedProjects);
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
      const nextProjects = projects.filter((p) => p.key !== key);
      const savedProjects = await saveProjects(nextProjects);
      setProjects(savedProjects);
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
      const proj = { ...newProject };
      const nextProjects = [...projects, proj];
      const savedProjects = await saveProjects(nextProjects);
      setProjects(savedProjects);
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
        <Loader2 size={16} className="animate-spin" /> Loading...
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

                <div className="flex items-center gap-3 pt-3 mt-4 border-t border-[var(--border-main)]">
                  <button
                    type="button"
                    onClick={() => saveProject(project)}
                    disabled={isSaving}
                    className="button-primary min-w-[100px]"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>

                  {isSaved && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                      <CheckCircle2 size={16} /> Saved
                    </span>
                  )}

                  <div className="ml-auto">
                    {isDeletePending ? (
                      <span className="flex items-center gap-3 text-sm">
                        <span className="text-[var(--text-muted)] font-medium">Delete project?</span>
                        <button
                          type="button"
                          onClick={() => confirmDelete(project.key)}
                          className="text-[var(--accent-main)] hover:underline font-bold"
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
                        className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
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

      {adding ? (
        <div className="panel-surface overflow-hidden bg-[var(--bg-card)] mt-8">
          <div className="panel-header py-4 bg-white/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--accent-main)]">New project</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProjectField label="Project Key *" hint="Unique identifier, e.g. ANAHEIM-2024">
                <input
                  type="text"
                  value={newProject.key}
                  onChange={(e) => setNewProject((p) => ({ ...p, key: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                  className={inputCls}
                />
              </ProjectField>
            </div>
            <ProjectField label="Project Title">
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                className={inputCls}
              />
            </ProjectField>
            <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={handleAddProject}
                disabled={!newProject.key.trim() || addSaving}
                className="button-primary min-w-[120px]"
              >
                {addSaving ? 'Adding...' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewProject(BLANK_PROJECT);
                }}
                className="button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-8 mt-8 border-t border-[var(--border-main)]">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="button-primary min-w-[200px]"
          >
            <Plus size={18} /> Add New Project
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectField({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="eyebrow-label">{label}</label>
      {hint && <p className="mb-1 text-[11px] leading-tight text-[var(--text-muted)] italic">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = 'input-field';
