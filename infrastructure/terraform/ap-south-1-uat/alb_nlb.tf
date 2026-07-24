# ── Application Load Balancer (HTTP/HTTPS) ──────────────────────────────────────
resource "aws_lb" "main" {
  name               = "ai-docs-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name = "ai-docs-alb-${var.environment}"
  }
}

# Target Group for Frontend (React Nginx on Port 8080) -> Frontend ECS Fargate
resource "aws_lb_target_group" "frontend" {
  name                 = "ai-docs-tg-frontend-${var.environment}"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "ip"
  deregistration_delay = 30 # Connection draining for zero connection drop

  health_check {
    enabled             = true
    path                = "/health"
    port                = "8080"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name = "ai-docs-tg-frontend-${var.environment}"
  }
}

# Target Group for Backend (Node.js Express on Port 5000) -> Backend ECS Fargate
resource "aws_lb_target_group" "backend" {
  name                 = "ai-docs-tg-backend-${var.environment}"
  port                 = 5000
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "ip"
  deregistration_delay = 30 # Connection draining for zero connection drop

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "5000"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name = "ai-docs-tg-backend-${var.environment}"
  }
}

# HTTP Listener (Port 80) -> Default Forward to Frontend ECS Fargate
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Listener Rule for HTTP Backend API (/api/* and /auth/*) -> Backend ECS Fargate
resource "aws_lb_listener_rule" "backend_api_http" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/auth/*"]
    }
  }
}

# ── Network Load Balancer (SIP/TCP/UDP) ─────────────────────────────────────────
resource "aws_lb" "nlb" {
  name               = "ai-docs-nlb-${var.environment}"
  internal           = false
  load_balancer_type = "network"
  subnets            = aws_subnet.public[*].id

  enable_cross_zone_load_balancing = true
  enable_deletion_protection       = false

  tags = {
    Name = "ai-docs-nlb-${var.environment}"
  }
}

# Target Group for Voice Agent (SIP/TCP on Port 5060) -> Voice Agent ECS Fargate
resource "aws_lb_target_group" "voice_agent" {
  name                 = "ai-docs-tg-voice-${var.environment}"
  port                 = 5060
  protocol             = "TCP"
  vpc_id               = aws_vpc.main.id
  target_type          = "ip"
  deregistration_delay = 15

  health_check {
    enabled             = true
    port                = "5060"
    protocol            = "TCP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "ai-docs-tg-voice-${var.environment}"
  }
}

# NLB Listener (SIP/TCP Port 5060) -> Forwards directly to Voice Agent ECS Fargate
resource "aws_lb_listener" "nlb_voice_tcp" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = "5060"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.voice_agent.arn
  }
}
