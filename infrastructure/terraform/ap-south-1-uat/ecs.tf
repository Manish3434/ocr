data "aws_caller_identity" "current" {}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "ai-docs-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_execution_role" {
  name = "ai-docs-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task Runtime
resource "aws_iam_role" "ecs_task_role" {
  name = "ai-docs-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/ai-docs-backend-${var.environment}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/ai-docs-frontend-${var.environment}"
  retention_in_days = 30
}

# ECS Task Definition - Backend Node.js
resource "aws_ecs_task_definition" "backend" {
  family                   = "ai-docs-backend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_backend_cpu
  memory                   = var.ecs_backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image
      essential = true

      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
          protocol      = "tcp"
        }
      ]

      environment = [
        # ── Core Server Config ────────────────────────────────────────────
        { name = "NODE_ENV",        value = "production" },
        { name = "PORT",            value = "5000" },
        { name = "SESSION_SECRET",  value = var.session_secret },
        { name = "FRONTEND_URL",    value = "http://${aws_lb.main.dns_name}" },
        { name = "SERVER_URL",      value = "http://${aws_lb.main.dns_name}" },
        { name = "ALLOWED_ORIGINS", value = "http://${aws_lb.main.dns_name}" },

        # ── Database & Cache ──────────────────────────────────────────────
        { name = "MONGO_URI",                     value = "mongodb://aidocsuser:${random_password.docdb_master.result}@${aws_docdb_cluster.docdb.endpoint}:27017/ai-docs-summarizer?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&connectTimeoutMS=10000" },
        { name = "MONGO_URI_FALLBACK",            value = "mongodb://waranlogesh2005_db_user:logeshwaran117@ac-dffxwcg-shard-00-00.lxcz99h.mongodb.net:27017,ac-dffxwcg-shard-00-01.lxcz99h.mongodb.net:27017,ac-dffxwcg-shard-00-02.lxcz99h.mongodb.net:27017/ai-document-summarizer?ssl=true&replicaSet=atlas-w3sq58-shard-0&authSource=admin&retryWrites=true&w=majority" },
        { name = "MONGO_URI_FALLBACK_2",          value = "mongodb://waranlogesh2005_db_user:logeshwaran117@ac-dffxwcg-shard-00-00.lxcz99h.mongodb.net:27017,ac-dffxwcg-shard-00-01.lxcz99h.mongodb.net:27017,ac-dffxwcg-shard-00-02.lxcz99h.mongodb.net:27017/ai-document-summarizer-dr?ssl=true&replicaSet=atlas-w3sq58-shard-0&authSource=admin&retryWrites=true&w=majority" },
        { name = "MONGO_TLS",                     value = "true" },
        { name = "MONGO_TLS_ALLOW_INVALID_CERTS", value = "true" },
        { name = "REDIS_URI",  value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379" },

        # ── AI API Keys ───────────────────────────────────────────────────
        { name = "GROQ_API_KEY",      value = var.groq_api_key },
        { name = "GROQ_MODEL",        value = "llama-3.3-70b-versatile" },
        { name = "ANTHROPIC_API_KEY", value = var.anthropic_api_key },
        { name = "OPENAI_API_KEY",    value = var.openai_api_key },
        { name = "GEMINI_KEY_1",      value = var.gemini_key_1 },
        { name = "GEMINI_KEYS_COUNT", value = "1" },

        # ── OAuth ─────────────────────────────────────────────────────────
        { name = "GOOGLE_CLIENT_ID",     value = var.google_client_id },
        { name = "GOOGLE_CLIENT_SECRET", value = var.google_client_secret },

        # ── Email ─────────────────────────────────────────────────────────
        { name = "EMAIL_HOST", value = "smtp.gmail.com" },
        { name = "EMAIL_PORT", value = "587" },
        { name = "EMAIL_USER", value = var.email_user },
        { name = "EMAIL_PASS", value = var.email_pass },
        { name = "EMAIL_FROM", value = var.email_user },

        # ── Payment (Cashfree) ────────────────────────────────────────────
        { name = "CASHFREE_APP_ID",        value = var.cashfree_app_id },
        { name = "CASHFREE_SECRET_KEY",    value = var.cashfree_secret_key },
        { name = "CASHFREE_ENV",           value = "PRODUCTION" },
        { name = "CASHFREE_WEBHOOK_SECRET", value = var.cashfree_webhook_secret }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

# ECS Task Definition - Frontend React/Nginx
resource "aws_ecs_task_definition" "frontend" {
  family                   = "ai-docs-frontend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_frontend_cpu
  memory                   = var.ecs_frontend_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = var.frontend_image
      essential = true

      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
}

# High Availability ECS Service - Backend (Zero-Downtime Rolling Deployment)
resource "aws_ecs_service" "backend" {
  name                               = "ai-docs-backend-${var.environment}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.backend.arn
  desired_count                      = var.ecs_min_capacity
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = aws_subnet.private_app[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.http]
}

# High Availability ECS Service - Frontend
resource "aws_ecs_service" "frontend" {
  name                               = "ai-docs-frontend-${var.environment}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.frontend.arn
  desired_count                      = var.ecs_min_capacity
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = aws_subnet.private_app[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http]
}

# ── Voice Agent ECS Fargate Infrastructure (Connected Directly to NLB) ─────────
resource "aws_cloudwatch_log_group" "voice_agent" {
  name              = "/ecs/ai-docs-voice-agent-${var.environment}"
  retention_in_days = 30
}

resource "aws_ecs_task_definition" "voice_agent" {
  family                   = "ai-docs-voice-agent-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "voice-agent"
      image     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/ai-docs-voice-agent:${var.environment}"
      essential = true
      portMappings = [
        {
          containerPort = 5060
          hostPort      = 5060
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.voice_agent.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "voice-agent"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "voice_agent" {
  name                               = "ai-docs-voice-agent-${var.environment}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.voice_agent.arn
  desired_count                      = var.ecs_min_capacity
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = aws_subnet.private_app[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.voice_agent.arn
    container_name   = "voice-agent"
    container_port   = 5060
  }

  depends_on = [aws_lb_listener.nlb_voice_tcp]
}
