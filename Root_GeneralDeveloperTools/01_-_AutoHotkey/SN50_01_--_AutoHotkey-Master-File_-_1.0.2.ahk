#Requires AutoHotkey v1.1+  ; Ensure you're using AHK v1.1+ for UTF-8 support
#Warn  ; Enables warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
#SingleInstance, Force

; region  |  - - - - - - - - - - - - - - - - - - - - - - - - |  VERSION NOTES  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; Version 1.0 | Reformatted Script Consolidating older scripts into this new master script,
    ; Version 1.1 | Added date and time input hotstrings with calculation automation
    ; Version 1.1.1 | Extended Time & Date functions allowing for time addition & subtractinon.
    ; Version 1.2.1 | Added HTML Snippet Hotkeys & Unordered List hotkey for Shift & "-" pressed twice in two seconds.
    ; Version 1.3.1 | File Auto Text Added
    ; Version 1.3.2 | EM Dash Improved & Important notes section added to header
    ; Version 1.4.0 | 28/09/2024 | Rewrote Hanlding for large text sections, they now copy to clipboard instead of typing.
    ; Version 1.4.1 | 03/10/2024 | Script Refactored
    ; Version 1.4.2 | Added 🚧_Stub_Code_🚧_  ;fisc 
    ; Version 1.4.3 | Added Open .html Files in VS Code via Control + Shift + Left-Click & Added Media Pause Consolidating all old scripts
    ; Version 1.5.0 | 31/10/2024 | Horizontal line and end document HTML updated
    ; Version 1.5.1 | 31/10/2024 | Changed Note doc handling, it instead now references a document rather than a raw string
    ; Version 1.5.3 | 01/01/2025 | Added Additional Date Format - Hotstring ";dtsl" = Todays Date Formatted Like So 01 Dec 2024
    ; Version 1.5.3 | 01/01/2025 | Added Additional Date Format - Hotstring ";dtl" = Todays Date Formatted Like So 01-Dec-2024
    ; Version 1.5.4 | 20-Jan-2025 | Added File Path Shortcut Scripts Section, "Temporary Folder Quick Paste" logic & Keybind added
    ; Version 1.5.5 | 26-Jan-2025 | Added Standardised Comments For Python/ruby Development
    ; Version 1.5.6 | 15-Mar-2025 | Added triple click in windows explorer to open PowerShell
    ; Version 1.5.7 | 30-Apr-2025 | Added SketchUp Template Creator Shell Script


    ; !!!CRITICAL NOTE!!!
        ; All Additions to this code MUST be in the AHK 1.1 Syntax, its impotant to know there-
        ; Are are two completely different AHK Languages so the correct 1.1 Syntax must ALWAYS be coded.

    ; IMPORTANT NOTES
        ; -- Short Unicode Autotext--
        ; - For simple commands that use short Unicode characters, use the method demonstrated for the EM Dash below.
        ;   - Reason: Raw text corrupts once AHK executes.
        
        ; -- More Detailed Autotext Containing Unicode --
        ; - For more complex commands, such as whole paragraphs or specifically formatted sections of documents, 
        ;   copy the text from a file instead.

    ; TYPORA RELATED LAUNCH NOTES
        ; - Handling Moved Over To Power Toys Settings.
        ; - Use Keyboard Manager Utility In PowerToys.
        ; - Power Toys Keyboard Manager Utility Handles Lanching Typora
; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |

    ; ## 🕒 Time & Date Hotstrings and Modifiers - Quick Reference Table
        ;
        ; | Category                | Hotstring Trigger          | Description                                                   |
        ; |-------------------------|----------------------------|---------------------------------------------------------------|
        ; | Basic Date              | ::;dt::                    | Inserts today's date in `dd/MM/yyyy` format.                  |
        ; | Short Date              | ::;dtsl::                  | Inserts date as `01 Dec 2024`.                                |
        ; | Hyphenated Date         | ::;dtl::                   | Inserts date as `01-Dec-2024`.                                |
        ; | Ordinal Date            | ::;dtxl::                  | Inserts date with ordinal suffix (e.g., `1ˢᵗ December 2024`). |
        ; | Basic Time              | ::;hm::                    | Inserts current time in `HH:mm` format.                       |
        ; | Rounded Time            | ::;hmm::                   | Inserts current time rounded to the nearest 15 minutes.       |
        ; | Add Days                | ::;dtxlp1:: - ::;dtxlp10:: | Inserts date 1 to 10 days from today.                         |
        ; | Subtract Days           | ::;dtxlm1:: - ::;dtxlm10:: | Inserts date 1 to 10 days before today.                       |
        ; | Add Hours               | ::;hmp1:: - ::;hmp8::      | Inserts time 1 to 8 hours from now.                           |
        ; | Subtract Hours          | ::;hmm1:: - ::;hmm8::      | Inserts time 1 to 8 hours before now.                         |




; |-------------------------------------------------------------------------------------------------------------------------------------- |

; region | - - - - - - - - - -  |  Python Automation Powershell Enviroment Shortcode  | - - - - - - - - - - - - - - - - - - - - - - - - |


    ; region  - - - |  Testing Powershell Python Shortcode  | - -
    ::;py_test::
        Clipboard := "py ""$env:Python_Scripts\test.py""" ; Set the text to the clipboard
        ClipWait, 0.2 ; Wait for the clipboard to update (optional, ensures text is set)
        Send ^v ; Send the paste command (Ctrl+V)
    return

; endregion  - - - - - - - - - - - - - - - - - - - - - - - - 

    ; region  - - - |  Testing Powershell Python Shortcode  | - - -
    ::;py::
        Clipboard := "py ""$env:Python_Scripts\  """ ; Set the text to the clipboard
        ClipWait, 0.2 ; Wait for the clipboard to update (optional, ensures text is set)
        Send ^v ; Send the paste command (Ctrl+V)
    return

; endregion  - - - - - - - - - - - - - - - - - - - - - - - - 

; |--------------------------------------------------------------------------------------------------------------------------------|



; region | - - - - - - - - - -  |  Launch Powershell - Triple Click In Explorer  | - - - - - - - - - - - - - - - - - - - - - - - - |
; USAGE INSTRUCTIONS:
; - Triple-click anywhere in the white space of an open Explorer window.
; - This script will detect the action and retrieve the current directory.
; - PowerShell will open with the clicked folder set as the root directory.

#If WinActive("ahk_class CabinetWClass")  ; Only when Explorer is active
~LButton::
    ClickCount += 1
    SetTimer, ResetClickCount, -300
    if (ClickCount = 3)
    {
        ; Retrieve the current folder path using COM
        for window in ComObjCreate("Shell.Application").Windows
        {
            if (window.hwnd = WinActive("ahk_class CabinetWClass"))
            {
                currentPath := window.Document.Folder.Self.Path
                break
            }
        }
        ; Open PowerShell with the current folder as root path
        Run, powershell.exe -NoExit -Command "Set-Location -LiteralPath '%currentPath%'"
        ClickCount := 0  ; Reset counter
    }
return

ResetClickCount:
    ClickCount := 0
return
#If 

; region | - - - - - - - - - -  |  File Name Copy Shortcut via F2 Double-Tap  | - - - - - - - - - - - - - - - - - - - - - - - - |
; USAGE INSTRUCTIONS:
; - In Windows File Explorer, select a file.
; - Press F2 once to enter rename mode.
; - If you double-tap F2 (i.e. press F2 again within 500 ms) while the name is being edited,
;   the actual file name (with extension) is copied to the clipboard and the file is deselected.
#If WinActive("ahk_class CabinetWClass") || WinActive("ahk_class ExplorerWClass")

~F2::
    if (A_PriorHotkey = "~F2" and A_TimeSincePriorHotkey < 500)
    {
        selectedFileName := ""
        ; Use Shell.Application to access the active Explorer window's selected item.
        for window in ComObjCreate("Shell.Application").Windows
        {
            if (window.hwnd = WinActive("ahk_class CabinetWClass") or window.hwnd = WinActive("ahk_class ExplorerWClass"))
            {
                selItems := window.Document.SelectedItems()
                if (selItems.Count > 0)
                {
                    selectedFileName := selItems.Item(0).Name
                    break
                }
            }
        }
        if (selectedFileName != "")
        {
            ClipboardOld := ClipboardAll
            Clipboard := selectedFileName
            ClipWait, 0.3
            ; Deselect the file by sending the Escape key.
            SendInput {Escape}
        }
    }
return

#If
; |--------------------------------------------------------------------------------------------------------------------------------|




; region | - - - - - - - - - - - - - - - - - - |  File Path Shortcut Scripts  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


    ; region  - - - |  Temporary Folder Quick Paste  | - - -
    ::;wdtp::
    ::;tpfi::
    ::;windows_temp::
    ::;windows_directory_temp::
    ::;temp_folder::
    ::;temp_files::
        Clipboard := "C:\Users\Administrator\Desktop\00-Temp-Extports\" ; Set the text to the clipboard
        ClipWait, 0.2 ; Wait for the clipboard to update (optional, ensures text is set)
        Send ^v ; Send the paste command (Ctrl+V)
    return

; endregion  - - - - - - - - - - - - - - - - - - - - - - - - 

; |------------------------------------------------------------------------------------------------------------------------|


; region       |  - - - - - - - - - - - - - - - - |  Note File Starter Template  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

; region  - |  Copy & Paste Standard Notes Text Format  | - 
    ::;tpno:: ; Define the hotstring for the note template
    ::;exno:: ; Hotstring for a different note template
    ::;exnd:: ; Hotstring for additional note templates
    ::;tpnd:: ; Hotstring for further variations
    ::;template_note:: ; Hotstring for general template note
    ::;note_template:: ; Hotstring for alternate note template
        {
            ; Set the file path
                FilePath := "D:\RE00_--_Core_Repo_--_Local\GN03_--_Common_-_Template_Doc_Library\GN01_01_--_Core-Template_-_Note_Document_Template.txt"
            ; Check if the file exists
                If !FileExist(FilePath)
            {
                ; Stops further execution if file is not found
                    MsgBox, AHK Could not locate the file requested, please validate path.
                    Return  
            }
            ; Ensure that the file is read using UTF-8 encoding
            FileRead, Clipboard, %FilePath%

            ; Wait 300 milliseconds to ensure the clipboard is readye
                Sleep, 300
            ; Send Ctrl+V to paste clipboard content wherever the user's cursor is located
                Send ^v
        return
        }
    ; # endregion - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 


; region       |  - - - - - - - - - - - - - - - - |  Email Draft Starter Template  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; region  - - - -  |  Copy & Paste Standard Notes Text Format  | - - - - - - - 
    ::;tpem::           ; Defines the hotstring for the email starter form template
    ::;emtp::           ; Defines the hotstring for the email starter form template
    ::;emailtp::        ; Defines the hotstring for the email starter form template
    ::;tpemail::        ; Defines the hotstring for the email starter form template
    ::;template_email:: ; Defines the hotstring for the email starter form template
    ::;email_template:: ; Defines the hotstring for the email starter form template
        {
            ; Set the file path
                FilePath := "D:\RE00_--_Core_Repo_--_Local\GN03_--_Common_-_Template_Doc_Library\GN01_03_--_Core-Template_-_General-Email-Correspondence.txt"
            ; Check if the file exists
                If !FileExist(FilePath)
            {
                ; Stops further execution if file is not found
                    MsgBox, AHK Could not locate the file requested, please validate path.
                    Return  
            }
            ; Ensure that the file is read using UTF-8 encoding
            FileRead, Clipboard, %FilePath%

            ; Wait 300 milliseconds to ensure the clipboard is readye
                Sleep, 300
            ; Send Ctrl+V to paste clipboard content wherever the user's cursor is located
                Send ^v
        return
        }
    ; # endregion - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

; endregion   |  - - - - - - - - - - - - - - - - - - |  END OF TEMPLATES  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

; region     |  - - - - - - - - - - - - - - - - - - |  SketchUp Template Creator  | - - - - - - - - - - - - - - - - - - - - - - - - - - - |

    ; region  - |  Create New SketchUp File from Template  | -
    ::;skp::
    ::;sktp::
    ::;sketchup::
    ::;sufile::
    ::;tpsu::
    ::;sketchup-template::
    ::;sketchup-file::
    ::;new-sketchup-file::
    ::;add-sketchup::
    ::;template - sketchup::
        {
            ; Store the PowerShell script content
            sketchup_script := ""
            . "$sourcePath = ""D:\02_-_Core-Lib_-_SketchUp\06_-_Core-Lib_-_SketchUp-Templates\01_-_SketchUp_-_Master-Template.skp""`r`n"
            . "$destinationPath = ""Template.Sketchup.skp""`r`n"
            . "`r`n"
            . "Write-Host ""Creating new SketchUp file from template...""`r`n"
            . "`r`n"
            . "try {`r`n"
            . "    Copy-Item -Path $sourcePath -Destination $destinationPath -Force`r`n"
            . "    Write-Host ""Template created successfully: $destinationPath""`r`n"
            . "} catch {`r`n"
            . "    Write-Host ""Failed to create template: $_""`r`n"
            . "}`r`n"
            . "`r`n"
            . "Read-Host -Prompt ""Press Enter to exit"""
            
            ; Save current clipboard content
            ClipboardOld := ClipboardAll
            
            ; Set PowerShell script to clipboard
            Clipboard := sketchup_script
            
            ; Wait for clipboard to be ready
            ClipWait, 0.3
            
            ; Send Ctrl+V to paste the content
            Send ^v
            
            ; Short delay for stability
            Sleep, 50
            
            ; Restore original clipboard
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
    ; endregion  - |  Create New SketchUp File from Template  | -

; endregion     |  - - - - - - - - - - - - - - - - - |  END OF SketchUp Template Creator  | - - - - - - - - - - - - - - - - - - - - - - - |


; |------------------------------------------------------------------------------------------------------------------------|

; region       |  - - - - - - - - - - - - - - - |  SNIPPETS FROM TXT FILES  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; # region - - |  INSERT SNIPPET -- See Below Example  | - -
    ::;seeex::
    ::;seex::
    ::;sex::
    ::;seb::
    ::;see_ex::
    ::;see_example::
    ::;see_below::
    ::;see_example_below::
    ::;see_below_example::
        {
            ; Set the file path
                FilePath := "D:\RE00_I_GitHub_Repo\GN_Library_Common\GN50-.-_AHK_--Text_Snippet_Repo\GN50_01-.-_AHK_--Snippet--See_Example_Below_Text_Snippet.txt"
            ; Check if the file exists
                If !FileExist(FilePath)
            {
                ; Stops further execution if file is not found
                    MsgBox, AHK Could not locate the file requested, please validate path.
                    Return  
            }
            ; Ensure that the file is read using UTF-8 encoding
            FileRead, Clipboard, %FilePath%

            ; Wait 300 milliseconds to ensure the clipboard is readye
                Sleep, 300
            ; Send Ctrl+V to paste clipboard content wherever the user's cursor is located
                Send ^v
        return
        }
    ; # endregion - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 


; endregion   | ---------------------------------------------------------------------------------------------------------------------------- |

; endregion   |  - - - - - - - - - - - - - - - - -  |  END OF SNIPPETS  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |


; |-------------------------------------------------------------------------------------------------------------------------------------  |


; region       |  - - - - - - - - - - - - - - - - - - |  ChatBot Prompts  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -   |


    ; region  - |  Paste Prompt For Standard Spelling & Grammar Checking  | - 
        ::;aisc::
        ::;spell check::
            {
                ; Set the file path
                    FilePath := "D:\RE00_I_GitHub_Repo\NS_Library_NoodlSoft\NS04_Chat_Bots\NS02_01_Writing_Assistant\NS02_01_02_Simple_Spelling_Checker.txt"  
                ; Check if the file exists
                    If !FileExist(FilePath)
                {
                    ; Stops further execution if file is not found
                        MsgBox, AHK Could not locate the file requested, please validate path.
                        Return  
                }
                ; Read the file content directly to the clipboard
                    FileRead, Clipboard, %FilePath%
                ; Wait 300 milliseconds to ensure the clipboard is ready
                    Sleep, 300
                ; Send Ctrl+V to paste clipboard content wherever the user's cursor is located
                    Send ^v
            return
            }
    ; endregion  - |  Paste Prompt For Standard Spelling & Grammar Checking  | - 


    ; region  - |  Chat GPT - Edit Just This Section  | - 
        ::;aied:: 
        ::;aies:: 
        ::;aise::
        ::;aistartedit::
            {
                SendInput, ━ {U+270E} EDIT JUST THIS SECTION {U+1F898}
                return
            }
    ; endregion  - |  Chat GPT - Edit Just This Section  | - 


    ; region  - |  Chat GPT - End Of Edited Section  | - 
        ::;aiee:: 
        ::;aiendedit::
            {
                SendInput, {U+1F898} {U+2755} Changes = x_y_z    {U+2755} x\|
                return
            }
    ; endregion  - |  Chat GPT - End Of Edited Section  | - 


; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |-------------------------------------------------------------------------------------------------------------------------------------  |


; region       |  - - - - - - - - - - - - - - - - - - - - |  COMPANY DETAILS AUTOTEXT  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; region - - - - - - - - - - - - - - - |  Software Development Company Name - Studio NoodlFjørd  | - - - - - - - - - - - - - - - - -  |
    ::;stnd::
    ::;coding_name::
    ::;dev_name::
    ::;dvnm::
    ::;stnf::
        ns_company_text := "Studio NoodlFjord"      ; Define the initial text
        empty_set_symbol := Chr(248)                ; Define the Unicode character (U+00F8, ø)
        
        ; Replace "Fjord" with "Fj∅rd"
        StringReplace, ns_company_text, ns_company_text, Fjord, Fj%empty_set_symbol%rd, All
        
        ClipboardOld := ClipboardAll                ; Save the current clipboard
        Clipboard := ""                             ; Clear the clipboard to ensure the new text is set
        Clipboard := ns_company_text                ; Set the modified text to the clipboard
        
        ClipWait, 20                                ; Wait for the clipboard to be ready
        if !ErrorLevel                              ; If the clipboard is successfully updated
        {
            SendInput, ^v                           ; Send Ctrl+V to paste the text
        }
        
        Sleep, 30                                   ; Add a small delay for stability
        Clipboard := ClipboardOld                   ; Restore the original clipboard content
        ClipboardOld := ""                          ; Clear the old clipboard variable
        return



; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |


    ; region       |  - - - - - - - - - - - - - - - - - - - - |  Email Addresses  | - - - - - - - - - - - - - - - - - - - - - - - - - - - |

    ; region  - |  Work Email Address 1  | - 

    ::;wb01::
    ::;WB01::
    ::;we01::
    ::;WE01::
        SendInput {Backspace 5} ; Remove typed trigger (;wb01)
        ClipboardOld := ClipboardAll
        Clipboard := "https://www.noble-architecture.com/"
        SendInput ^v
        Sleep 100
        Clipboard := ClipboardOld
        return

    ; endregion

    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |


    ; region       |  - - - - - - - - - - - - - - - - - - - - |  Email Addresses  | - - - - - - - - - - - - - - - - - - - - - - - - - - - |

    ; region  - |  Work Email Address 1  | - 
        ::;em01:: 
        ::;EM01::
            {
                SendInput, Adam@Noble-Architecture.com
                return
            }
            
    ; endregion

    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |


    ; region  - |  Work Email Address 2  | - 
        ::;em02:: 
        ::;EM02::
            {
                SendInput, adam-face@hotmail.co.uk
                return
            }
    ; endregion  - |

; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |


; |-------------------------------------------------------------------------------------------------------------------------------------  |


; region       |  - - - - - - - - - - - - - - - - - - - - - -  |  Links  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; region  - |  GitHub Link  | - 
        ::;ghli:: 
        ::;gitlink::
        ::;github_link::
        ::;link_github:: 
        ::;link_gh::
        ::;ligh::
            {
                SendInput, https://adam-noble-01.github.io/RE10_I_GitHub_I_Public_Repo/
                return
            }
    ; endregion |

    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |        

    ; region  - |  Google Drive Download File Prefix  | - 
        ::;gdli::
        ::;google_drive::
        ::;google_drive_link::
        ::;drive_link::
        ::;drive_DL:: 
        ::;drive_dl::
            {
                SendInput, https://drive.google.com/uc?export=download&id=
                return
            }
    ; endregion  - |  Google Drive Download File Prefix  | - 

; endregion    |  - - - - - - - - - - - - - - - - - - |  END OF Links  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |


; |-------------------------------------------------------------------------------------------------------------------------------------  |



; region       |  - - - - - - - - - - - - - - - - - - - - |  Markdown Elements  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - |

    ; region  - |  Copy & Paste Horizontal Divider Line  | - 
        
        ; Divider Line Note : 
        ; Line Must Always Be EXACTLY 119 Characters in Length!
        ::;mdli::
        ::;hlli::
        ::;hline::
        ::;divider::
        ::;divider_line::
        ::;horizontal_line::
        ::;horizontal_divider::
        {
            text_horizontal_divider := ""
            . "<div style="" /* | - - - - - - - - - - - -->|  Horizontal Page Divider Line   |<-- - - - - - - - - - - - - - - - -|  */ `r`n"
            . "    text-align           :     center;    `r`n"
            . "    padding-top          :    05.00mm;    /*  <--- Space Above The Divider Line  */`r`n"
            . "    padding-bottom       :    05.00mm;    /*  <--- Space Below The Divider Line  */`r`n"
            . "    margin-top           :    00.00mm;    `r`n"
            . "    margin-bottom        :    00.00mm;    `r`n"
            . "    "">                                   `r`n"
            . "    <div style=""                         `r`n"
            . "        width            :       100%;    `r`n"
            . "        border-style     :      solid;    `r`n"
            . "        border-width     :     0.01pt;    `r`n"
            . "        border-color     :    #ebebeb;    `r`n"
            . "        "">                               `r`n"
            . "    </div>                                `r`n"
            . "</div>  `r`n"

            ClipboardOld := ClipboardAll
            Clipboard := text_horizontal_divider
            SendInput, ^v
            Sleep, 50
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
    ; # endregion -
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |

; ------------------------------------------------------------------------------------------------------------
; AHK SCRIPT | Horizontal Page Divider and End of Document | Copies formatted HTML to Clipboard for quick paste
; ------------------------------------------------------------------------------------------------------------

    ; End Of Note Doc Notes : 
    ; Line Must Always Be EXACTLY 119 Characters in Length!
        ::;eddo::
        ::;endo::
        ::;noen::
        ::;enddo::
{
    text_horizontal_divider := ""
        . "<div style="" /* | - - - - - - - - - - - -->|  Horizontal Page Divider Line   |<-- - - - - - - - - - - - - - - - -|  */ `r`n"
        . "    text-align           :     center;    `r`n"
        . "    padding-top          :    05.00mm;    /*  <--- Space Above The Divider Line  */`r`n"
        . "    padding-bottom       :    05.00mm;    /*  <--- Space Below The Divider Line  */`r`n"
        . "    margin-top           :    00.00mm;    `r`n"
        . "    margin-bottom        :    00.00mm;    `r`n"
        . "    "">                                   `r`n"
        . "    <div style=""                         `r`n"
        . "        width            :       100%;    `r`n"
        . "        border-style     :      solid;    `r`n"
        . "        border-width     :     0.01pt;    `r`n"
        . "        border-color     :    #ebebeb;    `r`n"
        . "        "">                               `r`n"
        . "    </div>                                `r`n"
        . "</div>                                   `r`n"
        . "<div style="" /* | - - - - - - - - - - - - -->|  Note : End Of Page  |<--  - - - - - - - - - - - - - - - - - - - - | */ `r`n"
        . "    text-align           :     center;    `r`n"
        . "    padding-top          :    05.00mm;    `r`n"
        . "    padding-bottom       :    05.00mm;    `r`n"
        . "    margin-top           :    00.00mm;    `r`n"
        . "    margin-bottom        :    00.00mm;    `r`n"
        . "    color                :    #d1d1d1;    `r`n"
        . "    font-weight          :    200.000;    `r`n"
        . "    "">                                   `r`n"
        . "  End Of Document                          `r`n"
        . "</div>                                   `r`n"

    ClipboardOld := ClipboardAll
    Clipboard := text_horizontal_divider
    SendInput, ^v
    Sleep, 50
    Clipboard := ClipboardOld
    ClipboardOld := ""
    return
}


    ; |-------------------------------------------------------------------


    ; region  - |  en dash "  –  " Divider   | - 
        ::;emda::
        ::;enda::
            {
                SendInput,  %A_Space%%A_Space%{U+2013}%A_Space%%A_Space%
                return
            }
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |

    ; |-------------------------------------------------------------------


    ; region  - |  Document Warning  | - 
    ::;mdwa:: 
    ::;warning_note::
    ::;doc_warning::
    ::;markdown_warning:: 
        {
            SendInput, ###### ⚠ WARNING ⚠  |  Document Information Not Yet Fully Validated
            return
        }
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |

    ; |-------------------------------------------------------------------

    ; region  - |  NO TEXT WRAPPING; NO LINE BREAK  | - 
    ::;mdnb:: 
    ::;md_no_break:: 
    ::;mardkdown_no_break:: 
    ::;mdnlb:: 
    ::;md_no_line_break:: 
    ::;markdown_no_line_break:: 
        {
            SendInput, <span style="white-space: nowrap;">REPLACE_THIS_TEXT</span>
            return
        }
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |

    ; |-------------------------------------------------------------------
; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |-------------------------------------------------------------------------------------------------------------------------------------  |


; region       |  - - - - - - - - - - - - - - - - - - - - - - |  Auto Text  -  File Naming  |- - - - - - - - - - - - - - - - - - - - - -  |

    ; region  - |  File Auto Text  - |  ----> _⚠_Unverified File_⚠_ <---  |  
    ::;fiin:: 
    ::;fiun::
    ::;finv::
    ::;fiinv::
    ::;file_unvalidated:: 
    ::;file_unverified:: 
    ::;file_not_validates:: 
        {
            Text := "_"Chr(9888)"_Unverified File_"Chr(9888)"_"
            SendInput, % Text
            return
        }
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |


    ; | -------------------------------------------------------------------


    ; region  - |  File Auto Text  - |  -------> _🚧_Stub_Code_🚧_ <---  | 
    ::;scfi::
    ::;fisc::
    ::;stub_code:: 
    ::;stub_code_file:: 
    ::;code_file_stub:: 
        {
            Text := "_"Chr(0x1F6A7)"_Stub_Code_"Chr(0x1F6A7)"_"
            SendInput, % Text
            return
        }
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- |--


    ; | -------------------------------------------------------------------





; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |---------------------------------------------------------------------------------------------------------------------------------------|


; region       |  - - - - - - - - - - - - - - - - - - - - |  Placeholder Text  | - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |                                                      

; region       |  - - - - - - - - - - |  Placeholder Markdown Lists  | - - - - - - - - - -  |                                                      
    ; region  - |  Lorem Ipsum | 5 List Items  | - 
    ::;loremli5::
    ::;loremli05::
        {
            text := "- Lorem ipsum dolor sit amet, consectetur adipiscing`r`n"
            . "- Vivamus in pharetra velit cras lacus`r`n"
            . "- Feugiat id vehicula ut placerat eget`r`n"
            . "- Sed vitae fringilla turpis vel consequat`r`n"
            . "- Donec feugiat vel risus nec pharetra`r`n"
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 20
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
        ; endregion  -

    ; |-------------------------------------------------------------------

    ; region  - |  Lorem Ipsum | 10 List Items  | - 
        ::;loremli10::
        {
            text := "- Lorem ipsum dolor sit amet, consectetur adipiscing`r`n"
            . "- Vivamus in pharetra velit cras lacus`r`n"
            . "- Feugiat id vehicula ut placerat eget`r`n"
            . "- Sed vitae fringilla turpis vel consequat`r`n"
            . "- Donec feugiat vel risus nec pharetra`r`n"
            . "- Praesent hendrerit rhoncus risus sit amet`r`n"
            . "- Curabitur dignissim tellus lacus non vulputate`r`n"
            . "- Consectetur adipiscing elit sed a diam`r`n"
            . "- Mauris laoreet pulvinar porttitor morbi auctor`r`n"
            . "- Nunc eleifend tortor lorem sit amet"
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 20
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
    ; endregion  - 

; endregion       |  - - - - - - - - - - |  Placeholder Markdown Lists  | - - - - - - - - - -  |    

; |----------------------------------------------------------------------------------- |


; region         |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |

    ; region  - |  Lorem Ipsum 01  | - 
        ::;Lorem1:: 
        ::;lorem1::
        {
            text := "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus in pharetra velit. Cras lacus arcu, feugiat id vehicula ut, placerat eget nisi. Sed vitae fringilla turpis, vel consequat arcu. Donec feugiat vel risus nec pharetra. Praesent hendrerit rhoncus risus, sit amet euismod mauris pretium vel.`r`n`r`nCurabitur dignissim tellus lacus, non vulputate neque blandit a. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a diam diam."
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 50
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
        ; endregion  -

    ; |-------------------------------------------------------------------


    ; region  - |  Lorem Ipsum 02  | - 
        ::;Lorem2:: 
        ::;lorem2::
        {
            text := "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus in pharetra velit. Cras lacus arcu, feugiat id vehicula ut, placerat eget nisi. Sed vitae fringilla turpis, vel consequat arcu. Donec feugiat vel risus nec pharetra. Praesent hendrerit rhoncus risus, sit amet euismod mauris pretium vel. Curabitur dignissim tellus lacus, non vulputate neque blandit a. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a diam diam.`r`n`r`nMauris laoreet pulvinar porttitor. Morbi a auctor nisl. Nunc eleifend tortor lorem, sit amet tempor magna feugiat at. Donec non gravida est. Nunc volutpat semper luctus. Mauris ultricies risus in nunc fermentum, in semper leo sollicitudin. Sed interdum mattis faucibus."
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 50
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
        ; endregion  -

    ; |-------------------------------------------------------------------

    ; region  - |  Lorem Ipsum 03  | - 
        ::;lorem3::
        {
            text := "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus in pharetra velit. Cras lacus arcu, feugiat id vehicula ut, placerat eget nisi. Sed vitae fringilla turpis, vel consequat arcu. Donec feugiat vel risus nec pharetra. Praesent hendrerit rhoncus risus, sit amet euismod mauris pretium vel. Curabitur dignissim tellus lacus, non vulputate neque blandit a. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a diam diam.`r`n`r`nMauris laoreet pulvinar porttitor. Morbi a auctor nisl. Nunc eleifend tortor lorem, sit amet tempor magna feugiat at. Donec non gravida est. Nunc volutpat semper luctus. Mauris ultricies risus in nunc fermentum, in semper leo sollicitudin. Sed interdum mattis faucibus.`r`n`r`nDonec facilisis vestibulum eros at hendrerit. Aenean vel posuere purus. In ut massa neque. Nullam condimentum sem at tincidunt placerat. Sed tempor ullamcorper ex, non mollis ligula euismod cursus. Sed nec nulla at metus feugiat eleifend et vitae metus. Ut vitae ultrices nisi. Maecenas eu mattis quam."
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 50
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
        ; endregion  - 

    ; |-------------------------------------------------------------------

    ; region  - |  Lorem Ipsum 04  | - 
        ::;lorem4::
        {
            text := "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus in pharetra velit. Cras lacus arcu, feugiat id vehicula ut, placerat eget nisi. Sed vitae fringilla turpis, vel consequat arcu. Donec feugiat vel risus nec pharetra. Praesent hendrerit rhoncus risus, sit amet euismod mauris pretium vel. Curabitur dignissim tellus lacus, non vulputate neque blandit a. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a diam diam.`r`n`r`nMauris laoreet pulvinar porttitor. Morbi a auctor nisl. Nunc eleifend tortor lorem, sit amet tempor magna feugiat at. Donec non gravida est. Nunc volutpat semper luctus. Mauris ultricies risus in nunc fermentum, in semper leo sollicitudin. Sed interdum mattis faucibus.`r`n`r`nDonec facilisis vestibulum eros at hendrerit. Aenean vel posuere purus. In ut massa neque. Nullam condimentum sem at tincidunt placerat. Sed tempor ullamcorper ex, non mollis ligula euismod cursus. Sed nec nulla at metus feugiat eleifend et vitae metus. Ut vitae ultrices nisi. Maecenas eu mattis quam.`r`n`r`nCras nec malesuada massa. Duis nisl diam, ultrices in ligula a, laoreet consequat dolor. Vestibulum blandit mi placerat tempor imperdiet. Integer in rutrum risus, nec congue quam. Maecenas non leo porttitor ligula hendrerit commodo. Nam eu est eget felis dignissim laoreet consequat in elit. Phasellus sollicitudin dolor ac turpis accumsan, sit amet dapibus velit tempor. Sed posuere tempus risus, a viverra ante fermentum eget. Integer dapibus, est eget sollicitudin tempor, metus metus egestas ligula, in aliquet elit tellus eget orci. Donec ipsum elit, vulputate sed tincidunt at, dignissim nec magna. Mauris vulputate varius nunc, vitae pharetra mi volutpat a. Duis tincidunt cursus elit, et pretium quam interdum ut. Aliquam sed accumsan justo, et pharetra nunc. Donec quis ex eu elit dictum sodales et nec diam. Fusce quis nisi purus."
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 50
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
        ; endregion  -

        ; |-------------------------------------------------------------------

    ; region  - |  Lorem Ipsum 05  | - 
        ::;lorem5::
        {
            text := "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus in pharetra velit. Cras lacus arcu, feugiat id vehicula ut, placerat eget nisi. Sed vitae fringilla turpis, vel consequat arcu. Donec feugiat vel risus nec pharetra. Praesent hendrerit rhoncus risus, sit amet euismod mauris pretium vel. Curabitur dignissim tellus lacus, non vulputate neque blandit a. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a diam diam.`r`n`r`nMauris laoreet pulvinar porttitor. Morbi a auctor nisl. Nunc eleifend tortor lorem, sit amet tempor magna feugiat at. Donec non gravida est. Nunc volutpat semper luctus. Mauris ultricies risus in nunc fermentum, in semper leo sollicitudin. Sed interdum mattis faucibus.`r`n`r`nDonec facilisis vestibulum eros at hendrerit. Aenean vel posuere purus. In ut massa neque. Nullam condimentum sem at tincidunt placerat. Sed tempor ullamcorper ex, non mollis ligula euismod cursus. Sed nec nulla at metus feugiat eleifend et vitae metus. Ut vitae ultrices nisi. Maecenas eu mattis quam.`r`n`r`nCras nec malesuada massa. Duis nisl diam, ultrices in ligula a, laoreet consequat dolor. Vestibulum blandit mi placerat tempor imperdiet. Integer in rutrum risus, nec congue quam. Maecenas non leo porttitor ligula hendrerit commodo. Nam eu est eget felis dignissim laoreet consequat in elit. Phasellus sollicitudin dolor ac turpis accumsan, sit amet dapibus velit tempor. Sed posuere tempus risus, a viverra ante fermentum eget. Integer dapibus, est eget sollicitudin tempor, metus metus egestas ligula, in aliquet elit tellus eget orci. Donec ipsum elit, vulputate sed tincidunt at, dignissim nec magna. Mauris vulputate varius nunc, vitae pharetra mi volutpat a. Duis tincidunt cursus elit, et pretium quam interdum ut. Aliquam sed accumsan justo, et pharetra nunc. Donec quis ex eu elit dictum sodales et nec diam. Fusce quis nisi purus.`r`n`r`nFusce lorem ligula, laoreet at hendrerit vel, pharetra id turpis. Aliquam posuere sem neque, quis venenatis mauris dignissim ac. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nunc id efficitur metus. Donec sit amet vehicula orci, eget dictum dolor. Sed elit leo, iaculis at sodales vulputate, tempor eu lacus. Nullam auctor, ipsum sit amet tincidunt feugiat, neque leo facilisis sapien, sit amet accumsan sem odio sed risus. Donec eget leo quis nibh porttitor dignissim. Integer porta mi ut porta rhoncus."
            ClipboardOld := ClipboardAll
            Clipboard := text
            SendInput, ^v
            Sleep, 50
            Clipboard := ClipboardOld
            ClipboardOld := ""
            return
        }
        ; endregion  -

        ; endregion         |  - - - - - - - - - - |  Placeholder Text Paragraphs  | - - - - - - - - - -  |

; endregion    |  - - - - - - - - - - - - - - - - - - |  END OF Placeholder Text  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |


; |---------------------------------------------------------------------------------------------------------------------------------------|


; region       |  - - - - - - - - - - - - - - - - - - - - |  Special Characters  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; region  - |  Invisible Character  | - 
        ::;charinv::
            {
                SendInput, {U+200E}
                return
            }
    ; endregion  - |

    ; |--------------------------------------

    ; region  - |  Superscript 2  | - 
        ::;char2::
            {
                SendInput, {U+00B2}
                return
            }
    ; endregion  - |  Superscript 2  | - 

    ; |--------------------------------------

    ; region  - |  Superscript 3  | - 
        ::;char3::
            {
                SendInput, {U+00B3}
                return
            }
    ; endregion  - |  Superscript 3  | - 

; endregion    |  - - - - - - - - - - - - - - - - - - |  END OF Special Characters  | - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |---------------------------------------------------------------------------------------------------------------------------------------|

; region       |   - - - - - - -  - - - - - | Time & Date Auto-Text Functions Collection | - - - - - - - - - - - - - - - - - - - - - - -  |


; region       |  - - - - - - - - - - - - - - - - - - - - | Basic Date Auto-Text | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; Today's Date Hotstring
        ::;dt::
            FormatTime, OutputVar, %A_Now%, dd/MM/yyyy  ; Outputs today's date
            SendInput, %OutputVar%
        return
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- | |
    
    ; |--------------------------------------

; region       |  - - - - - - - - - - - - - - - - - - - - | Basic Time Auto-Text | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; Current Time Hotstring (e.g., 15:25)
        ::;hm::
                FormatTime, OutputVar, %A_Now%, HH:mm  ; Outputs the current time in HH:mm format
                SendInput, %OutputVar%
            return
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- | |
    
    ; |--------------------------------------

; region       |  - - - - - - - - - - - - - - - - - - |  Rounded Time Auto Text  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; Rounded Time to the Nearest 15 Minutes
        ::;hmm::
            ; Get the current time in HH:mm
            FormatTime, Now, %A_Now%, HHmm
            ; Extract the hour and minute
            StringLeft, Hour, Now, 2
            StringRight, Minute, Now, 2
            ; Convert hour and minute to total minutes
            TotalMinutes := (Hour * 60) + Minute
            ; Round the total minutes to the nearest 15-minute increment
            RoundedMinutes := Round(TotalMinutes / 15) * 15
            if (RoundedMinutes >= 1440)  ; Adjust for midnight rollover
                RoundedMinutes := 0
            ; Calculate the rounded hour and minute
            Hour := Floor(RoundedMinutes / 60)
            Minute := Mod(RoundedMinutes, 60)
            ; Ensure leading zero for single-digit hours and minutes
            if (Hour < 10)
                Hour := "0" . Hour
            if (Minute < 10)
                Minute := "0" . Minute
            ; Output the rounded time
            OutputVar := Hour . ":" . Minute
            SendInput, %OutputVar%
        return
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- | |
    

; |------------------------------------------------------------------------------------|
; region       |  - - - - - - - - - |  Additional Date Formats  | - - - - - - - - - -  |

    ; Hotstring for ";dtsl" = Today's Date Formatted Like So 01 Dec 2024
    ::;dtsl::
        FormatTime, OutputVar, %A_Now%, dd MMM yyyy  ; Formats date as "01 Dec 2024"
        SendInput, %OutputVar%
    return

    ; Hotstring for ";dtl" = Today's Date Formatted Like So 01-Dec-2024
    ::;dtl::
        FormatTime, OutputVar, %A_Now%, dd-MMM-yyyy  ; Formats date as "01-Dec-2024"
        SendInput, %OutputVar%
    return

    ; Hotstring for ";dtxl" = Today's Date Formatted Like So "01st December 2024" 
    ; Includes Handling For "th" "rd" "st" Superscripts

; endregion    |  - - - - - - - - - |  END OF Additional Date Formats  | - - - - - - - - - -  |


; region       |  - - - - - - - - - |  Additional Date Formats  | - - - - - - - - - -  |

    ; Hotstring for ";dtxl" = Today's Date Formatted Like So "01ˢᵗ December 2024"  
    ; Includes Handling For "th", "rd", "st" Superscripts
    ::;dtxl::
        ; Format the day, month, and year
        FormatTime, Day, %A_Now%, dd
        FormatTime, Month, %A_Now%, MMMM
        FormatTime, Year, %A_Now%, yyyy

        ; Convert Day to integer to remove leading zero
        DayNumber := Day + 0

        ; Determine the ordinal suffix with superscript characters
        if (DayNumber >= 11 && DayNumber <= 13)
            Suffix := Chr(0x1D57) . Chr(0x02B0)  ; 'th' superscript: ᵗʰ
        else
        {
            lastDigit := Mod(DayNumber, 10)
            if (lastDigit = 1)
                Suffix := Chr(0x02E2) . Chr(0x1D57)  ; 'st' superscript: ˢᵗ
            else if (lastDigit = 2)
                Suffix := Chr(0x207F) . Chr(0x1D48)  ; 'nd' superscript: ⁿᵈ
            else if (lastDigit = 3)
                Suffix := Chr(0x02B3) . Chr(0x1D48)  ; 'rd' superscript: ʳᵈ
            else
                Suffix := Chr(0x1D57) . Chr(0x02B0)  ; 'th' superscript: ᵗʰ
        }

        ; Combine day with suffix, month, and year
        FormattedDate := DayNumber . Suffix . " " . Month . " " . Year

        ; Optional: Debugging - Display the formatted date
        ; MsgBox, %FormattedDate%

        ; Set Clipboard to FormattedDate
        ClipboardOld := ClipboardAll
        Clipboard := FormattedDate
        ClipWait, 0.3
        Sleep, 100  ; Add a slight delay to ensure clipboard is ready

        ; Send Ctrl+V to paste the formatted date
        SendInput, ^v
        Sleep, 50  ; Optional small delay after pasting

        ; Restore original clipboard
        Clipboard := ClipboardOld
        ClipboardOld := ""
    return

; endregion    |  - - - - - - - - - |  END OF Additional Date Formats  | - - - - - - - - - -  |


; |-----------------------------------------------------------------------------------------------------------------------------------|
; region       |  - - - - - - - - - - - - - - - - - - | Date Function Modifiers | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; Adding Days (+1 through +7)
        ::;dtp1::
            DateVar := A_Now
            EnvAdd, DateVar, 1, Days  ; Adds 1 day
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtp2::
            DateVar := A_Now
            EnvAdd, DateVar, 2, Days  ; Adds 2 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtp3::
            DateVar := A_Now
            EnvAdd, DateVar, 3, Days  ; Adds 3 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtp4::
            DateVar := A_Now
            EnvAdd, DateVar, 4, Days  ; Adds 4 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtp5::
            DateVar := A_Now
            EnvAdd, DateVar, 5, Days  ; Adds 5 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtp6::
            DateVar := A_Now
            EnvAdd, DateVar, 6, Days  ; Adds 6 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtp7::
            DateVar := A_Now
            EnvAdd, DateVar, 7, Days  ; Adds 7 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return
    ; --------------------------------
    ; Subtracting Days (-1 through -7)
    ; --------------------------------
        ::;dtm1::
            DateVar := A_Now
            EnvAdd, DateVar, -1, Days  ; Subtracts 1 day
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtm2::
            DateVar := A_Now
            EnvAdd, DateVar, -2, Days  ; Subtracts 2 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtm3::
            DateVar := A_Now
            EnvAdd, DateVar, -3, Days  ; Subtracts 3 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtm4::
            DateVar := A_Now
            EnvAdd, DateVar, -4, Days  ; Subtracts 4 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtm5::
            DateVar := A_Now
            EnvAdd, DateVar, -5, Days  ; Subtracts 5 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtm6::
            DateVar := A_Now
            EnvAdd, DateVar, -6, Days  ; Subtracts 6 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return

        ::;dtm7::
            DateVar := A_Now
            EnvAdd, DateVar, -7, Days  ; Subtracts 7 days
            FormatTime, OutputVar, %DateVar%, dd/MM/yyyy
            SendInput, %OutputVar%
        return
    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- | |
    
    ; |--------------------------------------

; region       |  - - - - - - - - - - - - - - - - - - | Time Function Modifiers | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

    ; Adding Hours (+1 through +8)
        ::;hmp1::
            TimeVar := A_Now
            EnvAdd, TimeVar, 1, Hours  ; Adds 1 hour
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp2::
            TimeVar := A_Now
            EnvAdd, TimeVar, 2, Hours  ; Adds 2 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp3::
            TimeVar := A_Now
            EnvAdd, TimeVar, 3, Hours  ; Adds 3 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp4::
            TimeVar := A_Now
            EnvAdd, TimeVar, 4, Hours  ; Adds 4 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp5::
            TimeVar := A_Now
            EnvAdd, TimeVar, 5, Hours  ; Adds 5 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp6::
            TimeVar := A_Now
            EnvAdd, TimeVar, 6, Hours  ; Adds 6 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp7::
            TimeVar := A_Now
            EnvAdd, TimeVar, 7, Hours  ; Adds 7 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmp8::
            TimeVar := A_Now
            EnvAdd, TimeVar, 8, Hours  ; Adds 8 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

    ; --------------------------------
    ; Subtracting Hours (-1 through -8)
    ; --------------------------------
        ::;hmm1::
            TimeVar := A_Now
            EnvAdd, TimeVar, -1, Hours  ; Subtracts 1 hour
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm2::
            TimeVar := A_Now
            EnvAdd, TimeVar, -2, Hours  ; Subtracts 2 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm3::
            TimeVar := A_Now
            EnvAdd, TimeVar, -3, Hours  ; Subtracts 3 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm4::
            TimeVar := A_Now
            EnvAdd, TimeVar, -4, Hours  ; Subtracts 4 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm5::
            TimeVar := A_Now
            EnvAdd, TimeVar, -5, Hours  ; Subtracts 5 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm6::
            TimeVar := A_Now
            EnvAdd, TimeVar, -6, Hours  ; Subtracts 6 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm7::
            TimeVar := A_Now
            EnvAdd, TimeVar, -7, Hours  ; Subtracts 7 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

        ::;hmm8::
            TimeVar := A_Now
            EnvAdd, TimeVar, -8, Hours  ; Subtracts 8 hours
            FormatTime, OutputVar, %TimeVar%, HH:mm
            SendInput, %OutputVar%
        return

    ; endregion  |--  --  -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- | |
    
; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |---------------------------------------------------------------------------------------------------------------------------------------|


; region       |  - - - - - - - - - - - - - - - - -  |  Case Converter Tools & Functions  | - - - - - - - - - - - - - - - - - - - - - -  |


;Convert Text Tool  |  Convert To Upper Case
    ; Define a hotkey combination: Ctrl+Alt+U
    ^!u::
        ; Clear the clipboard
        clipboard := ""
        ; Simulate pressing Ctrl+C to copy selected text
        send ^{c}
        ; Wait for 0.3 seconds for the clipboard to contain data
        clipWait, 0.3
        ; Convert the text in the clipboard to uppercase
        stringUpper, clipboard, clipboard
        ; Simulate pressing Ctrl+V to paste the transformed text
        send ^{v}
        ; End of the hotkey subroutine
    return


;------------------------------------


;Convert Text Tool  |  Convert To Lower Case
    ; Define a hotkey combination: Ctrl+Alt+L
    ^!l:: 
        ; Clear the clipboard
        clipboard := ""
        ; Simulate pressing Ctrl+C to copy selected text
        send ^{c}
        ; Wait for 0.3 seconds for the clipboard to contain data
        clipWait, 0.3
        ; Convert the text in the clipboard to lowercase
        stringLower, clipboard, clipboard
        ; Simulate pressing Ctrl+V to paste the transformed text
        send ^{v}
        ; End of the hotkey subroutine
    return

;------------------------------------


;Convert Text Tool  |  Convert To Sentence Case
    ; Define a hotkey combination: Ctrl+Alt+T
    ^!t:: 
        ; Clear the clipboard
        clipboard := ""
        ; Simulate pressing Ctrl+C to copy selected text
        send ^{c}
        ; Wait for 0.3 seconds for the clipboard to contain data
        clipWait, 0.3
        ; Convert the text in the clipboard to title case
        stringLower, clipboard, clipboard, T
        ; Simulate pressing Ctrl+V to paste the transformed text
        send ^{v}
        ; End of the hotkey subroutine
    return

;------------------------------------


;Convert Text Tool  |  Convert To Pascal Snake Case
    ; Define a hotkey combination: Ctrl+Alt+_
    ^!-:: 
        clipboard := ""  ; Clear the clipboard
        send ^{c}        ; Simulate pressing Ctrl+C to copy selected text
        clipWait, 0.3    ; Wait for 0.3 seconds for the clipboard to contain data
        ; Normalize the text (similar to previous version)
        clipboard := RegExReplace(clipboard, "[^\w\s]+", "") 
        clipboard := RegExReplace(clipboard, "\s+", " ") 
        clipboard := RegExReplace(clipboard, "(^|\b)(\w)", "$u2")  ; Capitalize using word boundaries
        ; Replace spaces with underscores
        clipboard := RegExReplace(clipboard, "\s", "_") 
        send ^{v}  ; Simulate pressing Ctrl+V to paste the transformed text   
    return 

;------------------------------------

; Convert Text Tool | Toggle == before and after each line
; Define a hotkey combination: AltGr+H
^!h::
    clipboard := "" ; Clear the clipboard
    send ^{c} ; Simulate pressing Ctrl+C to copy selected text
    clipWait, 0.3 ; Wait for 0.3 seconds for the clipboard to contain data
    ; Split the clipboard text into lines
    lines := StrSplit(clipboard, "`n")
    ; Initialize a variable for the new text
    newText := ""
    ; Loop through each line
    for index, line in lines {
        ; Trim any leading or trailing whitespace
        line := Trim(line)
        ; Check if the line already starts and ends with ==
        if (RegexMatch(line, "^==.*==$")) {
            ; Remove the == from the start and end
            line := SubStr(line, 3, -2)
        } else {
            ; Add == before and after the line
            line := "==" . line . "=="
        }
        ; Append the processed line to newText
        newText .= line . "`n"
    }
    ; Remove the last newline character
    StringTrimRight, newText, newText, 1
    ; Set the modified text back to the clipboard
    clipboard := newText
    ; Simulate pressing Ctrl+V to paste the transformed text
    send ^{v}
    ; End of the hotkey subroutine
return

; |---------------------------------------------------------------------------------------------------------------------------------------|
; region       |  - - - - - - - - - - - - - - - - - |  Small Text String Dividers  | - - - - - - - - - - - - - - - - - - - - - - - - - -- |

;------------------
;TEXT   |  Divider
    ;ACTION |  AltGr + I
    ;Use For Folder Names Etc To Ensure Consistency
    ;------------------
    !<^i:: 
    {
        SendInput  {Space}{Space}I{Space}{Space}
        return
    }

;------------------
;TEXT   |  Pipe Divider
    ;ACTION |  AltGr + |
    ;Use For Folder Names Etc To Ensure Consistency
    ;------------------
    !<^\::
    {
        SendInput  {Space}{Space}|{Space}{Space}
        return
    }

;------------------
;TEXT   |  Dash Divider
    ;ACTION |  AltGr + =
    ;Types out "_--_" for quick divider use
    ;Used in file and folder naming to seperate start code and main elements within text string
    ;------------------
    !<^=:: 
    {
        SendInput, _--_
        return
    }


; |---------------------------------------------------------------------------------------------------------------------------------------|

;-------------------------------
;         HTML SNIPPETS
;-------------------------------

;------------------
;COMMENT
    ;ACTION |  ;cm01
    ;Use For Titles For HTML Code Blocks
    ;------------------
    ::;cm01:: 
    {
        SendInput <!--- - - - - TITLE - - - - --->
        return
    }

;------------------
;COMMENT
    ;ACTION |  ;cm02
    ;Use For End Of Code Blocks
    ;------------------
    ::;cm02:: 
    {
        SendInput <!--- - - - - - X - - - - - --->
        return
    }


; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |---------------------------------------------------------------------------------------------------------------------------------------|


; region       |  - - - - - - - - - - - - - - - - - - - - |  Custom Hotkeys  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - -- |


    ; region       |  - - - - - - - - - - - - - - - - - |  HTML Snippet Hotkeys  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

        ; Hotkey: Shift + Numpad "-"
        +NumpadSub::
            if (A_PriorHotkey = "+NumpadSub" and A_TimeSincePriorHotkey < 1000)
            {
                ; Double press detected within one second
                SendInput, <li> Enter_Point </li>
                
                ; Move the cursor to the position of the pipe symbol "|"
                ; "<li> Enter_Point </li>" is 21 characters
                ; The pipe "|" is intended to be placed after "<li> ", which is 5 characters
                ; Therefore, move the cursor left by (21 - 5) = 16 characters
                Send, {Left 17}
            }
            return

    ; endregion       | - - - - - - - - - - - - - - - - |  HTML Snippet Hotkeys  | - - - - - - - - - - - - - - - - - - - - - - - - - - -  |


; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; |-------------------------------------------------------------------------------------------------------------------------------------  |

; region  |  - - - - - - - - - - - - - - - - - - - - - - - |  Open .html Files in VS Code via Control + Shift + Left-Click  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

; Ensure the following hotkey is active only in Windows Explorer
#If WinActive("ahk_class CabinetWClass") || WinActive("ahk_class ExplorerWClass")

; Intercept the Control + Shift + Left-Click
$^+LButton::
    ; Get the mouse position and window under the cursor
    MouseGetPos, xpos, ypos, winUnderMouse, controlUnderMouse

    ; Retrieve the selected file's path
    selectedFilePath := GetSelectedFilePath()
    if (selectedFilePath = "")
    {
        ; No file selected or clipboard operation failed
        return
    }

    ; Check if the file has a .html extension (case-insensitive)
    SplitPath, selectedFilePath, , , fileExt
    StringLower, fileExtLower, fileExt
    if (fileExtLower = "html" || fileExtLower = "htm")
    {
        ; Path to Visual Studio Code executable
        vsCodePath := "C:\Users\Administrator\AppData\Local\Programs\Microsoft VS Code\Code.exe"
        ; Check if VS Code exists at the specified path
        if (FileExist(vsCodePath))
        {
            ; Open the .html file in VS Code
            Run, "%vsCodePath%" "%selectedFilePath%"  ; Ensure paths are enclosed in quotes
            return  ; Prevent the default action
        }
        else
        {
            ; VS Code not found, notify the user
            MsgBox, 16, Error, VS Code not found at:`n%vsCodePath%
            return
        }
    }
    ; If not an .html file or conditions not met, allow default action
return

#If  ; End of context-sensitive hotkeys

; Function to retrieve the selected file's path
GetSelectedFilePath()
{
    ; Save the current clipboard content
    ClipSaved := ClipboardAll
    Clipboard := ""  ; Clear the clipboard

    ; Send Ctrl+C to copy the selected file path
    Send, ^c
    ; Wait for the clipboard to contain data (up to 0.5 seconds)
    ClipWait, 0.5
    if (ErrorLevel)
    {
        ; Clipboard didn't update in time
        Clipboard := ClipSaved  ; Restore original clipboard
        return ""
    }

    ; Retrieve the copied file path
    localFilePath := Clipboard  ; Local variable to avoid conflict

    ; Restore the original clipboard content
    Clipboard := ClipSaved

    ; Trim any surrounding whitespace
    localFilePath := Trim(localFilePath)

    return localFilePath
}

; endregion    |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |

; region       |  - - - - - - - - - - - - - - - - |  Media Pause Hotkey  | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |

; This script binds AltGr + M to the media pause function

; Define the hotkey for AltGr + M
<^>!m:: 
    ; Simulate the media play/pause key
    Send, {Media_Play_Pause}
    return

; endregion       |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |



; region | - - - - - - - - - - - - - - - - - - |  STANDARDISED COMMENTS  | - - - - - - - - - - - - - - - - - - - - - - - - - - |
; Standardised comment hotstrings for Python/Ruby development
; - Provides consistent spacing for inline comments
; - Supports both 8-space and 16-space alignment
; - Automatically inserts attention marker for quick reference
; - Works with Python (#) and Ruby (#) comment syntax
; - Maintains clean code formatting standards


; 16-space aligned comment
    ::;;p::
    ::;;r::
    ::;;comment::
    ::;ruby_comment::
    ::;python_comment::
        SendInput {Space 16}{#} <---- ATTENTION
    return


; endregion       |  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |


; endregion

