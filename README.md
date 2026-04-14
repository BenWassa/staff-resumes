# staff-resumes

> Local web app for managing staff profiles and generating proposal resumes from a shared workbook. One-click startup, no cloud, fully private.

![License](https://img.shields.io/badge/license-MIT-green) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Language](https://img.shields.io/badge/language-Python-yellow) ![GitHub](https://img.shields.io/badge/GitHub-BenWassa/staff--resumes-black?logo=github)

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Requirements](#requirements)
- [Examples](#examples)
- [Contributing](#contributing)
- [Architecture](#architecture)
- [Advanced](#advanced)

## ℹ️ Project Information

- **Author:** BenWassa
- **Version:** 1.0.0
- **License:** MIT
- **Repository:** [https://github.com/BenWassa/staff-resumes](https://github.com/BenWassa/staff-resumes)

## Features

- 🎯 **Local-only processing** — All data stays on your machine. No cloud uploads, no external dependencies
- 🖥️ **Web-based UI** — Intuitive home dashboard for managing staff profiles and generating resumes
- 📊 **Excel-driven** — Centralized workbook sync and data-driven resume generation
- 📝 **Template-based** — Generates professional `.docx` resumes from customizable templates
- ⚡ **One-click startup** — Windows launcher handles all setup and dependency installation
- 🔒 **Privacy-first** — No database, no telemetry—complete control over your data

## Installation

For detailed step-by-step setup instructions, see [SETUP-GUIDE.md](SETUP-GUIDE.md).

### Quick Start (Windows)

1. Download the repository:
   [`https://github.com/BenWassa/staff-resumes/archive/refs/heads/main.zip`](https://github.com/BenWassa/staff-resumes/archive/refs/heads/main.zip)
2. Extract the ZIP to your desired location (e.g., `C:\Users\YourName\Documents\staff-resumes`)
3. Double-click `Start-Local.bat` in the extracted folder
4. Wait while dependencies install (2–3 minutes on first run)
5. Your browser will automatically open to the application at `http://localhost:5174`

## Usage

### Web Interface

1. Start the application with `Start-Local.bat`
2. Your browser will open to `http://localhost:5174`
3. On first run, configure your Projects folder in the setup wizard
4. Use the home dashboard to manage staff profiles and sync data
5. Generate resumes directly from the web UI

## Requirements

- **Python 3.8+**
- **Node.js 18+ (LTS recommended)**
- **Windows 10+** (launcher scripts require PowerShell)

## Examples

1. Launch the app: `Start-Local.bat`
2. Configure your Projects folder when prompted
3. Add or edit staff profiles in the web interface
4. Review synced pursuit data
5. Generate `.docx` proposal resumes with a single click
6. Access generated files in the local output folder

## Contributing

This project is maintained by a single developer. For feature requests, bug reports, or general support, please reach out via Teams. All contributions and feedback are welcome—message directly to discuss any changes or improvements.

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

---

## Advanced

### Command Line Interface

#### Development Commands

```bash
npm run dev          # Start both API (8012) and UI (5174)
npm run dev:api      # Start API only (port 8012)
npm run dev:client   # Start UI only (port 5174)
npm run build        # Build for production
```

#### Pipeline CLI

For direct pipeline execution without the web UI:

```bash
python run_pipeline.py
```
