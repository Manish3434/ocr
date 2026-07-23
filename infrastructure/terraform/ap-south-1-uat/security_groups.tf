# ── ALB Security Group ────────────────────────────────────────────────────
# Accepts HTTP traffic from the public internet
resource "aws_security_group" "alb" {
  name        = "ai-docs-alb-sg-${var.environment}"
  description = "Allow inbound HTTP traffic to Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description      = "Allow HTTP from internet"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    description      = "Allow all outbound traffic to ECS tasks"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "ai-docs-alb-sg-${var.environment}"
  }
}

# ── ECS Fargate Security Group ────────────────────────────────────────────
# ECS tasks receive traffic only from ALB.
# Outbound: allows pulling ECR images, calling DocumentDB, Redis, and AWS APIs via NAT.
resource "aws_security_group" "ecs" {
  name        = "ai-docs-ecs-sg-${var.environment}"
  description = "Allow traffic from ALB to ECS Fargate tasks - no EC2 required"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow HTTP from ALB to Backend (port 5000)"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Allow HTTP from ALB to Frontend (port 8080)"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description      = "Allow all outbound - ECR image pulls, DocumentDB, Redis, AWS APIs"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "ai-docs-ecs-sg-${var.environment}"
  }
}

# ── Redis Security Group ───────────────────────────────────────────────────
# Redis accepts connections only from ECS Fargate tasks
resource "aws_security_group" "redis" {
  name        = "ai-docs-redis-sg-${var.environment}"
  description = "Allow Redis traffic from ECS Fargate tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow Redis (6379) from ECS Fargate Tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    description = "Deny outbound from Redis"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ai-docs-redis-sg-${var.environment}"
  }
}

# ── DocumentDB Security Group ─────────────────────────────────────────────
# DocumentDB accepts connections only from ECS Fargate tasks on port 27017
# No EC2, no PgBouncer, no PostgreSQL — pure DocumentDB (MongoDB-compatible)
resource "aws_security_group" "db" {
  name        = "ai-docs-db-sg-${var.environment}"
  description = "Allow DocumentDB traffic from ECS Fargate tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow DocumentDB (27017) from ECS Fargate Tasks"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    description = "Deny outbound from DocumentDB"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ai-docs-db-sg-${var.environment}"
  }
}
