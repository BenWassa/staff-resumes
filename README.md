# Staff Resumes

A local-only web application for managing staff profiles and generating proposal resumes.

## Architecture

- **Frontend**: React + Vite
- **Backend**: Python FastAPI
- **Storage**: Local JSON files in the machine-specific app data folder
- **Downloads**: Local output folder served by the API

## Local Development

### Double-click start
From File Explorer, run [Start-Local.bat](/c:/Users/ben.haddon/Documents/staff-resumes/Start-Local.bat). It opens the app locally and starts both the Vite frontend and FastAPI backend.

Prerequisites:
- Node.js and npm installed
- Python installed
- The local pursuits folder configured in the Setup Wizard on first run

On first run, the launcher will create `web\venv`, install Python dependencies, and install npm packages under `web`.

### Frontend
```bash
npm --prefix web run dev:client
```
Runs on `http://localhost:5174`

### Backend + Frontend
```bash
npm --prefix web run dev
```
Runs backend on `http://localhost:8002` and frontend on `http://localhost:5174`

Convenience from repo root:
```bash
npm run dev
```

## Local State

The app stores its data under `%APPDATA%/ResumeGenerator/`:

- `config.json` for the configured pursuits folder
- `data/staff.json` for local profile overrides
- `data/pursuits.json` for pursuits
- `data/sessions.json` for saved resume sessions
- `outputs/<job-id>/` for generated documents

## Notes

- There is no login screen or cloud backend.
- Staff profiles are seeded from the workbook and then overridden locally when you edit them.
- Resume downloads are served directly from the local API as files on disk.
