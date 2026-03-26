# PowerShell Script: Download_Dependencies.ps1
# Run this script in the Py_FileUtils__PngFilesToTimelapseVideo folder
# This will download all required Python packages locally

# Set the target directory for dependencies
$targetDir = Join-Path $PSScriptRoot "LocalScope__ExternalCodeDependencies"

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "PNG/JPG TO TIMELAPSE - DEPENDENCY INSTALLER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Create the directory if it doesn't exist
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "`nCreated directory: $targetDir" -ForegroundColor Green
} else {
    Write-Host "`nUsing existing directory: $targetDir" -ForegroundColor Yellow
    
    # Clean up any existing site-packages folder (will be recreated by Python script)
    $sitePackages = Join-Path $targetDir "site-packages"
    if (Test-Path $sitePackages) {
        Write-Host "Cleaning up old site-packages folder..." -ForegroundColor Yellow
        Remove-Item $sitePackages -Recurse -Force
    }
}

# Check if pip is available
try {
    $pipVersion = pip --version
    Write-Host "`nFound pip: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "`nERROR: pip is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Python with pip first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Change to the target directory
Set-Location $targetDir

Write-Host "`n------------------------------------------" -ForegroundColor Gray
Write-Host "Downloading dependencies to local folder..." -ForegroundColor Yellow
Write-Host "Target: $targetDir" -ForegroundColor Cyan
Write-Host "------------------------------------------" -ForegroundColor Gray

# Function to download with error handling
function Download-Package {
    param($PackageName, $Description)
    
    Write-Host "`n► Downloading $Description..." -ForegroundColor Yellow
    try {
        $output = pip download $PackageName --dest . --no-cache-dir 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $Description downloaded successfully" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Warning: Some issues with $Description" -ForegroundColor Yellow
            Write-Host "  $output" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ✗ Failed to download $Description" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

# Download all required packages and their dependencies
Download-Package "moviepy" "MoviePy (video processing library)"
Download-Package "opencv-python-headless" "OpenCV (computer vision library)"
Download-Package "scikit-image" "Scikit-Image (image similarity detection)"
Download-Package "numpy" "NumPy (numerical computing)"
Download-Package "Pillow" "Pillow (image processing)"
Download-Package "tqdm" "tqdm (progress bars)"
Download-Package "imageio" "ImageIO (image I/O library)"
Download-Package "imageio-ffmpeg" "ImageIO-FFmpeg (video codec support)"
Download-Package "decorator" "Decorator (MoviePy dependency)"
Download-Package "proglog" "Proglog (MoviePy logging)"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "DOWNLOAD COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Count downloaded files
$fileCount = (Get-ChildItem -Path . -Filter "*.whl" | Measure-Object).Count
$tarCount = (Get-ChildItem -Path . -Filter "*.tar.gz" | Measure-Object).Count
$totalCount = $fileCount + $tarCount

Write-Host "`nDownloaded $totalCount packages:" -ForegroundColor Cyan
Write-Host "  - Wheel files (.whl): $fileCount" -ForegroundColor Gray
Write-Host "  - Source archives (.tar.gz): $tarCount" -ForegroundColor Gray
Write-Host "`nLocation: $targetDir" -ForegroundColor Cyan

# List downloaded files
Write-Host "`nPackage files:" -ForegroundColor Yellow
Get-ChildItem -Path . | Where-Object { $_.Extension -match '\.(whl|tar\.gz)$' } | ForEach-Object { 
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host ("  - {0,-60} ({1} MB)" -f $_.Name, $size) -ForegroundColor Gray
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "You can now run the Python script!" -ForegroundColor Green
Write-Host "The application will load these local packages." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Pause to show results
Write-Host "`n"
Read-Host "Press Enter to close"
