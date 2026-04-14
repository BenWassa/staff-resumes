import { apiFetch } from './apiFetch';

export async function selectFolder() {
  if (typeof window !== 'undefined' && typeof window.electronAPI?.selectFolder === 'function') {
    const picked = await window.electronAPI.selectFolder();
    return picked || null;
  }

  const response = await apiFetch('/api/system/select-folder', {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Could not open folder picker.');
  }
  return data.path || null;
}
