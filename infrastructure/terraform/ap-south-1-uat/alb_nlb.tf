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
    path                = "/"
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

# HTTP Listener (Port 80) -> Automatic Redirect to HTTPS (Port 443)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener (Port 443) with SSL Certificate
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Listener Rule for Backend API and Auth Routes (/api/* and /auth/*)
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.https.arn
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
