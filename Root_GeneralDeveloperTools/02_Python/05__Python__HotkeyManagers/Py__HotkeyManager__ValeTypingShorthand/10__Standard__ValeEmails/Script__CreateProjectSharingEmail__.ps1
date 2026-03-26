# =============================================================================
# VALE DESIGN SUITE - PROJECT SHARING EMAIL GENERATOR
# =============================================================================
#
# FILE       : Script__CreateProjectSharingEmail__.ps1
# NAMESPACE  : ValeTypingShorthand
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Generate and populate Whitecardopedia project sharing email
# CREATED    : 23-Jan-2026
#
# DESCRIPTION:
# - Reads project data from 00__ProjectData folder
# - Builds Whitecardopedia sharing URL from project number
# - Creates project sharing email with populated HTML template
# - Supports addressing to designer (default), artist, or both
# - Auto-opens the generated email in default browser
#
# USAGE:
# - Run from project root directory in PowerShell
# - Script will auto-detect project JSON file
#
# FLAGS:
# - --designer  Address to Designer (default)
# - --artist    Address to Concept Artist
# - --both      Address to both Designer and Concept Artist
#
# =============================================================================

param(
    [string]$ProjectRoot = $PWD.Path
)

# -----------------------------------------------------------------------------
# REGION | Configuration Constants
# -----------------------------------------------------------------------------

$DELIVERY_FOLDER_NAME      = "20__DeliveryEmails"
$PROJECT_DATA_FOLDER       = "00__ProjectData"
$TEMPLATE_PATH             = "D:\10_CoreLib__ValeCodebase\Root_GeneralDeveloperTools\02_Python\05__Python__HotkeyManagers\Py__HotkeyManager__ValeTypingShorthand\10__Standard__ValeEmails\EmailTemplate__ProjectIntroductionEmail.html"
$WHITECARDOPEDIA_BASE_URL  = "https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/app.html"

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Helper Functions
# -----------------------------------------------------------------------------

# FUNCTION | Find Project JSON File
# ------------------------------------------------------------
function Find-ProjectJsonFile {
    param([string]$ProjectRoot)
    
    $dataFolder = Join-Path $ProjectRoot $PROJECT_DATA_FOLDER
    
    if (!(Test-Path $dataFolder)) {
        Write-Host "Error: Project data folder not found: $dataFolder" -ForegroundColor Red
        return $null
    }
    
    # Find JSON file matching pattern *__ProjectData__.json
    $jsonFiles = Get-ChildItem -Path $dataFolder -Filter "*__ProjectData__.json" -ErrorAction SilentlyContinue
    
    if ($jsonFiles.Count -eq 0) {
        Write-Host "Error: No project data JSON file found in: $dataFolder" -ForegroundColor Red
        return $null
    }
    
    return $jsonFiles[0].FullName
}
# ---------------------------------------------------------------

# FUNCTION | Read Project Data from JSON
# ------------------------------------------------------------
function Read-ProjectData {
    param([string]$JsonPath)
    
    try {
        $jsonContent = Get-Content -Path $JsonPath -Raw | ConvertFrom-Json
        
        # Extract metadata from first object
        $metadata = $jsonContent[0].Project__MetaData
        
        return @{
            ProjectName     = $metadata.Project__Name
            ProjectNumber   = $metadata.Project__Number
            ConceptArtist   = $metadata.Project__ConceptArtist
            Designer        = $metadata.Project__Designer
        }
    }
    catch {
        Write-Host "Error reading project JSON: $_" -ForegroundColor Red
        return $null
    }
}
# ---------------------------------------------------------------

# FUNCTION | Get Recipient Mode from User
# ------------------------------------------------------------
function Get-RecipientMode {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  PROJECT SHARING EMAIL GENERATOR      " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "FLAGS (optional):" -ForegroundColor Yellow
    Write-Host "  --designer  Address to Designer (default)" -ForegroundColor DarkGray
    Write-Host "  --artist    Address to Concept Artist" -ForegroundColor DarkGray
    Write-Host "  --both      Address to both Designer and Artist" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Press Enter to use default (designer), or type a flag:" -ForegroundColor Yellow
    Write-Host ""
    
    $input = Read-Host "Input"
    $input = $input.Trim().ToLower()
    
    # Default recipient mode
    $recipientMode = "designer"
    
    # Check for flags
    if ($input -eq "--designer" -or $input -eq "") {
        $recipientMode = "designer"
        Write-Host ""
        Write-Host "Recipient set to: DESIGNER" -ForegroundColor Green
    }
    elseif ($input -eq "--artist") {
        $recipientMode = "artist"
        Write-Host ""
        Write-Host "Recipient set to: CONCEPT ARTIST" -ForegroundColor Green
    }
    elseif ($input -eq "--both") {
        $recipientMode = "both"
        Write-Host ""
        Write-Host "Recipient set to: BOTH (Designer & Concept Artist)" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "Unrecognized flag. Using default: DESIGNER" -ForegroundColor Yellow
    }
    
    return $recipientMode
}
# ---------------------------------------------------------------

# FUNCTION | Build Recipient String
# ------------------------------------------------------------
function Get-RecipientString {
    param(
        [hashtable]$ProjectData,
        [string]$RecipientMode
    )
    
    switch ($RecipientMode) {
        "designer" {
            return $ProjectData.Designer
        }
        "artist" {
            return $ProjectData.ConceptArtist
        }
        "both" {
            return "$($ProjectData.Designer) &amp; $($ProjectData.ConceptArtist)"
        }
        default {
            return $ProjectData.Designer
        }
    }
}
# ---------------------------------------------------------------

# FUNCTION | Create Project Sharing Email
# ------------------------------------------------------------
function New-ProjectSharingEmail {
    param(
        [string]$ProjectRoot,
        [hashtable]$ProjectData,
        [string]$RecipientMode = "designer"
    )
    
    # Build recipient string based on mode
    $recipient = Get-RecipientString -ProjectData $ProjectData -RecipientMode $RecipientMode
    
    # Build Whitecardopedia URL
    $whitecardopediaUrl = "$WHITECARDOPEDIA_BASE_URL`?id=$($ProjectData.ProjectNumber)"
    
    # Create delivery folder
    $deliveryFolder = Join-Path $ProjectRoot $DELIVERY_FOLDER_NAME
    if (!(Test-Path $deliveryFolder)) {
        New-Item -ItemType Directory -Path $deliveryFolder | Out-Null
        Write-Host "Created folder: $deliveryFolder" -ForegroundColor Green
    }
    
    # Generate destination filename with timestamp
    $timestamp = Get-Date -Format "dd-MMM-yyyy"
    $destFileName = "ProjectSharingEmail__$timestamp`__.html"
    $destPath = Join-Path $deliveryFolder $destFileName
    
    # Read template
    if (!(Test-Path $TEMPLATE_PATH)) {
        Write-Host "Error: Template not found: $TEMPLATE_PATH" -ForegroundColor Red
        return $null
    }
    
    $templateContent = Get-Content -Path $TEMPLATE_PATH -Raw
    
    # Replace placeholders
    $populatedContent = $templateContent
    $populatedContent = $populatedContent -replace '\{\{Recipient\}\}', $recipient
    $populatedContent = $populatedContent -replace '\{\{ProjectName\}\}', $ProjectData.ProjectName
    $populatedContent = $populatedContent -replace '\{\{ProjectNumber\}\}', $ProjectData.ProjectNumber
    $populatedContent = $populatedContent -replace '\{\{ConceptArtist\}\}', $ProjectData.ConceptArtist
    
    # Write populated template
    $populatedContent | Out-File -FilePath $destPath -Encoding UTF8
    
    Write-Host ""
    Write-Host "Email created successfully!" -ForegroundColor Green
    Write-Host "Location: $destPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Project Details:" -ForegroundColor Yellow
    Write-Host "  Name:           $($ProjectData.ProjectName)" -ForegroundColor White
    Write-Host "  Number:         $($ProjectData.ProjectNumber)" -ForegroundColor White
    Write-Host "  Concept Artist: $($ProjectData.ConceptArtist)" -ForegroundColor White
    Write-Host "  Designer:       $($ProjectData.Designer)" -ForegroundColor White
    Write-Host ""
    Write-Host "Whitecardopedia URL:" -ForegroundColor Yellow
    Write-Host "  $whitecardopediaUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Addressed to: $recipient" -ForegroundColor Cyan
    Write-Host ""
    
    return $destPath
}
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "Working directory: $ProjectRoot" -ForegroundColor DarkGray

# Step 1: Find project JSON file
$jsonPath = Find-ProjectJsonFile -ProjectRoot $ProjectRoot
if ($null -eq $jsonPath) {
    Write-Host "Press any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "Found project data: $jsonPath" -ForegroundColor DarkGray

# Step 2: Read project data
$projectData = Read-ProjectData -JsonPath $jsonPath
if ($null -eq $projectData) {
    Write-Host "Press any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Step 3: Get recipient mode from user
$recipientMode = Get-RecipientMode

# Step 4: Create project sharing email
$emailPath = New-ProjectSharingEmail -ProjectRoot $ProjectRoot -ProjectData $projectData -RecipientMode $recipientMode
if ($null -eq $emailPath) {
    Write-Host "Press any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Step 5: Open the email file
Start-Process $emailPath

# Step 6: Exit
Write-Host "Opening email and closing window..." -ForegroundColor DarkGray
Start-Sleep -Seconds 1
exit 0

# endregion -------------------------------------------------------------------
