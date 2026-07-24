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

variable "alert_email" {
  type    = string
  default = "waranlogesh2005@gmail.com"
}

locals {
  valid_alert_email = var.alert_email != "" && var.alert_email != null ? var.alert_email : "waranlogesh2005@gmail.com"
}

# SNS Topic for Alarms
resource "aws_sns_topic" "alerts" {
  name = "ai-docs-alerts-${var.environment}"
}

# SNS Email Subscription for Automatic Alert Notifications
resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = local.valid_alert_email
}

# CloudWatch Alarm - High ECS CPU Utilization (Triggers automatically at 70%)
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "ai-docs-ecs-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Alarm automatically triggered when ECS CPU utilization exceeds 70%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Alarm - High ECS Memory Utilization (Triggers automatically at 70%)
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "ai-docs-ecs-memory-high-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Alarm automatically triggered when ECS Memory utilization exceeds 70%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Alarm - High DocumentDB CPU Utilization (Triggers automatically at 70%)
resource "aws_cloudwatch_metric_alarm" "docdb_cpu_high" {
  alarm_name          = "ai-docs-docdb-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Alarm automatically triggered when DocumentDB CPU utilization exceeds 70%"

  dimensions = {
    DBClusterIdentifier = "ai-docs-docdb-${var.environment}"
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
  alarm_description   = "Alarm automatically triggered when ALB target group has unhealthy hosts"

  dimensions = {
    TargetGroup  = var.alb_target_group_arn
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
