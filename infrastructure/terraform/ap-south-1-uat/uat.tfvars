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
ecs_min_capacity = 1
ecs_max_capacity = 4

# ── Database & Cache Instance Specs ───────────────────────────────────────
db_instance_class = "db.t3.medium"
redis_node_type   = "cache.t3.micro"

# ── Application Secrets ────────────────────────────────────────────────────
# Session secret - required for app to start (min 32 chars)
session_secret = "ai-docs-uat-secret-key-2026-secure-prod-key"

# ── Google OAuth (get from https://console.cloud.google.com/apis/credentials)
# FILL THESE IN to enable Google Login feature
google_client_id     = ""
google_client_secret = ""

# ── AI API Keys (fill in to enable AI summarization features)
groq_api_key      = ""   # https://console.groq.com/keys
gemini_key_1      = ""   # https://aistudio.google.com/app/apikey
openai_api_key    = ""   # https://platform.openai.com/api-keys
anthropic_api_key = ""   # https://console.anthropic.com

# ── Email SMTP (fill in to enable email notifications)
email_user = "maneeskumar3434@gmail.com"
email_pass = ""   # ⚠️  REQUIRED: Generate Gmail App Password at https://myaccount.google.com/apppasswords
           # (NOT your Gmail login password - a 16-char app-specific password)

# ── Cashfree Payment (fill in to enable payments)
cashfree_app_id        = ""
cashfree_secret_key    = ""
cashfree_webhook_secret = ""
