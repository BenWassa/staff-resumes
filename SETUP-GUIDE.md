# Staff Resumes — Setup Guide for New Users

This guide walks you through getting the Staff Resumes application running on your Windows computer. Even if you're not technical, you just need to follow a few simple steps.

---

## Prerequisites

Your computer needs two pieces of free software installed:
- **Python** (for the backend processing)
- **Node.js** (for the web interface)

If you already have these, **skip to step 3**.

---

## Step 1: Install Python

> ⚠️ **Admin Access Required** — You may need to ask your administrator (Ian) for permission to install software.

1. Go to [python.org](https://www.python.org/downloads/)
2. Click the large yellow **Download Python** button (it will show the latest version).
3. Run the installer.
4. **Important:** Check the box that says **"Add Python to PATH"** before clicking Install.
5. Click **Install Now** and wait for it to complete.

**To verify it worked:**
- Press `Windows Key + R`
- Type `cmd` and press Enter
- Type: `python --version`
- You should see a version number (e.g., `Python 3.12.0`)

---

## Step 2: Install Node.js

> ⚠️ **Admin Access Required** — You may need to ask your administrator (Ian) for permission to install software.

1. Go to [nodejs.org](https://nodejs.org/)
2. Click the large green **LTS** button (this is the stable version).
3. Run the installer.
4. Click through the installer with default options (just keep clicking **Next**).
5. At the end, make sure **"Automatically install the necessary tools"** is checked. Click **Install**.
6. Wait for it to complete.

**To verify it worked:**
- Press `Windows Key + R`
- Type `cmd` and press Enter
- Type: `node --version`
- You should see a version number (e.g., `v20.11.0`)

---

## Step 3: Get the Repository

Choose **one** of these options:

### Option A: Download as ZIP (recommended)
1. Open this URL in your browser:
   `https://github.com/BenWassa/staff-resumes/archive/refs/heads/main.zip`
2. Download the ZIP file.
3. Extract the ZIP file to a folder on your computer (e.g., `C:\Users\YourName\Documents\staff-resumes`).

### Option B: Clone with Git (only if you already have Git installed)
```
git clone https://github.com/BenWassa/staff-resumes.git
cd staff-resumes
```

---

## Step 4: Start the Application

1. Open **File Explorer** and navigate to the folder where you extracted/cloned the repo.
2. **Double-click `Start-Local.bat`** (it's a batch file — looks like a document with a gear icon).
3. A command window will open and start the application.
   - It will check for Python and Node.js.
   - It will install necessary dependencies (first time only — this may take 2–3 minutes).
   - You'll see messages like `"Installing web npm dependencies..."` and `"Installing Python dependencies..."`.
4. Once done, your browser will automatically open to the application at `http://localhost:5174`.

You should now see the **Staff Resumes** web interface.

---

## First Run Setup

On your first run, the application will ask you to configure your **Projects folder**. This is the folder where your pursuit data lives.

1. When prompted in the app, click **Browse** or enter your Projects folder path.
2. The app will sync your data and you're ready to go.

---

## Troubleshooting

### "Python is not installed or not on PATH"
- Go back to **Step 1** and make sure you checked **"Add Python to PATH"** during installation.
- Restart your computer after installing Python.

### "Node.js is not installed or not on PATH"
- Go back to **Step 2** and make sure the installation completed successfully.
- Restart your computer after installing Node.js.

### Ports 5174 or 8012 are already in use
- The app will warn you if these ports are busy. This means another application is using them.
- Close any other applications that might be using these ports (check if another instance of the app is running).
- Try again.

### The application doesn't open after clicking `Start-Local.bat`
- Make sure you waited at least 30 seconds for the application to start.
- Check if there are any error messages in the command window.
- Take a screenshot of any errors and share them with the team.

---

## Running the Application Again

Every time you want to use the app:
- Simply **double-click `Start-Local.bat`** in the repository folder.
- Your browser will open automatically to `http://localhost:5174`.

---

## Important Notes

- The application runs **locally only** on your computer. No data is sent to the cloud.
- You can close the command window to stop the application.
- All your data is stored in your user profile folder under `%APPDATA%\ResumeGenerator\`.

---

## Need Help?

If you run into issues:
1. Take a screenshot of any error messages.
2. Note the exact step where it failed.
3. Share this with the development team.

---

**You're all set! Enjoy using Staff Resumes.**
