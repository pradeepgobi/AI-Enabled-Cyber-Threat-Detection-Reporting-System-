@echo off
REM AWS Elastic Beanstalk Deployment Script for Windows

echo ==========================================
echo AWS Elastic Beanstalk Deployment
echo ==========================================
echo.

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS CLI not installed
    echo Install from: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

REM Check if EB CLI is installed
eb --version >nul 2>&1
if errorlevel 1 (
    echo Installing AWS EB CLI...
    pip install awsebcli
)

set PROJECT_NAME=cyber-threat-detection
set ENVIRONMENT_NAME=production-env
set REGION=us-east-1

echo.
echo Step 1: Configure AWS Credentials
echo ===========================================
echo Ensure you have NEW AWS credentials (not the compromised ones)
echo Run: aws configure
echo.
pause

REM Check if EB is initialized
if not exist ".elasticbeanstalk" (
    echo.
    echo Step 2: Initialize Elastic Beanstalk
    echo ===========================================
    call eb init -p "Python 3.13" "%PROJECT_NAME%" --region "%REGION%"
) else (
    echo Step 2: Elastic Beanstalk already initialized
)

REM Install Python dependencies
echo.
echo Step 3: Installing Python dependencies
echo ===========================================
cd Backend
pip install -r requirements.txt
cd ..

REM Check environment variables
echo.
echo Step 4: Verify Environment Variables
echo ===========================================
echo Make sure Backend\.env contains:
echo   - AWS_ACCESS_KEY_ID ^(new credentials^)
echo   - AWS_SECRET_ACCESS_KEY ^(new credentials^)
echo   - MONGO_URI
echo   - TWILIO credentials
echo.
pause

REM Create or deploy environment
echo.
echo Step 5: Creating/Deploying Environment
echo ===========================================
eb list 2>nul | find "%ENVIRONMENT_NAME%" >nul
if errorlevel 0 (
    echo Environment exists. Deploying update...
    call eb deploy "%ENVIRONMENT_NAME%"
) else (
    echo Creating new environment...
    call eb create "%ENVIRONMENT_NAME%" --instance-type t3.medium
)

REM Get environment URL
echo.
echo Step 6: Getting Environment URL
echo ===========================================
call eb open -p

echo.
echo Step 7: Deployment Tips
echo ===========================================
echo View logs: eb logs
echo SSH into instance: eb ssh
echo Terminate environment: eb terminate

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
pause
