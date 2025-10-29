#!/usr/bin/env python3
# =============================================================================
# VALEDESIGNSUITE - LOCAL WEB SERVER LAUNCHER
# =============================================================================
#
# FILE       : start_server.py
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Simple HTTP server launcher for Artist Timeline Visualizer
# CREATED    : 24-Oct-2025
#
# DESCRIPTION:
# - Starts a local Python HTTP server for testing the visualization tool
# - Automatically opens the tool in the default web browser
# - Handles both Python 2 and Python 3
# - Server runs on port 8000 by default
#
# USAGE:
# - Double-click this file, or
# - Run from command line: python start_server.py
#
# =============================================================================

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

PORT = 8080                                                              # <-- Server port number
SERVER_ADDRESS = 'localhost'                                             # <-- Server address

# -----------------------------------------------------------------------------
# Main Server Logic
# -----------------------------------------------------------------------------

def start_server():
    """Start the HTTP server and open the visualization tool in browser"""
    
    # Change to the repository root directory
    # This script is in WebApps/Whitecardopedia/Prototypes__ToolTesting__EarlyStage/Prototypes__ToolTesting__EarlyStage/
    # We need to go up to the repository root to serve files correctly
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent.parent.parent                   # <-- Navigate to repository root (4 levels up)
    os.chdir(repo_root)
    
    print("=" * 77)
    print("VALE DESIGN SUITE - ARTIST TIMELINE VISUALIZER")
    print("=" * 77)
    print()
    print(f"Starting HTTP server at http://{SERVER_ADDRESS}:{PORT}")
    print(f"Serving from: {repo_root}")
    print()
    print("The visualization tool will open in your default browser...")
    print()
    print("Press CTRL+C to stop the server")
    print("=" * 77)
    print()
    
    # Construct the URL to the visualization tool
    tool_path = "WebApps/Whitecardopedia/Prototypes__ToolTesting__EarlyStage/Prototypes__ToolTesting__EarlyStage/index.html"
    url = f"http://{SERVER_ADDRESS}:{PORT}/{tool_path}"
    
    # Create the HTTP server
    Handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            # Open the browser after a short delay
            print(f"Opening browser to: {url}")
            print()
            webbrowser.open(url, new=2)  # new=2 opens in a new tab if possible
            
            # Start serving
            print(f"Server is running... Visit http://{SERVER_ADDRESS}:{PORT}")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n" + "=" * 77)
        print("Server stopped by user")
        print("=" * 77)
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98 or e.errno == 10048:  # Address already in use (Unix/Windows)
            print(f"\n❌ ERROR: Port {PORT} is already in use!")
            print(f"\nSOLUTIONS:")
            print(f"1. Close any other web server running on port {PORT}")
            print(f"2. Edit 'start_server.py' and change PORT to a different number (e.g., 8081, 8082)")
            print(f"3. Try a common alternative: python -m http.server 8081")
            print(f"\nPress any key to exit...")
        else:
            print(f"\n❌ ERROR: {e}")
        input()  # Wait for user to press a key
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        sys.exit(1)

# -----------------------------------------------------------------------------
# Entry Point
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    start_server()

