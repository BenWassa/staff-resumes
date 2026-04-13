# Proposal Tool: Deployment Plan (Upgraded)

Last updated: 2026-04-13

## 1. Scope and Goals
This plan covers productionizing both active flows in this repo:
- Python CLI pipeline: `python run_pipeline.py`
- Web workflow: FastAPI backend + React frontend in `web/`

Deployment success means:
- Team members can run generation without editing code.
- Environment-specific paths are configurable (no username coupling).
- A failed release can be rolled back quickly.
- We have a clear go/no-go gate before demo and team rollout.
- Phase 0 and Phase 1 are repo-local only: no read/write operations outside this folder until explicitly approved.

## 2. Current Risks to Address
- Hardcoded or environment-coupled external paths in web/data-enrichment flows.
- Mixed setup expectations (Python + Node) are not fully standardized for non-technical users.
- Limited explicit smoke/regression checks before release.
- No documented rollback runbook.
- Potential parsing artifacts from source extraction quality edge cases.
- Source workbook location is not yet standardized to one shared team-accessible folder.

## 3. Release Readiness Criteria (Go/No-Go)
Release is allowed only if all are true:
- [ ] No absolute user-specific paths in active codepaths.
- [x] Local-safe mode verified: all resolved paths stay inside this repository root.
- [ ] Fresh-machine setup tested by at least 1 teammate.
- [ ] CLI smoke test passes on a known workbook/template.
- [ ] Web smoke test passes end-to-end (package name -> team selection -> generate outputs).
- [ ] Outputs verified:
  - [ ] Individual resumes generated for selected users.
  - [ ] Consolidated resume generated and opens successfully.
- [ ] Rollback procedure tested once in a dry run.
- [ ] README quickstart is accurate for both CLI and Web.

## 4. Phase 0: Local-Safe Guardrails (Required First)
- [x] Add a strict "repo-local mode" as the default runtime behavior.
- [ ] Add path-boundary validation:
  - [x] Reject configured paths that resolve outside the repository root while local-safe mode is enabled.
  - [x] Print a clear error that includes the attempted path and expected repo-relative location.
- [ ] Keep all active inputs/outputs inside repo-local folders only:
  - inputs under `data/`
  - templates under `templates/`
  - outputs under `outputs/` (or repo-local pursuit test folders)
- [x] Add an explicit promotion switch for later:
  - Example: `ALLOW_EXTERNAL_PATHS=false` by default.
  - External locations are blocked unless this is intentionally enabled.
- [ ] Add one safety test that proves external paths are denied in local-safe mode.

## 5. Phase 1: Configuration Hardening (Local-Only)
- [x] Introduce typed runtime config for all environment-specific values.
  - Suggested:
    - root `.env` for shared runtime config
    - `web/.env` for web-specific config if needed
- [x] Replace hardcoded paths with config/env vars, but keep defaults repo-local first:
  - `LOCAL_DATA_ROOT` (default: `./data`)
  - `LOCAL_PURSUITS_ROOT` (default: repo-local test folder)
- [ ] Defer `SHARED_DATA_ROOT` / `PURSUITS_ROOT` production wiring until promotion phase.
- [x] Add startup validation:
  - Fail fast with actionable errors when required paths/files are missing.
  - Print exactly which env var or config key is missing.
  - If a user sets a path that goes too deep (e.g. into a subfolder), detect and suggest the correct parent automatically.
- [x] Keep sane defaults for repo-local paths (`data/`, `templates/`, `outputs/`) while allowing overrides that remain inside this repo in local-safe mode.
- [ ] Pin runtime versions to avoid drift across machines:
  - [x] Add `.python-version` (e.g. `3.11`) for Python version consistency.
  - [x] Add `.nvmrc` (e.g. `20`) for Node version consistency.
  - These are read automatically by `pyenv` and `nvm` if installed, and document the required versions clearly in the README for users without those tools.

## 6. Phase 1A: Local Data Stabilization
- [x] Local split workbooks created at `data\person_workbooks\` (one `.xlsx` per person with only `{Name}_projects` + `{Name}_profile` tabs).
- [x] Split workbook exports now write to `data\person_workbooks` (not `outputs\`).
- [ ] Keep `data\Blackline Staff Project Database.xlsm` in-repo during local validation.
- [ ] Ensure both CLI and Web flows can run end-to-end against repo-local workbook inputs.
- [ ] Document temporary rule in README/runbook:
  - "During local-safe phase, all data reads/writes remain inside this repository."

## 7. Phase 1B: Shared Workbook Risks, Constraints, and Recommendation (Deferred Until Promotion)
- [ ] Treat the move to OneDrive/SharePoint as a data-access decision, not just a file-location change.
- [ ] Validate the shared workbook specifically as a macro-enabled Excel file (`.xlsm`), not just as a normal Excel workbook.
- [ ] Confirm whether Blackline staff will open/edit the workbook in desktop Excel only.
  - VBA/macros do not run in Excel for the web, so any sheet-visibility/filter behavior that depends on macros should be assumed to require the desktop app.
- [ ] Confirm whether the proposal tool only needs read access to the workbook during generation.
  - If yes, keep the tool read-only against the shared workbook and avoid any write-back behavior.
- [ ] Add a concurrency test:
  - 1 user runs the CLI or Web flow while 2-3 other users have the workbook open and are making normal data edits.
  - Verify the tool can still complete generation without file-lock, sync, or partial-read issues.
- [ ] Add a coauthoring test focused on the macro behavior:
  - multiple users edit normal data cells at the same time
  - confirm whether the sheet-hiding/filter macros interrupt coauthoring or force single-editor behavior
- [ ] Document expected operating constraints:
  - Normal data entry may be multi-user.
  - Macro/VBA edits should be treated as single-user maintenance.
  - If the workbook shows unstable coauthoring behavior, users must stop editing the macro-enabled workbook while a structural/macro change is being made.
- [ ] Decide on the production pattern after testing:
  - Preferred: shared workbook supports concurrent read access for the tool and concurrent data-entry for staff.
  - Acceptable fallback: shared workbook remains editable, but only one maintainer edits at a time.
  - Safer long-term fallback: split the process into an editable source workbook and a clean tool-consumption workbook (`.xlsx`) published from it.
- [ ] Add a go/no-go note:
  - Do not make the shared `.xlsm` the only production dependency until concurrency testing passes in the Blackline Microsoft 365 environment.

## 7A. Shared Global Workbook Pattern (Operational Decision)
- [x] Source of truth remains split person workbooks in shared Staff Resumes.
- [x] Generate a single global workbook into a protected shared subfolder, for example:
  - `...\\Staff Resumes\\_generated\\`
- [x] Write each run as a timestamped file for traceability, for example:
  - `global_resume_data_YYYY-MM-DD_HHMMSS.xlsx`
- [x] Use safe promotion flow:
  - [x] write to temp file first
  - [x] validate/openability check
  - [x] rename or copy into `global_resume_data_latest.xlsx` only after success
- [x] Cleanup policy:
  - [x] remove older generated timestamped files only after the newest run is confirmed valid
  - [x] keep a small safety buffer (recommended: keep last 1-2 prior files)
- [x] Treat generated global workbook as disposable build artifact:
  - [x] no manual edits expected
  - [x] rely on source workbooks + Microsoft 365 version history for recovery
- [ ] Permissions hardening:
  - restrict write access for generated artifact location to designated maintainers/service account when feasible
  - read access can remain broader for tool consumers

## 8. Phase 1C: Project-Based Output Layout (Repo-Local First)
- [ ] Reconfigure output routing to be project-first, not global repo output-first.
- [ ] For each pursuit, write outputs into a repo-local pursuits test root first, for example:
  - `.\pursuits_local\HSCPOA HR - 2026047\resume-outputs`
- [ ] Standardize subfolders under `resume-outputs`:
  - `save-state`
  - `consolidated`
  - `individual`
- [ ] Keep unique run folders or timestamped filenames inside each subfolder to avoid sync collisions/conflicted copies.
- [x] Add config keys for:
  - [x] local pursuit root path (`LOCAL_PURSUITS_ROOT`, selected per project)
  - [x] output folder name default (`resume-outputs`)
  - [ ] overwrite policy (`never` by default; version/timestamp instead)
- [ ] Ensure CLI and Web use the same output resolver logic so both flows write identical structure.

## 9. Phase 2: Setup and Onboarding
- [x] Add a one-command setup path for Windows users, e.g. `scripts/setup.ps1`:
  - [x] create venv
  - [x] install `requirements.txt` and `web/requirements.txt`
  - [x] install frontend deps in `web/`
  - [x] optionally create `.env` from `.env.example`
- [x] Add a lightweight config check command, e.g. `python -m src.validate_config` (or equivalent script).
- [x] Provide `.env.example` with placeholder values and comments.
- [ ] Ensure no secret or local path values are committed.

## 10. Phase 3: Quality Gates and Usage Guidance
- [ ] Define and run minimum pre-release checks:
  - `pytest`
  - [x] CLI smoke run (`python run_pipeline.py`) against test-safe inputs
  - Web API health/startup check
- [ ] Write a short "how to use this project" guide with a working example:
  - Show exactly what good input data looks like in the workbook.
  - Show expected output for a clean run.
  - Note that incomplete or inconsistent data won't break generation but may slow down downstream proposal work.
- [ ] Keep quality gates lightweight - the goal is catching broken setup, not enforcing data perfection.

## 11. Phase 4: Packaging and Operational Runbooks
- [x] Add convenience run scripts:
  - [x] `scripts/run_cli.ps1`
  - [x] `scripts/run_web.ps1`
- [ ] Document operational runbooks in `/docs` (or README sections):
  - standard start/stop
  - common failures and fixes
  - where logs/errors appear
- [ ] Define versioning approach (simple release tags recommended, e.g. `v0.4.0`).
  - Tags must be created before deployment day, not during.

## 12. Phase 5: Deployment and Rollback
Rollback means: if something breaks after a release, you revert to the previous working version (git tag) and re-run from there. Steps below.

- [ ] Deployment checklist (release day):
  - pull tagged release (e.g. `git checkout v0.4.0`)
  - run config validation
  - run smoke tests
  - execute live generation with a known "golden" package into a pursuit-specific `resume-outputs` folder
- [ ] Rollback checklist:
  - keep last known-good tag and `.env` file backed up
  - if failure occurs: `git checkout <previous-tag>`, restore `.env`, rerun smoke test
  - confirm restored service before continuing
- [ ] Test the rollback procedure once in a dry run before the first real release.

## 13. Demo Readiness
- [ ] Prepare 2 demo datasets:
  - Golden path (clean workbook data)
  - Edge-case path (messy formatting) with expected caveats
- [ ] Demo script:
  - show configuration validation
  - run generation
  - open individual + consolidated outputs in pursuit folder structure (`resume-outputs\individual`, `resume-outputs\consolidated`)
- [ ] Be explicit about current limitations and manual review expectations for edge cases.

## 14. Ownership and Timeline
Use this as a suggested working cadence:
- Week 1:
  - local-safe guardrails
  - configuration hardening
  - `.env.example`
  - startup validation
- Week 2:
  - setup scripts
  - smoke tests
  - README/runbook updates
- Week 3:
  - dry-run deployment + rollback rehearsal
  - demo rehearsal and sign-off

## 15. Immediate Next Actions (Local-Only First)
1. Add local-safe mode guardrails so any configured path outside repo root is blocked by default.
2. Replace hardcoded paths with local-first config keys (`LOCAL_DATA_ROOT`, `LOCAL_PURSUITS_ROOT`) and keep defaults inside this repo.
3. Reconfigure outputs to pursuit-specific repo-local folders (example: `.\pursuits_local\HSCPOA HR - 2026047\resume-outputs\{save-state|consolidated|individual}`).
4. Add `.env.example` plus startup config validation with clear path-boundary errors.
5. Add `.python-version` and `.nvmrc` files to pin runtime versions.
6. Create `scripts/setup.ps1`, `scripts/run_cli.ps1`, and `scripts/run_web.ps1`.
7. Run CLI + Web smoke tests entirely against repo-local data.
8. Write the "how to use this project" guide for local-safe operation.
9. Run fresh-machine validation with a teammate before the next demo.
10. After local validation passes, execute a separate Promotion Phase to enable/validate shared external paths.
11. Implement shared global workbook generation in `Staff Resumes\\_generated` with timestamped files, safe promotion to `global_resume_data_latest.xlsx`, and post-success cleanup.
