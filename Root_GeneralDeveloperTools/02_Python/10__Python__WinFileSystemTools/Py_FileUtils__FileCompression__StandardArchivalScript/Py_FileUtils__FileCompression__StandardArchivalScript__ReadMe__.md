# Python  -  Standard Archival Compression Script
###### `Py_FileUtils__FileCompression__StandardArchivalScript__ReadMe__.md`
---
### Script Purpose

-   Standardise, and automate the task of Archiving long term project files.
-   Project files contain many different file types for production such as . . .

    ```FileTypes
    .jpg
    .png
    .pdf
    .dwg
    .dxf
    .skp
    .layout
    .laz
    .las
    .glb
    .obj
    ```

-   Many of these files will contain identical data, thus the use of capable libraries for compression makes very much sense vs using the standard .zip format.
-   The aim to to create a highly optimised compression system.

---
### Project Back-up File Removal
- Certain duplicate files will be present in the project files.
- These will be removed **BEFORE** the compression process.
- BackUp Files Removal Step is included to reduce the size of the project files before the compression process.
  

##### Standard Back-up File Types To Be Removed
```FileTypes
File Extension |   Description
----------------------------------
.skb           |   SketchUp Backup File - These are the standard backup files that are duplicates of the working SketchUpfile.
```



##### Special Case Files To Be Removed

- In this section we will cover the special case files that need to be removed before the compression process.
- These files need additional logic to be applied to them before they are removed.

#### SketchUp Layout Back-up Files
- SketchUp Layout files do not use a specific file extension for backup files, they still use the `.layout` extension.
- The software automatically creates a backup file when the file is saved and appends the prefix `Backup of ` to the file name.
- Its important to ensure to differentiate between the working file and the backup file, only the "Backup of" Files need to be purged.
- Ensure the .layout files without the prefix `Backup of ` are not targeted for removal and that they are kept removing just the "Backup of" prefixed .Layout Files.
.layout files with the prefix `Backup of `

#### Examples Of The SketchUp Layout Back-up File Vs Working File

```
To Keep File  =  `GA04_T02_D02__DesignProposalDrawings__RevC__1.0.0__.layout`
Backup File   =  `Backup of GA04_T02_D02__DesignProposalDrawings__RevC__1.0.0__.layout`
```


---

### Compression System Selected  -  `.7z`
- `.7z` is a very capable compression format and can be very efficient.
- It is a modern & popular format and is supported by many different compression libraries.
- It uses much more advanced compression algorithms than the standard .zip format.

---

### Installing 7zip Python Libraries 
- The 7zip Python libraries are not included in the standard Python library.
- They are a third-party library and must be installed separately.
- I've chosen to install them into a custom folder called `./02__LocalScope__ExternalCodeLibraries` in this Main script's Root Directory.

#### PowerShell  Command To Download Library  

-   PIP Installs the packages Into a Custom Folder.
    -   In this case the this projects main script's Root Directory.
-   Uses the dependencies folder in the current root.

#### PowerShell PIP

```powershell
#Command : Using PIP to Download put dependencies into ./02__LocalScope__ExternalCodeLibraries
python -m pip install py7zr pycryptodomex --target .\02__LocalScope__ExternalCodeLibraries
```
#### Instalation Log
```log
Install Note :  `./02__LocalScope__ExternalCodeLibraries` dependencies folder now contains py7zr and all required modules.
Completed    :  07-Sep-2025  -  14:30
```

---

### Installing Tkinter Python Libraries 
- Tkinter is typically included with Python installations, but for consistency with local dependencies management.
- Installing tkinter locally ensures version control and project isolation.
- I've chosen to install them into the same custom folder called `./02__LocalScope__ExternalCodeLibraries` in this Main script's Root Directory.

#### PowerShell  Command To Download Tkinter Library  

-   PIP Installs the tkinter package Into a Custom Folder.
    -   In this case the this projects main script's Root Directory.
-   Uses the dependencies folder in the current root.

#### PowerShell PIP

```powershell
#Command : Using PIP to Download tkinter dependencies into ./02__LocalScope__ExternalCodeLibraries
python -m pip install tk --target .\02__LocalScope__ExternalCodeLibraries
```
#### Installation Log
```log
Install Note :  `./02__LocalScope__ExternalCodeLibraries` dependencies folder now contains tk and all required modules.
Completed    :  07-Sep-2025  -  14:50
```

---

### Installing PAR2 Command Line Tools
- PAR2 (Parity Archive Volume Set) tools are required for creating recovery files that can repair corrupted or missing archive data.
- The py7zr library does NOT include PAR2 functionality - a separate PAR2 engine is required.
- PAR2 tools are standalone executables that work independently of Python libraries.
- I've chosen to bundle the PAR2 executables into a custom folder called `./02__LocalScope__ExternalCodeLibraries\02_01__ExternalCodeLibraries__Par2Library\` in this Main script's Root Directory.

#### PAR2 Tool Selection and Download

-   **Windows:** MultiPar CLI (`par2j.exe`) or `par2.exe` from par2cmdline
-   **Raspberry Pi:** `par2` from par2cmdline  
-   **Cross-Platform:** There is no well-maintained pure-Python PAR2 creator - external executables are required

#### Manual Download and Setup
```setup
# PAR2 executables available in PAR2 library directory
./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j.exe    (Windows - MultiPar PAR2J engine)
./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j64.exe  (Windows 64-bit - MultiPar PAR2J engine)
./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par1j.exe    (Windows - PAR1 engine)
./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/MultiPar.exe (Windows - GUI application)
./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/sfv_md5.exe  (Windows - SFV/MD5 verification tool)
```

#### Installation Log
```log
Install Note :  `./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/` directory contains MultiPar suite with all required PAR2 command line tools.
Install Type :  MultiPar 1.3.3.4 complete installation
Available    :  par2j.exe, par2j64.exe, par1j.exe, MultiPar.exe, sfv_md5.exe
Completed    : 07-Sep-2025  -  16:00
```

---

### The Main Script
- The Main Script is located in the projects Root Directory.
  - `Py_FileUtils__FileCompression__StandardArchivalScript__Main__.py`


#### Pseudocode Breakdown of the Main Script
```pseudocode
When Executed This Script The Following In This Order

PHASE 1 : LOADING LIBRARIES
---------------------------

1. LOAD BASIC PYTHON LIBRARIES
  - Loads Python Libraries Required for the basic script functions and OS interaction.

2. TKINTER PYTHON LIBRARIES
  - Loads Python Libraries Required for the basic script functions and OS interaction.
  - Targets Folder : Systems Default Dependencies Folder, TKINTER is widely used for GUI development.
  - Thus requiring user pre installation of TKINTER is fine due to the wide use of TKINTER in the Python community.

3. LOAD 7ZIP COMPRESSION PYTHON LIBRARIES
  - Loads Python Libraries Required for the **Compression Process**.
  -  Targets Folder : `./02__LocalScope__ExternalCodeLibraries`
  -  This includes the `py7zr` library and all required modules.

4. VALIDATION OF ALL LIBRARIES
  - Prints a simple console log to confirm that all libraries have been loaded successfully.
  
---------------------------

THEN . . . 

PHASE 2 : INITIALISATION OF STANDARD CONFIGURATION
--------------------------------------------------        

5. STANDARD CONFIGURATION
  - These are the default settings for the script.
  - These can be overridden by the user if desired.
  - There is dropdown menus in the UI for control of the compression method, compression level and compression ratio.


PHASE 3 : USER INTERACTION & ARCHIVE CREATION
---------------------------------------------

6. USER INTERACTION & ARCHIVE CREATION
  - Prompt user for selection of top level folders to be compressed.
  - Script then targets Folders For Compression
  - Uses system OS file management system GUI for selection of the top level folder / folders to be compressed.
  - This marks each folder as an individual archive.
  - The individual project folders in the selection will contain multiple files and Subfolders.
  - Each of these top level folders acts as a parent container and each parent for each project folder becomes archives.

7. MARK AND LOG THE INDIVIDUAL ARCHIVES TO BE COMPRESSED
  - !Important Step! as the compression logic will loop through each archive and compress each one by one.
  - Fetch and Log the name of each Archive before it loops through.  
    - `./NameIsEachTopLevelFolder`
    - If the user selects 10 folders, then there will be 10 archives to be compressed.
  - This allows for the implementation of a progress bar and a log of the compression process later down the line.
    - The Bar is calculated based on the total number of archives to be compressed, 10 archives = 10% progress per archive completed.

8. DELETE STANDARD BACK-UP FILES
  - Deletes the standard back-up files from the project files.
  PreProcess__PurgeSketchUpBackupFiles()
    - These are the standard backup files that are duplicates of the working SketchUp files.
  PreProcess__PurgeLayoutBackupFiles()
    - These are the standard backup files that are duplicates of the working Layout files.
---------------------------------------------

THEN . . . 

PHASE 4 : READ AND VALIDATE CONFIGURATION SETTINGS
-----------------------------------------------
9. PREPARE COMPRESSION PROCESS
  - Reads the configuration settings for the compression process.
    - If none set in the UI then default settings are used.
  - Validation of the configuration settings.
    - If the configuration settings are not valid then the script will stop and report the error to the user.
    - If the configuration settings are valid then the script will continue.
---------------------------------------------

THEN . . . 

PHASE 5 : CORE ARCHIVE COMPRESSION PROCESS LOOP
-----------------------------------------------

11. RUN METHODS AND FUNCTIONS FROM THE EXTERNAL COMPRESSION PYTHON LIBRARIES
  - Uses the 7zip library within `02__LocalScope__ExternalCodeLibraries`
  - Loops through each archive and compresses each one individually before moving on to the next archive.
  - No Encryption is required, this simplifies the libraries required and processing overhead.
  - Applies the 7zip libraries compression based on the configuration settings.
  - Applies the PAR2 libraries compression based on the configuration settings.

12. LOG THE COMPRESSION PROCESS DATA ABD REPORT BACK TO THE USER
  - The log will also include meta info and report back metric and status of the archive after compression.
    - Use `ConsoleLog__PerArchiveLog` Function for the format of the per archive logging.
  Outputs Follow This String Name
  - `./Archive__NamedTheSameAsTheParentFolder__DD-MMM-YYYY__LongTermArchive.7z`
  - Reports each of the archives completion and updates the TKinter loading bar element.
  - If ScriptMode__GUI_Dump is set then the log will be dumped to a .txt file in the same directory as the script.
    - The file will be named `./ArchiveCompressionLog__DD-MMM-YYYY__LongTermArchive.txt`
    - Note this logs all of the archives data in sequence.
-----------------------------------------------

THEN . . .

PHASE 6 : ARCHIVE COMPLETION
-----------------------------------------------
12. ARCHIVE COMPLETION
  - User interface will report the completion of the compression process.
  - Highlight the success of the compression process.
  - Highlight the failure and issues encountered during the compression process.

END

-----------------------------------------------


```

---


### ConsoleLog__PerArchiveLog Function Output
```ConsoleLog__PerArchiveLog
\n                               # <--Note : A Linebreak to seperate these status blocks.
------------------------------
ARCHIVE METADATA
Archive       =  1  of 28        # <-- "28" is an example, it will be the amount of archives detected back at the start.
Archive Name  =  SM01__Smith     # <-- This value is an example, The script uses the top level folder names captured earlier.
Compressed    =  Successful      # <-- Logs whether the archive was compressed successfully or not. Success = True, Failure = False.
\n
ARCHIVE COMPRESSION
Compression Time   =  01:10.00   # <-- This value is an example, Compression Time reported. Format : HH:MM:SS
Compression Level  =  Highest    # <-- This value is an example, Highest Compression Level reported.
Compression Speed  =  10.0MB/s   # <-- This value is the speed averaged over the entire archive processing time for the compression process.
Compression Method =  LZMA2      # <-- This value is an example, Compression Method reported.
------------------------------
\n
\n                               # <--Note : A Linebreak to seperate these status blocks.
------------------------------
ARCHIVE METADATA
Archive       =  2  of 28        # <-- "28" is an example, it will be the amount of archives detected back at the start.
Archive Name  =  JN01__Johnson   # <-- This value is an example, The script uses the top level folder names captured earlier.
Compressed    =  Successful      # <-- Logs whether the archive was compressed successfully or not. Success = True, Failure = False.
\n
ARCHIVE COMPRESSION
Compression Time   =  01:10.00   # <-- This value is an example, Compression Time reported. Format : HH:MM:SS
Compression Level  =  Highest    # <-- This value is an example, Highest Compression Level reported.
Compression Speed  =  10.0MB/s   # <-- This value is the speed averaged over the entire archive processing time for the compression process.
Compression Method =  LZMA2      # <-- This value is an example, Compression Method reported.
------------------------------
\n
\n Continue Loop . . .
```


---

### Configuration Options
- This section lists the variables and their corresponding options for the script.
- Shows the options that populate the UI elements for the users selection.
- By default the standard configuration is as listed and ensures Max Compression at the expense of Processing Time.


#### Script Default Configuration Options
```Config__ScriptDefaultConfig
SCRIPT DEFAULT CONFIGURATION
Script Mode          =  GUI
Archive Format       =  7Z
Compression Method   =  LZMA2
Compression Level    =  Highest Compression
Solid Mode           =  On
Dictionary Size      =  Auto
Threads              =  Auto
Split Volumes        =  None
SevenZip Library     =  ./02__LocalScope__ExternalCodeLibraries/
PAR2 Engine Path     =  ./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j.exe
PAR2 Required        =  Yes
PAR2 Engine          =  AUTO
PAR2 Scope           =  PerArchive
PAR2 Slice Size      =  AUTO
PAR2 Recovery Files  =  AUTO
PAR2 Redundancy      =  10.0%
PAR2 Verify Mode     =  AfterCreate
Verify After Create  =  On
Verify After Copy    =  On
Checksum Algorithm   =  SHA256
Encryption           =  None
```


#### Script Mode Options
```Config__ScriptVariables__Script Mode
SCRIPT MODES
ScriptMode__GUI       =   Uses the GUI for user interaction.
ScriptMode__GUI_Dump  =   Uses the GUI for user interaction. Dumps the console log to a .txt file in the same directory as the script.
ScriptMode__HEADLESS  =   Automation and batch processing when called from another script.
```


#### Compression Method Options
```Config__ScriptVariables__Compression Method
COMPRESSION METHODS
Variable Name             | UI Appearance |   Description
------------------------------------------------------------------------------------
CompressionType__LZMA2    =   LZMA2       =   Selects the LZMA2 compression method.      
CompressionType__LZMA     =   LZMA        =   Selects the LZMA compression method.
CompressionType__PPMD     =   PPMD        =   Selects the PPMD compression method.
CompressionType__BZIP2    =   BZIP2       =   Selects the BZIP2 compression method.
CompressionType__DEFLATE  =   DEFLATE     =   Selects the DEFLATE compression method.
CompressionType__COPY     =   COPY        =   Selects the COPY compressi on method.
```


#### Compression Level Options
```Config__ScriptVariables__Compression Level
COMPRESSION LEVELS
Variable Name                        | UI Appearance           |   Description
------------------------------------------------------------------------------------
CompressionLevel_HighestCompression  =  Highest Compression       =  Selects the Highest Compression level.
CompressionLevel_FastestProcessing   =  Fastest Processing Time   =  Selects the Fastest Processing Time level.
```


#### Solid Mode Options
- Explaining of this mode and what it does.

```Config__ScriptVariables__Solid Mode
SOLID MODE
Variable Name | UI Appearance |   Description
------------------------------------------------------------------------------------
SolidMode__On     =  On    |  Compress files as a single solid block for best ratio on similar files.  |  Selects the On solid mode.
SolidMode__Off    =  Off   |  Store files independently for faster random extraction.                 |  Selects the Off solid mode.
SolidMode__Auto   =  Auto  |  Script selects based on profile.                                        |  Selects the Auto solid mode.
```


#### Dictionary Size Options
```Config__ScriptVariables__Dictionary Size
DICTIONARY SIZE
Variable Name | UI Appearance |   Description
------------------------------------------------------------------------------------
Auto   =  Auto
64MB   =  64MB
128MB  =  128MB
256MB  =  256MB
512MB  =  512MB
1GB    =  1GB
```

#### Threads Options
```Config__ScriptVariables__Threads
THREADS
Variable Name                |  UI    |   Description
------------------------------------------------------------------------------------
CoreThreadsAllowance__Auto   =  Auto  =  Use all available logical cores.
CoreThreadsAllowance__1      =  1     =  Uses 1 thread (Core).
CoreThreadsAllowance__2      =  2     =  Uses 2 threads (Cores).
CoreThreadsAllowance__4      =  4     =  Uses 4 threads (Cores).
CoreThreadsAllowance__8      =  8     =  Uses 8 threads (Cores).
CoreThreadsAllowance__16     =  16    =  Uses 16 threads (Cores).
```


#### Split Volumes Options
```Config__ScriptVariables__Split Volumes
SPLIT VOLUMES
Variable Name     | UI Appearance     |   Description
------------------------------------------------------------------------------------
SplitVolume__None  =  None            =  Selects No Split Volumes.
SplitVolume__1GB   =  1Gb Per Volume  =  Selects 1000Mb Per Volume.
SplitVolume__4GB   =  4Gb Per Volume  =  Selects 4000Mb Per Volume.
SplitVolume__8GB   =  8Gb Per Volume  =  Selects 8000Mb Per Volume.
```


#### Tool Paths Options
```Config__ScriptVariables__Tool Paths
TOOL PATHS
Variable Name               | UI Appearance         |   Description
------------------------------------------------------------------------------------
SevenZipExecutable__Tools   =  ./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/7zz.exe      =  Path to standalone 7-Zip executable for compression.
PAR2ExecutablePath__Tools   =  ./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j.exe    =  Path to PAR2J command line tool for parity file creation.
```

#### PAR2 Required Options
```Config__ScriptVariables__PAR2 Required
PAR2 REQUIRED
Variable Name        | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2Required__Yes    =  Yes          =  Create parity after every archive, fail if engine missing.
PAR2Required__No     =  No           =  Skip parity if engine missing, log a warning.
```

#### Verification Options
```Config__ScriptVariables__Verification
VERIFICATION
Variable Name                    | UI Appearance        |   Description
------------------------------------------------------------------------------------
VerifyAfterCreate__On            =  On                 =  Verifies archive integrity after creation.
VerifyAfterCopy__On              =  On                 =  Verifies archive integrity after copying.
ChecksumAlgorithm__SHA256        =  SHA256             =  Uses SHA256 algorithm for checksum verification.
```


---

## Parity Archive Volume Set Engine 
PAR2 is a system for creating recovery files that can be used to repair missing or corrupted data in archives. In the context of long-term archival and compression, PAR2 provides several important benefits:
- **Data Integrity & Recovery:** 
    - Over time, files stored on disk or transferred between systems can become corrupted or partially lost. PAR2 files allow you to recover from such damage by reconstructing missing or damaged parts of the archive, as long as enough recovery data is available.
- **Redundancy:** 
    - By generating extra parity files, you add redundancy to your archives. This means that even if some files are lost or damaged, the archive can still be restored to its original state.
- **Long-Term Preservation:** 
    - For long-term storage, bit rot and media degradation are real risks. PAR2 helps mitigate these risks, making your compressed archives much more robust for future access.
- **Flexible Recovery Options:** 
    - PAR2 allows you to configure the amount of recovery data (number and size of recovery files), so you can balance storage overhead with the level of protection you need.
- **Automation Friendly:** 
    - PAR2 verification and repair can be automated, making it suitable for batch processing and unattended archival workflows.

#### PAR2 Implementation Requirements

**Critical:** You do need a separate PAR2 tool. The 7-Zip library and the Windows zip stack do not create PAR2 files.

**Recommended Approach:**
- Use an external PAR2 engine and call it from Python using `subprocess.run()` after each archive is written.
- Place PAR2 executables in the repository for offline bundling (no pip package required for PAR2).
- The script calls these binaries directly without requiring additional Python packages.

**Call Sequence:**
1. Create `.7z` archive using py7zr library
2. Test archive integrity 
3. Create PAR2 recovery set using external PAR2 tool
4. Verify PAR2 files
5. Generate SHA256 checksum

This approach keeps parity creation independent and portable across Windows and Raspberry Pi platforms without requiring pip installations for PAR2 functionality.

#### PAR2 Engine Options
```Config__ScriptVariables__PAR2 Engines
PAR2 ENGINES
Variable Name        | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2Engine__Auto     =  AUTO        =  Automatically selects the best available PAR2 engine.
PAR2Engine__PAR2     =  PAR2        =  Uses the standard PAR2 engine for recovery file creation.
PAR2Engine__PAR2J    =  PAR2J       =  Uses the PAR2J engine (Java implementation) for recovery files.
```

#### PAR2 Scope Options
```Config__ScriptVariables__PAR2 Scope
PAR2 SCOPE
Variable Name            | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2Scope__PerArchive    =  PerArchive  =  Creates PAR2 recovery files per individual archive.
PAR2Scope__PerSplitSet   =  PerSplitSet =  Creates PAR2 recovery files per split volume set.
```

#### PAR2 Slice Size Options
```Config__ScriptVariables__PAR2 Slice Size
PAR2 SLICE SIZE
Variable Name            | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2SliceSize__Auto      =  AUTO        =  Automatically determines optimal slice size for PAR2 files.
PAR2SliceSize__512KB     =  512KB       =  Uses 512KB slice size for PAR2 recovery files.
PAR2SliceSize__1MB       =  1MB         =  Uses 1MB slice size for PAR2 recovery files.
PAR2SliceSize__2MB       =  2MB         =  Uses 2MB slice size for PAR2 recovery files.
PAR2SliceSize__4MB       =  4MB         =  Uses 4MB slice size for PAR2 recovery files.
```

#### PAR2 Recovery Files Options
```Config__ScriptVariables__PAR2 Recovery Files
PAR2 RECOVERY FILES
Variable Name                | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2RecoveryFiles__Auto      =  AUTO        =  Automatically determines number of recovery files needed.
PAR2RecoveryFiles__4         =  4           =  Creates 4 PAR2 recovery files for data protection.
PAR2RecoveryFiles__8         =  8           =  Creates 8 PAR2 recovery files for data protection.
PAR2RecoveryFiles__12        =  12          =  Creates 12 PAR2 recovery files for data protection.
```

#### PAR2 Verify Mode Options
```Config__ScriptVariables__PAR2 Verify Mode
PAR2 VERIFY MODE
Variable Name                | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2VerifyMode__AfterCreate  =  AfterCreate =  Verifies PAR2 files immediately after creation.
PAR2VerifyMode__Skip         =  Skip        =  Skips PAR2 verification to save processing time.
```

#### PAR2 Redundancy Options
```Config__ScriptVariables__PAR2 Redundancy
PAR2 REDUNDANCY
Variable Name            | UI Appearance |   Description
------------------------------------------------------------------------------------
PAR2Redundancy__None     =  0.0%         =  No PAR2 redundancy protection applied.
PAR2Redundancy__5Pct     =  5.0%         =  Applies 5% PAR2 redundancy for data protection.
PAR2Redundancy__10Pct    =  10.0%        =  Applies 10% PAR2 redundancy for data protection.
PAR2Redundancy__15Pct    =  15.0%        =  Applies 15% PAR2 redundancy for data protection.
PAR2Redundancy__20Pct    =  20.0%        =  Applies 20% PAR2 redundancy for data protection.
PAR2Redundancy__30Pct    =  30.0%        =  Applies 30% PAR2 redundancy for data protection.
```

---



---

###### END OF DOCUMENTATION
