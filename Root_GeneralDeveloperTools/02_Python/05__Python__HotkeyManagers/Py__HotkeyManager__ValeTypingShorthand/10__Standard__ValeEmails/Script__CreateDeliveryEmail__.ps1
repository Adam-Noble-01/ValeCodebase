# =============================================================================
# VALE DESIGN SUITE - WHITECARD DELIVERY EMAIL GENERATOR
# =============================================================================
#
# FILE       : Script__CreateDeliveryEmail__.ps1
# NAMESPACE  : ValeTypingShorthand
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Generate and populate Whitecard delivery email from project data
# CREATED    : 05-Dec-2025
#
# DESCRIPTION:
# - Reads project data from 00__ProjectData folder
# - Prompts user for Vale Server path
# - Creates delivery email folder and populated HTML template
# - Auto-opens the generated email in default browser
#
# USAGE:
# - Run from project root directory in PowerShell
# - Script will auto-detect project JSON file
#
# =============================================================================

param(
    [string]$ProjectRoot = $PWD.Path
)

# -----------------------------------------------------------------------------
# REGION | Configuration Constants
# -----------------------------------------------------------------------------

$DELIVERY_FOLDER_NAME    = "20__DeliveryEmails"
$PROJECT_DATA_FOLDER     = "00__ProjectData"
$TEMPLATE_PATH           = "D:\10_CoreLib__ValeCodebase\Root_GeneralDeveloperTools\02_Python\05__Python__HotkeyManagers\Py__HotkeyManager__ValeTypingShorthand\10__Standard__ValeEmails\EmailTemplate__WhitecardDelivery__.html"

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

# FUNCTION | Prompt for Recipient Mode and Vale Server Path
# ------------------------------------------------------------
function Get-RecipientAndServerPath {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  WHITECARD DELIVERY EMAIL GENERATOR   " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "FLAGS (optional):" -ForegroundColor Yellow
    Write-Host "  --artist    Address to Concept Artist (default)" -ForegroundColor DarkGray
    Write-Host "  --designer  Address to Designer" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Paste Vale Server path (or type a flag first):" -ForegroundColor Yellow
    Write-Host "(e.g., N:\Sales\Designer Name\Designer 2025\ProjectName12345 NEW DB\aa-Watercolour...)" -ForegroundColor DarkGray
    Write-Host ""
    
    $input = Read-Host "Input"
    $input = $input.Trim()
    
    # Default recipient mode
    $recipientMode = "artist"
    $serverPath = $null
    
    # Check for flags
    if ($input -eq "--designer") {
        $recipientMode = "designer"
        Write-Host ""
        Write-Host "Recipient set to: DESIGNER" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now paste the Vale Server path:" -ForegroundColor Yellow
        $serverPath = Read-Host "Vale Server Path"
    }
    elseif ($input -eq "--artist") {
        $recipientMode = "artist"
        Write-Host ""
        Write-Host "Recipient set to: CONCEPT ARTIST (default)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now paste the Vale Server path:" -ForegroundColor Yellow
        $serverPath = Read-Host "Vale Server Path"
    }
    else {
        # Input is the server path
        $serverPath = $input
    }
    
    # Remove quotes if present
    $serverPath = $serverPath.Trim('"').Trim("'")
    
    if ([string]::IsNullOrWhiteSpace($serverPath)) {
        Write-Host "Error: No path provided" -ForegroundColor Red
        return $null
    }
    
    return @{
        RecipientMode = $recipientMode
        ServerPath    = $serverPath
    }
}
# ---------------------------------------------------------------

# FUNCTION | Create Delivery Email
# ------------------------------------------------------------
function New-DeliveryEmail {
    param(
        [string]$ProjectRoot,
        [hashtable]$ProjectData,
        [string]$ValeServerPath,
        [string]$RecipientMode = "artist"
    )
    
    # Determine recipient based on mode
    if ($RecipientMode -eq "designer") {
        $recipient = $ProjectData.Designer
        $recipientLabel = "Designer"
    }
    else {
        $recipient = $ProjectData.ConceptArtist
        $recipientLabel = "Concept Artist"
    }
    
    # Create delivery folder
    $deliveryFolder = Join-Path $ProjectRoot $DELIVERY_FOLDER_NAME
    if (!(Test-Path $deliveryFolder)) {
        New-Item -ItemType Directory -Path $deliveryFolder | Out-Null
        Write-Host "Created folder: $deliveryFolder" -ForegroundColor Green
    }
    
    # Generate destination filename with timestamp
    $timestamp = Get-Date -Format "dd-MMM-yyyy"
    $destFileName = "WhitecardDeliveryEmail__$timestamp`__.html"
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
    $populatedContent = $populatedContent -replace '\{\{ValeServerPath\}\}', $ValeServerPath
    $populatedContent = $populatedContent -replace '\{\{AdditionalNotes\}\}', ''
    
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
    Write-Host "Addressed to: $recipient ($recipientLabel)" -ForegroundColor Cyan
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

# Step 3: Prompt for recipient mode and Vale Server path
$inputResult = Get-RecipientAndServerPath
if ($null -eq $inputResult) {
    Write-Host "Press any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

$valeServerPath = $inputResult.ServerPath
$recipientMode = $inputResult.RecipientMode

# Step 4: Create delivery email
$emailPath = New-DeliveryEmail -ProjectRoot $ProjectRoot -ProjectData $projectData -ValeServerPath $valeServerPath -RecipientMode $recipientMode
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

