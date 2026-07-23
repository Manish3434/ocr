output "pgbouncer_security_group_id" {
  description = "Security Group ID of PgBouncer pooler"
  value       = aws_security_group.pgbouncer.id
}
