# Random Auth Token for Redis (min 16 chars, no special chars)
resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# ElastiCache Redis Replication Group - Secured with AUTH token + TLS
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "ai-docs-redis-${var.environment}"
  description                = "HA Redis cluster with AUTH token and automatic failover"
  node_type                  = var.redis_node_type
  num_cache_clusters         = 2
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # ── Security ───────────────────────────────────────────────────────────
  at_rest_encryption_enabled = true   # Encrypt data at rest
  transit_encryption_enabled = true   # Encrypt data in transit (TLS)
  auth_token                 = random_password.redis_auth.result  # Redis AUTH password

  maintenance_window = "sun:03:00-sun:04:00"
  snapshot_window    = "01:00-02:00"

  tags = {
    Name = "ai-docs-redis-${var.environment}"
  }
}

# Output auth token (sensitive) for use in ECS task env vars
output "redis_auth_token" {
  description = "Redis AUTH token (sensitive)"
  value       = random_password.redis_auth.result
  sensitive   = true
}
