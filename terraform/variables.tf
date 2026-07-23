variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ai-document-summarizer"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

# RDS Configuration
variable "db_engine" {
  description = "Database engine (mysql, postgres, mariadb)"
  type        = string
  default     = "postgres"
}

variable "db_engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "documentdb"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database password (minimum 8 characters)"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters."
  }
}

variable "db_skip_final_snapshot" {
  description = "Skip final snapshot when deleting DB"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

# ElastiCache (Redis) Configuration
variable "elasticache_engine" {
  description = "ElastiCache engine (redis, memcached)"
  type        = string
  default     = "redis"
}

variable "elasticache_engine_version" {
  description = "ElastiCache engine version"
  type        = string
  default     = "7.0"
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

# ECS Configuration
variable "ecs_launch_type" {
  description = "ECS launch type (EC2, FARGATE)"
  type        = string
  default     = "FARGATE"
}

variable "app_cpu" {
  description = "CPU units for ECS task"
  type        = number
  default     = 256
}

variable "app_memory" {
  description = "Memory (MB) for ECS task"
  type        = number
  default     = 512
}

variable "app_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "server_image" {
  description = "Docker image for server"
  type        = string
}

variable "frontend_image" {
  description = "Docker image for frontend"
  type        = string
}

variable "server_container_port" {
  description = "Server container port"
  type        = number
  default     = 5000
}

variable "frontend_container_port" {
  description = "Frontend container port"
  type        = number
  default     = 3000
}

# ALB Configuration
variable "enable_alb" {
  description = "Enable Application Load Balancer"
  type        = bool
  default     = true
}

variable "alb_target_type" {
  description = "ALB target type"
  type        = string
  default     = "ip"
}

# Security
variable "enable_https" {
  description = "Enable HTTPS"
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

# CloudWatch Logs
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

# Tags
variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Scaling Configuration
variable "enable_autoscaling" {
  description = "Enable ECS auto scaling"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 4
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization percentage"
  type        = number
  default     = 70
}

# S3 Configuration for file uploads
variable "enable_s3_uploads" {
  description = "Enable S3 bucket for document uploads"
  type        = bool
  default     = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name for uploads (must be globally unique)"
  type        = string
  default     = ""
}

variable "s3_upload_expiration_days" {
  description = "S3 object expiration in days (0 = never)"
  type        = number
  default     = 0
}

# CloudFront Configuration
variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = false
}

# Email Configuration
variable "email_from_address" {
  description = "Email address for sending emails"
  type        = string
  default     = ""
}

# API Configuration
variable "api_rate_limit" {
  description = "API rate limit per minute"
  type        = number
  default     = 100
}

# Monitoring
variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring and alarms"
  type        = bool
  default     = true
}

variable "alarm_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = ""
}
