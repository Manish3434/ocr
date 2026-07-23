# Data source for Route53 Primary Hosted Zone
data "aws_route53_zone" "primary" {
  name         = var.domain_name
  private_zone = false
}

# Route53 Alias Record pointing to ALB
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Route53 Wildcard Alias Record for Subdomains
resource "aws_route53_record" "wildcard" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
