#!/bin/bash
# AWS Elastic Beanstalk Deployment Script

set -e  # Exit on error

echo "=========================================="
echo "AWS Elastic Beanstalk Deployment"
echo "=========================================="

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed. Install from: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command -v eb &> /dev/null; then
    echo "Installing EB CLI..."
    pip install awsebcli
fi

# Configuration
PROJECT_NAME="cyber-threat-detection"
ENVIRONMENT_NAME="production-env"
REGION="us-east-1"

echo ""
echo "Step 1: Configure AWS Credentials"
echo "==========================================="
echo "Ensure you have NEW AWS credentials (not the compromised ones)"
echo "Run: aws configure"
echo ""
read -p "Press Enter after configuring AWS credentials..."

# Check if EB is initialized
if [ ! -d ".elasticbeanstalk" ]; then
    echo ""
    echo "Step 2: Initialize Elastic Beanstalk"
    echo "==========================================="
    eb init -p "Python 3.13" "$PROJECT_NAME" --region "$REGION"
else
    echo "✓ Elastic Beanstalk already initialized"
fi

# Install Python dependencies
echo ""
echo "Step 3: Installing Python dependencies"
echo "==========================================="
cd Backend
pip install -r requirements.txt
cd ..

# Check environment variables
echo ""
echo "Step 4: Environment Variables"
echo "==========================================="
echo "Make sure Backend/.env contains:"
echo "  - AWS_ACCESS_KEY_ID (new credentials)"
echo "  - AWS_SECRET_ACCESS_KEY (new credentials)"
echo "  - MONGO_URI"
echo "  - TWILIO credentials"
echo ""
read -p "Press Enter to continue..."

# Create or deploy environment
echo ""
echo "Step 5: Creating/Deploying Environment"
echo "==========================================="
if eb list | grep -q "$ENVIRONMENT_NAME"; then
    echo "Environment exists. Deploying update..."
    eb deploy "$ENVIRONMENT_NAME"
else
    echo "Creating new environment..."
    eb create "$ENVIRONMENT_NAME" --instance-type t3.medium
fi

# Get the environment URL
echo ""
echo "Step 6: Getting Environment URL"
echo "==========================================="
ENV_URL=$(eb open -p)
echo "✓ Backend URL: $ENV_URL"
echo ""
echo "Update your Frontend .env with:"
echo "VITE_BACKEND_URL=$ENV_URL"

# View logs
echo ""
echo "Step 7: Checking Deployment"
echo "==========================================="
echo "View logs with: eb logs"
echo "SSH into instance: eb ssh"
echo "Terminate environment: eb terminate"

echo ""
echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="
