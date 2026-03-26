# Python  -  Standard Archival Extraction Script
###### `Py_FileUtils__FileCompression__StandardArchivalScript__Unzip__ReadMe__.md`
---
### Script Purpose

-   **Sister Script** to the Standard Archival Compression Script
-   Standardise and automate the task of **extracting** long-term project archives
-   Provides corruption detection and repair capabilities using PAR2 recovery files
-   Advanced error handling and verification systems for data integrity
-   Project files contain many different file types that were compressed using advanced .7z compression

---
### Key Features

#### Archive Extraction & Verification
-   **7z Archive Support:** Full extraction of .7z archives using py7zr library
-   **Corruption Detection:** Multi-layer verification before and after extraction
-   **PAR2 Recovery:** Automatic verification and repair using PAR2 recovery files
-   **Integrity Testing:** Built-in archive integrity testing using py7zr
-   **Checksum Verification:** SHA256 checksum validation for data integrity

#### Error Handling & Recovery
-   **Automatic Repair:** PAR2-based automatic repair of corrupted archives
-   **Skip Corrupted:** Option to skip corrupted archives and continue processing
-   **Detailed Error Reports:** Comprehensive error logging and reporting
-   **Recovery Statistics:** Detailed statistics on repair success/failure rates

#### User Interface & Experience
-   **GUI Interface:** Similar interface to compression script for consistency
-   **Progress Tracking:** Real-time progress bars and status updates
-   **Batch Processing:** Select and extract multiple archives simultaneously
-   **Noble Architecture Branding:** Consistent branding with compression script

---
### Archive Extraction Process

#### PHASE 1: LIBRARY LOADING
```pseudocode
1. LOAD BASIC PYTHON LIBRARIES
   - Loads Python Libraries Required for basic script functions and OS interaction

2. LOAD 7ZIP EXTRACTION PYTHON LIBRARIES
   - Loads py7zr library from ./02__LocalScope__ExternalCodeLibraries
   - Includes all required modules for 7z extraction

3. LOAD TKINTER GUI LIBRARIES
   - Loads GUI libraries for user interface

4. VALIDATION OF ALL LIBRARIES
   - Confirms all libraries loaded successfully
```

#### PHASE 2: CONFIGURATION INITIALIZATION
```pseudocode
5. STANDARD CONFIGURATION
   - Default settings for extraction operations
   - PAR2 verification and repair settings
   - Error handling and recovery options
   - GUI dropdown menus for user control
```

#### PHASE 3: USER INTERACTION & ARCHIVE SELECTION
```pseudocode
6. ARCHIVE SELECTION
   - GUI file dialog for selecting .7z archives
   - Multiple archive selection support
   - Archive validation and listing

7. EXTRACTION DESTINATION
   - Same Directory: Extract to folder named after archive
   - Sub Folder: Extract to "Extracted" subfolder
   - Select Directory: User-specified extraction location
```

#### PHASE 4: VERIFICATION & EXTRACTION PROCESS
```pseudocode
8. PRE-EXTRACTION VERIFICATION
   - PAR2 verification (if enabled)
   - Archive integrity testing using py7zr
   - Automatic repair attempts if corruption detected

9. EXTRACTION PROCESS
   - Create extraction directories
   - Extract all files preserving structure
   - Progress tracking and logging

10. POST-EXTRACTION VERIFICATION
    - PAR2 verification of extracted data
    - Checksum validation (if enabled)
    - File count and size verification
```

#### PHASE 5: REPORTING & COMPLETION
```pseudocode
11. EXTRACTION STATISTICS
    - Per-archive extraction metrics
    - Corruption detection reports
    - PAR2 repair status
    - Performance statistics

12. COMPLETION REPORTING
    - Success/failure summary
    - Corruption and repair statistics
    - Log file generation (GUI_Dump mode)
```

---
### Configuration Options

#### Script Default Configuration Options
```Config__ScriptDefaultConfig
SCRIPT DEFAULT CONFIGURATION
Script Mode              =  GUI
Extract To Folder        =  SameDirectory
Overwrite Existing       =  Ask
Preserve Timestamps      =  Yes
Create Extraction Log    =  Yes
Verify Before Extract    =  Yes
Verify After Extract     =  Yes
Checksum Verification    =  Yes
Checksum Algorithm       =  SHA256
SevenZip Library         =  ./02__LocalScope__ExternalCodeLibraries/
PAR2 Engine Path         =  ./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j.exe
PAR2 Repair Enabled      =  Yes
PAR2 Engine              =  AUTO
PAR2 Verify Mode         =  BeforeExtract
Stop On Error            =  No
Skip Corrupted           =  Yes
Create Error Report      =  Yes
```

#### Script Mode Options
```Config__ScriptVariables__Script Mode
SCRIPT MODES
ScriptMode__GUI       =   Uses the GUI for user interaction
ScriptMode__GUI_Dump  =   Uses the GUI + dumps console log to .txt file
ScriptMode__HEADLESS  =   Automation and batch processing (future feature)
```

#### Extract To Folder Options
```Config__ScriptVariables__Extract To Folder
EXTRACT TO FOLDER
Variable Name                    | UI Appearance      |   Description
------------------------------------------------------------------------------------
ExtractToFolder__SameDirectory  =  SameDirectory     =  Extract to folder named after archive in same location
ExtractToFolder__SelectDirectory =  SelectDirectory  =  User selects extraction destination
ExtractToFolder__SubFolder      =  SubFolder         =  Extract to "Extracted" subfolder
```

#### Overwrite Existing Options
```Config__ScriptVariables__Overwrite Existing
OVERWRITE EXISTING
Variable Name              | UI Appearance |   Description
------------------------------------------------------------------------------------
OverwriteExisting__Ask     =  Ask          =  Prompt user for each conflict
OverwriteExisting__Yes     =  Yes          =  Automatically overwrite existing files
OverwriteExisting__No      =  No           =  Skip extraction if files exist
OverwriteExisting__Rename  =  Rename       =  Rename extraction folder to avoid conflicts
```

#### PAR2 Repair Options
```Config__ScriptVariables__PAR2 Repair
PAR2 REPAIR
Variable Name           | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2Repair__Yes         =  Yes          =  Enable PAR2 verification and repair
PAR2Repair__No          =  No           =  Disable PAR2 functionality
```

#### PAR2 Verify Mode Options
```Config__ScriptVariables__PAR2 Verify Mode
PAR2 VERIFY MODE
Variable Name                    | UI Appearance    |   Description
------------------------------------------------------------------------------------
PAR2VerifyMode__BeforeExtract    =  BeforeExtract  =  Verify PAR2 before extraction only
PAR2VerifyMode__AfterExtract     =  AfterExtract   =  Verify PAR2 after extraction only
PAR2VerifyMode__Both             =  Both           =  Verify PAR2 before and after extraction
PAR2VerifyMode__Skip             =  Skip           =  Skip PAR2 verification entirely
```

#### Error Handling Options
```Config__ScriptVariables__Error Handling
ERROR HANDLING
Variable Name                | UI Appearance        |   Description
------------------------------------------------------------------------------------
StopOnError__Yes             =  Yes                =  Stop processing on first error
StopOnError__No              =  No                 =  Continue processing despite errors
SkipCorrupted__Yes           =  Yes                =  Skip corrupted archives and continue
SkipCorrupted__No            =  No                 =  Fail if corrupted archives found
CreateErrorReport__Yes       =  Yes                =  Generate detailed error reports
CreateErrorReport__No        =  No                 =  Basic error logging only
```

---
### PAR2 Integration & Corruption Handling

#### PAR2 Recovery System
The extraction script provides comprehensive PAR2 integration for handling corrupted archives:

**Automatic Detection:**
- Scans for PAR2 files associated with each archive
- Supports both .par2 and .vol*.par2 recovery files
- Compatible with MultiPar PAR2J and standard PAR2 engines

**Verification Process:**
1. **Pre-Extraction Verification:** Verify archive integrity before extraction
2. **Automatic Repair:** Attempt repair if corruption detected
3. **Post-Extraction Verification:** Verify extracted data integrity
4. **Status Reporting:** Detailed PAR2 operation status

**Recovery Scenarios:**
- **VERIFIED:** Archive passed PAR2 verification
- **REPAIRED:** Archive was corrupted but successfully repaired
- **NO_PAR2:** No PAR2 files found (extraction continues)
- **VERIFICATION_FAILED:** PAR2 verification failed
- **REPAIR_FAILED:** PAR2 repair attempt failed

#### Corruption Detection Layers
```layers
CORRUPTION DETECTION LAYERS
Layer 1: PAR2 Verification    =  External PAR2 engine verification
Layer 2: py7zr Integrity     =  Built-in archive integrity testing
Layer 3: Checksum Validation =  SHA256 checksum verification
Layer 4: File Count Check    =  Verify expected number of files extracted
Layer 5: Size Validation     =  Compare extracted size with expected
```

---
### Console Log Format

#### Per-Archive Extraction Log
```ConsoleLog__PerArchiveLog
\n                               # <--Note : A Linebreak to separate these status blocks
------------------------------
ARCHIVE METADATA
Archive       =  1  of 15        # <-- "15" is example, actual number of archives selected
Archive Name  =  Archive__ProjectName__07-Sep-2025__LongTermArchive.7z
Extracted     =  Successful      # <-- Success = True, Failure = False
Corruption    =  None Detected   # <-- Only shown if corruption was detected
\n
ARCHIVE EXTRACTION
Extraction Time   =  00:02:30    # <-- Format: HH:MM:SS
Files Extracted   =  1,247       # <-- Number of files extracted from archive
Extraction Speed  =  25.3MB/s    # <-- Speed averaged over entire extraction time
PAR2 Status       =  VERIFIED    # <-- VERIFIED, REPAIRED, NO_PAR2, FAILED, etc.
------------------------------
\n
```

---
### Installation & Dependencies

#### Required Libraries
The extraction script uses the same libraries as the compression script:

```powershell
# Install py7zr and dependencies to local folder
python -m pip install py7zr pycryptodomex --target .\02__LocalScope__ExternalCodeLibraries

# Install tkinter (usually included with Python)
python -m pip install tk --target .\02__LocalScope__ExternalCodeLibraries
```

#### PAR2 Tools
Uses the same PAR2 tools as the compression script:
- **Location:** `./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/`
- **Primary Engine:** `par2j.exe` (MultiPar PAR2J engine)
- **Fallback:** `par2.exe` (standard PAR2 engine)

---
### Usage Instructions

#### GUI Mode Operation
1. **Launch Script:** Run `Py_FileUtils__FileCompression__StandardArchivalScript__Unzip__.py`
2. **Select Archives:** Click "Add Archives" to select .7z files for extraction
3. **Configure Settings:** Adjust extraction settings in Configuration panel
4. **Start Extraction:** Click "Start Extraction" to begin processing
5. **Monitor Progress:** Watch progress bar and log for real-time status
6. **Review Results:** Check completion summary and any error reports

#### Batch Processing
- Select multiple archives simultaneously
- Each archive extracts to its own folder
- Progress tracked per archive
- Continue processing even if some archives fail

#### Error Recovery
- Corrupted archives automatically trigger PAR2 repair attempts
- Option to skip corrupted archives and continue with remaining
- Detailed error logging for troubleshooting
- Recovery statistics in completion report

---
### Output File Structure

#### Extraction Directory Structure
```structure
Original Archive: Project__ClientName__07-Sep-2025__LongTermArchive.7z

Extracted to: Project__ClientName__07-Sep-2025__LongTermArchive/
├── [Original folder structure preserved]
├── file1.dwg
├── file2.skp
├── subfolder1/
│   ├── file3.pdf
│   └── file4.jpg
└── subfolder2/
    └── file5.layout
```

#### Log Files (GUI_Dump Mode)
```files
Generated Files:
- ArchiveExtractionLog__07-Sep-2025__LongTermArchive.txt
  └── Complete extraction log with all operations and statistics
```

---
### Sister Script Relationship

This extraction script is designed as a **sister script** to the compression script:

#### Shared Components
- **Same Library Dependencies:** Uses identical py7zr and PAR2 libraries
- **Consistent UI Design:** Similar Noble Architecture branding and layout
- **Compatible Configuration:** Similar settings structure and options
- **Matching Log Format:** Consistent logging and reporting format

#### Complementary Functionality
- **Compression Script:** Creates .7z archives with PAR2 recovery files
- **Extraction Script:** Extracts .7z archives with PAR2 verification and repair
- **Round-Trip Compatibility:** Archives created by compression script fully supported
- **Recovery Workflow:** PAR2 files created during compression used for extraction repair

#### File Naming Consistency
```naming
Compression Output:  Archive__ProjectName__07-Sep-2025__LongTermArchive.7z
                    Archive__ProjectName__07-Sep-2025__LongTermArchive.par2
                    Archive__ProjectName__07-Sep-2025__LongTermArchive.vol*.par2

Extraction Input:   Archive__ProjectName__07-Sep-2025__LongTermArchive.7z (+ PAR2 files)
Extraction Output:  Archive__ProjectName__07-Sep-2025__LongTermArchive/ (folder)
```

---
### Error Codes & Status Messages

#### Archive Status Codes
```status_codes
SUCCESS          =  Archive extracted successfully
FAILED           =  Archive extraction failed
CORRUPTED        =  Corruption detected, extraction skipped
REPAIRED         =  Corruption detected and repaired, extraction successful
NO_PAR2          =  No PAR2 files found, extraction completed without verification
PAR2_FAILED      =  PAR2 verification/repair failed
INTEGRITY_FAILED =  Archive integrity test failed
```

#### PAR2 Status Codes
```par2_status
VERIFIED         =  PAR2 verification passed
REPAIRED         =  Archive repaired using PAR2
NO_PAR2          =  No PAR2 files found
NO_ENGINE        =  PAR2 engine not available
VERIFICATION_FAILED = PAR2 verification failed
REPAIR_FAILED    =  PAR2 repair attempt failed
ERROR            =  PAR2 operation error
```

---
### Performance & Statistics

#### Extraction Metrics
- **Extraction Time:** Total time per archive
- **Extraction Speed:** MB/s throughput rate
- **Files Extracted:** Count of files extracted
- **Size Verification:** Original vs extracted size comparison
- **Success Rate:** Percentage of successful extractions

#### Recovery Statistics
- **Corruption Detection Rate:** Percentage of archives with detected corruption
- **Repair Success Rate:** Percentage of corrupted archives successfully repaired
- **PAR2 Availability:** Percentage of archives with PAR2 recovery files
- **Verification Coverage:** Percentage of archives verified with PAR2

---

###### END OF DOCUMENTATION
