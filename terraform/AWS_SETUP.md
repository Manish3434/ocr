# AWS Setup & Credentials Guide

## Prerequisites

Before deploying the Terraform configuration, ensure you have the following:

### 1. AWS Account
- [ ] AWS Account created
- [ ] Billing information configured
- [ ] Email verified

### 2. IAM User Setup

Create an IAM user with the necessary permissions:

```bash
# Create IAM user
aws iam create-user --user-name terraform-user

# Attach required policies
aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Or for more restricted access, attach specific policies:
aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/ElastiCachePowerUserAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonVPCFullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchFullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

aws iam attach-user-policy --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### 3. Create Access Keys

```bash
# Create access key
aws iam create-access-key --user-name terraform-user
```

Store the Access Key ID and Secret Access Key securely.

---

## AWS CLI Configuration

### Option 1: Interactive Setup (Recommended)

```bash
aws configure
```

You'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### Option 2: Manual Configuration

Create/edit `~/.aws/credentials` file:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY

[terraform]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

Create/edit `~/.aws/config` file:

```ini
[default]
region = us-east-1
output = json

[profile terraform]
region = us-east-1
output = json
```

### Option 3: Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
```

### Option 4: MFA (Multi-Factor Authentication)

For added security, set up MFA:

```bash
# Create virtual MFA device
aws iam enable-mfa-device \
  --user-name terraform-user \
  --serial-number arn:aws:iam::123456789012:mfa/terraform-user \
  --authentication-code1 123456 \
  --authentication-code2 654321

# Then when using Terraform, get temporary credentials
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/terraform-user \
  --token-code 123456 \
  --duration-seconds 129600
```

---

## Verify AWS Configuration

Test your AWS credentials:

```bash
# Check current user
aws sts get-caller-identity

# Should output:
# {
#     "Account": "123456789012",
#     "UserId": "AIDAQ...",
#     "Arn": "arn:aws:iam::123456789012:user/terraform-user"
# }

# List your S3 buckets
aws s3 ls

# List EC2 instances
aws ec2 describe-instances
```

---

## Docker Image Preparation

### 1. Create ECR Repository

```bash
# Create repository for server
aws ecr create-repository \
  --repository-name server \
  --region us-east-1

# Create repository for frontend
aws ecr create-repository \
  --repository-name frontend \
  --region us-east-1

# Store the repository URIs
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
SERVER_REPO="${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/server"
FRONTEND_REPO="${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/frontend"

echo "Server Repository: $SERVER_REPO"
echo "Frontend Repository: $FRONTEND_REPO"
```

### 2. Build Docker Images

```bash
# Build server image
cd server
docker build -t server:latest -t server:1.0.0 .

# Build frontend image
cd ../ai-document-summarizer
docker build -t frontend:latest -t frontend:1.0.0 .

# Verify images
docker images | grep -E "server|frontend"
```

### 3. Authenticate with ECR

```bash
# Get login token
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# On Windows PowerShell:
aws ecr get-login-password --region us-east-1 | `
  docker login --username AWS --password-stdin `
  "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
```

### 4. Tag and Push Images

```bash
# Tag images
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1

# Server image
docker tag server:latest \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/server:latest
docker tag server:latest \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/server:1.0.0

# Frontend image
docker tag frontend:latest \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/frontend:latest
docker tag frontend:latest \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/frontend:1.0.0

# Push server image
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/server:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/server:1.0.0

# Push frontend image
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/frontend:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/frontend:1.0.0
```

### 5. Verify Images in ECR

```bash
# List images in server repository
aws ecr describe-images --repository-name server --region us-east-1

# List images in frontend repository
aws ecr describe-images --repository-name frontend --region us-east-1
```

---

## Configure Terraform Variables

### 1. Create terraform.tfvars

```bash
cd terraform
cp environments/dev.tfvars terraform.tfvars
```

### 2. Update terraform.tfvars

Edit `terraform.tfvars` and set:

```hcl
# AWS Configuration
aws_region  = "us-east-1"
environment = "dev"

# Database Password (IMPORTANT: Use a strong password)
db_password = "YourStrongPassword123!@#"

# Docker Image URIs (from previous step)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
server_image   = "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/server:latest"
frontend_image = "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/frontend:latest"

# Other configuration
app_desired_count = 2
enable_s3_uploads = true
enable_autoscaling = true
```

---

## AWS Resources Pre-Check

Before deploying, verify your AWS account is ready:

```bash
# Check quotas
aws service-quotas list-service-quotas \
  --service-code ecs \
  --region us-east-1

# Check existing resources
aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId'
aws rds describe-db-instances --query 'DBInstances[].DBInstanceIdentifier'

# Check IAM policies
aws iam list-attached-user-policies --user-name terraform-user
```

---

## Security Best Practices

### 1. Secure Your Credentials

```bash
# Restrict credentials file permissions
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

# Never commit credentials to git
echo "credentials" >> .gitignore
echo "*.tfvars" >> .gitignore
```

### 2. Use AWS Secrets Manager

```bash
# Store database password securely
aws secretsmanager create-secret \
  --name ai-document-summarizer/db/password \
  --secret-string "YourPassword123"

# Reference in Terraform (instead of plain text)
# See locals.tf for usage
```

### 3. Enable MFA

```bash
# Require MFA for production deployments
aws iam add-user-to-group \
  --user-name terraform-user \
  --group-name mfa-required
```

### 4. Rotate Access Keys

Periodically rotate access keys:

```bash
# Create new access key
aws iam create-access-key --user-name terraform-user

# Update aws configure or environment variables

# Delete old access key
aws iam delete-access-key \
  --user-name terraform-user \
  --access-key-id OLD_KEY_ID
```

---

## Environment-Specific Setup

### Development Environment

```bash
# Use least privileges
terraform apply -var-file="environments/dev.tfvars"

# Update credentials to dev profile
export AWS_PROFILE=dev
```

### Production Environment

```bash
# Use restricted IAM user
export AWS_PROFILE=terraform-prod

# Require approval process
terraform plan -var-file="environments/prod.tfvars"
# Get approval before applying
terraform apply -var-file="environments/prod.tfvars"
```

---

## Troubleshooting

### Issue: "Unable to locate credentials"

**Solution:**
```bash
# Verify AWS CLI is configured
aws sts get-caller-identity

# If not configured, run
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### Issue: "User is not authorized to perform iam:..."

**Solution:**
```bash
# Attach necessary IAM policies
aws iam attach-user-policy \
  --user-name terraform-user \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### Issue: "ECR repository not found"

**Solution:**
```bash
# Create repositories first
aws ecr create-repository --repository-name server
aws ecr create-repository --repository-name frontend
```

### Issue: "Access Denied when pushing to ECR"

**Solution:**
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

---

## References

- [AWS CLI User Guide](https://docs.aws.amazon.com/cli/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Docker on AWS](https://docs.docker.com/cloud/ecs-integration/)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
