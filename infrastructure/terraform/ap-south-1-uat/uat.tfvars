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
# ⚠️  DO NOT commit real secrets here.
# All secrets below are injected at pipeline runtime via:
#   Jenkins Credentials → TF_VAR_* environment variables
# See Jenkinsfile for injection logic.

session_secret = "ai-docs-uat-secret-key-2026-secure-prod-key"

# ── Google OAuth ───────────────────────────────────────────────────────────
# Injected via Jenkins credentials: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
google_client_id     = ""
google_client_secret = ""

# ── AI API Keys ────────────────────────────────────────────────────────────
# Injected via Jenkins credentials: GROQ_API_KEY / GEMINI_KEY_1 / etc.
groq_api_key      = ""
gemini_key_1      = ""
openai_api_key    = ""
anthropic_api_key = ""

# ── Email SMTP ─────────────────────────────────────────────────────────────
# Injected via Jenkins credentials: EMAIL_USER / EMAIL_PASS
email_user = ""
email_pass = ""

# ── Cashfree Payment ───────────────────────────────────────────────────────
# Injected via Jenkins credentials: CASHFREE_APP_ID / CASHFREE_SECRET_KEY
cashfree_app_id         = ""
cashfree_secret_key     = ""
cashfree_webhook_secret = ""
