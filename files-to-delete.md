# Files/Folders to Delete Before Deployment

Last updated: 2026-04-13

This is a proposed cleanup list for a deployment-focused copy of this repo.

## Delete Now (High Confidence)

These are not required to run either production flow (`python run_pipeline.py` or `web/`).

- `.venv/` (local virtual environment)
- `node_modules/` (root-level local Node install cache)
- `.pytest_cache/` (test cache)
- `.ruff_cache/` (linter cache)
- `pytest-cache-files-gt5xj95d/` (temp cache folder)
- `pytest-cache-files-zxu3slqk/` (temp cache folder)
- `tmp3rlz9y5k/` (temp folder)
- `tmpvx4eew4b/` (temp folder)
- `_archive/` (legacy extraction/archive material; not in active runtime path)
- `_extraction_archive/` (legacy source resumes/prompts archive; not in active runtime path)
- `outputs/` — existing generated artifacts (run outputs are reproducible and deployment should start clean)
- `.claude/` (local assistant tooling config)
- `long_files_report.md` (analysis artifact, not runtime)
- `NEXT_TASK_project_date_matching.md` (working note, not runtime)
- `blackline-style-guide-lean.md` (reference note, not runtime)
- `test_export.yaml` (empty file)

## Confirm Before Deleting (Depends on Deployment Scope)

These can be removed **if** your deployment target does not need that capability.

- `tests/`
  - Keep if you want on-server smoke/regression checks (`pytest`) before/after deploy.
  - Delete if deployment image should be runtime-only.

- `match-review-tool/` - DELETE
  - Keep if your team will continue human review/correction workflow for project-date matching.
  - Delete if this deployment only needs resume generation and not match reconciliation UI.

- `scripts/export_ipr_sheets_to_csv.py` - DELETE
  - Keep if you still export workbook sheets as part of operations.
  - Delete if this script is no longer part of deployment runbooks.

- `tests/` - DELETE
  - Keep only if you want local regression/smoke coverage inside this repo.
  - Delete if this copy is intended to be runtime-only.

- `package.json` - DELETE
  - Root-level convenience wrapper for `web/` scripts, not required for runtime deployment.

- `package-lock.json` - DELETE
  - Companion lockfile for the root convenience wrapper, not required for runtime deployment.

- `TECHNICAL_OVERVIEW.md` - DELETE
  - Keep for maintainer docs.
  - Delete only if you want a minimal runtime bundle and move docs elsewhere.

- `deployment_plan.md` - KEEP
  - Keep if this repo copy is the active deployment workstream.
  - Delete after rollout if you maintain plans externally.

## Do Not Delete (Needed for Deployment Runtime)

- `src/`
- `web/`
- `data/` (or replacement shared data source configured via env)
- `templates/`
- `public/`
- `requirements.txt`
- `web/requirements.txt`
- `web/package.json`
- `web/package-lock.json`
- `run_pipeline.py`
- `README.md`
- `Makefile` (optional but useful for consistent commands)
- `pytest.ini` (harmless; useful if tests are retained)
- `.gitignore`
- `package.json` and `package-lock.json` at repo root (currently lightweight; verify they remain relevant to your deployment process before retaining)

## Suggested Deletion Order (when you approve)

1. Remove cache/temp/local-env folders.
2. Remove legacy archives.
3. Remove generated outputs.
4. Remove optional docs/tools you decide not to ship.

## Validation Checklist (After Deletion)

After running deletions, verify:

- [ ] `python run_pipeline.py` executes successfully
- [ ] `web/` dev server starts (`npm run dev`)
- [ ] All required templates are intact and accessible
- [ ] Shared data source access works (via env variable or local path)
- [ ] No broken imports or missing dependencies in remaining code

## Notes

- This file is a planning artifact only; no deletions have been run yet.
- Once you approve this list, deletions can be executed in one pass and the repo contents re-validated.
