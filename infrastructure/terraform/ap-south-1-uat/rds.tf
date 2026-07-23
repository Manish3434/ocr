# Random password for database admin
resource "random_password" "docdb_master" {
  length  = 16
  special = false
}

# AWS DocumentDB Cluster (MongoDB Compatible Multi-AZ Cluster)
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier      = "ai-docs-docdb-${var.environment}"
  engine                  = "docdb"
  master_username         = "aidocsuser"
  master_password         = random_password.docdb_master.result
  db_subnet_group_name    = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db.id]

  storage_encrypted   = true
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name = "ai-docs-docdb-${var.environment}"
  }
}

# Multi-AZ DocumentDB Cluster Instances (Primary + Standby Replica)
resource "aws_docdb_cluster_instance" "docdb_instances" {
  count              = 2
  identifier         = "ai-docs-docdb-instance-${count.index + 1}-${var.environment}"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = var.db_instance_class

  tags = {
    Name = "ai-docs-docdb-instance-${count.index + 1}-${var.environment}"
  }
}
