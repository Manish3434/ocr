# ACM Certificate for Domain SSL/TLS Termination
resource "aws_acm_certificate" "cert" {
  count             = length(data.aws_route53_zones.primary_search.ids) > 0 ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "ai-docs-acm-${var.environment}"
  }
}

# Route53 Record for ACM Certificate DNS Validation
resource "aws_route53_record" "cert_validation" {
  for_each = length(data.aws_route53_zones.primary_search.ids) > 0 ? {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zones.primary_search.ids[0]
}

# ACM Certificate Validation Completion
resource "aws_acm_certificate_validation" "cert" {
  count                   = length(data.aws_route53_zones.primary_search.ids) > 0 ? 1 : 0
  certificate_arn         = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
