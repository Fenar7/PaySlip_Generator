variable "app_name" { type = string }
variable "environment" { type = string }
variable "s3_bucket_domain" { type = string }
variable "alb_dns_name" { type = string }
variable "certificate_arn" { type = string }
variable "cdn_aliases" {
  type    = list(string)
  default = []
}
