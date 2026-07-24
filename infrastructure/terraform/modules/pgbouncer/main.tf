# Security Group for PgBouncer Connection Pooler Instance
resource "aws_security_group" "pgbouncer" {
  name        = "ai-docs-pgbouncer-sg-${var.environment}"
  description = "Security group for PgBouncer connection pooler"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow connections from app tier"
    from_port       = 6432
    to_port         = 6432
    protocol        = "tcp"
    security_groups = [var.security_group_id]
  }

  egress {
    description = "Allow egress to DB and VPC"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ai-docs-pgbouncer-sg-${var.environment}"
  }
}

# Local Parameters for Connection Pooler Configuration
locals {
  pool_mode        = "transaction"
  max_client_conn  = var.max_client_conn
  default_pool_size = var.default_pool_size
}
