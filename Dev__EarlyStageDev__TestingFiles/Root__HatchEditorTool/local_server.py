#!/usr/bin/env python3
# =============================================================================
# VALE DESIGN SUITE - LOCAL DEVELOPMENT SERVER
# =============================================================================
#
# FILE       : local_server.py
# PURPOSE    : Local HTTP server for Hatch Editor Tool development
# AUTHOR     : Generated for Vale Design Suite
# CREATED    : 2025
#
# DESCRIPTION:
# - Simple HTTP server to serve Hatch Editor Tool files
# - Prevents CORS issues during development
# - Serves static files from the project directory
# - Automatically finds available port if default port is in use
#
# USAGE:
# python local_server.py
# Then open: http://localhost:8000/index.html (or auto-detected port)
#
# =============================================================================

import http.server
import socketserver
import os
import sys
import socket
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Server Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Server Settings
# ------------------------------------------------------------
DEFAULT_PORT            = 8000                                  # <-- Default server port
PORT_RANGE_START        = 8000                                  # <-- Start of port range to search
PORT_RANGE_END          = 8010                                  # <-- End of port range to search
DIRECTORY               = "."                                   # <-- Serve current directory
SUPPORTED_EXTENSIONS    = ['.html', '.css', '.js', '.json', '.dxf', '.png', '.jpg', '.jpeg', '.gif', '.ico'] # <-- Supported file types
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Port Management Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Check if Port is Available
# ------------------------------------------------------------
def is_port_available(port):
    """Check if a port is available for binding"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(('localhost', port))                       # Try to bind to port
            return True                                          # Port is available
    except OSError:
        return False                                            # Port is in use
# ------------------------------------------------------------

# FUNCTION | Find Available Port in Range
# ------------------------------------------------------------
def find_available_port(start_port=DEFAULT_PORT, end_port=PORT_RANGE_END):
    """Find an available port in the specified range"""
    for port in range(start_port, end_port + 1):                # Check each port in range
        if is_port_available(port):                             # Check if port is available
            return port                                         # Return first available port
    return None                                                 # No available ports found
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Custom HTTP Request Handler
# -----------------------------------------------------------------------------

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with CORS headers and logging"""
    
    # FUNCTION | Add CORS Headers to All Responses
    # ------------------------------------------------------------
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')        # Allow all origins
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS') # Allow methods
        self.send_header('Access-Control-Allow-Headers', 'Content-Type') # Allow headers
        super().end_headers()
    # ------------------------------------------------------------
    
    # FUNCTION | Handle OPTIONS Requests for CORS Preflight
    # ------------------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(200)                                      # Send OK response
        self.end_headers()                                          # Add CORS headers
    # ------------------------------------------------------------
    
    # FUNCTION | Log All Requests for Debugging
    # ------------------------------------------------------------
    def log_message(self, format, *args):
        request_path = self.path.split('?')[0]                                 # <-- Get request path without query
        file_extension = Path(request_path).suffix.lower()                     # <-- Get file extension
        
        if file_extension in SUPPORTED_EXTENSIONS or request_path == '/':       # <-- Check if supported file type
            print(f"[{self.log_date_time_string()}] {format % args}")          # <-- Log with timestamp
        else:
            print(f"[{self.log_date_time_string()}] WARNING: Unsupported file type {file_extension} - {format % args}") # <-- Log warning
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Server Startup Functions
# -----------------------------------------------------------------------------

# FUNCTION | Start Local Development Server
# ------------------------------------------------------------
def start_server():
    # Change to the script's directory
    script_dir = Path(__file__).parent                          # Get script directory
    os.chdir(script_dir)                                        # Change to script directory
    
    # Find available port
    port = find_available_port()                                # Find available port
    if port is None:                                            # Check if no ports available
        print("ERROR: No available ports found in range 8000-8010") # Print error message
        print("Please close other applications using these ports and try again") # Print instructions
        return                                                  # Exit function
    
    # Create server with available port
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print("=" * 60)                                     # Print separator
            print("VALE DESIGN SUITE - HATCH EDITOR TOOL SERVER")
            print("=" * 60)                                     # Print separator
            print(f"Server running at: http://localhost:{port}") # Print server URL with actual port
            print(f"Serving directory: {os.getcwd()}")          # Print current directory
            print("=" * 60)                                     # Print separator
            print("Press Ctrl+C to stop the server")            # Print instructions
            print("=" * 60)                                     # Print separator
            
            try:
                httpd.serve_forever()                           # Start serving
            except KeyboardInterrupt:
                print("\nServer stopped by user")               # Print stop message
    except OSError as e:                                        # Handle any remaining binding errors
        print(f"ERROR: Failed to start server on port {port}: {e}") # Print error message
        print("Please try a different port or close conflicting applications") # Print instructions
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    start_server()                                                  # Start the server

# endregion ------------------------------------------------------------------- 