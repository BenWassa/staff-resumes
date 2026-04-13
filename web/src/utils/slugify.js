/**
 * Matches the backend _slugify function in web/api/runner.py
 * strip → lowercase → replace non-alphanumeric sequences with '-' → strip leading/trailing '-'
 */
export function slugify(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'package'
  );
}
