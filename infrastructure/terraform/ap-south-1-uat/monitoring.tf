# Module invocation for CloudWatch Monitoring Alarms
module "monitoring" {
  source = "../modules/monitoring"

  environment           = var.environment
  ecs_cluster_name      = aws_ecs_cluster.main.name
  backend_service_name  = aws_ecs_service.backend.name
  frontend_service_name = aws_ecs_service.frontend.name
  alb_target_group_arn  = aws_lb_target_group.backend.arn_suffix
  alb_arn_suffix        = aws_lb.main.arn_suffix
}
