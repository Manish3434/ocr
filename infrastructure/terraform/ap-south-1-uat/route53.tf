# Search for Route53 Primary Hosted Zone (Optional)
data "aws_route53_zones" "primary_search" {
  name         = var.domain_name
  private_zone = false
}

# Route53 Alias Record pointing to ALB (Only if Hosted Zone exists)
resource "aws_route53_record" "app" {
  count   = length(data.aws_route53_zones.primary_search.ids) > 0 ? 1 : 0
  zone_id = data.aws_route53_zones.primary_search.ids[0]
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Route53 Wildcard Alias Record for Subdomains (Only if Hosted Zone exists)
resource "aws_route53_record" "wildcard" {
  count   = length(data.aws_route53_zones.primary_search.ids) > 0 ? 1 : 0
  zone_id = data.aws_route53_zones.primary_search.ids[0]
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
