# =============================================================================
# PEN & WASH WATERCOLOR EFFECTS - LOCAL DEVELOPMENT SERVER
# =============================================================================
#
# FILE       : server.py
# NAMESPACE  : PenWashWatercolorEffects
# MODULE     : HTTP Server
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Simple HTTP server for local development and testing
# CREATED    : 2025
#
# DESCRIPTION:
# - Simple Python HTTP server for serving static files
# - Serves HTML, JavaScript, GLSL, and asset files
# - Enables local development without CORS issues
# - Uses Python's built-in http.server module
#
# =============================================================================

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

# -----------------------------------------------------------------------------
# REGION | Server Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Server Configuration
# ------------------------------------------------------------
SERVER_PORT             = 8055                                           # <-- Development server port
SERVER_HOST             = '127.0.0.1'                                    # <-- Localhost binding
DEFAULT_FILE            = 'Babylon__TestingEnvironment__.html'          # <-- Default file to serve
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Custom Request Handler
# -----------------------------------------------------------------------------

# CLASS | Custom HTTP Request Handler
# ------------------------------------------------------------
class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom request handler with default file support"""
    
    # SUB FUNCTION | Handle Directory Requests
    # ---------------------------------------------------------------
    def end_headers(self):
        """Add CORS headers for local development"""
        self.send_header('Access-Control-Allow-Origin', '*')             # <-- Allow CORS for local dev
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')  # <-- Allow GET and OPTIONS
        self.send_header('Access-Control-Allow-Headers', '*')            # <-- Allow all headers
        super().end_headers()                                            # <-- Call parent method
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Handle Directory Requests
    # ---------------------------------------------------------------
    def do_GET(self):
        """Handle GET requests with default file support"""
        if self.path == '/' or self.path == '':                          # <-- Check if root path
            self.path = '/' + DEFAULT_FILE                                # <-- Set default file path
        
        return super().do_GET()                                          # <-- Call parent GET handler
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Log Request
    # ---------------------------------------------------------------
    def log_message(self, format, *args):
        """Custom log message format"""
        print(f' [REQUEST] {args[0]} - {args[1]}')                      # <-- Log request details
    # ---------------------------------------------------------------
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Server Initialization
# -----------------------------------------------------------------------------

# FUNCTION | Start HTTP Server
# ------------------------------------------------------------
def start_server():
    """Start the HTTP development server"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))         # <-- Get script directory
        os.chdir(script_dir)                                             # <-- Change to script directory
        
        server_address = (SERVER_HOST, SERVER_PORT)                     # <-- Create server address tuple
        httpd = HTTPServer(server_address, CustomHTTPRequestHandler)    # <-- Create HTTP server instance
        
        print('=' * 77)
        print(' PEN & WASH WATERCOLOR EFFECTS - HTTP DEVELOPMENT SERVER')
        print('=' * 77)
        print()
        print(f' Server running at: http://{SERVER_HOST}:{SERVER_PORT}')
        print(f' Default file: {DEFAULT_FILE}')
        print(f' Press Ctrl+C to stop the server')
        print()
        print('=' * 77)
        print()
        
        httpd.serve_forever()                                            # <-- Start serving requests
        
    except OSError as e:
        if e.errno == 10048 or 'Address already in use' in str(e):      # <-- Port already in use
            print()
            print('=' * 77)
            print(' ERROR - PORT ALREADY IN USE')
            print('=' * 77)
            print()
            print(f' Port {SERVER_PORT} is already in use.')
            print(f' Please close the application using port {SERVER_PORT}')
            print(f' or change SERVER_PORT in server.py to a different port.')
            print()
            print('=' * 77)
        else:
            print()
            print('=' * 77)
            print(' ERROR - SERVER STARTUP FAILED')
            print('=' * 77)
            print()
            print(f' Error: {str(e)}')
            print()
            print('=' * 77)
        sys.exit(1)                                                      # <-- Exit with error code
        
    except KeyboardInterrupt:
        print()
        print(' [INFO] Server stopped by user')                         # <-- Log stop message
        if 'httpd' in locals():
            httpd.shutdown()                                             # <-- Shutdown server gracefully
            
    except Exception as e:
        print()
        print('=' * 77)
        print(' ERROR - UNEXPECTED ERROR')
        print('=' * 77)
        print()
        print(f' Error: {str(e)}')
        print()
        print('=' * 77)
        sys.exit(1)                                                      # <-- Exit with error code
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

# MAIN | Start Server
# ------------------------------------------------------------
if __name__ == '__main__':
    start_server()                                                       # <-- Start HTTP server
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

