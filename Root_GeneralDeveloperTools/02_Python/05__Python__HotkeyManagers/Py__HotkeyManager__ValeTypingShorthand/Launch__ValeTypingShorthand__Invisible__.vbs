' =============================================================================
' VALEDESIGNSUITE - INVISIBLE LAUNCHER FOR VALE TYPING SHORTHAND
' =============================================================================
'
' FILE       : Launch__ValeTypingShorthand__Invisible__.vbs
' AUTHOR     : Adam Noble - Noble Architecture
' PURPOSE    : Launch Vale Typing Shorthand invisibly using pythonw.exe
' CREATED    : 05-Dec-2025
'
' DESCRIPTION:
' - This VBScript launches the Vale Typing Shorthand hotkey manager invisibly.
' - Uses pythonw.exe to ensure zero console window appears.
' - Place a shortcut to this file in shell:startup for auto-start on login.
' - The script runs completely in the background with system tray icon.
'
' USAGE:
' 1. Create a shortcut to this .vbs file
' 2. Place the shortcut in your Windows Startup folder (shell:startup)
' 3. The hotkey manager will start invisibly on every Windows login
'
' =============================================================================

' Get the directory where this VBS script is located
Set objFSO = CreateObject("Scripting.FileSystemObject")
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Construct the path to the Python script
strPythonScript = strScriptDir & "\Py__HotkeyManager__ValeTypingShorthand__Main__.py"

' Create the shell object to run the command
Set objShell = CreateObject("WScript.Shell")

' Run pythonw.exe with the script (0 = hidden window, False = don't wait)
' pythonw.exe is the windowless Python interpreter - no console window at all
objShell.Run "pythonw.exe """ & strPythonScript & """", 0, False

' Clean up
Set objShell = Nothing
Set objFSO = Nothing

