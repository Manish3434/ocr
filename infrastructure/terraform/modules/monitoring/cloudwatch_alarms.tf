variable "environment" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "backend_service_name" {
  type = string
}

variable "frontend_service_name" {
  type = string
}

variable "alb_target_group_arn" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

# SNS Topic for Alarms
resource "aws_sns_topic" "alerts" {
  name = "ai-docs-alerts-${var.environment}"
}

# CloudWatch Alarm - High ECS CPU Utilization
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "ai-docs-ecs-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Alarm when ECS CPU utilization exceeds 85%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Alarm - High ECS Memory Utilization
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "ai-docs-ecs-memory-high-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when ECS Memory utilization exceeds 90%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Alarm - ALB Unhealthy Host Count
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "ai-docs-alb-unhealthy-hosts-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Alarm when ALB target group has unhealthy hosts"

  dimensions = {
    TargetGroup  = var.alb_target_group_arn
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
