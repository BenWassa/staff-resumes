# Staff Resumes 🚀

A local-only web application and processing pipeline for managing staff profiles and generating high-quality proposal resumes from a central global workbook.

## Project Structure

- **`src/`**: Core Python logic for the resume generation pipeline.
  - `pipeline.py`: Main execution flow.
  - `word_writer.py`: Handles `.docx` generation using templates.
  - `data_loader.py` & `global_workbook.py`: Excel/Data processing.
- **`web/`**: FastAPI backend and React (Vite) frontend for the visual management interface.
- **`scripts/`**: Utility scripts for workbook management (splitting/building).
- **`templates/`**: Word `.dotx` templates used for generation.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI (Uvicorn)
- **Data Pipeline**: Python-driven Excel and Word automation
- **Storage**: Local JSON files in `%APPDATA%/ResumeGenerator/`
- **Output**: Generates `.docx` files in a local directory served by the API

## Getting Started

### 1. Simple Start (Windows Launcher)
From File Explorer, run [Start-Local.bat](Start-Local.bat). This script:
1. Checks for Python and Node.js.
2. Sets up a Python virtual environment (`web/venv`) and installs `requirements.txt`.
3. Sets up npm dependencies in the `web/` folder.
4. Launches both the API and the UI automatically.

### 2. Manual Development
If you prefer running components separately:

#### Backend + Frontend (Root)
```bash
npm run dev
```
Runs the FastAPI backend on `http://localhost:8012` and the Vite frontend on `http://localhost:5174`.

#### Pipeline CLI
To run the processing pipeline directly without the web UI:
```bash
python run_pipeline.py
```

## Local State & Configuration

The application stores all persistent user data under `%APPDATA%/ResumeGenerator/`:

- `config.json`: Path to the required pursuits folder.
- `data/staff.json`: Local profile overrides (bio, project experience, etc.).
- `data/pursuits.json`: Synced pursuit data.
- `data/sessions.json`: Saved resume generation sessions.
- `outputs/`: Generated documents.

## Development Notes

- **Template customization**: Edit the files in `templates/` to change the look of generated resumes.
- **Workbook Sync**: The `web/` interface allows you to sync and edit data, which is then used by the `src/` pipeline to generate documents.
- **No Database**: All data is local to your machine to ensure privacy and speed.
