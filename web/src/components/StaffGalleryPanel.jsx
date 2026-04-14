import { Search, UserRound } from 'lucide-react';
import { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProfileEditorTabs from './profile/ProfileEditorTabs';

export default function StaffGalleryPanel({ allStaff }) {
  const [query, setQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const editorRef = useRef(null);

  const filteredStaff = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return allStaff;

    return allStaff.filter((person) =>
      [person.display_name, person.title, person.staff_id]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [allStaff, query]);

  const activeStaffId = filteredStaff.some((person) => person.staff_id === selectedStaffId)
    ? selectedStaffId
    : (filteredStaff[0]?.staff_id ?? '');

  const selectedPerson =
    filteredStaff.find((person) => person.staff_id === activeStaffId) ??
    allStaff.find((person) => person.staff_id === activeStaffId) ??
    null;

  const handleStaffSelect = (staffId) => {
    setSelectedStaffId(staffId);
    // Smooth scroll to editor on mobile viewports
    if (window.innerWidth < 1024 && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="grid min-h-0 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Left Sidebar: Directory List */}
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="panel-surface overflow-hidden">
          <div className="panel-header px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-medium text-[var(--text-main)]">Team Roster</span>
              <span className="rounded-full bg-[var(--bg-selected)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-accent)]">
                {allStaff.length}
              </span>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                className="input-field pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search staff..."
                type="text"
                value={query}
              />
            </div>
          </div>

          <div className="hide-scrollbar min-h-[500px] overflow-y-auto p-3 bg-[var(--bg-panel)]">
            {filteredStaff.length === 0 ? (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border-main)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No staff profiles match that search.
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredStaff.map((person) => {
                  const isSelected = person.staff_id === activeStaffId;

                  return (
                    <button
                      key={person.staff_id}
                      onClick={() => handleStaffSelect(person.staff_id)}
                      className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-[var(--border-accent)] bg-[var(--bg-selected)]'
                          : 'border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                      }`}
                      type="button"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                          isSelected
                            ? 'border-[var(--border-accent-subtle)] bg-[var(--accent-main)] text-[var(--accent-text)]'
                            : 'border-[var(--border-main)] bg-[var(--bg-panel)] text-[var(--text-muted)]'
                        }`}
                      >
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-[var(--text-main)]">
                          {person.display_name}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {person.title || 'Title not set'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right Content: Profile Editor */}
      <section ref={editorRef} className="min-h-0 flex-1">
        {selectedPerson ? (
          <div className="flex h-full flex-col space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow-label">Editing Profile</p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--text-main)] tracking-tight">
                  {selectedPerson.display_name}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedPerson.title || 'Profile title not set yet'}
                </p>
              </div>
              <Link
                to={`/profile/${selectedPerson.staff_id}`}
                className="text-sm font-medium text-[var(--text-accent)] transition hover:text-[var(--accent-hover)] hover:underline"
              >
                Open standalone profile view
              </Link>
            </div>

            <ProfileEditorTabs
              staffId={selectedPerson.staff_id}
              description="Changes here instantly update the staff profile used for future proposal resume generation."
            />
          </div>
        ) : (
          <div className="panel-surface flex h-[400px] flex-col items-center justify-center p-8 text-center bg-[var(--bg-panel)]">
            <div className="mb-4 rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-[var(--text-muted)]">
              <UserRound className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-main)]">
              Select a staff member
            </h2>
            <p className="mt-2 text-base text-[var(--text-muted)] max-w-sm">
              Pick someone from the roster on the left to start editing their professional bio, project history, or education.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
