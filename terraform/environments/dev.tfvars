aws_region     = "us-east-1"
environment    = "dev"
project_name   = "ai-document-summarizer"

vpc_cidr              = "10.0.0.0/16"
availability_zones    = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24"]

db_engine              = "postgres"
db_instance_class      = "db.t3.micro"
db_allocated_storage   = 20
db_name                = "documentdb"
db_username            = "admin"
db_password            = "DevPassword123456"
db_skip_final_snapshot = true
db_backup_retention_period = 7

elasticache_engine          = "redis"
elasticache_node_type       = "cache.t3.micro"
elasticache_num_cache_nodes = 1

app_cpu             = 256
app_memory          = 512
app_desired_count   = 1
server_container_port  = 5000
frontend_container_port = 3000

enable_alb      = true
enable_https    = false

log_retention_days = 7

enable_autoscaling       = false
min_capacity             = 1
max_capacity             = 2
target_cpu_utilization   = 70

enable_s3_uploads         = true
s3_upload_expiration_days = 0

enable_monitoring = true
alarm_email       = "admin@example.com"

tags = {
  Team        = "DevOps"
  CostCenter  = "Engineering"
  Environment = "Development"
}
