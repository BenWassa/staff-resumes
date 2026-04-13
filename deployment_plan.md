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

## 2. Current Risks to Address
- Hardcoded or environment-coupled external paths in web/date-enrichment flows.
- Mixed setup expectations (Python + Node) are not fully standardized for non-technical users.
- Limited explicit smoke/regression checks before release.
- No documented rollback runbook.
- Potential parsing artifacts from source extraction quality edge cases.
- Source workbook location is not yet standardized to one shared team-accessible folder.

## 3. Release Readiness Criteria (Go/No-Go)
Release is allowed only if all are true:
- [ ] No absolute user-specific paths in active codepaths.
- [ ] Fresh-machine setup tested by at least 1 teammate.
- [ ] CLI smoke test passes on a known workbook/template.
- [ ] Web smoke test passes end-to-end (package name -> team selection -> generate outputs).
- [ ] Outputs verified:
  - [ ] Individual resumes generated for selected users.
  - [ ] Consolidated resume generated and opens successfully.
- [ ] Rollback procedure tested once in a dry run.
- [ ] README quickstart is accurate for both CLI and Web.

## 4. Phase 1: Configuration Hardening
- [ ] Introduce typed runtime config for all environment-specific values.
  - Suggested:
    - root `.env` for shared runtime config
    - `web/.env` for web-specific config if needed
- [ ] Replace all hardcoded external paths with config/env vars:
  - `SHARED_DATA_ROOT` — path to the shared staff data folder (e.g. each user's OneDrive folder for `_Proposal Objects\Staff Resumes`, replacing their own username automatically)
  - `PURSUITS_ROOT` — path to the pursuits folder root (same pattern: per-user OneDrive path, username resolved automatically)
- [ ] Add startup validation:
  - Fail fast with actionable errors when required paths/files are missing.
  - Print exactly which env var or config key is missing.
  - If a user sets a path that goes too deep (e.g. into a subfolder), detect and suggest the correct parent automatically.
- [ ] Keep sane defaults for repo-local paths (`data/`, `templates/`, `outputs/`) while allowing overrides.
- [ ] Pin runtime versions to avoid drift across machines:
  - Add `.python-version` (e.g. `3.11`) for Python version consistency.
  - Add `.nvmrc` (e.g. `20`) for Node version consistency.
  - These are read automatically by `pyenv` and `nvm` if installed, and document the required versions clearly in the README for users without those tools.

## 5. Phase 1A: Standardized Shared Data Source
- [ ] Define one shared source-of-truth location for staff data via `SHARED_DATA_ROOT` config key:
  - Each user's value will point to their own OneDrive path for `_Proposal Objects\Staff Resumes` — same location, different username prefix.
- [ ] Move `data\Blackline Staff Project Database.xlsm` to that shared folder.
- [ ] Update config to reference the shared workbook path via `SHARED_DATA_ROOT` for both CLI and Web flows.
- [ ] Confirm all staff who maintain resume/project records can access and edit that shared workbook.
- [ ] Document this rule in README/runbook:
  - "All production staff data updates must be made in the shared workbook in Staff Resumes."

## 6. Phase 1B: Shared Workbook Risks, Constraints, and Recommendation
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

## 7. Phase 1C: Project-Based Output Layout (Pursuits Folders)
- [ ] Reconfigure output routing to be project-first, not global repo output-first.
- [ ] For each pursuit, write outputs into that pursuit's folder via `PURSUITS_ROOT`, for example:
  - `{PURSUITS_ROOT}\HSCPOA HR - 2026047\resume-outputs`
- [ ] Standardize subfolders under `resume-outputs`:
  - `save-state`
  - `consolidated`
  - `individual`
- [ ] Keep unique run folders or timestamped filenames inside each subfolder to avoid sync collisions/conflicted copies.
- [ ] Add config keys for:
  - pursuit root path (`PURSUITS_ROOT`, selected per project)
  - output folder name default (`resume-outputs`)
  - overwrite policy (`never` by default; version/timestamp instead)
- [ ] Ensure CLI and Web use the same output resolver logic so both flows write identical structure.

## 8. Phase 2: Setup and Onboarding
- [ ] Add a one-command setup path for Windows users, e.g. `scripts/setup.ps1`:
  - create venv
  - install `requirements.txt` and `web/requirements.txt`
  - install frontend deps in `web/`
  - optionally create `.env` from `.env.example`
- [ ] Add a lightweight config check command, e.g. `python -m src.validate_config` (or equivalent script).
- [ ] Provide `.env.example` with placeholder values and comments.
- [ ] Ensure no secret or local path values are committed.

## 9. Phase 3: Quality Gates and Usage Guidance
- [ ] Define and run minimum pre-release checks:
  - `pytest`
  - CLI smoke run (`python run_pipeline.py`) against test-safe inputs
  - Web API health/startup check
- [ ] Write a short "how to use this project" guide with a working example:
  - Show exactly what good input data looks like in the workbook.
  - Show expected output for a clean run.
  - Note that incomplete or inconsistent data won't break generation but may slow down downstream proposal work.
- [ ] Keep quality gates lightweight — the goal is catching broken setup, not enforcing data perfection.

## 10. Phase 4: Packaging and Operational Runbooks
- [ ] Add convenience run scripts:
  - `scripts/run_cli.ps1`
  - `scripts/run_web.ps1`
- [ ] Document operational runbooks in `/docs` (or README sections):
  - standard start/stop
  - common failures and fixes
  - where logs/errors appear
- [ ] Define versioning approach (simple release tags recommended, e.g. `v0.4.0`).
  - Tags must be created before deployment day, not during.

## 11. Phase 5: Deployment and Rollback
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

## 12. Demo Readiness
- [ ] Prepare 2 demo datasets:
  - Golden path (clean workbook data)
  - Edge-case path (messy formatting) with expected caveats
- [ ] Demo script:
  - show configuration validation
  - run generation
  - open individual + consolidated outputs in pursuit folder structure (`resume-outputs\individual`, `resume-outputs\consolidated`)
- [ ] Be explicit about current limitations and manual review expectations for edge cases.

## 13. Ownership and Timeline
Use this as a suggested working cadence:
- Week 1:
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

## 14. Immediate Next Actions
1. Replace all hardcoded paths with `SHARED_DATA_ROOT` and `PURSUITS_ROOT` config keys; add path auto-detection and validation on startup.
2. Move `data\Blackline Staff Project Database.xlsm` to the shared Staff Resumes folder and switch code/config to read from that copy.
3. Run a concurrency check with the shared workbook: one proposal-tool run in parallel with multiple staff editing the workbook in desktop Excel.
4. Decide whether the shared `.xlsm` is viable as the live production data source or whether the tool should consume a separate published `.xlsx` copy.
5. Reconfigure outputs to pursuit-specific folders (example: `{PURSUITS_ROOT}\HSCPOA HR - 2026047\resume-outputs\{save-state|consolidated|individual}`).
6. Add `.env.example` plus config validation on startup.
7. Add `.python-version` and `.nvmrc` files to pin runtime versions.
8. Create `scripts/setup.ps1`, `scripts/run_cli.ps1`, and `scripts/run_web.ps1`.
9. Write the "how to use this project" usage guide with a working example.
10. Run fresh-machine validation with a teammate before the next demo.
