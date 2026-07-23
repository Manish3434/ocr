# ── ALB Security Group ────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "ai-docs-alb-sg-${var.environment}"
  description = "Allow inbound HTTP/HTTPS traffic to Application Load Balancer"
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
    description      = "Allow all outbound traffic"
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
resource "aws_security_group" "ecs" {
  name        = "ai-docs-ecs-sg-${var.environment}"
  description = "Allow traffic from ALB to ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow HTTP traffic from ALB to Backend"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Allow HTTP traffic from ALB to Frontend"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description      = "Allow all outbound traffic for external API calls"
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
resource "aws_security_group" "redis" {
  name        = "ai-docs-redis-sg-${var.environment}"
  description = "Allow Redis traffic from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow Redis from ECS Tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    description = "Disallow outbound"
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
resource "aws_security_group" "db" {
  name        = "ai-docs-db-sg-${var.environment}"
  description = "Allow database traffic from ECS tasks and PgBouncer pooler"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow MongoDB / DocumentDB traffic from ECS Tasks"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    description = "Disallow outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ai-docs-db-sg-${var.environment}"
  }
}
