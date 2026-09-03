# DEVELOPMENT LOG:  
================================================================================

02-Sep-2026 - Version 0.6.1 - VALE DRIVE LINKS REMOVED
- Removed the entire Vale drive link system added in 0.7.0 to 0.7.4
- Main script restored to the 0.6.0 baseline
- valefile protocol handler uninstalled, HKCU registration deleted
- ValeDriveLinks hotstring dictionary deleted, 30__ValeDriveLinks folder moved
  to 00__Archive\30__ValeDriveLinks__REMOVED__02-Sep-2026
- ValeAliases dictionary KEPT. It is unrelated to drive links and just adds
  single underscore spellings of the existing triggers

REASON FOR REMOVAL:
- The only mechanism that produces a working internal file link in Outlook is a
  custom URI protocol handler, and that must be installed on every recipient's
  machine. Not viable across roughly 2000 staff
- file:// links are dead everywhere: blocked by design in New Outlook and
  Outlook on the web, and refused by Edge and Chrome when Outlook Classic hands
  them over
- The custom protocol route worked only in Outlook Classic. New Outlook strips
  custom protocol anchors on paste, so it also broke at compose time
- Anything that scales here has to be an ordinary http or https URL, which means
  an internal web endpoint that redirects to the file share. That is an IT
  infrastructure decision, not something a hotstring tool can provide

-----------------------------------------------------------

02-Sep-2026 - Version 0.7.4
- CONFIRMED WORKING: valefile links click through correctly in Outlook Classic
  once the handler is installed. Full chain verified end to end
- CONFIRMED NOT WORKING: New Outlook and the Outlook PWA strip the custom
  protocol anchor on paste. The text survives as plain black underlined text
  with no href, which matches Microsoft's documented behaviour that New Outlook
  removes custom protocol hyperlinks entirely
- Consequence: emails must be COMPOSED in Outlook Classic, not the PWA, or the
  link is destroyed before sending
- Consequence: recipients need both the handler installed and Outlook Classic
- Documented the shelf life problem in the ReadMe. Only http and https survive
  in New Outlook, so an intranet redirect endpoint would be needed to outlast
  the Classic to New Outlook migration

-----------------------------------------------------------

02-Sep-2026 - Version 0.7.3
- Changed default LinkScheme from file to protocol. Testing showed file:// links
  are refused by BOTH Outlook Classic and the Outlook PWA on this machine
- Root cause confirmed against Microsoft documentation: New Outlook and Outlook
  on the web block local file links by design with no roadmap to restore them,
  and Outlook Classic hands links to the default browser, which refuses file://
  unless Edge has the IntranetFileLinksEnabled policy set
- The anchor itself was never the problem. It pastes intact and renders as a
  blue underlined link. Outlook just will not follow it
- Changed link text colour from Vale navy #172b3a to Office link blue #0563c1,
  added a separate LinkColour config key. Navy read as plain black text
- Verified the valefile URL format against the WHATWG URL parser that Edge 133+
  now enforces. Edge 133 broke custom protocol handlers using backslashes, raw
  spaces or no hostname, and there is no policy to disable that enforcement.
  The format used here parses and round trips unchanged, so it is unaffected

-----------------------------------------------------------

02-Sep-2026 - Version 0.7.2
- Added ValeAliases dictionary giving single underscore aliases for the original
  double underscore triggers: ;v_build, ;v_email, ;v_projectemail and
  ;v_project_email now work alongside ;v__build, ;v__email and so on
- Reason: the drive link hotstrings use a single underscore, so two naming
  conventions were live at once and easy to mix up
- Verified no suffix collisions across all 35 triggers. The matcher uses
  endswith and breaks on the first hit, so a trigger that is a suffix of another
  would fire the wrong one. Every trigger currently fires itself.

-----------------------------------------------------------

02-Sep-2026 - Version 0.7.1
- Added Windows clipboard history fallback for the drive link hotstrings, read
  through the WinRT Clipboard.GetHistoryItemsAsync API
- Copying a screenshot or any other non text content no longer defeats the
  hotstring: the most recent Vale path still in history is used instead
- A path taken from history is ALWAYS announced in a tray balloon showing the
  exact path used, so a stale link can never be inserted silently
- Added UseClipboardHistoryFallback and ClipboardHistoryMaxItems config keys
- Extracted resolve_candidate_to_network_path so live clipboard and history
  entries go through identical validation

-----------------------------------------------------------

02-Sep-2026 - Version 0.7.0
- Added PasteValeDriveLink action for building clickable company drive links
- Added rich HTML clipboard support using the Windows CF_HTML clipboard format,
  so Outlook and other rich editors receive a live hyperlink on Ctrl+V
- Added mapped drive to UNC resolution, with a static fallback map in config,
  so links keep working for staff whose drive letters differ
- Added reverse UNC to drive letter rendering for the grey path sub line
- Added clipboard file drop list support, so a plain Ctrl+C on a file in
  Explorer works as well as Ctrl+Shift+C Copy as path
- Added 30__ValeDriveLinks folder holding the config, the valefile custom
  protocol launcher and its per user installer
- Added ValeDriveLinks hotstring dictionary: ;v_link and eight variants
- Added tray balloon notifications for unusable clipboard content
- Reload Hotstrings now also clears the drive link config and drive map caches

-----------------------------------------------------------

26-Mar-2026 - Version 0.6.0
- Added tray menu action to reload hotstrings without restarting the app
- Added runtime rebind of keyboard handler after reloading hotstring sources
- Updated tray tooltip/menu count to refresh after hotstring reload

-----------------------------------------------------------

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