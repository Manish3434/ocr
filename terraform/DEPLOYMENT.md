# Terraform Configuration - Setup Checklist

## Pre-Deployment Checklist

Before deploying this Terraform configuration, ensure you have completed the following:

### AWS Account & Credentials
- [ ] AWS account created and access configured
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Appropriate IAM permissions for ECS, RDS, ElastiCache, ALB, VPC
- [ ] AWS region selected (default: us-east-1)

### Tools Installation
- [ ] Terraform installed (v1.0+)
- [ ] Docker installed (for building images)
- [ ] git installed (for version control)
- [ ] jq installed (optional, for JSON parsing)

### Application Preparation
- [ ] Docker images built for server and frontend
- [ ] Docker images pushed to AWS ECR (or registry)
- [ ] Database migrations prepared
- [ ] Environment variables documented

### Configuration Files
- [ ] Variables file created (`terraform.tfvars`)
- [ ] Database password set (minimum 8 characters, strong)
- [ ] ECR image URIs updated in variables
- [ ] AWS region verified

### Optional - Remote State Setup
- [ ] S3 bucket created for Terraform state
- [ ] DynamoDB table created for state locking
- [ ] `backend.tf` uncommented and configured (optional)

---

## Deployment Steps

### Step 1: Initialize Terraform
```bash
cd terraform
terraform init
```

**Verification:**
- `.terraform/` directory created
- `.terraform.lock.hcl` file present
- No errors in initialization

### Step 2: Validate Configuration
```bash
terraform validate
terraform fmt -recursive
```

**Verification:**
- All syntax valid
- No formatting issues

### Step 3: Review Plan
```bash
terraform plan -var-file="environments/dev.tfvars"
```

**Review:**
- Number of resources to be created (~50)
- Resource configurations correct
- No unexpected changes
- Estimated costs

### Step 4: Apply Configuration
```bash
terraform apply -var-file="environments/dev.tfvars"
```

**Verification:**
- All resources created successfully
- ALB DNS name available in outputs
- RDS endpoint accessible
- ECS services running (check AWS Console)

### Step 5: Verify Deployment
```bash
# Get ALB DNS
terraform output alb_dns_name

# Check ECS services
aws ecs list-services --cluster ai-document-summarizer-cluster

# Check RDS
aws rds describe-db-instances --db-instance-identifier ai-document-summarizer-db

# Check ElastiCache
aws elasticache-describe-cache-clusters --cache-cluster-id ai-document-summarizer-cache
```

### Step 6: Update DNS (if using custom domain)
```bash
# Create CNAME record pointing to ALB DNS
# Example: app.yourdomain.com -> alb-dns.aws.region.elb.amazonaws.com
```

---

## Post-Deployment Configuration

### 1. Update Application Configuration
Update your application with:
- RDS endpoint: `terraform output rds_address`
- ElastiCache endpoint: `terraform output elasticache_endpoint`
- S3 bucket name: `terraform output s3_bucket_name`

### 2. Set Up SSL/HTTPS (if not enabled)
```bash
# Request certificate in AWS ACM
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com

# Get certificate ARN
aws acm list-certificates

# Update terraform.tfvars
enable_https = true
certificate_arn = "arn:aws:acm:..."

# Reapply Terraform
terraform apply -var-file="environments/dev.tfvars"
```

### 3. Configure Database
```bash
# Connect to RDS
psql -h $(terraform output -raw rds_address) -U admin -d documentdb

# Run migrations if needed
\i migrations/001_init.sql
```

### 4. Set Up Monitoring
```bash
# Enable detailed CloudWatch monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name ai-document-summarizer-high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### 5. Configure Backups
```bash
# RDS automatic backups already configured
# Verify retention period
aws rds describe-db-instances \
  --db-instance-identifier ai-document-summarizer-db \
  --query 'DBInstances[0].BackupRetentionPeriod'
```

---

## Troubleshooting Common Issues

### Issue: "AccessDenied" error
**Solution:** Verify IAM permissions for your AWS user/role

### Issue: "Invalid ECR image URL"
**Solution:** Push Docker images to ECR and update image URIs in variables

### Issue: "RDS connection failed"
**Solution:** Check security groups allow connection from ECS tasks

### Issue: "ECS tasks failing to start"
**Solution:** Check CloudWatch logs: `/ecs/ai-document-summarizer-server`

### Issue: "Terraform state lock"
**Solution:** `terraform force-unlock <LOCK_ID>`

---

## Environment-Specific Deployments

### Development
```bash
terraform apply -var-file="environments/dev.tfvars"
```
- Smaller resources (cost-optimized)
- 1 container instance
- 7-day backup retention
- No auto-scaling

### Staging
```bash
terraform apply -var-file="environments/staging.tfvars"
```
- Medium resources
- 2 container instances
- 14-day backup retention
- Basic auto-scaling

### Production
```bash
terraform apply -var-file="environments/prod.tfvars"
```
- Larger resources (high-availability)
- 3+ container instances
- 30-day backup retention
- Full auto-scaling
- HTTPS enabled
- CloudFront enabled

---

## Monitoring After Deployment

### CloudWatch Logs
```bash
# View real-time logs
aws logs tail /ecs/ai-document-summarizer-server --follow
aws logs tail /ecs/ai-document-summarizer-frontend --follow
```

### ECS Service Health
```bash
# Check service status
aws ecs describe-services \
  --cluster ai-document-summarizer-cluster \
  --services ai-document-summarizer-server-service \
  --query 'services[0].[status,deployments]'
```

### RDS Performance
```bash
# Check database performance metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=ai-document-summarizer-db \
  --start-time $(date -u -d '-1 hour' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

---

## Maintenance Tasks

### Weekly
- [ ] Check CloudWatch logs for errors
- [ ] Review cost dashboard
- [ ] Verify backups are running

### Monthly
- [ ] Review security group rules
- [ ] Check for Terraform/AWS provider updates
- [ ] Review and optimize resource sizes

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Disaster recovery drill (restore from backup)

---

## Scaling Operations

### Scale Up Application
```bash
terraform apply \
  -var-file="environments/prod.tfvars" \
  -var="app_desired_count=5"
```

### Scale Down During Off-Hours
```bash
terraform apply \
  -var-file="environments/prod.tfvars" \
  -var="app_desired_count=2"
```

### Upgrade Database
```bash
terraform apply \
  -var-file="environments/prod.tfvars" \
  -var="db_instance_class=db.t3.large"
```

---

## Disaster Recovery

### Backup & Restore Database
```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier ai-document-summarizer-db \
  --db-snapshot-identifier backup-$(date +%Y%m%d-%H%M%S)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ai-document-summarizer-db-restored \
  --db-snapshot-identifier backup-id
```

### Recreate Infrastructure
```bash
# Destroy (if needed)
terraform destroy -var-file="environments/prod.tfvars"

# Recreate
terraform apply -var-file="environments/prod.tfvars"
```

---

## Support Resources

- Terraform Docs: https://www.terraform.io/docs
- AWS ECS Guide: https://docs.aws.amazon.com/ecs/
- AWS RDS Guide: https://docs.aws.amazon.com/rds/
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest

---

## Final Notes

- Keep `terraform.tfvars` secure (add to `.gitignore`)
- Regularly back up your state file
- Use version control for infrastructure code
- Document any manual changes to infrastructure
- Test major changes in dev/staging first
