# Module invocation for PgBouncer / Connection Pooler
module "pgbouncer" {
  source = "../modules/pgbouncer"

  environment        = var.environment
  vpc_id             = aws_vpc.main.id
  private_subnet_ids = aws_subnet.private_app[*].id
  security_group_id  = aws_security_group.ecs.id
  db_host            = aws_docdb_cluster.docdb.endpoint
  db_port            = 27017
  max_client_conn    = 5000
  default_pool_size  = 50
}
