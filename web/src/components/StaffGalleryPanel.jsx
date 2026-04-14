import { Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileEditorTabs from './profile/ProfileEditorTabs';

export default function StaffGalleryPanel({ allStaff }) {
  const [query, setQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');

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

  return (
    <div className="h-[calc(100vh-8.25rem)] min-h-[38rem] overflow-hidden px-6 py-6">
      <div className="panel-surface grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[var(--border-main)] bg-[var(--bg-card)] lg:border-b-0 lg:border-r">
          <div className="panel-header px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="section-title">Staff Profiles</h1>
                <p className="section-description mt-1">
                  Browse and edit staff bios, project history, and education records.
                </p>
              </div>
              <span className="rounded-full bg-[var(--bg-selected)] px-2.5 py-1 text-xs font-medium text-[var(--text-accent)]">
                {allStaff.length}
              </span>
            </div>

            <label className="mt-4 flex items-center gap-2 input-field px-3 py-2.5">
              <Search size={15} className="text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Search staff"
                type="text"
              />
            </label>
          </div>

          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
            {filteredStaff.length === 0 ? (
              <div className="px-5 py-8 text-sm text-[var(--text-muted)]">
                No staff profiles match that search.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-main)]">
                {filteredStaff.map((person) => {
                  const isSelected = person.staff_id === activeStaffId;

                  return (
                    <button
                      key={person.staff_id}
                      onClick={() => setSelectedStaffId(person.staff_id)}
                      className={`w-full px-5 py-4 text-left transition-colors ${
                        isSelected
                          ? 'bg-[var(--bg-selected)]'
                          : 'bg-transparent hover:bg-[var(--bg-hover)]'
                      }`}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full border border-[var(--border-main)] bg-white/65 p-2 text-[var(--text-muted)]">
                          <UserRound size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {person.display_name}
                          </p>
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {person.title || 'Title not set'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto bg-transparent">
          {selectedPerson ? (
            <div className="px-6 py-6 lg:px-8 lg:py-8">
              <div className="mb-6 flex flex-col gap-3 border-b border-[var(--border-main)] pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow-label">
                    Selected Staff Member
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {selectedPerson.display_name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {selectedPerson.title || 'Profile title not set yet'}
                  </p>
                </div>
                <Link
                  to={`/profile/${selectedPerson.staff_id}`}
                  className="text-sm font-medium text-[var(--text-accent)] hover:underline"
                >
                  Open standalone profile view
                </Link>
              </div>

              <ProfileEditorTabs
                staffId={selectedPerson.staff_id}
                title="Edit Profile"
                description="Changes here update the staff profile used for proposal resume generation."
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Select a staff member
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Pick someone from the left to start editing their profile.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
