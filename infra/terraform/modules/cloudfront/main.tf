# CloudFront Module — Global CDN for document delivery

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.app_name}-${var.environment}-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.app_name} ${var.environment} document delivery"
  default_root_object = ""
  price_class         = "PriceClass_200" # NA + EU + Asia

  aliases = var.cdn_aliases

  # S3 Origin (documents)
  origin {
    domain_name              = var.s3_bucket_domain
    origin_id                = "s3-documents"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # ALB Origin (application)
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-app"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: route to ALB
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-app"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = aws_cloudfront_cache_policy.dynamic.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.forward_all.id
  }

  # Static assets: route to S3
  ordered_cache_behavior {
    path_pattern           = "/documents/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-documents"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.static.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # Next.js static assets
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-app"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.immutable.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${var.app_name}-${var.environment}-cdn" }
}

# Cache Policies
resource "aws_cloudfront_cache_policy" "dynamic" {
  name        = "${var.app_name}-${var.environment}-dynamic"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers { items = ["Authorization", "Host"] }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

resource "aws_cloudfront_cache_policy" "static" {
  name        = "${var.app_name}-${var.environment}-static"
  min_ttl     = 86400
  default_ttl = 604800
  max_ttl     = 2592000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_cache_policy" "immutable" {
  name        = "${var.app_name}-${var.environment}-immutable"
  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# Origin Request Policy (forward all to ALB)
resource "aws_cloudfront_origin_request_policy" "forward_all" {
  name = "${var.app_name}-${var.environment}-forward-all"

  cookies_config { cookie_behavior = "all" }
  headers_config {
    header_behavior = "allViewer"
  }
  query_strings_config { query_string_behavior = "all" }
}

# Security Headers Function
resource "aws_cloudfront_function" "security_headers" {
  name    = "${var.app_name}-${var.environment}-security-headers"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var response = event.response;
      var headers = response.headers;
      headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
      headers['x-content-type-options'] = { value: 'nosniff' };
      headers['x-frame-options'] = { value: 'DENY' };
      headers['x-xss-protection'] = { value: '1; mode=block' };
      return response;
    }
  EOT
}

# Outputs
output "distribution_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.main.arn
}
