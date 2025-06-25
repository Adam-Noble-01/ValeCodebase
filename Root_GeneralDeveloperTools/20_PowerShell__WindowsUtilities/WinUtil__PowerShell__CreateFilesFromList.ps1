# This script creates a list of files in the current directory.

$files = @(
    "ExampleFile01.txt",
    "ExampleFile02.txt",
    "ExampleFile03.txt",
    "ExampleFile04.txt"
)

foreach ($file in $files) {
    New-Item -ItemType File -Path $file -Force
    Write-Host "Created file: $file"
}