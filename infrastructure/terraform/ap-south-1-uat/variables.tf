variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "uat"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}


variable "backend_image" {
  description = "ECR image URL for the backend Node.js container"
  type        = string
  default     = "962415228730.dkr.ecr.ap-northeast-1.amazonaws.com/ai-docs-backend:latest"
}

variable "frontend_image" {
  description = "ECR image URL for the frontend React/Nginx container"
  type        = string
  default     = "962415228730.dkr.ecr.ap-northeast-1.amazonaws.com/ai-docs-frontend:latest"
}

variable "ecs_backend_cpu" {
  description = "CPU units for backend ECS task"
  type        = number
  default     = 512
}

variable "ecs_backend_memory" {
  description = "Memory (MB) for backend ECS task"
  type        = number
  default     = 1024
}

variable "ecs_frontend_cpu" {
  description = "CPU units for frontend ECS task"
  type        = number
  default     = 256
}

variable "ecs_frontend_memory" {
  description = "Memory (MB) for frontend ECS task"
  type        = number
  default     = 512
}

variable "ecs_min_capacity" {
  description = "Minimum capacity of ECS tasks for autoscaling"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Maximum capacity of ECS tasks for autoscaling"
  type        = number
  default     = 4
}

variable "db_instance_class" {
  description = "Instance class for relational database / DocumentDB cluster"
  type        = string
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}
