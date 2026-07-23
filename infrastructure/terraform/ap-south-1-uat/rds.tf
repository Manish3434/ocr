# Random password for DocumentDB admin user
resource "random_password" "docdb_master" {
  length  = 16
  special = false
}

# DocumentDB Cluster Parameter Group - TLS disabled for simple connection
# (No domain/certificate configured - plain mongodb:// connection from ECS)
resource "aws_docdb_cluster_parameter_group" "no_tls" {
  family      = "docdb5.0"
  name        = "ai-docs-docdb-no-tls-${var.environment}"
  description = "DocumentDB parameter group with TLS disabled"

  parameter {
    name  = "tls"
    value = "disabled"
  }

  tags = {
    Name = "ai-docs-docdb-params-${var.environment}"
  }
}

# AWS DocumentDB Cluster (MongoDB 5.0 Compatible)
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier              = "ai-docs-docdb-${var.environment}"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = "aidocsuser"
  master_password                 = random_password.docdb_master.result
  db_subnet_group_name            = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids          = [aws_security_group.db.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.no_tls.name

  storage_encrypted   = true
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name = "ai-docs-docdb-${var.environment}"
  }
}

# DocumentDB Cluster Instances (2 for HA)
resource "aws_docdb_cluster_instance" "docdb_instances" {
  count              = 2
  identifier         = "ai-docs-docdb-instance-${count.index + 1}-${var.environment}"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = var.db_instance_class

  tags = {
    Name = "ai-docs-docdb-instance-${count.index + 1}-${var.environment}"
  }
}

# Output the master password so it can be stored safely
output "docdb_master_password" {
  description = "DocumentDB master password (store this securely)"
  value       = random_password.docdb_master.result
  sensitive   = true
}
