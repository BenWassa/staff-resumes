import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layers,
  ListFilter,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatProjectDateRange, getProjectDateSortValue } from '../utils/projectDates';
import SortableList from './SortableList';

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getProjectSearchScore(project, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return 0;

  const title = normalizeSearchValue(project.title);
  const client = normalizeSearchValue(project.client);
  const key = normalizeSearchValue(project.key);
  const haystack = [title, client, key].filter(Boolean).join(' ');
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!haystack) return Number.POSITIVE_INFINITY;

  let score = 0;

  if (title === normalizedQuery) score -= 150;
  else if (key === normalizedQuery) score -= 140;
  else if (client === normalizedQuery) score -= 120;

  if (title.startsWith(normalizedQuery)) score -= 100;
  else if (client.startsWith(normalizedQuery)) score -= 70;
  else if (key.startsWith(normalizedQuery)) score -= 60;

  if (title.includes(normalizedQuery)) score -= 45;
  if (client.includes(normalizedQuery)) score -= 25;
  if (key.includes(normalizedQuery)) score -= 20;

  queryTokens.forEach((token) => {
    if (title.startsWith(token)) score -= 18;
    else if (title.includes(token)) score -= 12;

    if (client.startsWith(token)) score -= 10;
    else if (client.includes(token)) score -= 6;

    if (key.startsWith(token)) score -= 8;
    else if (key.includes(token)) score -= 4;

    if (!haystack.includes(token)) score += 28;
  });

  score += title.length * 0.01;

  return score;
}

function sortProjectsForSearch(projects, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return projects;

  return [...projects].sort((a, b) => {
    const scoreDifference =
      getProjectSearchScore(a, normalizedQuery) - getProjectSearchScore(b, normalizedQuery);
    if (scoreDifference !== 0) return scoreDifference;
    return (a.title || a.key).localeCompare(b.title || b.key);
  });
}

function compareTextValues(a, b, direction = 'asc') {
  const normalizedA = String(a || '')
    .trim()
    .toLocaleLowerCase();
  const normalizedB = String(b || '')
    .trim()
    .toLocaleLowerCase();
  const comparison = normalizedA.localeCompare(normalizedB);
  return direction === 'desc' ? -comparison : comparison;
}

function compareDateValues(a, b, direction = 'desc') {
  const normalizedA = String(a || '').trim();
  const normalizedB = String(b || '').trim();

  if (!normalizedA && !normalizedB) return 0;
  if (!normalizedA) return 1;
  if (!normalizedB) return -1;

  const comparison = normalizedA.localeCompare(normalizedB);
  return direction === 'asc' ? comparison : -comparison;
}

function sortProjects(projects, sortConfig) {
  return [...projects].sort((a, b) => {
    let comparison = 0;

    if (sortConfig.column === 'client') {
      comparison = compareTextValues(
        a.client || a.title || a.key,
        b.client || b.title || b.key,
        sortConfig.direction
      );
    } else if (sortConfig.column === 'title') {
      comparison = compareTextValues(a.title || a.key, b.title || b.key, sortConfig.direction);
    } else if (sortConfig.column === 'date') {
      comparison = compareDateValues(
        getProjectDateSortValue(a),
        getProjectDateSortValue(b),
        sortConfig.direction
      );
    }

    if (comparison !== 0) return comparison;
    return compareTextValues(a.title || a.key, b.title || b.key, 'asc');
  });
}

function SortHeader({ active, direction, label, onClick }) {
  return (
    <button
      className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 transition ${
        active
          ? 'text-[var(--text-main)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
      }`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      )}
    </button>
  );
}

function TeamOrder({ selectedNames, activeTab, onSelectTab, onReorder }) {
  const move = (index, direction) => {
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= selectedNames.length) return;
    const next = [...selectedNames];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onReorder(next);
  };

  return (
    <div
      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
      style={{ borderTop: 'var(--card-border-top)' }}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="text-base font-medium text-[var(--text-main)]">Team Order</span>
        <span className="ml-auto text-sm text-[var(--text-muted)]">
          Consolidated resume follows this order
        </span>
      </div>

      <ol className="space-y-1">
        {selectedNames.map((name, index) => (
          <li
            key={name}
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 transition ${
              activeTab === name
                ? 'border-[var(--border-accent)] bg-[var(--bg-selected)]'
                : 'border-[var(--border-main)] bg-[var(--bg-panel)]'
            }`}
          >
            <button
              className="min-w-0 flex flex-1 items-center gap-3 text-left"
              onClick={() => onSelectTab(name)}
              type="button"
            >
              <span className="w-5 shrink-0 text-center font-mono text-sm text-[var(--text-muted)]">
                {index + 1}
              </span>
              <span className="truncate text-base text-[var(--text-main)]">{name}</span>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="Move person up"
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label="Move person down"
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] disabled:opacity-30"
                disabled={index === selectedNames.length - 1}
                onClick={() => move(index, 1)}
                type="button"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProjectSelectionModal({
  isOpen,
  projects,
  selectedKeys,
  onClose,
  onToggleProject,
  onSelectAll,
  onDeselectAll,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    column: 'client',
    direction: 'asc',
  });
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timeoutId = window.setTimeout(() => {
        setSearchQuery('');
        searchInputRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const searchRankedProjects = sortProjectsForSearch(projects, searchQuery);
  const visibleProjects = searchQuery
    ? searchRankedProjects.filter((project) => {
        const score = getProjectSearchScore(project, searchQuery);
        return Number.isFinite(score) && score < 28;
      })
    : projects;
  const sortedProjects = sortProjects(visibleProjects, sortConfig);
  const topQuickAddProject = visibleProjects.find((project) => !selectedKeys.includes(project.key));

  const updateSort = (column) => {
    setSortConfig((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        column,
        direction: column === 'date' ? 'desc' : 'asc',
      };
    });
  };

  const handleQuickAdd = () => {
    if (!topQuickAddProject) return;
    onToggleProject(topQuickAddProject.key);
    setSearchQuery('');
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleQuickAdd();
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4"
      data-modal-layer="child"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close project selector"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 flex h-[min(80vh,720px)] w-[min(90vw,760px)] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between border-b border-[var(--border-main)] px-5 py-4">
          <div>
            <div className="text-base font-medium text-[var(--text-main)]">Select Projects</div>
            <div className="text-sm text-[var(--text-muted)]">
              Check the projects to include, then reorder them on the main screen.
            </div>
          </div>
          <button
            aria-label="Close project selector"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border-main)] hover:text-[var(--text-main)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
            <label
              className="mb-2 block text-base font-medium text-[var(--text-main)]"
              htmlFor="project-search"
            >
              Quick add projects
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                autoComplete="off"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-panel)] py-2.5 pl-9 pr-3 text-base text-[var(--text-main)] outline-none transition focus:border-[var(--border-accent)]"
                id="project-search"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type a project name, client, or key. Press Enter to add the top match."
                type="text"
                value={searchQuery}
              />
            </div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">
              {searchQuery
                ? topQuickAddProject
                  ? 'Press Enter to add the highlighted result.'
                  : 'No unselected matches for that search.'
                : 'Search is ranked so the best match stays on top for quick Enter-to-add.'}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-3">
            <div className="text-base text-[var(--text-muted)]">
              {selectedKeys.length} of {projects.length} included
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2.5 text-base text-[var(--text-main)] transition hover:border-[var(--text-muted)]"
                onClick={onSelectAll}
                type="button"
              >
                Select all
              </button>
              <button
                className="rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-panel)] px-4 py-2.5 text-base text-[var(--text-main)] transition hover:border-[var(--text-muted)]"
                onClick={onDeselectAll}
                type="button"
              >
                Deselect all
              </button>
            </div>
          </div>

          {sortedProjects.length > 0 ? (
            <div className="mb-2 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(120px,0.72fr)_auto] gap-3 px-4 text-sm uppercase tracking-[0.12em] opacity-70">
              <SortHeader
                active={sortConfig.column === 'client'}
                direction={sortConfig.direction}
                label="Client"
                onClick={() => updateSort('client')}
              />
              <SortHeader
                active={sortConfig.column === 'title'}
                direction={sortConfig.direction}
                label="Engagement"
                onClick={() => updateSort('title')}
              />
              <SortHeader
                active={sortConfig.column === 'date'}
                direction={sortConfig.direction}
                label="Dates"
                onClick={() => updateSort('date')}
              />
              <div className="w-5" aria-hidden />
            </div>
          ) : null}

          <div className="space-y-2">
            {sortedProjects.map((project) => {
              const checked = selectedKeys.includes(project.key);
              const isTopQuickAddMatch =
                Boolean(searchQuery) && topQuickAddProject?.key === project.key;
              const dateRange = formatProjectDateRange(project);
              return (
                <button
                  key={project.key}
                  className={`grid w-full grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(120px,0.72fr)_auto] items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-left transition ${
                    checked || isTopQuickAddMatch
                      ? 'border-[var(--border-accent)] bg-[var(--bg-selected)]'
                      : 'border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                  }`}
                  onClick={() => onToggleProject(project.key)}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium text-[var(--text-main)]">
                      {project.client || 'Unknown client'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base text-[var(--text-main)]">
                      {project.title || project.key}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[var(--text-muted)]">
                      {dateRange || '-'}
                    </div>
                  </div>
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? 'border-[var(--border-accent-subtle)] bg-[var(--accent-main)] text-[var(--accent-text)]'
                        : 'border-[var(--border-main)] bg-[var(--bg-panel)] text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>

          {visibleProjects.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border-main)] px-4 py-6 text-center text-base text-[var(--text-muted)]">
              No projects matched that search.
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--border-main)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-base text-[var(--text-muted)]">
              {selectedKeys.length} project
              {selectedKeys.length !== 1 ? 's' : ''} selected
            </div>
            <button
              className="rounded-[var(--radius-sm)] bg-[var(--accent-main)] px-4 py-2 text-base font-medium text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonPanel({ data, selection, onChangeSelection }) {
  const [eduOpen, setEduOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const availableProjects = data?.projects ?? [];
  const selectedKeys = selection?.projects ?? [];
  const educationIndices = selection?.education_indices ?? [];
  const allEducation = data?.education ?? [];

  const sortedItems = selectedKeys.map((key) => {
    const project = availableProjects.find((item) => item.key === key);
    return {
      id: key,
      label: project?.title ?? key,
      sublabel: project?.client ?? '',
    };
  });

  const toggleProject = (key) => {
    if (selectedKeys.includes(key)) {
      onChangeSelection({
        ...selection,
        projects: selectedKeys.filter((item) => item !== key),
      });
      return;
    }
    onChangeSelection({ ...selection, projects: [...selectedKeys, key] });
  };

  const removeProject = (key) => {
    onChangeSelection({
      ...selection,
      projects: selectedKeys.filter((item) => item !== key),
    });
  };

  const reorderProjects = (newItems) => {
    onChangeSelection({
      ...selection,
      projects: newItems.map((item) => item.id),
    });
  };

  const selectAllProjects = () => {
    onChangeSelection({
      ...selection,
      projects: availableProjects.map((project) => project.key),
    });
  };

  const deselectAllProjects = () => {
    onChangeSelection({ ...selection, projects: [] });
  };

  const toggleEduIndex = (idx) => {
    const hasValue = educationIndices.includes(idx);
    onChangeSelection({
      ...selection,
      education_indices: hasValue
        ? educationIndices.filter((item) => item !== idx)
        : [...educationIndices, idx].sort((a, b) => a - b),
    });
  };

  return (
    <div className="space-y-4">
      <ProjectSelectionModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onDeselectAll={deselectAllProjects}
        onSelectAll={selectAllProjects}
        onToggleProject={toggleProject}
        projects={availableProjects}
        selectedKeys={selectedKeys}
      />

      <div
        className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
        style={{ borderTop: 'var(--card-border-top)' }}
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-base font-medium text-[var(--text-main)]">Projects</span>
          <span className="ml-auto text-sm text-[var(--text-muted)]">
            {selectedKeys.length} of {availableProjects.length} selected
          </span>
        </div>

        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-main)] bg-[var(--bg-panel)] px-3 py-2 text-base text-[var(--text-main)] transition hover:border-[var(--text-muted)]"
            onClick={() => setIsProjectModalOpen(true)}
            type="button"
          >
            <ListFilter className="h-4 w-4" />
            Select Included Projects
          </button>
        </div>

        <SortableList items={sortedItems} onReorder={reorderProjects} onRemove={removeProject} />
      </div>

      {allEducation.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-card)]">
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => setEduOpen((current) => !current)}
            type="button"
          >
            <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-base font-medium text-[var(--text-main)]">Education</span>
            <span className="ml-auto text-sm text-[var(--text-muted)]">
              {educationIndices.length} of {allEducation.length} included
            </span>
            {eduOpen ? (
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
            )}
          </button>

          {eduOpen ? (
            <div className="space-y-2 border-t border-[var(--border-main)] p-4">
              {allEducation.map((entry, index) => {
                const idx = index + 1;
                const checked = educationIndices.includes(idx);
                const label = [entry.degree_cert, entry.degree_area, entry.location]
                  .filter(Boolean)
                  .join(' | ');

                return (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-transparent px-3 py-2.5 transition hover:border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
                    key={idx}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        checked
                          ? 'border-[var(--border-accent-subtle)] bg-[var(--bg-accent-subtle)]'
                          : 'border-[var(--border-main)] bg-[var(--bg-panel)]'
                      }`}
                      onClick={() => toggleEduIndex(idx)}
                    >
                      {checked ? (
                        <svg
                          className="h-2.5 w-2.5 text-[var(--text-accent)]"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M1.5 5L4 7.5L8.5 2.5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                          />
                        </svg>
                      ) : null}
                    </div>
                    <span
                      className={`text-base ${checked ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
                      onClick={() => toggleEduIndex(idx)}
                    >
                      {label || `Education entry ${idx}`}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function StepPersonConfig({
  selectedNames,
  personData,
  selections,
  onChangeSelections,
  onChangeSelectedNames,
}) {
  const [activeTab, setActiveTab] = useState(selectedNames[0] ?? '');

  const currentTab = selectedNames.includes(activeTab) ? activeTab : (selectedNames[0] ?? '');

  const updatePerson = (name, newSelection) => {
    onChangeSelections({ ...selections, [name]: newSelection });
  };

  return (
    <div className="grid min-h-0 gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-h-0 space-y-4">
        <p className="text-base text-[var(--text-muted)]">
          Reorder people for the consolidated resume, then choose and sort projects for each team
          member.
        </p>

        <TeamOrder
          activeTab={currentTab}
          onReorder={onChangeSelectedNames}
          onSelectTab={setActiveTab}
          selectedNames={selectedNames}
        />
      </div>

      <div className="min-h-0 overflow-y-auto pr-1">
        {currentTab && personData[currentTab] ? (
          <PersonPanel
            data={personData[currentTab]}
            selection={selections[currentTab]}
            onChangeSelection={(nextSelection) => updatePerson(currentTab, nextSelection)}
          />
        ) : (
          <div className="flex items-center justify-center py-10">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-[var(--border-accent)]" />
          </div>
        )}
      </div>
    </div>
  );
}
