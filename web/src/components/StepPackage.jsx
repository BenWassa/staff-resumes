import { useState, useRef, useEffect } from 'react';
import { FileCode, AlertTriangle, ChevronDown, Search, X } from 'lucide-react';
import { formatProjectDateRange, formatProjectOptionLabel } from '../utils/projectDates';
import { slugify } from '../utils/slugify';

function formatSavedAt(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function teamPreview(selectedNames) {
  if (selectedNames.length === 0) return 'No team selected';
  if (selectedNames.length <= 2) return selectedNames.join(', ');
  return `${selectedNames.slice(0, 2).join(', ')} and ${selectedNames.length - 2} more`;
}

const YamlIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <defs>
      <mask id="yaml-mask">
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <text
          x="12"
          y="20.2"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="4.2"
          fontWeight="bold"
          fill="black"
          stroke="none"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          YAML
        </text>
      </mask>
    </defs>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
    <path d="M14 2v6h6" />
    <path d="M12 9v4" />
    <path d="M9.5 11.5L12 14l2.5-2.5" />
    <rect
      x="4"
      y="16"
      width="16"
      height="6"
      rx="1.5"
      fill="currentColor"
      stroke="none"
      mask="url(#yaml-mask)"
    />
  </svg>
);

function buildGallerySaves(saves, projectMap) {
  if (!saves || saves.length === 0) return [];
  const pursuit = [];
  const active = [];
  const other = [];
  for (const save of saves) {
    const project = save.selected_project_id ? projectMap.get(save.selected_project_id) : null;
    const type = project?.project_type;
    const tile = {
      save,
      clientLabel: project?.short_client || project?.client || save.package_name,
      projectTitle: project?.engagement_type || null,
      projectType: type || null,
    };
    if (type === 'pursuit') pursuit.push(tile);
    else if (type === 'active') active.push(tile);
    else other.push(tile);
  }
  return [...pursuit, ...active, ...other].slice(0, 6);
}

export default function StepPackage({
  value,
  projects,
  selectedProjectId,
  onSelectProject,
  saves,
  onLoadSave,
  onYamlImport,
}) {
  const selectedProject = projects.find((project) => project.project_id === selectedProjectId);
  const [search, setSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const projectMap = new Map(projects.map((project) => [project.project_id, project]));

  // Mark projects that already have a recent session (save)
  const existingSaveIds = new Set((saves || []).map((s) => s.selected_project_id).filter(Boolean));
  const existingSlugs = new Set((saves || []).map((s) => s.slug).filter(Boolean));

  const filteredProjects = projects
    .filter((p) => formatProjectOptionLabel(p).toLowerCase().includes(search.toLowerCase()))
    .map((p) => ({
      ...p,
      hasExistingSave: existingSaveIds.has(p.project_id) || existingSlugs.has(p.project_id),
    }))
    .sort((a, b) => {
      // Keep sort order consistent, but maybe move existing to bottom?
      // User said "mark them", let's keep alpha sort but style them.
      return formatProjectOptionLabel(a).localeCompare(formatProjectOptionLabel(b));
    });

  const gallery = buildGallerySaves(saves, projectMap);
  const hasGallery = gallery.length > 0;

  const currentSlug = slugify(value);
  const willOverwrite =
    value.trim().length > 0 &&
    currentSlug !== 'package' &&
    Array.isArray(saves) &&
    saves.some((save) => save.slug === currentSlug);

  return (
    <div className="space-y-5">
      {hasGallery ? (
        <div>
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="text-base font-medium text-[var(--text-main)]">
              Resume a recent session
            </h3>
            <span className="text-sm text-[var(--text-muted)]">{gallery.length} recent</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map(({ save, clientLabel, projectTitle, projectType }) => (
              <button
                key={save.slug}
                type="button"
                onClick={() => onLoadSave(save.slug)}
                className="group relative flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-left transition hover:border-[var(--border-accent)] hover:bg-[var(--bg-hover)]"
              >
                {projectType && projectType !== 'pursuit' ? (
                  <span
                    className={`absolute left-4 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-sm font-semibold uppercase tracking-[0.05em] border border-[var(--border-main)] text-[var(--text-muted)]`}
                  >
                    {projectType}
                  </span>
                ) : null}
                <div
                  className={`flex flex-wrap items-baseline gap-x-1.5 pr-8 text-base font-medium ${projectType && projectType !== 'pursuit' ? 'mt-6' : ''}`}
                >
                  <span className="text-[var(--text-main)]">{clientLabel}</span>
                  {projectTitle && (
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      {projectTitle}
                    </span>
                  )}
                </div>
                <div className="truncate text-sm text-[var(--text-muted)] opacity-70">
                  {save.package_name}
                </div>
                <div className="truncate text-sm text-[var(--text-muted)]">
                  {formatSavedAt(save.saved_at)}
                  {save.selected_names.length > 0 ? ` · ${teamPreview(save.selected_names)}` : ''}
                </div>
                <a
                  className="absolute right-2 top-2 rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] group-hover:opacity-100"
                  download={`${save.slug}.selections.yaml`}
                  href={`/api/saves/${encodeURIComponent(save.slug)}/yaml`}
                  onClick={(e) => e.stopPropagation()}
                  title="Export YAML"
                >
                  <YamlIcon className="h-5 w-5" />
                </a>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasGallery ? (
        <div className="flex items-center gap-3">
          <span className="flex-1 border-t border-[var(--border-main)]" />
          <span className="text-sm uppercase tracking-wider text-[var(--text-muted)]">
            or start a new package
          </span>
          <span className="flex-1 border-t border-[var(--border-main)]" />
        </div>
      ) : null}

      <div>
        <p className="text-base text-[var(--text-muted)]">
          Select the pursuit for this resume package. This determines the output folder name and
          reference dates.
        </p>
      </div>

      <div
        className="rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)] p-[var(--card-padding,1.25rem)]"
        style={{ borderTop: 'var(--card-border-top)' }}
      >
        <div className="relative mb-5" ref={dropdownRef}>
          <div className="mb-2 text-base font-medium text-[var(--text-main)]">Pursuit</div>

          <div className="relative">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--text-muted)]">
                <Search className="h-4 w-4" />
              </div>
              <input
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-input)] py-2.5 pl-11 pr-10 text-base text-[var(--text-main)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--border-accent)]"
                onBlur={() => {
                  // Small delay to allow button click inside the dropdown
                  setTimeout(() => setIsDropdownOpen(false), 200);
                }}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!isDropdownOpen) setIsDropdownOpen(true);
                }}
                onClick={() => setIsDropdownOpen(true)}
                onFocus={() => setIsDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsDropdownOpen(false);
                  }
                }}
                placeholder="Choose or search for a pursuit..."
                type="text"
                value={
                  isDropdownOpen
                    ? search
                    : selectedProject
                      ? formatProjectOptionLabel(selectedProject)
                      : search
                }
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {search && isDropdownOpen ? (
                  <button
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch('');
                    }}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl pt-1">
                {filteredProjects.length === 0 ? (
                  <div className="px-4 py-3 text-center text-base text-[var(--text-muted)]">
                    {search ? 'No matches found' : 'All pursuits tracked'}
                  </div>
                ) : (
                  <div className="mb-1">
                    {filteredProjects.map((p) => (
                      <button
                        key={p.project_id}
                        onClick={() => {
                          onSelectProject(p.project_id);
                          setIsDropdownOpen(false);
                          setSearch('');
                        }}
                        type="button"
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-base transition-colors hover:bg-[var(--bg-hover)] ${
                          selectedProjectId === p.project_id
                            ? 'bg-[var(--bg-accent-subtle)] text-[var(--text-accent)] font-medium'
                            : p.hasExistingSave
                              ? 'text-[var(--text-muted)] opacity-60'
                              : 'text-[var(--text-main)]'
                        }`}
                      >
                        <span className="truncate">{formatProjectOptionLabel(p)}</span>
                        {p.hasExistingSave && (
                          <span className="ml-2 whitespace-nowrap text-[9px] font-bold uppercase tracking-tighter opacity-50">
                            Resumed
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedProject ? (
          <div className="mt-2 space-y-1 text-base text-[var(--text-muted)] opacity-90">
            {formatProjectDateRange(selectedProject) ? (
              <p>Reference pursuit dates: {formatProjectDateRange(selectedProject)}</p>
            ) : null}
            <p className="mt-2 text-sm">
              Output will be written to{' '}
              <span className="font-mono text-[var(--text-main)]">
                outputs/{currentSlug === 'package' ? '<package>' : currentSlug}/
              </span>
            </p>
          </div>
        ) : null}
      </div>

      {willOverwrite ? (
        <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border-accent)] bg-[var(--bg-accent-subtle)] px-3 py-2 text-sm text-[var(--text-accent)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            A package with this name already exists and will be overwritten. Use{' '}
            <span className="font-medium">Restore</span> above if you meant to resume it.
          </span>
        </div>
      ) : null}

      {onYamlImport ? (
        <div>
          <div className="mb-2 text-base font-medium text-[var(--text-main)]">Quick Load</div>
          <button
            className="inline-flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-accent-subtle)] bg-[var(--bg-accent-subtle)] px-4 py-3 text-left text-base text-[var(--text-accent)] transition hover:bg-[var(--bg-hover)]"
            onClick={onYamlImport}
            type="button"
          >
            <FileCode className="h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Import from selections.yaml</div>
              <div className="text-sm text-[var(--text-muted)]">
                Autoload team and pursuits from{' '}
                <span className="font-mono">data/selections.yaml</span>
              </div>
            </div>
          </button>
        </div>
      ) : null}
    </div>
  );
}
