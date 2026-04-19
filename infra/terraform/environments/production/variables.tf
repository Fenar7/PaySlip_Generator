variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "app_name" {
  type    = string
  default = "slipwise"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "nextauth_secret" {
  type      = string
  sensitive = true
}

variable "certificate_arn" {
  type = string
}
