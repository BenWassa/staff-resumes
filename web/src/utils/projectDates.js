export function formatProjectDateRange(project) {
  if (!project) return '';
  return (project.date_range || '').trim();
}

export function buildProjectDateRange(startDate, endDate) {
  const start = String(startDate || '').trim();
  const end = String(endDate || '').trim();

  if (start && end) return `${start} to ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return '';
}

export function formatProjectOptionLabel(project) {
  if (!project) return '';

  const client = project.short_client || project.client || '';
  const engagement = project.engagement_type || project.name || '';
  const baseLabel =
    client && engagement
      ? `${client} | ${engagement}`
      : (client || engagement || project.display_name || '').trim();

  const dateRange = formatProjectDateRange(project);

  if (!dateRange) return baseLabel;
  if (!baseLabel) return dateRange;
  return `${baseLabel} | ${dateRange}`;
}

export function getProjectDateSortValue(project) {
  const start = String(project?.start_date || '').trim();
  const end = String(project?.end_date || '').trim();
  return start || end || '';
}
