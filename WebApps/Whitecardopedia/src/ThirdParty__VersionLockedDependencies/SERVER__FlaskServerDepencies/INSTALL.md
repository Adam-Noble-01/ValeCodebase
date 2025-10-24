# Flask Server Dependencies Installation Guide

## Overview

This folder contains version-locked Flask dependencies for the Whitecardopedia development server. The Flask server enables the Project Editor tool to read and write project.json files on localhost.

---

## Installation

### Windows

Open Command Prompt or PowerShell and navigate to the Whitecardopedia directory:

```batch
cd D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia
pip install -r src\ThirdParty__VersionLockedDependencies\SERVER__FlaskServerDepencies\requirements.txt
```

### macOS / Linux

Open Terminal and navigate to the Whitecardopedia directory:

```bash
cd /path/to/WebApps/Whitecardopedia
pip3 install -r src/ThirdParty__VersionLockedDependencies/SERVER__FlaskServerDepencies/requirements.txt
```

---

## Verify Installation

To verify Flask is installed correctly:

```bash
python -c "import flask; print(flask.__version__)"
```

Expected output: `3.0.0`

---

## Running the Server

### Windows

Double-click `start_server.bat` or run from Command Prompt:

```batch
start_server.bat
```

### macOS / Linux

Make the script executable (first time only):

```bash
chmod +x start_server.sh
```

Then run:

```bash
./start_server.sh
```

---

## Dependencies

This installation includes:

- **Flask 3.0.0** - Web framework for API server
- **Flask-CORS 4.0.0** - Cross-origin resource sharing support
- **Werkzeug 3.0.1** - WSGI utility library
- **click 8.1.7** - Command-line interface creation
- **itsdangerous 2.1.2** - Data signing library
- **Jinja2 3.1.2** - Template engine
- **MarkupSafe 2.1.3** - String escaping library

All dependencies are version-locked for consistent deployment.

---

## Troubleshooting

### "pip is not recognized" (Windows)

Ensure Python is in your PATH or use:

```batch
python -m pip install -r src\ThirdParty__VersionLockedDependencies\SERVER__FlaskServerDepencies\requirements.txt
```

### Permission Denied (macOS/Linux)

Use `sudo` for system-wide installation:

```bash
sudo pip3 install -r src/ThirdParty__VersionLockedDependencies/SERVER__FlaskServerDepencies/requirements.txt
```

Or install in a virtual environment (recommended):

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r src/ThirdParty__VersionLockedDependencies/SERVER__FlaskServerDepencies/requirements.txt
```

### Port 8000 Already in Use

If port 8000 is occupied, edit `server.py` and change `SERVER_PORT = 8000` to another port.

---

## Project Editor Tool

Once Flask is installed and the server is running, the Project Editor tool will be available:

1. Launch the server using `start_server.bat` (Windows) or `start_server.sh` (macOS/Linux)
2. Open http://localhost:8000 in your browser
3. Click the hamburger menu (☰) next to the search bar in the gallery
4. Select "Project Editor" from the dropdown menu
5. Choose a project to edit its details

**Note**: The Project Editor tool is only available when running on localhost. Static web deployments will show an alert directing users to run locally.

---

## Additional Notes

- The Flask server serves all static files (HTML, CSS, JS, images) in addition to providing API endpoints
- Debug mode is enabled by default for development convenience
- Press Ctrl+C in the terminal/command prompt to stop the server
- Changes to project.json files are saved immediately when you click "Save Changes"

---

**Author**: Adam Noble - Noble Architecture  
**Created**: 2025  
**Purpose**: Enable localhost editing capabilities for Whitecardopedia

