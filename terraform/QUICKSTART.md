# Terraform Quick Start Guide

## 🚀 First Time Setup

### 1. Install Terraform
```bash
# macOS
brew install terraform

# Windows (PowerShell)
choco install terraform

# Linux
curl https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
```

### 2. Configure AWS Credentials
```bash
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### 3. Prepare Docker Images
```bash
# Build and push to ECR
cd server && docker build -t server:latest .
cd ../ai-document-summarizer && docker build -t frontend:latest .

# Push to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag server:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/server:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/server:latest
```

### 4. Update Variables
```bash
cd terraform
cp environments/dev.tfvars terraform.tfvars
# Edit terraform.tfvars with your values:
# - server_image = your ECR image URL
# - frontend_image = your ECR image URL  
# - db_password = strong password
```

### 5. Deploy
```bash
terraform init
terraform plan
terraform apply
```

---

## 📋 Common Commands

### Initialize
```bash
terraform init
```

### Plan Changes (Preview)
```bash
# Dev environment
terraform plan -var-file="environments/dev.tfvars"

# Staging environment
terraform plan -var-file="environments/staging.tfvars"

# Production environment
terraform plan -var-file="environments/prod.tfvars"
```

### Apply Changes
```bash
terraform apply -var-file="environments/dev.tfvars"
```

### View Outputs
```bash
terraform output                          # All outputs
terraform output alb_dns_name             # Specific output
terraform output -json                    # JSON format
```

### View State
```bash
terraform state list                      # List all resources
terraform state show aws_lb.main          # Show resource details
terraform show                            # Show complete state
```

### Format Code
```bash
terraform fmt -recursive
```

### Validate Syntax
```bash
terraform validate
```

---

## 🔧 Common Operations

### Scale Application
```bash
# Change desired count
terraform apply -var-file="environments/dev.tfvars" -var="app_desired_count=5"
```

### Update Database Size
```bash
# Change instance class
terraform apply -var-file="environments/dev.tfvars" -var="db_instance_class=db.t3.small"
```

### Update Docker Images
Update `server_image` and `frontend_image` in your `.tfvars` file, then:
```bash
terraform apply -var-file="environments/dev.tfvars"
```

### Enable HTTPS
```bash
# Get your ACM certificate ARN first
aws acm list-certificates

# Update terraform.tfvars
enable_https = true
certificate_arn = "arn:aws:acm:..."

terraform apply -var-file="environments/dev.tfvars"
```

### Add Environment Variable to Service
Update the `environment` list in the ECS task definition in `main.tf`, then apply:
```bash
terraform apply -var-file="environments/dev.tfvars"
```

---

## 📊 Database Operations

### Connect to Database
```bash
# Get endpoint
ENDPOINT=$(terraform output -raw rds_address)
PASSWORD=$(grep db_password terraform.tfvars | cut -d'"' -f2)

# Connect
psql -h $ENDPOINT -U admin -d documentdb
```

### Create Manual Backup
```bash
SNAPSHOT_ID="manual-$(date +%Y%m%d-%H%M%S)"
aws rds create-db-snapshot \
  --db-instance-identifier ai-document-summarizer-db \
  --db-snapshot-identifier $SNAPSHOT_ID
```

### View Backups
```bash
aws rds describe-db-snapshots --db-instance-identifier ai-document-summarizer-db
```

---

## 📜 Monitoring & Logs

### View Application Logs
```bash
# Server logs
aws logs tail /ecs/ai-document-summarizer-server --follow

# Frontend logs  
aws logs tail /ecs/ai-document-summarizer-frontend --follow

# With time range
aws logs tail /ecs/ai-document-summarizer-server --follow --since 1h
```

### Check ECS Tasks
```bash
# List tasks
aws ecs list-tasks --cluster ai-document-summarizer-cluster

# Describe specific task
aws ecs describe-tasks \
  --cluster ai-document-summarizer-cluster \
  --tasks arn:aws:ecs:...

# View task events
aws ecs describe-services \
  --cluster ai-document-summarizer-cluster \
  --services ai-document-summarizer-server-service
```

### Monitor Infrastructure
```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=ai-document-summarizer-server-service \
               Name=ClusterName,Value=ai-document-summarizer-cluster \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average,Maximum
```

---

## 🗑️ Cleanup & Destruction

### Destroy Specific Resource
```bash
terraform destroy -target=aws_ecs_service.server -var-file="environments/dev.tfvars"
```

### Destroy Everything
```bash
# Plan destruction
terraform plan -destroy -var-file="environments/dev.tfvars"

# Actually destroy (be careful!)
terraform destroy -var-file="environments/dev.tfvars"
```

### Clean Local Files
```bash
rm -rf .terraform/
rm -f terraform.tfstate*
rm -f .terraform.lock.hcl
```

---

## 🔐 Security Best Practices

### Store Passwords Securely
```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name ai-document-summarizer/db/password \
  --secret-string "YourPassword123"

# Reference in Terraform
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "ai-document-summarizer/db/password"
}
```

### Encrypt Terraform State
```hcl
# In backend.tf
terraform {
  backend "s3" {
    bucket         = "your-state-bucket"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### Rotate Database Password
```bash
# Update password in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id ai-document-summarizer/db/password \
  --secret-string "NewPassword123"

# Update Terraform (if not using Secrets Manager)
terraform apply -var-file="environments/dev.tfvars" -var='db_password=NewPassword123'
```

---

## 🆘 Troubleshooting

### Terraform Lock
```bash
# Find lock ID
terraform state list
terraform state show

# Remove lock
terraform force-unlock <LOCK_ID>
```

### State Corruption
```bash
# Backup current state
cp terraform.tfstate terraform.tfstate.backup

# Pull latest state
terraform refresh

# View state
terraform state list
```

### Resource Import
```bash
# Import existing resource
terraform import aws_security_group.example sg-12345678
```

### Debug Output
```bash
# Enable debug logging
export TF_LOG=DEBUG
export TF_LOG_PATH=terraform.log

terraform plan -var-file="environments/dev.tfvars"

# Check logs
tail -f terraform.log
```

---

## 📈 Cost Optimization

| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| DB Class | t3.micro | t3.small | t3.medium |
| Cache Nodes | 1 | 1 | 3 |
| App Tasks | 1 | 2 | 3 |
| Storage | 20GB | 50GB | 100GB |
| Backups | 7 days | 14 days | 30 days |

---

## 📚 References

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Best Practices](https://docs.aws.amazon.com/index.html)
- [Terraform Best Practices](https://www.terraform.io/docs)
- [Docker on AWS](https://docs.docker.com/cloud/ecs-integration/)
