# Staff Resumes

A web application for managing and generating staff resumes with Firebase and Cloud Run.

## Architecture

- **Frontend**: React + Vite (served via Firebase Hosting)
- **Backend**: Python FastAPI (served via Google Cloud Run)
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication

## Deployment

### Important: Firebase App Hosting ≠ Python Support

**Firebase App Hosting currently supports Node.js apps only.** Do not attempt to deploy a Python backend directly via Firebase App Hosting — it will fail with container startup errors trying to run `node index.js`.

Your Python FastAPI backend is deployed via **Cloud Run** (a separate Google Cloud product), which Firebase Hosting can proxy to via the rewrite rules in `firebase.json`.

### Setup for Production

1. **Ensure Blaze plan**: Firebase Console → Project Settings. Cloud Run integration requires a billing-enabled Blaze plan.

2. **Set up Artifact Registry** (for Cloud Build):
   ```bash
   gcloud artifacts repositories create cloud-run-repo \
     --repository-format=docker \
     --location=us-east4 \
     --project=staff-resumes
   ```

3. **Deploy**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```
   This builds the Docker image, pushes to Artifact Registry, and deploys to Cloud Run with the configured environment variables.

4. **Verify**:
   - Firebase Hosting serves the static React build
   - `/api/**` requests are rewritten to Cloud Run
   - Cloud Run logs show successful Python startup

## Local Development

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

### Backend (`.env.production`)
- Python-specific config (copied into Docker container at build time)
- Cloud Run injects additional vars via `--set-env-vars` in `cloudbuild.yaml`

## Architecture Decisions

- **Cloud Run over App Hosting**: Gives you full control over the Docker image and runtime. Python/FastAPI just works without fighting Firebase's Node.js-first assumptions.
- **Firebase Hosting rewrite to Cloud Run**: Clean separation — hosting serves static content, Cloud Run handles dynamic API requests.
- **Application Default Credentials**: Cloud Run uses ADC instead of checking in service account keys. Safer and easier to manage.
