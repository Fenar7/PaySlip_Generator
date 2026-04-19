variable "app_name" { type = string }
variable "environment" { type = string }
variable "allowed_origins" {
  type    = list(string)
  default = ["https://app.slipwise.in"]
}
variable "cloudfront_distribution_arn" { type = string }
