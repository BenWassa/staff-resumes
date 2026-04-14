import { useState } from 'react';
import BioEditor from './BioEditor';
import ProjectsEditor from './ProjectsEditor';
import EducationEditor from './EducationEditor';

const TABS = ['bio', 'projects', 'education'];
const TAB_LABELS = { bio: 'Bio', projects: 'Projects', education: 'Education' };

export default function ProfileEditorTabs({ staffId, title = 'My Profile', description }) {
  const [tab, setTab] = useState('bio');

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-[var(--text-primary)]">{title}</h1>
      {description ? <p className="mb-6 text-sm text-[var(--text-muted)]">{description}</p> : null}

      <div className="mb-6 flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-[var(--blc-red)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            type="button"
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'bio' && <BioEditor staffId={staffId} />}
      {tab === 'projects' && <ProjectsEditor staffId={staffId} />}
      {tab === 'education' && <EducationEditor staffId={staffId} />}
    </div>
  );
}
