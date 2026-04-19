variable "app_name" { type = string }
variable "environment" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "rds_security_group_id" { type = string }
variable "instance_class" { type = string }
variable "allocated_storage" { type = number }
variable "max_allocated_storage" { type = number }
variable "db_password" {
  type      = string
  sensitive = true
}
