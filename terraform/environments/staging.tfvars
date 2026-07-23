aws_region     = "us-east-1"
environment    = "staging"
project_name   = "ai-document-summarizer"

vpc_cidr              = "10.0.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24"]

db_engine              = "postgres"
db_instance_class      = "db.t3.small"
db_allocated_storage   = 50
db_name                = "documentdb"
db_username            = "admin"
db_password            = "StagingPassword123456"
db_skip_final_snapshot = false
db_backup_retention_period = 14

elasticache_engine          = "redis"
elasticache_node_type       = "cache.t3.small"
elasticache_num_cache_nodes = 1

app_cpu             = 512
app_memory          = 1024
app_desired_count   = 2
server_container_port  = 5000
frontend_container_port = 3000

enable_alb      = true
enable_https    = true
certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"

log_retention_days = 14

enable_autoscaling       = true
min_capacity             = 2
max_capacity             = 4
target_cpu_utilization   = 70

enable_s3_uploads         = true
s3_upload_expiration_days = 90

enable_monitoring = true
alarm_email       = "ops@example.com"

tags = {
  Team        = "DevOps"
  CostCenter  = "Engineering"
  Environment = "Staging"
}
