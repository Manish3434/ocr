# High Availability Application Load Balancer across 3 Public Subnets
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

# Target Group for Frontend (React Nginx on Port 8080)
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

# Target Group for Backend (Node.js Express on Port 5000)
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

# HTTP Listener (Port 80) -> Default Forward to Frontend Target Group
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Listener Rule for HTTP Backend API (/api/* and /auth/*)
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

# ── High-Performance Network Load Balancer (NLB) for Ultra-Low Latency ──────────
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

# NLB Target Group targeting ALB (Target Type = alb)
resource "aws_lb_target_group" "nlb_to_alb" {
  name        = "ai-docs-tg-nlb-alb-${var.environment}"
  port        = 80
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "alb"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "80"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "ai-docs-tg-nlb-alb-${var.environment}"
  }
}

# Attach ALB as target inside NLB Target Group
resource "aws_lb_target_group_attachment" "nlb_alb_attachment" {
  target_group_arn = aws_lb_target_group.nlb_to_alb.arn
  target_id        = aws_lb.main.arn
  port             = 80
}

# NLB Listener (TCP Port 80) -> Forwards to ALB
resource "aws_lb_listener" "nlb_tcp_80" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = "80"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nlb_to_alb.arn
  }
}
