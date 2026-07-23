# AI Document Summarizer - Terraform Configuration

Complete Terraform configuration for deploying the AI Document Summarizer application on AWS.

## Overview

This Terraform setup provides a complete infrastructure-as-code solution for deploying a containerized application with:
- VPC with public and private subnets across multiple AZs
- RDS PostgreSQL database
- ElastiCache Redis cache
- ECS Fargate for running containers
- Application Load Balancer
- S3 bucket for document uploads
- CloudWatch monitoring
- Auto-scaling configuration

## Prerequisites

1. **Terraform** >= 1.0 ([Install](https://www.terraform.io/downloads))
2. **AWS Account** with appropriate permissions
3. **AWS CLI** configured with credentials
4. **Docker images** pushed to ECR (for server and frontend)

## Quick Start

### 1. Set Up Environment Variables

```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
```

### 2. Create Variables File

Copy and customize the environment file:

```bash
cp environments/dev.tfvars terraform.tfvars
```

Or use a specific environment:

```bash
# For development
terraform plan -var-file="environments/dev.tfvars"

# For staging
terraform plan -var-file="environments/staging.tfvars"

# For production
terraform plan -var-file="environments/prod.tfvars"
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Review Plan

```bash
terraform plan -var-file="environments/dev.tfvars"
```

### 5. Apply Configuration

```bash
terraform apply -var-file="environments/dev.tfvars"
```

## Configuration Files

### `variables.tf`
All input variables with descriptions, types, defaults, and validations.

### `main.tf`
Core infrastructure resources including VPC, RDS, ElastiCache, ECS, ALB, and S3.

### `provider.tf`
AWS provider configuration with default tags.

### `outputs.tf`
Output values for accessing resource information after deployment.

### `backend.tf`
Remote state backend configuration (S3 + DynamoDB).

### `environments/`
Environment-specific variable files:
- `dev.tfvars` - Development configuration
- `staging.tfvars` - Staging configuration
- `prod.tfvars` - Production configuration

## Important Variables

### Required Variables (no defaults)

```hcl
environment               # "dev", "staging", or "prod"
server_image              # ECR image for backend service
frontend_image            # ECR image for frontend service
db_password               # Database password (min 8 chars)
```

### Key Configuration Variables

```hcl
aws_region                # AWS region (default: us-east-1)
vpc_cidr                  # VPC CIDR block (default: 10.0.0.0/16)
db_instance_class         # RDS instance type (default: db.t3.micro)
app_cpu                   # ECS task CPU (default: 256)
app_memory                # ECS task memory (default: 512)
app_desired_count         # Desired number of tasks (default: 2)
enable_autoscaling        # Enable auto-scaling (default: true)
enable_s3_uploads         # Enable S3 bucket (default: true)
```

## Deployment Guide

### Step 1: Push Docker Images to ECR

```bash
# Build and push server image
docker build -t server:latest ./server
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag server:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/server:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/server:latest

# Build and push frontend image
docker build -t frontend:latest ./ai-document-summarizer
docker tag frontend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/frontend:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/frontend:latest
```

### Step 2: Update Variable Files

Edit the environment-specific `.tfvars` file:

```hcl
# Set your account ID and image tags
server_image   = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/server:latest"
frontend_image = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/frontend:latest"
db_password    = "YourSecurePassword123"
```

### Step 3: Set Up Remote State (Optional but Recommended)

For team collaboration, use S3 + DynamoDB backend:

```bash
# Create S3 bucket
aws s3 mb s3://terraform-state-bucket-unique-name --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket terraform-state-bucket-unique-name \
  --versioning-configuration Status=Enabled

# Create DynamoDB table
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

Then uncomment and update `backend.tf`.

### Step 4: Deploy

```bash
# Initialize (first time only)
terraform init

# Plan
terraform plan -var-file="environments/dev.tfvars"

# Apply
terraform apply -var-file="environments/dev.tfvars"
```

### Step 5: Get Outputs

```bash
terraform output
terraform output alb_dns_name
```

## Management Commands

### View Current State

```bash
terraform show
terraform state list
terraform state show aws_db_instance.main
```

### Get Specific Output

```bash
terraform output alb_dns_name
terraform output rds_address
```

### Update Resources

```bash
# Plan changes
terraform plan -var-file="environments/dev.tfvars" -var="app_desired_count=3"

# Apply changes
terraform apply -var-file="environments/dev.tfvars" -var="app_desired_count=3"
```

### Destroy Infrastructure

```bash
# Plan destruction
terraform plan -destroy -var-file="environments/dev.tfvars"

# Destroy (be careful!)
terraform destroy -var-file="environments/dev.tfvars"
```

## Scaling Configuration

### Auto Scaling Policy

Edit the environment file to adjust scaling:

```hcl
min_capacity             = 2
max_capacity             = 10
target_cpu_utilization   = 70
enable_autoscaling       = true
```

Then apply:

```bash
terraform apply -var-file="environments/prod.tfvars"
```

### Manual Scaling

Change `app_desired_count`:

```bash
terraform apply -var-file="environments/dev.tfvars" -var="app_desired_count=4"
```

## Database Management

### Connect to RDS

```bash
psql -h <rds-endpoint> -U admin -d documentdb
```

### Create Backups

Snapshots are automatic. To force a snapshot:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier ai-document-summarizer-db \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)
```

### Restore from Snapshot

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier restored-db \
  --db-snapshot-identifier snapshot-id
```

## Monitoring

### CloudWatch Logs

View logs for ECS services:

```bash
# Server logs
aws logs tail /ecs/ai-document-summarizer-server --follow

# Frontend logs
aws logs tail /ecs/ai-document-summarizer-frontend --follow
```

### CloudWatch Metrics

View CPU/memory utilization in AWS Console under CloudWatch > Metrics.

## Troubleshooting

### Terraform State Lock

If Terraform is stuck on a lock:

```bash
terraform force-unlock LOCK_ID
```

### ECS Task Failures

Check task definitions and logs:

```bash
aws ecs list-tasks --cluster ai-document-summarizer-cluster
aws ecs describe-tasks --cluster ai-document-summarizer-cluster --tasks <task-arn>
aws logs get-log-events --log-group-name /ecs/ai-document-summarizer-server --log-stream-name <stream>
```

### Database Connection Issues

Verify security groups and RDS accessibility:

```bash
aws rds describe-db-instances --db-instance-identifier ai-document-summarizer-db
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

## Cost Optimization

1. **Use smaller instance types in dev:** Change `db_instance_class` to `db.t3.micro`
2. **Reduce log retention:** Lower `log_retention_days` for non-production
3. **Disable features:** Set `enable_s3_uploads = false` if not needed
4. **Use Spot instances:** Set `elasticache_num_cache_nodes = 1` in dev
5. **Scale down during off-hours:** Manually reduce `app_desired_count`

## Best Practices

1. **Always use `terraform plan` before `apply`**
2. **Keep sensitive data in terraform.tfvars (in .gitignore)**
3. **Use remote state for production**
4. **Enable versioning on S3 state bucket**
5. **Use separate .tfvars for each environment**
6. **Tag all resources for cost tracking**
7. **Review and test in dev before prod**
8. **Use auto-scaling in production**
9. **Enable backups for databases**
10. **Monitor costs with AWS Cost Explorer**

## Security Considerations

1. **Encrypt database password** in AWS Secrets Manager
2. **Use VPC endpoints** for private service access
3. **Enable encryption** for RDS and ElastiCache
4. **Restrict security groups** to minimum required access
5. **Use IAM roles** instead of access keys
6. **Enable MFA** for AWS console access
7. **Audit CloudTrail logs** for infrastructure changes
8. **Use HTTPS** for ALB (enable via `enable_https = true`)
9. **Implement WAF** rules for additional protection
10. **Regular security audits** of Terraform code

## Maintenance

### Regular Checks

```bash
# Weekly: Check for drift
terraform refresh

# Monthly: Update provider versions
terraform init -upgrade

# Quarterly: Review cost and optimize
# Check AWS Console > Cost Management
```

### Update Terraform Version

```bash
# Check current version
terraform version

# Download new version and upgrade
# Then run init again
terraform init
```

## Support and Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Best Practices](https://docs.aws.amazon.com/index.html)
- [Terraform Best Practices](https://www.terraform.io/docs)
- [Docker Documentation](https://docs.docker.com/)
- [ECS Documentation](https://docs.aws.amazon.com/ecs/)

## License

This Terraform configuration is part of the AI Document Summarizer project.
