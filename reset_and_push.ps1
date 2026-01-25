# PowerShell script to reset Git and push clean code

$ErrorActionPreference = "Stop"
$gitPath = "C:\Program Files\Git\bin\git.exe"

Write-Host "Cleaning up Git repository..." -ForegroundColor Yellow

# Remove .git folder to start fresh
if (Test-Path ".git") {
    Remove-Item -Path ".git" -Recurse -Force
    Write-Host "✓ Removed old .git folder" -ForegroundColor Green
}

# Initialize new Git repository
Write-Host "`nInitializing new Git repository..." -ForegroundColor Yellow
& $gitPath init
& $gitPath config user.email "your-email@example.com"
& $gitPath config user.name "pradeepgobi"

# Add all files (respecting .gitignore)
Write-Host "`nAdding files..." -ForegroundColor Yellow
& $gitPath add .

# Create initial commit
Write-Host "`nCreating commit..." -ForegroundColor Yellow
& $gitPath commit -m "Initial commit: AI-Enabled Cybersecurity Portal (all secrets secured)"

# Add remote and push
Write-Host "`nAdding remote origin..." -ForegroundColor Yellow
& $gitPath remote add origin https://github.com/pradeepgobi/AI-Enabled-Cyber-Threat-Detection-Reporting-System-.git

# Rename branch to main
& $gitPath branch -M main

# Increase buffer for large push
& $gitPath config http.postBuffer 524288000

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
& $gitPath push -u origin main --force

Write-Host "`n✓ Done!" -ForegroundColor Green
