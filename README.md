# Staff Resumes

A local-first web application for managing and generating staff resumes.

## Architecture

- **Frontend**: React + Vite
- **Backend**: Python FastAPI
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication

## Hosted Path Status

The Firebase App Hosting and Cloud Run deployment path was attempted and intentionally abandoned.

Reason:
- Firebase App Hosting is Node.js-first and was not a good fit for this Python FastAPI backend.
- Keeping the app local is simpler, more reliable, and avoids deployment and runtime mismatch issues.

This repository is now intended to be run locally from the checked-out source.

## Local Development

### Double-click start
From File Explorer, run [Start-Local.bat](/c:/Users/ben.haddon/Documents/staff-resumes/Start-Local.bat). It opens the app locally and starts both the Vite frontend and FastAPI backend.

Prerequisites:
- Node.js and npm installed
- Python installed
- `web\.env.local` filled in with Firebase web config values

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

## Environment Variables

### Frontend (`.env.local`)
- `VITE_FIREBASE_*` — Firebase config (public, baked into build)

### Backend (`.env`)
- Local runtime paths and generation settings
- Google credentials if needed for local Firebase Admin access

## Notes

- Firebase is still used by the application itself for auth, Firestore, and storage.
- What was removed is the Firebase Hosting/App Hosting and Cloud Run deployment work, not the Firebase-backed app behavior.
