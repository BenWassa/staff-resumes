# Proposal Resume Generator

This repository generates proposal-ready resume packages from a structured Excel workbook and a Word template.

The project now supports two active ways of working:

- `python run_pipeline.py` for the original CLI-driven batch flow
- a React + FastAPI UI in `web/` for package naming, team selection, project ordering, education filtering, and progress tracking

At a high level, the live workflow is:

`Excel workbook -> person/project selection -> project formatting -> Word resume generation -> consolidated package output`

## What Is Live

Live production areas:

- `src/` core Python pipeline
- `data/` workbook and config inputs
- `templates/` Word template assets
- `outputs/` generated resume packages
- `web/` FastAPI backend and React frontend
- `run_pipeline.py` CLI entry point

Archived/reference-only areas:

- `_archive/`
- `_extraction_archive/`

Those archived folders are not part of the day-to-day generation path.

## Current Flows

### CLI flow

The CLI uses fixed root-level inputs:

- workbook: `data/extraction IPR.xlsx`
- selections config: `data/selections.yaml`
- template: `templates/Proposal Resume Template.dotx`

Run it with:

```powershell
python run_pipeline.py
```

Default outputs go to:

- `outputs/individual/`
- `outputs/consolidated/consolidated_resume.docx`

### Web UI flow

The UI adds a guided 3-step workflow:

1. choose a package name, usually derived from an active/pursuit project
2. select team members from the workbook
3. configure project order and education entries per person

Generation requests are sent to the FastAPI backend, which builds an in-memory selections payload and calls the same `src.pipeline.run_pipeline()` function used by the CLI.

UI-generated outputs go to:

- `outputs/<package-slug>/individual/`
- `outputs/<package-slug>/consolidated/consolidated_resume.docx`

## Repository Structure

```text
proposal-tool-resumes/
|-- data/
|   |-- extraction IPR.xlsx
|   |-- selections.yaml
|   `-- project_date_overrides.csv
|-- outputs/
|   |-- individual/
|   |-- consolidated/
|   `-- <package-slug>/
|-- src/
|   |-- config_loader.py
|   |-- data_loader.py
|   |-- formatter.py
|   |-- pipeline.py
|   |-- project_date_matcher.py
|   |-- selector.py
|   `-- word_writer.py
|-- templates/
|   |-- Proposal Resume Template.dotx
|   `-- consolidated_resume.docx
|-- web/
|   |-- api/
|   |-- src/
|   |-- main.py
|   |-- package.json
|   `-- requirements.txt
|-- _archive/
|-- _extraction_archive/
|-- run_pipeline.py
|-- requirements.txt
|-- README.md
`-- TECHNICAL_OVERVIEW.md
```

## Data Model

### Workbook

`data/extraction IPR.xlsx` is the main source of truth.

Expected workbook patterns:

- one `{Name}_projects` sheet per person
- optional `{Name}_profile` sheet per person
- optional `{Name}_key` sheets used by the date-matching write-back workflow

Project sheets currently supply fields such as:

- `Project Key`
- `Client`
- `Project Title`
- `Full Project Description`
- `Project Order`
- optional `Start Date` and `End Date`

Profile sheets use `Field` / `Value` rows and can populate:

- first name
- last name
- title
- summary
- numbered education entries

### YAML selections

`data/selections.yaml` drives the CLI flow. It defines:

- which people to process
- which project keys to include for each person
- the order of those projects
- fallback person metadata
- which generated resumes belong in the consolidated output

## Template Expectations

`templates/Proposal Resume Template.dotx` is the active individual resume template.

The writer expects person placeholders:

- `{{PERSON_FIRST}}`
- `{{PERSON_LAST}}`
- `{{PERSON_TITLE}}`
- `{{PERSON_SUMMARY}}`

It also expects repeating block markers:

- `{{PROJECT_BLOCK_START}}` / `{{PROJECT_BLOCK_END}}`
- `{{EDU_BLOCK_START}}` / `{{EDU_BLOCK_END}}`

The current writer renders project rows using:

- `{{PROJECT_CLIENT}}`
- `{{PROJECT_TITLE}}`
- `{{PROJECT_DESCRIPTION}}`

## Project Dates

The codebase now includes two date-related behaviors:

- direct formatting of `Start Date` / `End Date` values when they already exist in the person project sheets
- enrichment of missing project dates in the web/API layer using reviewed matches from `src/project_date_matcher.py`

Supporting files:

- `outputs/project_date_matches.csv` review artifact
- `data/project_date_overrides.csv` manual overrides

The UI also reads portfolio project metadata from a separate portfolio index and master references workbook via `web/api/project_dates.py`. Those external paths are environment-specific and currently point to Ben's local Blackline directories.

## Setup

### Core Python pipeline

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Web backend

```powershell
pip install -r web\requirements.txt
```

### Web frontend

```powershell
cd web
npm install
```

## Running

### CLI

```powershell
python run_pipeline.py
```

### Web UI

From `web/`:

```powershell
npm run dev
```

This starts:

- FastAPI on `http://127.0.0.1:8002`
- Vite on `http://127.0.0.1:5174`

## Outputs

Each successful run can produce:

- one individual `.docx` file per selected person
- one consolidated `.docx` file assembled from those individual files

The consolidated document is built by merging generated resumes directly in `src/word_writer.py`. The checked-in `templates/consolidated_resume.docx` file is currently not used by that assembly step.

## Important Implementation Notes

- `Benjamin Haddon` maps to workbook sheets named `Ben Haddon_*` through `PERSON_SHEET_ALIASES`.
- The pipeline uses fixed root paths in `src/pipeline.py` for the workbook, templates, and default outputs.
- The web layer does not write `selections.yaml`; it constructs the config in memory and passes it to `run_pipeline()`.
- Education supplied explicitly by the web payload takes precedence over profile-sheet education.
- Project selection is strict: if a configured `Project Key` is missing from the workbook, the run fails.

## Known Environment Coupling

Some web and date-enrichment features depend on absolute local paths outside this repo, including:

- the portfolio index JSON used by `/api/projects`
- the master client references workbook used for date lookup and match review

That means the core CLI pipeline is portable inside this repo, but the full UI/data-enrichment experience still assumes the current local Blackline directory layout.

## Next Useful Improvements

- move from fixed root-level inputs to project-specific job folders
- make workbook/template/output paths configurable from the CLI
- replace absolute external paths with environment configuration
- document or automate the project-date review workflow end to end

## More Detail

For module-by-module architecture and runtime behavior, see `TECHNICAL_OVERVIEW.md`.
