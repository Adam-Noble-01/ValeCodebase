# =============================================================================
# VALEDESIGNSUITE - PROJECT ARCHITECTURE MAPPER SERVER
# =============================================================================
#
# FILE       : LocalServer__LaunchFlaskServer.py
# NAMESPACE  : ProjectArchitectureMapper
# MODULE     : FlaskServer
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Dynamic Project Structure Visualization Server
# CREATED    : 2025
#
# DESCRIPTION:
# - Flask server for real-time project architecture visualization
# - Scans project directory structure and file dependencies
# - Provides API endpoints for graph data and project analysis
# - Serves static files for neural network visualization frontend
# - Supports multiple file types and dependency parsing
# - Real-time scanning with performance tracking
# - Configuration-driven server settings via JSON config file
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 2025 - Version 1.0.0
# - Initial Flask server implementation
# - Project structure scanning and dependency parsing
# - API endpoints for graph data and status
# - Static file serving for frontend visualization
#
# 2025 - Version 1.1.0
# - Added JSON configuration file support
# - Separated configuration from code for easier maintenance
# - Configurable logging and debug settings
# - Performance and server settings via config
#
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Import Required Modules
# -----------------------------------------------------------------------------
from flask import Flask, send_from_directory, jsonify, request
import os
import re
import json
from pathlib import Path
import time
import sys

# COMMAND | Install Dependencies
# ------------------------------------------------------------
#   pip install -r requirements.txt


# COMMAND | Launch Flask Server
# ------------------------------------------------------------
#   python "LocalServer__LaunchFlaskServer.py"


# -----------------------------------------------------------------------------
# REGION | Configuration Loading and Management
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Configuration File Paths and Defaults
# --------------------------------------------------------
CONFIG_FILE_PATH      =   Path(__file__).parent / "LocalServer__ServerConfig.json"   # <-- Configuration file path


# MODULE VARIABLES | Global Configuration Storage
# --------------------------------------------------------
server_config         =   None                                                # <-- Global configuration object


# MODULE CONSTANTS | Default Configuration Fallback
# --------------------------------------------------------
DEFAULT_CONFIG        =   {                                                   # <-- Default configuration for fallback
    "server": {
        "debug_mode": {
            "enabled": True,
            "show_reloader_messages": True,
            "use_reloader": True
        },
        "port": 5000,
        "host": "localhost",
        "server_name": "ValeDesignSuite Project Architecture Mapper Server",
        "server_url": "http://localhost:5000"
    },
    "logging": {
        "show_welcome_banner": True,
        "show_api_logs": True,
        "show_file_scans": True
    },
    "performance": {
        "scan_batch_size": 100,
        "max_file_size_mb": 10,
        "cache_results": True
    }
}


# FUNCTION | Load Server Configuration from JSON File
# --------------------------------------------------------
def load_server_configuration():
    """Load server configuration from JSON file with fallback to defaults"""
    global server_config                                                        # <-- Access global config variable
    
    try:
        if CONFIG_FILE_PATH.exists():                                           # <-- Check if config file exists
            with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as config_file:  # <-- Open config file
                loaded_config = json.load(config_file)                          # <-- Parse JSON configuration
                server_config = loaded_config                                   # <-- Store loaded configuration
                print(f"✅ Configuration loaded from: {CONFIG_FILE_PATH}")      # <-- Log successful config load
                return True                                                     # <-- Return success status
        else:
            print(f"⚠️  Config file not found: {CONFIG_FILE_PATH}")            # <-- Log missing config file
            server_config = DEFAULT_CONFIG                                     # <-- Use default configuration
            print(f"🔧 Using default configuration settings")                 # <-- Log default config usage
            return False                                                       # <-- Return fallback status
            
    except json.JSONDecodeError as e:                                           # <-- Handle JSON parsing errors
        print(f"❌ Error parsing config file: {e}")                            # <-- Log JSON error
        server_config = DEFAULT_CONFIG                                          # <-- Use default configuration
        print(f"🔧 Falling back to default configuration")                      # <-- Log fallback usage
        return False                                                            # <-- Return error status

# ---------------------------------------------------------------


# HELPER FUNCTION | Get Configuration Value with Nested Key Support
# ------------------------------------------------------------
def get_config_value(key_path, default_value=None):
    """Get configuration value using dot notation (e.g., 'server.port')"""
    global server_config                                                        # <-- Access global config variable
    
    if not server_config:                                                       # <-- Check if config is loaded
        return default_value                                                    # <-- Return default if no config
    
    keys = key_path.split('.')                                                  # <-- Split key path into components
    value = server_config                                                       # <-- Start with root config object
    
    try:
        for key in keys:                                                        # <-- Traverse each key component
            value = value[key]                                                  # <-- Navigate to nested value
        return value                                                            # <-- Return found value
    except (KeyError, TypeError):                                               # <-- Handle missing keys
        return default_value                                                    # <-- Return default on error
# ---------------------------------------------------------------


# HELPER FUNCTION | Conditional Logging Based on Configuration
# ------------------------------------------------------------
def log_message(message, log_type="general"):
    """Log message based on configuration settings"""
    show_logs = True                                                                          # <-- Default to showing logs
    
    if log_type == "api" and not get_config_value("logging.show_api_logs", True):             # <-- Check API logging setting
        return                                                                                # <-- Skip API logs if disabled
    elif log_type == "scan" and not get_config_value("logging.show_file_scans", True):        # <-- Check scan logging setting
        return                                                                                # <-- Skip scan logs if disabled
    elif log_type == "banner" and not get_config_value("logging.show_welcome_banner", True):  # <-- Check banner setting
        return                                                                                # <-- Skip banner if disabled
    
    print(message)                                                                            # <-- Print the message
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Flask Application Configuration and Setup
# -----------------------------------------------------------------------------


# FUNCTION | Initialize Flask Application with Configuration
# ------------------------------------------------------------
def initialize_flask_application():
    """Initialize Flask application with loaded configuration"""
    # Load configuration before creating Flask app
    load_server_configuration()                                                 # <-- Load server configuration
    
    # Create Flask application instance
    app = Flask(__name__)                                                       # <-- Create Flask application
    
    # Configure Flask settings from config
    debug_enabled = get_config_value("server.debug_mode.enabled", True)         # <-- Get debug mode setting
    app.config['DEBUG'] = debug_enabled                                         # <-- Set Flask debug mode
    
    return app                                                                  # <-- Return configured Flask app
# ---------------------------------------------------------------


# MODULE CONSTANTS | Server Configuration and File Extensions
# ------------------------------------------------------------
ROOT_DIR              =   Path(__file__).parent.parent.parent                  # <-- Project root directory for scanning
STATIC_DIR            =   Path(__file__).parent                                # <-- Static files directory for serving

# Supported file extensions for scanning . . .
SCAN_EXTENSIONS       =   [                                                    # <-- Supported file extensions for scanning
    '.html', '.js', '.css', '.json', '.md',                                    # <-- Web Data, files scripts and stylesheet files etc.
    '.glb', '.gltf',                                                           # <-- 3D models
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',                          # <-- Image Files
    '.ttf', '.woff', '.woff2', '.otf',                                         # <-- Font Files
    '.hdr', '.exr',                                                            # <-- HDRI Files 
    '.mp3', '.wav', '.ogg',                                                    # <-- Audio Files
    '.mp4', '.webm',                                                           # <-- Video Files
    '.skp', '.layout',                                                         # <-- SketchUp and Layout Files
    '.dwg', '.dxf',                                                            # <-- CAD Files
    '.blend',                                                                  # <-- Blender Files
    '.psd',                                                                    # <-- Photoshop Files
    '.pdf'                                                                     # <-- PDF Files
] 

# Directories to skip during scanning . . .
SKIP_DIRS             =   [
    'node_modules', 
    '.git', 
    '__pycache__', 
    '.bak', 
    '.--BAK'
    ,'.skb' 
]
 
# ---------------------------------------------------------------


# MODULE VARIABLES | Flask Application Instance
# ------------------------------------------------------------
app                   =   initialize_flask_application()                      # <-- Initialize Flask app with config
# ---------------------------------------------------------------

# MODULE VARIABLES | Current Scanning Directory
# ------------------------------------------------------------
current_scan_directory =   None                                                 # <-- Current directory being scanned
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | CORS Configuration and Request Handling
# -----------------------------------------------------------------------------

# FUNCTION | Add CORS Headers for Development Environment
# ------------------------------------------------------------
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')                    # <-- Allow all origins for development
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')  # <-- Allow required headers
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE') # <-- Allow HTTP methods
    return response                                                              # <-- Return modified response
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | File Type Detection and Classification
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Determine File Type from Extension
# ------------------------------------------------------------
def get_file_type(filename):
    """Determine file type from extension"""
    ext = Path(filename).suffix.lower()                                          # <-- Get lowercase file extension
    
    # Web files classification
    if ext == '.html': return 'html'                                             # <-- HTML files
    if ext == '.js': return 'javascript'                                         # <-- JavaScript files
    if ext == '.css': return 'css'                                               # <-- CSS stylesheets
    if ext == '.json': return 'json'                                             # <-- JSON data files
    if ext == '.md': return 'markdown'                                           # <-- Markdown documentation
    
    # Asset files classification
    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']: return 'image' # <-- Image files
    if ext in ['.glb', '.gltf']: return 'model'                                  # <-- 3D model files
    if ext in ['.ttf', '.woff', '.woff2', '.otf']: return 'font'                 # <-- Font files
    if ext in ['.hdr', '.exr']: return 'hdri'                                    # <-- HDRI environment files
    if ext in ['.mp3', '.wav', '.ogg']: return 'audio'                           # <-- Audio files
    if ext in ['.mp4', '.webm']: return 'video'                                  # <-- Video files
    
    # Design and CAD files classification
    if ext == '.skp': return 'sketchup'                                          # <-- SketchUp files
    if ext == '.layout': return 'layout'                                         # <-- Layout files
    if ext in ['.dwg', '.dxf']: return 'cad'                                     # <-- CAD files
    if ext == '.blend': return 'blender'                                         # <-- Blender files
    if ext == '.psd': return 'photoshop'                                         # <-- Photoshop files
    if ext == '.pdf': return 'pdf'                                               # <-- PDF files
    
    return 'other'                                                               # <-- Default file type
# ---------------------------------------------------------------


# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | File Dependency Parsing and Analysis
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Find File References in JSON Data Recursively
# ------------------------------------------------------------
def find_references_in_json(obj, depth=0):
    """Recursively find file references in JSON data"""
    if depth > 10:                                                              # <-- Prevent infinite recursion
        return []
    
    references = []                                                             # <-- Initialize references list
    
    if isinstance(obj, str):                                                    # <-- Check if object is string
        if re.search(r'\.(js|css|html|json|png|jpg|jpeg|gif|svg|glb|gltf|ttf|hdr|mp3|wav|skp|layout|dwg|dxf|blend|psd|pdf)', obj):  # <-- Check for file extensions
            references.append(obj)                                              # <-- Add to references list
    elif isinstance(obj, dict):                                                 # <-- Check if object is dictionary
        for value in obj.values():                                              # <-- Iterate through dictionary values
            references.extend(find_references_in_json(value, depth + 1))        # <-- Recursive call for nested data
    elif isinstance(obj, list):                                                 # <-- Check if object is list
        for item in obj:                                                        # <-- Iterate through list items
            references.extend(find_references_in_json(item, depth + 1))         # <-- Recursive call for list items
    
    return references                                                           # <-- Return found references
# ---------------------------------------------------------------

# SUB HELPER FUNCTION | Resolve File Path from Reference
# ------------------------------------------------------------
def resolve_path(base_dir, reference):
    """Resolve file path from reference"""
    if reference.startswith(('http://', 'https://', 'data:', '#')):             # <-- Skip external URLs and data URIs
        return None
    
    try:
        resolved = (base_dir / reference).resolve()                             # <-- Resolve relative path
        if resolved.exists() and resolved.is_file():                            # <-- Check if file exists
            return resolved                                                      # <-- Return resolved path
    except:
        pass                                                                     # <-- Handle resolution errors
    
    return None                                                                 # <-- Return None if resolution fails
# ---------------------------------------------------------------

# FUNCTION | Parse File Dependencies Based on File Type
# ------------------------------------------------------------
def parse_file_dependencies(file_path):
    """Parse file for dependencies"""
    dependencies = []                                                           # <-- Initialize dependencies list
    max_file_size = get_config_value("performance.max_file_size_mb", 10) * 1024 * 1024  # <-- Get max file size from config
    
    try:
        # Check file size before reading
        if file_path.stat().st_size > max_file_size:                            # <-- Check if file exceeds size limit
            log_message(f"⚠️  Skipping large file: {file_path} ({file_path.stat().st_size / 1024 / 1024:.1f}MB)", "scan")  # <-- Log large file skip
            return dependencies                                                  # <-- Return empty dependencies for large files
        
        content = file_path.read_text(encoding='utf-8', errors='ignore')        # <-- Read file content with error handling
        file_type = get_file_type(file_path.name)                               # <-- Determine file type
        
        if file_type == 'html':                                                 # <-- Parse HTML file dependencies
            # Script tags with type info
            scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', content)  # <-- Find script src attributes
            for script in scripts:                                              # <-- Process each script reference
                dependencies.append({'path': script, 'type': 'script'})         # <-- Add script dependency
            
            # Stylesheet links
            links = re.findall(r'<link[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']stylesheet["\']|<link[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\']', content)  # <-- Find stylesheet links
            for link in links:                                                  # <-- Process each stylesheet reference
                href = link[0] if link[0] else link[1]                         # <-- Extract href value
                dependencies.append({'path': href, 'type': 'stylesheet'})       # <-- Add stylesheet dependency
            
            # Images and other assets
            images = re.findall(r'<img[^>]*src=["\']([^"\']+)["\']', content)   # <-- Find image src attributes
            for img in images:                                                  # <-- Process each image reference
                dependencies.append({'path': img, 'type': 'asset'})             # <-- Add image dependency
            
        elif file_type == 'js':                                                 # <-- Parse JavaScript file dependencies
            # ES6 imports
            imports = re.findall(r'import\s+.*?from\s+["\']([^"\']+)["\']', content)  # <-- Find ES6 import statements
            for imp in imports:                                                 # <-- Process each import
                dependencies.append({'path': imp, 'type': 'import'})            # <-- Add import dependency
            
            # CommonJS requires
            requires = re.findall(r'require\s*\(["\']([^"\']+)["\']\)', content)  # <-- Find require statements
            for req in requires:                                                # <-- Process each require
                dependencies.append({'path': req, 'type': 'require'})           # <-- Add require dependency
            
            # Asset references in JavaScript
            asset_refs = re.findall(r'["\']([^"\']+\.(?:png|jpg|jpeg|gif|svg|glb|gltf|ttf|hdr|mp3|wav|json|skp|layout|dwg|dxf|blend|psd|pdf))["\']', content)  # <-- Find asset references
            for asset in asset_refs:                                            # <-- Process each asset reference
                dependencies.append({'path': asset, 'type': 'asset'})           # <-- Add asset dependency
            
        elif file_type == 'css':                                                # <-- Parse CSS file dependencies
            # CSS imports
            imports = re.findall(r'@import\s+["\']([^"\']+)["\']', content)     # <-- Find CSS import statements
            for imp in imports:                                                 # <-- Process each CSS import
                dependencies.append({'path': imp, 'type': 'import'})            # <-- Add CSS import dependency
            
            # URL references (fonts, images, etc.)
            urls = re.findall(r'url\(["\']?([^"\')\s]+)["\']?\)', content)     # <-- Find URL references
            for url in urls:                                                    # <-- Process each URL reference
                dependencies.append({'path': url, 'type': 'asset'})             # <-- Add URL dependency
            
        elif file_type == 'json':                                               # <-- Parse JSON file dependencies
            try:
                import json                                                     # <-- Import JSON module
                data = json.loads(content)                                      # <-- Parse JSON content
                refs = find_references_in_json(data)                            # <-- Find references in JSON data
                for ref in refs:                                                # <-- Process each reference
                    dependencies.append({'path': ref, 'type': 'asset'})         # <-- Add JSON reference dependency
            except:
                pass                                                            # <-- Handle JSON parsing errors
        
    except Exception as e:                                                      # <-- Handle file reading errors
        log_message(f"Warning: Cannot parse {file_path}: {e}", "scan")          # <-- Log parsing error with conditional logging
    
    return dependencies                                                         # <-- Return parsed dependencies
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Project Structure Scanning and Analysis
# -----------------------------------------------------------------------------

# SUB HELPER FUNCTION | Add Folder Hierarchy to Graph Structure
# ------------------------------------------------------------
def add_folder_hierarchy(folder_path, nodes, node_index, folder_nodes, edges, scan_directory):
    """Add folder nodes and hierarchy connections"""
    folder_path = Path(folder_path)                                             # <-- Convert to Path object
    if str(folder_path) not in node_index:                                      # <-- Check if folder already indexed
        try:
            relative_path = folder_path.relative_to(scan_directory)             # <-- Get relative path from scan directory
            node_id = len(nodes)                                                # <-- Generate unique node ID
            nodes.append({                                                      # <-- Add folder node to graph
                'id': node_id,                                                  # <-- Node identifier
                'label': str(relative_path).replace('\\', '/'),                 # <-- Normalized path label
                'type': 'folder',                                               # <-- Node type classification
                'isFolder': True                                                # <-- Folder flag for visualization
            })
            node_index[str(folder_path)] = node_id                              # <-- Index folder path to node ID
            folder_nodes.add(str(folder_path))                                  # <-- Track folder nodes
            
            # Connect to parent folder
            parent = folder_path.parent                                         # <-- Get parent folder path
            if parent != folder_path and str(parent) in node_index:             # <-- Check if parent exists and is indexed
                edges.append({                                                  # <-- Add hierarchy edge
                    'source': node_index[str(parent)],                          # <-- Parent node ID
                    'target': node_id,                                          # <-- Current node ID
                    'type': 'hierarchy'                                         # <-- Edge type classification
                })
        except ValueError:                                                      # <-- Handle path resolution errors
            pass                                                                # <-- Skip invalid paths
# ---------------------------------------------------------------

# FUNCTION | Scan Complete Project Structure and Dependencies
# ------------------------------------------------------------
def scan_project_structure(scan_directory=None):
    """Scan project directory structure including folders"""
    # Use provided directory or fall back to ROOT_DIR
    if scan_directory is None:                                                  # <-- Check if directory provided
        scan_directory = ROOT_DIR                                                # <-- Use default root directory
    else:
        scan_directory = Path(scan_directory)                                    # <-- Convert to Path object
    
    nodes = []                                                                  # <-- Initialize nodes list
    edges = []                                                                  # <-- Initialize edges list
    node_index = {}                                                             # <-- Initialize node index mapping
    folder_nodes = set()                                                        # <-- Initialize folder tracking set
    
    log_message(f"🔍 Scanning project from: {scan_directory}", "scan")                # <-- Log scan start with conditional logging
    log_message(f"📁 Root directory exists: {scan_directory.exists()}", "scan")       # <-- Verify root directory with conditional logging
    log_message(f"🎯 Looking for extensions: {SCAN_EXTENSIONS}", "scan")        # <-- Log target extensions with conditional logging
    log_message(f"⏭️  Skipping directories: {SKIP_DIRS}", "scan")              # <-- Log skip directories with conditional logging
    
    file_count = 0                                                              # <-- Initialize file counter
    batch_size = get_config_value("performance.scan_batch_size", 100)           # <-- Get batch size from config
    
    for root, dirs, files in os.walk(scan_directory):                                # <-- Walk through project directory tree
        # Remove skip directories
        original_dirs = dirs.copy()                                             # <-- Preserve original directory list
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]                      # <-- Filter out skip directories
        
        if len(original_dirs) != len(dirs):                                     # <-- Check if directories were skipped
            skipped = set(original_dirs) - set(dirs)                            # <-- Identify skipped directories
            log_message(f"⏭️  Skipping directories in {root}: {skipped}", "scan")  # <-- Log skipped directories with conditional logging
        
        # Add folder node
        root_path = Path(root)                                                  # <-- Convert root to Path object
        add_folder_hierarchy(root_path, nodes, node_index, folder_nodes, edges, scan_directory)  # <-- Add folder to graph structure
        
        for file in files:                                                      # <-- Process each file in directory
            if any(file.endswith(ext) for ext in SCAN_EXTENSIONS):              # <-- Check if file has supported extension
                file_count += 1                                                 # <-- Increment file counter
                
                # Log progress in batches
                if file_count % batch_size == 0:                                # <-- Check if batch threshold reached
                    log_message(f"📊 Processed {file_count} files...", "scan")  # <-- Log batch progress
                
                file_path = Path(root) / file                                   # <-- Create full file path
                
                try:
                    relative_path = file_path.relative_to(scan_directory)             # <-- Get relative path from root
                    
                    # Add file node
                    if str(file_path) not in node_index:                        # <-- Check if file already indexed
                        node_id = len(nodes)                                    # <-- Generate unique node ID
                        nodes.append({                                          # <-- Add file node to graph
                            'id': node_id,                                      # <-- Node identifier
                            'label': str(relative_path).replace('\\', '/'),     # <-- Normalized path label
                            'type': get_file_type(file)                         # <-- File type classification
                        })
                        node_index[str(file_path)] = node_id                    # <-- Index file path to node ID
                    
                    # Connect file to parent folder
                    if str(root_path) in node_index:                            # <-- Check if parent folder is indexed
                        edges.append({                                          # <-- Add containment edge
                            'source': node_index[str(root_path)],               # <-- Parent folder node ID
                            'target': node_index[str(file_path)],               # <-- File node ID
                            'type': 'contains'                                  # <-- Edge type classification
                        })
                    
                    # Parse dependencies with types
                    dependencies = parse_file_dependencies(file_path)           # <-- Parse file dependencies
                    for dep in dependencies:                                    # <-- Process each dependency
                        dep_path = resolve_path(file_path.parent, dep['path'])  # <-- Resolve dependency path
                        if dep_path and dep_path.exists():                      # <-- Check if dependency exists
                            try:
                                dep_relative = dep_path.relative_to(scan_directory)   # <-- Get relative dependency path
                                
                                # Add dependency node if not exists
                                if str(dep_path) not in node_index:             # <-- Check if dependency already indexed
                                    dep_id = len(nodes)                         # <-- Generate unique dependency node ID
                                    nodes.append({                              # <-- Add dependency node to graph
                                        'id': dep_id,                           # <-- Node identifier
                                        'label': str(dep_relative).replace('\\', '/'),  # <-- Normalized path label
                                        'type': get_file_type(dep_path.name)    # <-- File type classification
                                    })
                                    node_index[str(dep_path)] = dep_id          # <-- Index dependency path to node ID
                                
                                # Add edge with connection type
                                edges.append({                                  # <-- Add dependency edge
                                    'source': node_index[str(file_path)],       # <-- Source file node ID
                                    'target': node_index[str(dep_path)],        # <-- Target dependency node ID
                                    'type': dep['type']                         # <-- Use detected connection type
                                })
                            except ValueError:                                  # <-- Handle path resolution errors
                                continue                                        # <-- Skip invalid dependency paths
                except ValueError:                                              # <-- Handle file path errors
                    log_message(f"⚠️  Skipping file outside project root: {file_path}", "scan")  # <-- Log skipped file with conditional logging
                    continue                                                    # <-- Skip file outside project root
    
    log_message(f"✅ Scan complete! Found {len(nodes)} nodes ({len(folder_nodes)} folders) and {len(edges)} connections", "scan")  # <-- Log scan completion with conditional logging
    
    # Show file type breakdown
    type_counts = {}                                                            # <-- Initialize type counter
    for node in nodes:                                                          # <-- Count nodes by type
        type_counts[node['type']] = type_counts.get(node['type'], 0) + 1       # <-- Increment type counter
    
    log_message("📊 File type breakdown:", "scan")                              # <-- Log type breakdown header with conditional logging
    for file_type, count in type_counts.items():                               # <-- Display each file type count
        log_message(f"   • {file_type}: {count}", "scan")                       # <-- Log file type statistics with conditional logging
    
    # Show connection type breakdown
    connection_counts = {}                                                      # <-- Initialize connection counter
    for edge in edges:                                                          # <-- Count edges by type
        conn_type = edge.get('type', 'unknown')                                # <-- Get edge type or default
        connection_counts[conn_type] = connection_counts.get(conn_type, 0) + 1  # <-- Increment connection counter
    
    log_message("🔗 Connection type breakdown:", "scan")                        # <-- Log connection breakdown header with conditional logging
    for conn_type, count in connection_counts.items():                         # <-- Display each connection type count
        log_message(f"   • {conn_type}: {count}", "scan")                       # <-- Log connection type statistics with conditional logging
    
    return {'nodes': nodes, 'edges': edges}                                    # <-- Return graph structure data
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Flask Route Handlers and API Endpoints
# -----------------------------------------------------------------------------

# FUNCTION | Serve Main HTML Visualization Page
# ------------------------------------------------------------
@app.route('/')
def index():
    """Serve main HTML file"""
    return send_from_directory(STATIC_DIR, 'index.html')                  # <-- Serve main visualization page
# ---------------------------------------------------------------

# FUNCTION | Serve Static Files from Mapper Directory or Project Root
# ------------------------------------------------------------
@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files from mapper directory or project root"""
    # First try to serve from the mapper directory
    mapper_path = STATIC_DIR / filename                                         # <-- Check mapper directory path
    if mapper_path.exists() and mapper_path.is_file():                         # <-- Verify file exists in mapper
        return send_from_directory(STATIC_DIR, filename)                        # <-- Serve from mapper directory
    
    # Then try to serve from project root (for fonts, assets, etc.)
    project_path = ROOT_DIR / filename                                          # <-- Check project root path
    if project_path.exists() and project_path.is_file():                       # <-- Verify file exists in project
        # Get the directory and filename separately
        directory = project_path.parent                                          # <-- Extract directory path
        file_name = project_path.name                                           # <-- Extract filename
        return send_from_directory(directory, file_name)                        # <-- Serve from project directory
    
    # If not found, return 404
    return "File not found", 404                                                # <-- Return 404 error for missing files
# ---------------------------------------------------------------

# FUNCTION | Graph Data API Endpoint with Performance Tracking
# ------------------------------------------------------------
@app.route('/api/graph-data')
def get_graph_data():
    """Graph data API endpoint with performance tracking"""
    global current_scan_directory                                               # <-- Access global scan directory
    start_time = time.time()                                                    # <-- Start performance timer
    
    try:
        # Use current scan directory or ROOT_DIR
        scan_dir = current_scan_directory if current_scan_directory else ROOT_DIR  # <-- Get directory to scan
        
        log_message(f"🔄 API Request: Scanning project structure from {scan_dir}...", "api")    # <-- Log API request start with conditional logging
        graph_data = scan_project_structure(scan_dir)                           # <-- Execute project structure scan with directory
        
        scan_time = time.time() - start_time                                    # <-- Calculate scan duration
        
        # Add metadata to response
        response_data = {                                                       # <-- Prepare response data structure
            'nodes': graph_data['nodes'],                                       # <-- Include graph nodes
            'edges': graph_data['edges'],                                       # <-- Include graph edges
            'metadata': {                                                       # <-- Include metadata
                'total_nodes': len(graph_data['nodes']),                        # <-- Node count
                'total_edges': len(graph_data['edges']),                        # <-- Edge count
                'scan_time_ms': round(scan_time * 1000, 2),                     # <-- Scan duration in milliseconds
                'timestamp': time.time(),                                       # <-- Current timestamp
                'root_directory': str(scan_dir),                                # <-- Scanned directory
                'server_config': {                                              # <-- Include server configuration info
                    'debug_mode': get_config_value("server.debug_mode.enabled", True),  # <-- Debug mode status
                    'port': get_config_value("server.port", 5000),              # <-- Server port
                    'performance_settings': {                                   # <-- Performance configuration
                        'max_file_size_mb': get_config_value("performance.max_file_size_mb", 10),  # <-- Max file size
                        'scan_batch_size': get_config_value("performance.scan_batch_size", 100)    # <-- Scan batch size
                    }
                }
            }
        }
        
        log_message(f"✅ API Response: {len(graph_data['nodes'])} nodes, {len(graph_data['edges'])} edges in {scan_time:.2f}s", "api")  # <-- Log successful response with conditional logging
        return jsonify(response_data)                                           # <-- Return JSON response
        
    except Exception as e:                                                      # <-- Handle API errors
        log_message(f"❌ API Error: {str(e)}", "api")                           # <-- Log error details with conditional logging
        return jsonify({                                                        # <-- Return error response
            'error': str(e),                                                    # <-- Error message
            'nodes': [],                                                        # <-- Empty nodes list
            'edges': [],                                                        # <-- Empty edges list
            'metadata': {                                                       # <-- Error metadata
                'total_nodes': 0,                                               # <-- Zero node count
                'total_edges': 0,                                               # <-- Zero edge count
                'scan_time_ms': 0,                                              # <-- Zero scan time
                'timestamp': time.time(),                                       # <-- Current timestamp
                'error': True                                                   # <-- Error flag
            }
        }), 500                                                                 # <-- Return 500 error status
# ---------------------------------------------------------------

# FUNCTION | Force Refresh of Project Data
# ------------------------------------------------------------
@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    """Force refresh of project data"""
    log_message(f"🔄 Manual refresh requested...", "api")                       # <-- Log manual refresh request with conditional logging
    return get_graph_data()                                                     # <-- Return fresh graph data
# ---------------------------------------------------------------

# FUNCTION | Change Scan Directory
# ------------------------------------------------------------
@app.route('/api/change-directory', methods=['POST'])
def change_directory():
    """Change the directory to scan"""
    global current_scan_directory                                               # <-- Access global scan directory
    
    try:
        data = request.get_json()                                               # <-- Get JSON request data
        new_directory = data.get('directory_path', '').strip()                 # <-- Extract directory path
        
        if not new_directory:                                                   # <-- Check if directory provided
            return jsonify({                                                    # <-- Return error for empty path
                'success': False,
                'error': 'No directory path provided'
            }), 400
        
        # Convert to Path object and validate
        new_path = Path(new_directory)                                          # <-- Convert to Path object
        
        if not new_path.exists():                                               # <-- Check if directory exists
            return jsonify({                                                    # <-- Return error for non-existent path
                'success': False,
                'error': f'Directory does not exist: {new_directory}'
            }), 404
        
        if not new_path.is_dir():                                              # <-- Check if path is directory
            return jsonify({                                                    # <-- Return error for non-directory
                'success': False,
                'error': f'Path is not a directory: {new_directory}'
            }), 400
        
        # Update current scan directory
        current_scan_directory = new_path                                       # <-- Update global scan directory
        
        log_message(f"📂 Changed scan directory to: {current_scan_directory}", "api")  # <-- Log directory change
        
        return jsonify({                                                        # <-- Return success response
            'success': True,
            'path': str(current_scan_directory),
            'message': f'Successfully changed to: {current_scan_directory}'
        })
        
    except Exception as e:                                                      # <-- Handle exceptions
        log_message(f"❌ Error changing directory: {str(e)}", "api")            # <-- Log error
        return jsonify({                                                        # <-- Return error response
            'success': False,
            'error': str(e)
        }), 500
# ---------------------------------------------------------------

# FUNCTION | Get Current Directory Status
# ------------------------------------------------------------
@app.route('/api/directory-status')
def get_directory_status():
    """Get current scan directory status"""
    global current_scan_directory                                               # <-- Access global scan directory
    
    # Use current scan directory or ROOT_DIR
    active_directory = current_scan_directory if current_scan_directory else ROOT_DIR  # <-- Get active directory
    
    return jsonify({                                                            # <-- Return directory status
        'current_path': str(active_directory),                                  # <-- Current directory path
        'exists': active_directory.exists(),                                    # <-- Directory existence check
        'is_directory': active_directory.is_dir() if active_directory.exists() else False,  # <-- Directory type check
        'default_path': str(ROOT_DIR),                                          # <-- Default root directory
        'timestamp': time.time()                                                # <-- Current timestamp
    })
# ---------------------------------------------------------------

# FUNCTION | Server Status Endpoint
# ------------------------------------------------------------
@app.route('/api/status')
def get_status():
    """Server status endpoint"""
    global current_scan_directory                                               # <-- Access global scan directory
    
    # Get active scan directory
    active_directory = current_scan_directory if current_scan_directory else ROOT_DIR  # <-- Get active directory
    
    return jsonify({                                                            # <-- Return status information
        'status': 'running',                                                    # <-- Server status
        'root_directory': str(active_directory),                                # <-- Current scan directory
        'default_root_directory': str(ROOT_DIR),                               # <-- Default project root directory
        'static_directory': str(STATIC_DIR),                                    # <-- Static files directory
        'supported_extensions': SCAN_EXTENSIONS,                                # <-- Supported file extensions
        'skipped_directories': SKIP_DIRS,                                       # <-- Skipped directories
        'timestamp': time.time(),                                               # <-- Current timestamp
        'configuration': {                                                      # <-- Configuration information
            'config_file_path': str(CONFIG_FILE_PATH),                          # <-- Configuration file path
            'config_loaded': server_config is not None,                         # <-- Configuration load status
            'server_settings': {                                                # <-- Server configuration
                'debug_mode': get_config_value("server.debug_mode.enabled", True),      # <-- Debug mode
                'port': get_config_value("server.port", 5000),                  # <-- Server port
                'host': get_config_value("server.host", "localhost"),           # <-- Server host
                'server_name': get_config_value("server.server_name", "Unknown Server")  # <-- Server name
            },
            'logging_settings': {                                               # <-- Logging configuration
                'show_welcome_banner': get_config_value("logging.show_welcome_banner", True),    # <-- Banner setting
                'show_api_logs': get_config_value("logging.show_api_logs", True),        # <-- API logging setting
                'show_file_scans': get_config_value("logging.show_file_scans", True)    # <-- Scan logging setting
            },
            'performance_settings': {                                           # <-- Performance configuration
                'scan_batch_size': get_config_value("performance.scan_batch_size", 100),         # <-- Batch size
                'max_file_size_mb': get_config_value("performance.max_file_size_mb", 10),        # <-- Max file size
                'cache_results': get_config_value("performance.cache_results", True)             # <-- Cache setting
            }
        }
    })
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Application Entry Point and Server Launch
# -----------------------------------------------------------------------------

# FUNCTION | Display Server Welcome Banner with Configuration Info
# ------------------------------------------------------------
def display_welcome_banner():
    """Display server welcome banner with configuration information"""
    server_name = get_config_value("server.server_name", "ValeDesignSuite Project Architecture Mapper Server")  # <-- Get server name from config
    server_port = get_config_value("server.port", 5000)                        # <-- Get port from config
    server_host = get_config_value("server.host", "localhost")                 # <-- Get host from config
    server_url = get_config_value("server.server_url", f"http://{server_host}:{server_port}")  # <-- Get or construct server URL
    
    log_message(f'🧠 {server_name}', "banner")                                  # <-- Server title with conditional logging
    log_message('=' * 70, "banner")                                             # <-- Title separator with conditional logging
    log_message(f'📁 Serving static files from: {STATIC_DIR}', "banner")        # <-- Static directory info with conditional logging
    log_message(f'📁 Scanning project from: {ROOT_DIR}', "banner")              # <-- Project root info with conditional logging
    log_message(f'🌐 Server URL: {server_url}', "banner")                       # <-- Server URL with conditional logging
    log_message('', "banner")                                                   # <-- Empty line with conditional logging
    log_message('🎯 ValeDesignSuite Frontend Files:', "banner")                # <-- Frontend files header with conditional logging
    log_message('   • index.html       - Main visualization page', "banner")      # <-- HTML file description with conditional logging
    log_message('   • MapGraph__Stylesheet.css         - Open Sans fonts & neural styling', "banner")     # <-- CSS file description with conditional logging
    log_message('   • map_visualization.js   - D3.js neural network visualization', "banner")   # <-- JS file description with conditional logging
    log_message('   • MapGraph__DataLoader.js          - Dynamic API data loader', "banner")      # <-- Data loader description with conditional logging
    log_message('', "banner")                                                   # <-- Empty line with conditional logging
    log_message('🚀 API Endpoints:', "banner")                                  # <-- API endpoints header with conditional logging
    log_message('   • GET  /api/graph-data   - Project structure data', "banner")       # <-- Graph data endpoint with conditional logging
    log_message('   • POST /api/refresh      - Force refresh scan', "banner")   # <-- Refresh endpoint with conditional logging
    log_message('   • GET  /api/status       - Server status', "banner")        # <-- Status endpoint with conditional logging
    log_message('', "banner")                                                   # <-- Empty line with conditional logging
    log_message('🔧 Configuration:', "banner")                                  # <-- Configuration header with conditional logging
    log_message(f'   • Config file: {CONFIG_FILE_PATH.name}', "banner")         # <-- Config file name with conditional logging
    log_message(f'   • Debug mode: {get_config_value("server.debug_mode.enabled", True)}', "banner")    # <-- Debug mode status with conditional logging
    log_message(f'   • Max file size: {get_config_value("performance.max_file_size_mb", 10)}MB', "banner")  # <-- Max file size with conditional logging
    log_message(f'   • Scan batch size: {get_config_value("performance.scan_batch_size", 100)}', "banner")  # <-- Batch size with conditional logging
    log_message('', "banner")                                                   # <-- Empty line with conditional logging
    log_message('✨ Features:', "banner")                                       # <-- Features header with conditional logging
    log_message('   • Real-time project scanning', "banner")                    # <-- Real-time scanning feature with conditional logging
    log_message('   • Neural network visualization', "banner")                  # <-- Visualization feature with conditional logging
    log_message('   • Fast node interactions', "banner")                        # <-- Interaction feature with conditional logging
    log_message('   • Open Sans font integration', "banner")                    # <-- Font feature with conditional logging
    log_message('   • ValeDesignSuite styling', "banner")                       # <-- Styling feature with conditional logging
    log_message('   • JSON configuration support', "banner")                    # <-- Configuration feature with conditional logging
    log_message('', "banner")                                                   # <-- Empty line with conditional logging
    log_message('Press Ctrl+C to stop the server', "banner")                    # <-- Stop instruction with conditional logging
    log_message('', "banner")                                                   # <-- Empty line with conditional logging
# ---------------------------------------------------------------

# FUNCTION | Main Application Entry Point
# ------------------------------------------------------------
if __name__ == '__main__':
    # Display welcome banner based on configuration
    display_welcome_banner()                                                    # <-- Show server information
    
    # Get server settings from configuration
    debug_enabled = get_config_value("server.debug_mode.enabled", True)        # <-- Get debug mode from config
    use_reloader = get_config_value("server.debug_mode.use_reloader", True)    # <-- Get reloader setting from config
    server_port = get_config_value("server.port", 5000)                        # <-- Get port from config
    server_host = get_config_value("server.host", "localhost")                 # <-- Get host from config
    
    # Launch Flask server with configuration settings
    app.run(                                                                    # <-- Launch Flask development server
        debug=debug_enabled,                                                    # <-- Use debug mode from config
        port=server_port,                                                       # <-- Use port from config
        host=server_host,                                                       # <-- Use host from config
        use_reloader=use_reloader                                               # <-- Use reloader setting from config
    )
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------