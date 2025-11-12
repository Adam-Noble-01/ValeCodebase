# =============================================================================
# WHITECARDOPEDIA - FLASK API SERVER
# =============================================================================
#
# FILE       : server.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Flask API Server
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Flask API server for localhost project editing capabilities
# CREATED    : 2025
#
# DESCRIPTION:
# - Comprehensive Flask API server for Whitecardopedia development
# - Provides endpoints for reading and writing project.json files
# - Enables Project Editor tool functionality on localhost
# - Serves static files from application directory
# - Implements CORS for local development
# - Uses bundled Flask dependencies from ThirdParty__VersionLockedDependencies
#
# API ENDPOINTS:
# - GET  /api/check-localhost     : Localhost detection endpoint
# - GET  /api/refresh-status      : Get refresh counter for client polling
# - GET  /api/projects            : List all projects from masterConfig.json
# - GET  /api/projects/discover   : Discover all project folders by scanning filesystem
# - GET  /api/projects/<folder>   : Get specific project.json data
# - POST /api/projects/<folder>   : Save updated project.json data
#
# CONSOLE COMMANDS:
# - --refresh / --Refresh         : Trigger refresh signal to all active clients
# - --reboot / --Reboot           : Restart the Flask server process
#
# =============================================================================

import os
import sys
import json
import threading
import time
from pathlib import Path

# Add bundled Flask dependencies to Python path
BUNDLED_DEPS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies'
)
if os.path.exists(BUNDLED_DEPS_PATH):
    sys.path.insert(0, BUNDLED_DEPS_PATH)

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# -----------------------------------------------------------------------------
# REGION | Flask Application Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Server Configuration
# ------------------------------------------------------------
SERVER_PORT             = 8000                                           # <-- Development server port
SERVER_HOST             = '127.0.0.1'                                    # <-- Localhost binding
PROJECTS_BASE_PATH      = 'Projects/2025'                                # <-- Projects directory path
MASTER_CONFIG_PATH      = 'src/data/masterConfig.json'                   # <-- Master config file path
REFRESH_COUNTER         = 0                                              # <-- Refresh counter for clients
# ------------------------------------------------------------


# INITIALIZATION | Create Flask Application
# ------------------------------------------------------------
app = Flask(__name__, static_folder='.')                                 # <-- Create Flask app instance
CORS(app)                                                                # <-- Enable CORS for all routes
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Helper Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Get Absolute Path for Project File
# ------------------------------------------------------------
def get_project_path(folder_id):
    """Construct absolute path to project folder"""
    base_dir = os.path.dirname(os.path.abspath(__file__))               # <-- Get server directory
    project_path = os.path.join(base_dir, PROJECTS_BASE_PATH, folder_id) # <-- Build project path
    return project_path                                                  # <-- Return absolute path
# ------------------------------------------------------------


# HELPER FUNCTION | Validate JSON Structure for Project Data
# ------------------------------------------------------------
def validate_project_json(data):
    """Validate that project JSON has required fields"""
    required_fields = ['projectName', 'projectCode']                     # <-- Required top-level fields
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"             # <-- Return validation error
    
    return True, None                                                    # <-- Validation passed
# ------------------------------------------------------------


# HELPER FUNCTION | Trigger Client Refresh
# ------------------------------------------------------------
def trigger_refresh():
    """Increment refresh counter to signal clients to refresh"""
    global REFRESH_COUNTER
    REFRESH_COUNTER += 1                                                 # <-- Increment refresh counter
    print(f' [REFRESH] Refresh signal sent to all clients (counter: {REFRESH_COUNTER})')
# ------------------------------------------------------------


# HELPER FUNCTION | Reboot Server Process
# ------------------------------------------------------------
def reboot_server():
    """Restart the Flask server by re-executing the Python process"""
    print(' [REBOOT] Restarting server...')
    print()
    
    # Get current Python executable and script path
    python_executable = sys.executable                                    # <-- Get Python interpreter path
    script_path = os.path.abspath(__file__)                              # <-- Get current script path
    
    # Re-execute the script with same arguments
    os.execv(python_executable, [python_executable, script_path] + sys.argv[1:])
# ------------------------------------------------------------


# HELPER FUNCTION | Get Project Folders Blacklist from Config
# ------------------------------------------------------------
def get_project_blacklist():
    """Load project folders blacklist from masterConfig.json"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))            # <-- Get server directory
        config_path = os.path.join(base_dir, MASTER_CONFIG_PATH)         # <-- Build config path
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)                                        # <-- Load master config
        
        return config.get('projectFoldersBlacklist', [])                 # <-- Return blacklist array
    except Exception:
        return []                                                         # <-- Return empty list on error
# ------------------------------------------------------------


# HELPER FUNCTION | Discover All Project Folders Recursively
# ------------------------------------------------------------
def discover_project_folders():
    """Recursively scan Projects/2025 directory for all project.json files"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))            # <-- Get server directory
        projects_path = os.path.join(base_dir, PROJECTS_BASE_PATH)       # <-- Build projects path
        
        if not os.path.exists(projects_path):                            # <-- Check if projects directory exists
            return []                                                     # <-- Return empty list if not found
        
        blacklist = get_project_blacklist()                              # <-- Get blacklist from config
        discovered_folders = []                                           # <-- Initialize folder list
        
        # Recursively find all project.json files
        for root, dirs, files in os.walk(projects_path):                 # <-- Walk directory tree
            if 'project.json' in files:                                  # <-- Check if project.json exists
                # Get relative path from Projects/2025
                rel_path = os.path.relpath(root, projects_path)           # <-- Get relative folder path
                
                # Extract folder name (handle nested paths)
                folder_name = rel_path.replace(os.sep, '/')              # <-- Normalize path separators
                
                # Check if folder is blacklisted
                if folder_name not in blacklist:                         # <-- Skip blacklisted folders
                    discovered_folders.append(folder_name)               # <-- Add to discovered list
        
        return sorted(discovered_folders)                                 # <-- Return sorted folder list
        
    except Exception as e:
        print(f' [ERROR] Error discovering project folders: {str(e)}')   # <-- Log discovery error
        return []                                                         # <-- Return empty list on error
# ------------------------------------------------------------


# HELPER FUNCTION | Console Command Handler Thread
# ------------------------------------------------------------
def console_command_handler():
    """Handle console input commands in separate thread"""
    while True:
        try:
            command = input().strip()                                     # <-- Read console input
            command_lower = command.lower()                               # <-- Normalize to lowercase
            
            # Check for refresh commands
            if command_lower == '--refresh':
                trigger_refresh()                                         # <-- Trigger client refresh
            
            # Check for reboot commands
            elif command_lower == '--reboot':
                reboot_server()                                           # <-- Restart server
            
        except (EOFError, KeyboardInterrupt):
            break                                                         # <-- Exit on EOF or interrupt
        except Exception as e:
            print(f' [ERROR] Console command error: {str(e)}')            # <-- Log errors
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | API Endpoints
# -----------------------------------------------------------------------------

# API ENDPOINT | Check Localhost Status
# ------------------------------------------------------------
@app.route('/api/check-localhost', methods=['GET'])
def check_localhost():
    """Endpoint for detecting localhost environment"""
    return jsonify({
        'isLocalhost': True,                                             # <-- Confirm localhost status
        'message': 'Server running on localhost'                         # <-- Status message
    })
# ------------------------------------------------------------


# API ENDPOINT | Get Refresh Status
# ------------------------------------------------------------
@app.route('/api/refresh-status', methods=['GET'])
def get_refresh_status():
    """Get current refresh counter for client polling"""
    global REFRESH_COUNTER
    return jsonify({
        'refreshCounter': REFRESH_COUNTER,                               # <-- Current refresh counter value
        'timestamp': time.time()                                         # <-- Current timestamp
    })
# ------------------------------------------------------------


# API ENDPOINT | List All Projects
# ------------------------------------------------------------
@app.route('/api/projects', methods=['GET'])
def list_projects():
    """Get list of all projects from masterConfig.json"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))            # <-- Get server directory
        config_path = os.path.join(base_dir, MASTER_CONFIG_PATH)         # <-- Build config path
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)                                        # <-- Load master config
        
        return jsonify(config)                                           # <-- Return config JSON
        
    except FileNotFoundError:
        return jsonify({
            'error': 'Master config file not found'                      # <-- File not found error
        }), 404
        
    except json.JSONDecodeError:
        return jsonify({
            'error': 'Invalid JSON in master config'                     # <-- JSON parse error
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'                           # <-- Generic error
        }), 500
# ------------------------------------------------------------


# API ENDPOINT | Get Specific Project Data
# ------------------------------------------------------------
@app.route('/api/projects/<folder_id>', methods=['GET'])
def get_project(folder_id):
    """Get specific project.json data by folder ID"""
    try:
        project_path = get_project_path(folder_id)                       # <-- Get project directory
        json_path = os.path.join(project_path, 'project.json')           # <-- Build JSON file path
        
        if not os.path.exists(json_path):
            return jsonify({
                'error': f'Project not found: {folder_id}'               # <-- Project not found
            }), 404
        
        with open(json_path, 'r', encoding='utf-8') as f:
            project_data = json.load(f)                                  # <-- Load project JSON
        
        return jsonify(project_data)                                     # <-- Return project data
        
    except json.JSONDecodeError:
        return jsonify({
            'error': f'Invalid JSON in project: {folder_id}'             # <-- JSON parse error
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'                           # <-- Generic error
        }), 500
# ------------------------------------------------------------


# API ENDPOINT | Save Updated Project Data
# ------------------------------------------------------------
@app.route('/api/projects/<folder_id>', methods=['POST'])
def save_project(folder_id):
    """Save updated project.json data"""
    try:
        project_data = request.get_json()                                # <-- Get JSON from request body
        
        if not project_data:
            return jsonify({
                'error': 'No data provided'                              # <-- Missing request data
            }), 400
        
        # VALIDATE JSON STRUCTURE
        is_valid, error_message = validate_project_json(project_data)    # <-- Validate structure
        if not is_valid:
            return jsonify({
                'error': error_message                                   # <-- Validation failed
            }), 400
        
        # GET PROJECT PATH AND VERIFY IT EXISTS
        project_path = get_project_path(folder_id)                       # <-- Get project directory
        json_path = os.path.join(project_path, 'project.json')           # <-- Build JSON file path
        
        if not os.path.exists(project_path):
            return jsonify({
                'error': f'Project folder not found: {folder_id}'        # <-- Folder doesn't exist
            }), 404
        
        # WRITE UPDATED JSON TO FILE
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(project_data, f, indent=4, ensure_ascii=False)     # <-- Write formatted JSON
        
        return jsonify({
            'success': True,                                             # <-- Success flag
            'message': f'Project {folder_id} saved successfully'         # <-- Success message
        })
        
    except json.JSONDecodeError:
        return jsonify({
            'error': 'Invalid JSON data provided'                        # <-- Invalid JSON in request
        }), 400
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'                           # <-- Generic error
        }), 500
# ------------------------------------------------------------


# API ENDPOINT | Discover All Project Folders
# ------------------------------------------------------------
@app.route('/api/projects/discover', methods=['GET'])
def discover_projects():
    """Discover all project folders by recursively scanning for project.json files"""
    try:
        folders = discover_project_folders()                             # <-- Discover project folders
        
        return jsonify({
            'folders': folders,                                          # <-- Return discovered folder list
            'count': len(folders)                                        # <-- Return folder count
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Server error discovering projects: {str(e)}'     # <-- Generic error
        }), 500
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Static File Serving
# -----------------------------------------------------------------------------

# ROUTE HANDLER | Serve Static Files
# ------------------------------------------------------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from application directory"""
    if path == '' or path == '/':
        path = 'index.html'                                              # <-- Default to index.html
    
    base_dir = os.path.dirname(os.path.abspath(__file__))                # <-- Get server directory
    file_path = os.path.join(base_dir, path)                             # <-- Build file path
    
    if os.path.isfile(file_path):
        return send_from_directory(base_dir, path)                       # <-- Serve file
    else:
        return send_from_directory(base_dir, 'index.html')               # <-- Fallback to index
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Server Initialization
# -----------------------------------------------------------------------------

# MAIN | Start Flask Development Server
# ------------------------------------------------------------
if __name__ == '__main__':
    print('=' * 77)
    print(' WHITECARDOPEDIA - FLASK DEVELOPMENT SERVER')
    print('=' * 77)
    print()
    print(f' Server running at: http://{SERVER_HOST}:{SERVER_PORT}')
    print(f' Press Ctrl+C to stop the server')
    print()
    print(' Console Commands:')
    print('   --refresh / --Refresh  : Refresh all active clients')
    print('   --reboot / --Reboot    : Restart the server')
    print()
    print('=' * 77)
    print()
    
    # Start console command handler in background thread
    console_thread = threading.Thread(target=console_command_handler, daemon=True) # <-- Create daemon thread
    console_thread.start()                                                # <-- Start console handler
    
    app.run(
        host=SERVER_HOST,                                                # <-- Bind to localhost
        port=SERVER_PORT,                                                # <-- Use port 8000
        debug=True                                                       # <-- Enable debug mode
    )
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------
