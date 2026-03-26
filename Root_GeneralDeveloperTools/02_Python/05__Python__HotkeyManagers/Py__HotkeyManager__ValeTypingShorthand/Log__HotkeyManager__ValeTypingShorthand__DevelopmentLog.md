# DEVELOPMENT LOG:  
================================================================================

04-Dec-2025 - Version 0.5.1
- Fixed PowerShell clipboard to use stdin piping
- Prevents markdown content from being parsed as PowerShell code
- Text is now sent via stdin instead of command-line arguments

-----------------------------------------------------------

04-Dec-2025 - Version 0.5.0
- Switched to PowerShell for clipboard operations (most reliable method)
- Removed complex ctypes implementation that had access violations
- Uses built-in Windows PowerShell commands (Set-Clipboard/Get-Clipboard)
- 100% reliable clipboard operations with no dependencies

-----------------------------------------------------------

04-Dec-2025 - Version 0.4.1
- Added retry mechanism for clipboard operations (5 attempts with 0.1s delay)
- Handles clipboard contention from other applications
- Improved error handling and reliability

-----------------------------------------------------------

04-Dec-2025 - Version 0.4.0
- Switched to clipboard-based paste operation using Windows API
- Added clipboard backup and restore functionality
- Significantly improved reliability for large text blocks
- Fixed issue with missing characters during paste

-----------------------------------------------------------

04-Dec-2025 - Version 0.3.0
- Refactored to use configurable hotstring groups
- Added support for markdown file content loading
- Implemented JSON-like configuration region for hotstring definitions
- Added file-based content replacement system

-----------------------------------------------------------

04-Dec-2025 - Version 0.2.0
- Initial implementation with trigger detection and text replacement
- Windows 11 compatible key press handling
- Buffer-based trigger matching system

================================================================================