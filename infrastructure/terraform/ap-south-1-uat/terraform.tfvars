# ── AWS Region & Environment ───────────────────────────────────────────────
aws_region  = "ap-northeast-1"
environment = "uat"

# ── Network Configuration ──────────────────────────────────────────────────
vpc_cidr    = "10.0.0.0/16"

# ── Container Registry Images (ECR Tokyo) ──────────────────────────────────
backend_image  = "962415228730.dkr.ecr.ap-northeast-1.amazonaws.com/ai-docs-backend:latest"
frontend_image = "962415228730.dkr.ecr.ap-northeast-1.amazonaws.com/ai-docs-frontend:latest"

# ── Compute Resources (ECS Fargate) ────────────────────────────────────────
ecs_backend_cpu     = 512
ecs_backend_memory  = 1024
ecs_frontend_cpu    = 256
ecs_frontend_memory = 512

# ── Auto Scaling Limits ────────────────────────────────────────────────────
ecs_min_capacity = 2
ecs_max_capacity = 10

# ── Database & Cache Instance Specs ───────────────────────────────────────
db_instance_class = "db.r6g.large"
redis_node_type   = "cache.t4g.medium"
