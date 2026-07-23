# Keep PgBouncer module definition to prevent Terraform dependency locks on existing Security Group (sg-0cc77c7a068fd7b73)
module "pgbouncer" {
  source = "../modules/pgbouncer"

  environment       = var.environment
  vpc_id           = aws_vpc.main.id
  security_group_id = aws_security_group.ecs.id
}
