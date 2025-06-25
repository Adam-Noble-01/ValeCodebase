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
#
# USAGE:
# python local_server.py
# Then open: http://localhost:8000/index.html
#
# =============================================================================

import http.server
import socketserver
import os
import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Server Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Server Settings
# ------------------------------------------------------------
PORT                    = 8000                                  # <-- Server port
DIRECTORY               = "."                                   # <-- Serve current directory
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
        print(f"[{self.log_date_time_string()}] {format % args}")   # Log with timestamp
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
    
    # Create server
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print("=" * 60)                                         # Print separator
        print("VALE DESIGN SUITE - HATCH EDITOR TOOL SERVER")
        print("=" * 60)                                         # Print separator
        print(f"Server running at: http://localhost:{PORT}")    # Print server URL
        print(f"Serving directory: {os.getcwd()}")              # Print current directory
        print("=" * 60)                                         # Print separator
        print("Press Ctrl+C to stop the server")                # Print instructions
        print("=" * 60)                                         # Print separator
        
        try:
            httpd.serve_forever()                               # Start serving
        except KeyboardInterrupt:
            print("\nServer stopped by user")                   # Print stop message
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    start_server()                                                  # Start the server

# endregion ------------------------------------------------------------------- 