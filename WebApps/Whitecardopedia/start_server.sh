#!/bin/bash
# =============================================================================
# WHITECARDOPEDIA - LOCAL DEVELOPMENT SERVER LAUNCHER
# =============================================================================
#
# FILE       : start_server.sh
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Launch local HTTP server for Whitecardopedia development
# CREATED    : 2025
#
# DESCRIPTION:
# - Automatically starts Python HTTP server on port 8000
# - Opens default browser to Whitecardopedia application
# - Press Ctrl+C to stop server
#
# USAGE:
# chmod +x start_server.sh
# ./start_server.sh
#
# =============================================================================

echo ""
echo "========================================================================"
echo " WHITECARDOPEDIA - FLASK DEVELOPMENT SERVER"
echo "========================================================================"
echo ""
echo " Starting Flask server on port 8000..."
echo " Application will be available at: http://localhost:8000"
echo ""
echo " Project Editor tool is available on localhost"
echo " Press Ctrl+C to stop the server"
echo ""
echo "========================================================================"
echo ""

# Start Flask development server
python3 server.py

