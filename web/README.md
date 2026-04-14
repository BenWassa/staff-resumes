# Resume Generator Dashboard

The management interface for the Staff Resumes project. This application allows users to configure project pursuit folders, sync staff data, edit profiles, and launch resume generation.

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: [React](https://react.dev/) with [Vite](https://vitejs.dev/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Core Components**:
  - `App.jsx`: Main routing and layout.
  - `components/profile/`: Specialized editors for staff bios, education, and project experience.
  - `components/OnboardingScreen.jsx`: Initial configuration of the pursuits folder.
  - `pages/`: Page-level components for Home, Profile editing, and Settings.

### Backend (FastAPI)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **API Entrypoint**: `main.py`
- **Modules (`api/`)**:
  - `config_store.py`: Manages the `%APPDATA%` local configuration.
  - `local_store.py`: CRUD operations for staff, pursuits, and sessions.
  - `runner.py`: Triggers the `src/` Python pipeline to generate Word documents.
  - `workbook.py`: Logic for reading and writing Excel workbooks.

## 🚀 Getting Started

From the `web/` directory:

1. **Install Dependencies**:
   ```bash
   # npm packages
   npm install
   # Python requirements (assuming venv exists)
   .\venv\Scripts\pip install -r requirements.txt
   ```

2. **Run Everything**:
   ```bash
   npm run dev
   ```
   Starts the API on [http://localhost:8012](http://localhost:8012) and the frontend on [http://localhost:5174](http://localhost:5174).

## 💻 Available Scripts

- `npm run dev`: Full stack development (UI + API).
- `npm run dev:api`: Run only the FastAPI backend with hot reload.
- `npm run dev:client`: Run only the Vite frontend.
- `npm run build`: Production build of the React app into `dist/`.
- `npm run lint`: Run ESLint to check for code style issues.

## 📁 Key Files

- `index.html`: Main HTML template for the SPA.
- `main.py`: FastAPI server logic.
- `src/utils/apiFetch.js`: Base utility for communicating with the local backend.
- `vite.config.js`: Configuration for the Vite build system.
- `tailwind.config.js`: Tailwind configuration for styling.
