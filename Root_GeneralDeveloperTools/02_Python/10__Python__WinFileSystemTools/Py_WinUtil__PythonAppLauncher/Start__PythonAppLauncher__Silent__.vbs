' =============================================================================
' Start__PythonAppLauncher__Silent__.vbs
' =============================================================================
' Silent launcher for the Python App Launcher - fires pythonw.exe with a
' hidden window so absolutely no console / PowerShell window flashes on
' startup. This is the file to link from shell:startup.
'
' How to install into shell:startup :
'   1. Press Win+R, type  shell:startup  and press Enter.
'   2. Right-click inside the opened folder -> New -> Shortcut.
'   3. Target:  this .vbs file's full path (browse to it).
'   4. Name the shortcut "Python App Launcher".
'   5. Sign out + back in.  The tray icon should appear silently.
' =============================================================================

Option Explicit

Dim oShell, oFso, sScriptDir, sMain, sPythonW, sCmd

Set oShell = CreateObject("WScript.Shell")
Set oFso   = CreateObject("Scripting.FileSystemObject")

sScriptDir = oFso.GetParentFolderName(WScript.ScriptFullName)
sMain      = sScriptDir & "\Py_WinUtil__PythonAppLauncher__Main__.py"

If Not oFso.FileExists(sMain) Then
    MsgBox "Python App Launcher main script not found:" & vbCrLf & sMain, _
           vbCritical + vbOKOnly, "Python App Launcher"
    WScript.Quit 1
End If

' Preferred pythonw.exe path (matches Adam's install under %LOCALAPPDATA%).
sPythonW = oShell.ExpandEnvironmentStrings( _
             "%LOCALAPPDATA%\Programs\Python\Python312\pythonw.exe")

If Not oFso.FileExists(sPythonW) Then
    sPythonW = oShell.ExpandEnvironmentStrings( _
                 "%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe")
End If

If Not oFso.FileExists(sPythonW) Then
    ' Final fallback: rely on %PATH% to resolve pythonw.exe.
    sPythonW = "pythonw.exe"
End If

sCmd = """" & sPythonW & """ """ & sMain & """"

' Run() args:
'   0     = hidden window style (no console flash, no taskbar entry)
'   False = non-blocking; this .vbs exits immediately, launcher keeps running
oShell.Run sCmd, 0, False
