import { apiFetch } from './apiFetch';

const MAX_PROFILE_CACHE_ENTRIES = 5;
const profileCache = new Map();
const profileRequests = new Map();
const cacheOrder = [];

function profileUrl(staffId) {
  return `/api/people/${encodeURIComponent(staffId)}/data`;
}

async function readJson(response) {
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return payload;
}

export function getCachedStaffProfile(staffId) {
  const cached = profileCache.get(staffId) ?? null;
  if (!cached) {
    return null;
  }

  const index = cacheOrder.indexOf(staffId);
  if (index !== -1) {
    cacheOrder.splice(index, 1);
  }
  cacheOrder.push(staffId);
  return cached;
}

function setCachedStaffProfile(staffId, data) {
  profileCache.set(staffId, data);
  const existingIndex = cacheOrder.indexOf(staffId);
  if (existingIndex !== -1) {
    cacheOrder.splice(existingIndex, 1);
  }
  cacheOrder.push(staffId);

  while (cacheOrder.length > MAX_PROFILE_CACHE_ENTRIES) {
    const oldest = cacheOrder.shift();
    if (oldest) {
      profileCache.delete(oldest);
      profileRequests.delete(oldest);
    }
  }
}

export async function loadStaffProfile(staffId, { force = false } = {}) {
  if (!force) {
    const cached = getCachedStaffProfile(staffId);
    if (cached) return cached;
  }

  if (!force && profileRequests.has(staffId)) {
    return profileRequests.get(staffId);
  }

  const request = apiFetch(profileUrl(staffId))
    .then(async (response) => {
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load profile.');
      }
      setCachedStaffProfile(staffId, data);
      if (data?.name && data.name !== staffId) {
        setCachedStaffProfile(data.name, data);
      }
      if (data?.staff_id && data.staff_id !== staffId) {
        setCachedStaffProfile(data.staff_id, data);
      }
      return data;
    })
    .finally(() => {
      profileRequests.delete(staffId);
    });

  profileRequests.set(staffId, request);
  return request;
}

export async function saveStaffProfile(staffId, updates) {
  const response = await apiFetch(profileUrl(staffId), {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.detail || 'Save failed. Please try again.');
  }

  setCachedStaffProfile(staffId, data);
  if (data?.name && data.name !== staffId) {
    setCachedStaffProfile(data.name, data);
  }
  if (data?.staff_id && data.staff_id !== staffId) {
    setCachedStaffProfile(data.staff_id, data);
  }
  return data;
}
