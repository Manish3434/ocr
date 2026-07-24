output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "application_url" {
  description = "The HTTP URL of the application via ALB (no domain/HTTPS configured)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "nlb_dns_name" {
  description = "The DNS name of the High-Performance Network Load Balancer"
  value       = aws_lb.nlb.dns_name
}

output "high_performance_nlb_url" {
  description = "The HTTP/TCP URL of the application via NLB"
  value       = "http://${aws_lb.nlb.dns_name}"
}

output "voice_agent_url" {
  description = "The SIP/TCP Voice Agent Endpoint via High-Performance NLB"
  value       = "sip:${aws_lb.nlb.dns_name}:5060"
}

output "ecs_cluster_name" {
  description = "Name of the ECS Cluster"
  value       = aws_ecs_cluster.main.name
}

output "docdb_endpoint" {
  description = "The primary endpoint of DocumentDB"
  value       = aws_docdb_cluster.docdb.endpoint
}

output "redis_primary_endpoint" {
  description = "The primary endpoint of ElastiCache Redis"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "The read replica endpoint of ElastiCache Redis for read-heavy scaling"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}
