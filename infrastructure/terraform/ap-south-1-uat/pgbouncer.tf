# ── PgBouncer Security Group (Kept to ensure zero-deletion stability) ─────────
# Keeping this security group in code prevents Terraform from attempting to delete
# sg-0cc77c7a068fd7b73 on AWS, completely eliminating the 15-minute dependency timeout.
resource "aws_security_group" "pgbouncer" {
  name        = "ai-docs-pgbouncer-sg-${var.environment}"
  description = "Security group for PgBouncer connection pooler"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow connections from app tier"
    from_port   = 6432
    to_port     = 6432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    description = "Allow egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ai-docs-pgbouncer-sg-${var.environment}"
  }
}

module "pgbouncer" {
  source = "../modules/pgbouncer"

  environment       = var.environment
  vpc_id           = aws_vpc.main.id
  security_group_id = aws_security_group.ecs.id
}
