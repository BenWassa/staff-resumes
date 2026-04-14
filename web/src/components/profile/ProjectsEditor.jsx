import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, CheckCircle2, Loader2, ArrowUpDown, History } from 'lucide-react';
import {
  getCachedStaffProfile,
  loadStaffProfile,
  saveStaffProfile,
} from '../../utils/staffProfileApi';

const BLANK_PROJECT = {
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
  const [sortConfig, setSortConfig] = useState({ key: 'original', direction: 'asc' });

  const sortedProjects = useMemo(() => {
    if (sortConfig.key === 'original') return projects;

    return [...projects].sort((a, b) => {
      let aVal, bVal;

      if (sortConfig.key === 'client') {
        aVal = (a.client || '').toLowerCase();
        bVal = (b.client || '').toLowerCase();
      } else if (sortConfig.key === 'title') {
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
      } else if (sortConfig.key === 'start_date') {
        aVal = a.start_date || '0000-00-00';
        bVal = b.start_date || '0000-00-00';
      } else if (sortConfig.key === 'end_date') {
        aVal = a.end_date || '9999-99-99'; // Ongoing projects at top for desc, bottom for asc
        bVal = b.end_date || '9999-99-99';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortConfig]);

  useEffect(() => {
    let isActive = true;
    setExpandedKey(null);
    setDeletingKey(null);
    setSavedKey(null);

    async function load() {
      const cached = getCachedStaffProfile(staffId);
      if (cached) {
        setProjects(cached.projects ?? []);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setErrors({});
      try {
        const data = await loadStaffProfile(staffId);
        if (!isActive) {
          return;
        }
        setProjects(data.projects ?? []);
      } catch {
        if (isActive) {
          setErrors({ load: 'Could not load projects.' });
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

  function updateField(key, field, value) {
    setProjects((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  }

  function handleSort(key) {
    setSortConfig((prev) => {
      const isNew = prev.key !== key;
      const nextDir = isNew ? (key.includes('date') ? 'desc' : 'asc') : (prev.direction === 'asc' ? 'desc' : 'asc');
      return { key, direction: nextDir };
    });
  }

  async function saveProjects(nextProjects) {
    const data = await saveStaffProfile(staffId, { projects: nextProjects });
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
    const hasAnyContent = [newProject.title, newProject.client, newProject.description]
      .some((value) => String(value || '').trim());
    if (!hasAnyContent) return;

    setAddSaving(true);
    try {
      const proj = {
        ...newProject,
        key: buildProjectKey(newProject, projects),
      };
      const nextProjects = [...projects, proj];
      const savedProjects = await saveProjects(nextProjects);
      setProjects(savedProjects);
      setNewProject(BLANK_PROJECT);
      setAdding(false);
      setExpandedKey(proj.key);
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
      {errors.load && (
        <p className="text-sm text-[var(--accent-main)]">
          {errors.load}
        </p>
      )}
      
      {projects.length > 1 && (
        <div className="flex items-center gap-2 mb-6 px-1 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mr-2">Sort by</span>
          <SortButton
            active={sortConfig.key === 'original'}
            icon={<History size={14} />}
            label="Original"
            onClick={() => handleSort('original')}
          />
          <SortButton
            active={sortConfig.key === 'client'}
            direction={sortConfig.key === 'client' ? sortConfig.direction : null}
            label="Client"
            onClick={() => handleSort('client')}
          />
          <SortButton
            active={sortConfig.key === 'title'}
            direction={sortConfig.key === 'title' ? sortConfig.direction : null}
            label="Project"
            onClick={() => handleSort('title')}
          />
          <SortButton
            active={sortConfig.key === 'start_date'}
            direction={sortConfig.key === 'start_date' ? sortConfig.direction : null}
            label="Start Date"
            onClick={() => handleSort('start_date')}
          />
          <SortButton
            active={sortConfig.key === 'end_date'}
            direction={sortConfig.key === 'end_date' ? sortConfig.direction : null}
            label="End Date"
            onClick={() => handleSort('end_date')}
          />
        </div>
      )}

      {projects.length === 0 && !adding && (
        <p className="text-sm text-[var(--text-muted)] py-4">
          No projects yet. Add your first one below.
        </p>
      )}

      {sortedProjects.map((project) => {
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
                  {project.client || (
                    <span className="italic text-[var(--text-muted)]">Client not set</span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {project.title || 'Untitled project'}
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
                <div className="pt-3">
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
                  <ProjectField label="Start Date" hint="Use the calendar picker">
                    <input
                      type="date"
                      value={project.start_date}
                      onChange={(e) => updateField(project.key, 'start_date', e.target.value)}
                      className={inputCls}
                    />
                  </ProjectField>
                  <ProjectField label="End Date" hint="Leave blank if ongoing">
                    <input
                      type="date"
                      value={project.end_date}
                      onChange={(e) => updateField(project.key, 'end_date', e.target.value)}
                      className={inputCls}
                    />
                  </ProjectField>
                </div>

                {errMsg && <p className="text-xs text-[var(--text-danger)]">{errMsg}</p>}

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
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-main)]">
                      <CheckCircle2 size={16} /> Saved
                    </span>
                  )}

                  <div className="ml-auto">
                    {isDeletePending ? (
                      <span className="flex items-center gap-3 text-sm">
                        <span className="max-w-[220px] text-[var(--text-muted)] font-medium">
                          Delete project? This cannot be undone.
                        </span>
                        <button
                          type="button"
                          onClick={() => confirmDelete(project.key)}
                          className="text-[var(--accent-main)] hover:underline font-bold"
                        >
                          Delete
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
          <div className="panel-header py-4 bg-[var(--bg-panel)]/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--accent-main)]">New project</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProjectField label="Client">
                <input
                  type="text"
                  value={newProject.client}
                  onChange={(e) => setNewProject((p) => ({ ...p, client: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
                  className={inputCls}
                  autoFocus
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
                disabled={addSaving}
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

function SortButton({ active, label, onClick, direction, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
        active
          ? 'bg-[var(--accent-main)] text-[var(--accent-text)] border-[var(--accent-main)]'
          : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-muted)]'
      }`}
    >
      {icon}
      {label}
      {direction && (
        <ArrowUpDown
          size={12}
          className={`transition-transform ${direction === 'desc' ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  );
}

function normalizeProjectKeyPart(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildProjectKey(newProject, existingProjects) {
  const primary =
    normalizeProjectKeyPart(newProject.title) ||
    normalizeProjectKeyPart(newProject.client) ||
    `PROJECT-${Date.now()}`;

  const existing = new Set((existingProjects || []).map((project) => project.key));
  if (!existing.has(primary)) {
    return primary;
  }

  let suffix = 2;
  let candidate = `${primary}-${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${primary}-${suffix}`;
  }
  return candidate;
}
