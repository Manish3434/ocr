output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.main.arn
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_address" {
  description = "RDS database address"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "rds_port" {
  description = "RDS database port"
  value       = aws_db_instance.main.port
}

output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
  sensitive   = true
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_server_name" {
  description = "ECS service name for server"
  value       = aws_ecs_service.server.name
}

output "ecs_service_frontend_name" {
  description = "ECS service name for frontend"
  value       = aws_ecs_service.frontend.name
}

output "iam_role_ecs_task_execution_arn" {
  description = "IAM role ARN for ECS task execution"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "cloudwatch_log_group_server" {
  description = "CloudWatch log group for server"
  value       = aws_cloudwatch_log_group.server.name
}

output "cloudwatch_log_group_frontend" {
  description = "CloudWatch log group for frontend"
  value       = aws_cloudwatch_log_group.frontend.name
}

output "s3_bucket_name" {
  description = "S3 bucket name for uploads"
  value       = var.enable_s3_uploads ? aws_s3_bucket.uploads[0].id : ""
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = var.enable_s3_uploads ? aws_s3_bucket.uploads[0].arn : ""
}

output "security_group_server_id" {
  description = "Security group ID for server"
  value       = aws_security_group.server.id
}

output "security_group_rds_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "security_group_elasticache_id" {
  description = "Security group ID for ElastiCache"
  value       = aws_security_group.elasticache.id
}
