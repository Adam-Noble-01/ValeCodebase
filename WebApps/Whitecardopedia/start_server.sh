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
echo " WHITECARDOPEDIA - LOCAL DEVELOPMENT SERVER"
echo "========================================================================"
echo ""
echo " Starting Python HTTP server on port 8000..."
echo " Application will be available at: http://localhost:8000"
echo ""
echo " Press Ctrl+C to stop the server"
echo ""
echo "========================================================================"
echo ""

# Start Python HTTP server
python3 -m http.server 8000

