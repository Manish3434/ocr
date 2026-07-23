# Local variables and computed values
# These are used throughout the configuration for consistency

locals {
  # Common naming convention
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Common tags applied to all resources
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      CreatedWith = "Terraform"
      CreatedAt   = timestamp()
    }
  )

  # Availability zones
  azs = slice(data.aws_availability_zones.available.names, 0, length(var.availability_zones))

  # Environment-based configurations
  is_prod    = var.environment == "prod"
  is_staging = var.environment == "staging"
  is_dev     = var.environment == "dev"

  # Database configuration
  db_multi_az = local.is_prod ? true : false
  db_deletion_protection = local.is_prod ? true : false
  
  # ECS configuration
  ecs_log_retention = local.is_prod ? 30 : local.is_staging ? 14 : 7
  
  # Backup configuration
  backup_retention = local.is_prod ? 30 : local.is_staging ? 14 : 7
  
  # Health check paths for different targets
  health_check_paths = {
    server   = "/health"
    frontend = "/"
  }

  # Port mappings
  ports = {
    http     = 80
    https    = 443
    server   = var.server_container_port
    frontend = var.frontend_container_port
    postgres = 5432
    redis    = 6379
  }

  # Container names
  container_names = {
    server   = "server"
    frontend = "frontend"
  }

  # CloudWatch log group names
  log_groups = {
    server   = "/ecs/${local.name_prefix}-server"
    frontend = "/ecs/${local.name_prefix}-frontend"
  }

  # Security group names
  security_groups = {
    alb            = "${local.name_prefix}-alb-sg"
    server         = "${local.name_prefix}-server-sg"
    frontend       = "${local.name_prefix}-frontend-sg"
    rds            = "${local.name_prefix}-rds-sg"
    elasticache    = "${local.name_prefix}-elasticache-sg"
  }

  # Resource naming
  resource_names = {
    vpc                = "${local.name_prefix}-vpc"
    igw                = "${local.name_prefix}-igw"
    nat_eip            = "${local.name_prefix}-eip"
    nat_gateway        = "${local.name_prefix}-nat"
    rds_subnet_group   = "${local.name_prefix}-db-subnet-group"
    rds_instance       = "${local.name_prefix}-db"
    elasticache_subnet = "${local.name_prefix}-cache-subnet-group"
    elasticache_cluster = "${local.name_prefix}-cache"
    alb                = "${local.name_prefix}-alb"
    alb_server_tg      = "${local.name_prefix}-server-tg"
    alb_frontend_tg    = "${local.name_prefix}-frontend-tg"
    ecs_cluster        = "${local.name_prefix}-cluster"
    ecs_server_task    = "${local.name_prefix}-server"
    ecs_frontend_task  = "${local.name_prefix}-frontend"
    ecs_server_service = "${local.name_prefix}-server-service"
    ecs_frontend_service = "${local.name_prefix}-frontend-service"
    iam_task_execution = "${local.name_prefix}-ecs-task-execution-role"
    iam_task_role      = "${local.name_prefix}-ecs-task-role"
    s3_bucket          = "${local.name_prefix}-uploads-${data.aws_caller_identity.current.account_id}"
  }

  # Enable/disable features based on environment
  enable_advanced_monitoring = local.is_prod || local.is_staging
  enable_multi_az            = local.is_prod
  enable_encryption          = true
  enable_versioning          = local.is_prod
}
