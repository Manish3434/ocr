variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-northeast-1"
}

variable "aws_account_id" {
  description = "AWS Account ID for ECR image registries"
  type        = string
  default     = "962415228730"
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

variable "voice_agent_image" {
  description = "ECR image URL for the Voice Agent container"
  type        = string
  default     = "962415228730.dkr.ecr.ap-northeast-1.amazonaws.com/ai-docs-backend:latest"
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

# ── Application Secrets ────────────────────────────────────────────────────
variable "session_secret" {
  description = "Session secret key (min 32 chars)"
  type        = string
  sensitive   = true
  default     = "change-this-to-a-secure-random-secret-key-32"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "groq_api_key" {
  description = "Groq AI API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic Claude API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_key_1" {
  description = "Google Gemini API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_user" {
  description = "SMTP Email address"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_pass" {
  description = "SMTP Email app password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cashfree_app_id" {
  description = "Cashfree App ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cashfree_secret_key" {
  description = "Cashfree Secret Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cashfree_webhook_secret" {
  description = "Cashfree Webhook Secret"
  type        = string
  sensitive   = true
  default     = ""
}
