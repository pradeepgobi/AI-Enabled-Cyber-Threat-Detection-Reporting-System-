# 🚀 Deployment Guide - Frontend (Netlify) + Backend (AWS)

## Frontend Deployment (Netlify)

Your frontend is already set up for Netlify at:  
**https://ai-enabled-cyber-threat-detection-reporting-system.netlify.app/**

### To redeploy frontend after backend URL changes:

```bash
# 1. Update frontend .env with new AWS backend URL
VITE_BACKEND_URL=https://your-eb-environment.elasticbeanstalk.com

# 2. Push to GitHub (Netlify auto-deploys)
git add .env .gitignore
git commit -m "Update backend URL for AWS deployment"
git push origin main

# 3. Check Netlify dashboard for deployment status
```

---

## Backend Deployment (AWS Elastic Beanstalk)

### Quick Start

**Windows:**
```bash
.\deploy-to-aws.bat
```

**Mac/Linux:**
```bash
bash deploy-to-aws.sh
```

### Manual Deployment Steps

#### Step 1: Set Up AWS Credentials (CRITICAL!)

```bash
# 1. Go to AWS IAM → Users → Your User → Security Credentials
# 2. Generate NEW Access Keys (revoke the old compromised ones!)
# 3. Configure AWS CLI
aws configure

# Enter:
# AWS Access Key ID: your_new_access_key
# AWS Secret Access Key: your_new_secret_key
# Default region: us-east-1
# Default output format: json
```

#### Step 2: Install EB CLI

```bash
pip install awsebcli
```

#### Step 3: Initialize Elastic Beanstalk

```bash
eb init -p "Python 3.13" cyber-threat-detection --region us-east-1
```

#### Step 4: Create Environment

```bash
eb create production-env --instance-type t3.medium
```

This will:
- Create EC2 instance(s)
- Set up load balancer
- Configure RDS (optional)
- Deploy your Flask app

#### Step 5: Deploy Code

```bash
eb deploy
```

#### Step 6: Get Backend URL

```bash
eb open
# This opens the deployed app in your browser
```

Your backend URL will be something like:
```
https://cyber-threat-detection-prod.elasticbeanstalk.com
```

---

## Configuration Files

### Backend/.env (Production)

Before deploying, ensure `Backend/.env` has:

```env
# ⚠️ NEW AWS credentials only!
AWS_ACCESS_KEY_ID=your_new_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_new_secret_access_key_here
AWS_REGION=us-east-1

# Existing API keys
OPENROUTER_API_KEY=sk-or-v1-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGO_DB_NAME=cybersecurity_portal

# Flask
FLASK_SECRET_KEY=your-secret-key
```

### Frontend/.env (After Backend URL is known)

```env
VITE_BACKEND_URL=https://your-eb-environment.elasticbeanstalk.com
```

---

## Environment Variables in Elastic Beanstalk

For sensitive data (API keys, database passwords), use **AWS Secrets Manager** instead of .env:

```bash
# Add secret
aws secretsmanager create-secret --name cyber-threat-secrets \
  --secret-string '{
    "OPENROUTER_API_KEY": "sk-or-v1-...",
    "MONGO_URI": "mongodb+srv://...",
    "TWILIO_ACCOUNT_SID": "AC..."
  }'

# Reference in app.py
import boto3
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='cyber-threat-secrets')
```

---

## Common Commands

```bash
# View logs
eb logs

# SSH into instance
eb ssh

# View environment status
eb status

# Terminate environment (⚠️ deletes everything)
eb terminate

# Deploy new code
eb deploy

# Configure environment
eb config

# Scale up/down
eb scale 2  # 2 instances
```

---

## MongoDB Setup

If you don't have MongoDB:

### Option 1: MongoDB Atlas (Cloud, Free Tier)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Add to Backend/.env:
   ```
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/database
   ```

### Option 2: AWS DocumentDB
1. Create DocumentDB cluster in AWS console
2. Get connection string
3. Add to Backend/.env

### Option 3: Local MongoDB
```bash
# Install MongoDB locally (not recommended for production)
# Development only
MONGO_URI=mongodb://localhost:27017/
```

---

## CORS Configuration

Elastic Beanstalk config already includes:
```yaml
ALLOWED_ORIGINS: https://ai-enabled-cyber-threat-detection-reporting-system.netlify.app
```

If you need to add more origins, edit `.ebextensions/01_flask.config`

---

## Security Checklist

- ✅ Revoke old AWS credentials
- ✅ Use new AWS credentials only
- ✅ Enable HTTPS (automatic with .elasticbeanstalk.com domain)
- ✅ Add .env to .gitignore
- ✅ Use Secrets Manager for sensitive data
- ✅ Enable CloudWatch logs
- ✅ Set up automatic scaling

---

## Troubleshooting

### App won't start
```bash
eb logs  # Check error logs
```

### CORS errors
- Ensure ALLOWED_ORIGINS includes your Netlify URL
- Clear browser cache

### MongoDB connection failed
- Check MONGO_URI in Backend/.env
- Ensure IP whitelist includes EC2 security group

### High memory usage
- Check for memory leaks in app.py
- Scale up instance type (t3.large)

---

## Next Steps

1. ✅ Generate NEW AWS credentials
2. ✅ Update Backend/.env with new credentials
3. ✅ Run deployment script
4. ✅ Get backend URL from EB
5. ✅ Update Frontend .env with backend URL
6. ✅ Redeploy frontend to Netlify
7. ✅ Test full integration

---

## Contact Support

- AWS Support: https://console.aws.amazon.com/support
- Netlify Support: https://support.netlify.com
- Flask Documentation: https://flask.palletsprojects.com
