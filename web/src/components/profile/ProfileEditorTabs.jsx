import { useState } from 'react';
import BioEditor from './BioEditor';
import ProjectsEditor from './ProjectsEditor';
import EducationEditor from './EducationEditor';

const TABS = ['bio', 'projects', 'education'];
const TAB_LABELS = { bio: 'Bio', projects: 'Projects', education: 'Education' };

export default function ProfileEditorTabs({ staffId, title = 'My Profile', description }) {
  const [tab, setTab] = useState('bio');

  return (
    <div className="panel-surface overflow-hidden">
      <div className="panel-header">
        <h1 className="section-title">{title}</h1>
        {description ? <p className="section-description">{description}</p> : null}
      </div>

      <div className="border-b border-[var(--border-main)] px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="app-shell-tab"
            data-active={tab === t}
            type="button"
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="px-6 py-6">
        {tab === 'bio' && <BioEditor staffId={staffId} />}
        {tab === 'projects' && <ProjectsEditor staffId={staffId} />}
        {tab === 'education' && <EducationEditor staffId={staffId} />}
      </div>
    </div>
  );
}
