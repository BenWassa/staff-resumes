import { Check, User } from "lucide-react";

const TITLE_RANK = {
  partner: 0,
  "senior engagement manager": 1,
  "senior consultant": 2,
  "associate consultant": 3,
};

function getTitleRank(title) {
  return TITLE_RANK[(title || "").trim().toLowerCase()] ?? 99;
}

export default function StepPeople({
  allPeople,
  selectedNames,
  onChangeSelected,
}) {
  const toggle = (name) => {
    if (selectedNames.includes(name)) {
      onChangeSelected(
        selectedNames.filter((personName) => personName !== name),
      );
      return;
    }
    onChangeSelected([...selectedNames, name]);
  };

  if (allPeople.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-[var(--border-accent)]" />
          <span className="text-base">Loading team members...</span>
        </div>
      </div>
    );
  }

  const getLastName = (name) => {
    const parts = name.trim().split(" ");
    return parts.length > 1 ? parts[parts.length - 1] : name;
  };

  const rankedPeople = [...allPeople].sort(
    (a, b) =>
      getTitleRank(a.title) - getTitleRank(b.title) ||
      getLastName(a.name).localeCompare(getLastName(b.name)) ||
      a.name.localeCompare(b.name),
  );

  const groupedPeople = rankedPeople.reduce((acc, person) => {
    const role = (person.title || "Other").trim();
    if (!acc[role]) acc[role] = [];
    acc[role].push(person);
    return acc;
  }, {});

  const sortedRoles = Object.keys(groupedPeople).sort((a, b) => {
    return getTitleRank(a) - getTitleRank(b) || a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <p className="text-base text-[var(--text-muted)]">
        Select the team members to include in this resume package.
      </p>

      {sortedRoles.map((role) => (
        <div className="space-y-3" key={role}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {role}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {groupedPeople[role].map(({ name }) => {
              const isSelected = selectedNames.includes(name);
              return (
                <button
                  className={`flex items-center gap-4 rounded-[var(--radius-md)] border p-4 text-left transition ${
                    isSelected
                      ? "border-[var(--border-accent)] bg-[var(--bg-selected)]"
                      : "border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]"
                  }`}
                  key={name}
                  onClick={() => toggle(name)}
                  type="button"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition ${
                      isSelected
                        ? "border-[var(--border-accent-subtle)] bg-[var(--accent-main)] text-[var(--accent-text)]"
                        : "border-[var(--border-main)] bg-[var(--bg-panel)] text-[var(--text-muted)]"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-medium text-[var(--text-main)]">
                      {name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedNames.length > 0 ? (
        <p className="text-base text-[var(--text-muted)]">
          {selectedNames.length} team member
          {selectedNames.length !== 1 ? "s" : ""} selected
        </p>
      ) : null}
    </div>
  );
}
