@echo off
echo Cleaning up Git repository...
if exist .git rmdir /s /q .git

echo Initializing new Git repository...
"C:\Program Files\Git\bin\git.exe" init
"C:\Program Files\Git\bin\git.exe" config user.email "pradeep@example.com"
"C:\Program Files\Git\bin\git.exe" config user.name "pradeepgobi"

echo Adding files...
"C:\Program Files\Git\bin\git.exe" add .

echo Creating commit...
"C:\Program Files\Git\bin\git.exe" commit -m "Initial commit: AI-Enabled Cybersecurity Portal (all secrets secured)"

echo Adding remote...
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/pradeepgobi/AI-Enabled-Cyber-Threat-Detection-Reporting-System-.git

echo Renaming branch to main...
"C:\Program Files\Git\bin\git.exe" branch -M main

echo Increasing buffer...
"C:\Program Files\Git\bin\git.exe" config http.postBuffer 524288000

echo Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push -u origin main --force

echo Done!
pause
