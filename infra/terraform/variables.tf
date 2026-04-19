variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "slipwise"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "RDS maximum storage for autoscaling in GB"
  type        = number
  default     = 200
}

variable "ecs_cpu" {
  description = "ECS task CPU units (1 vCPU = 1024)"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 2048
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "ecs_min_count" {
  description = "Minimum number of ECS tasks (autoscaling)"
  type        = number
  default     = 2
}

variable "ecs_max_count" {
  description = "Maximum number of ECS tasks (autoscaling)"
  type        = number
  default     = 10
}

variable "domain_name" {
  description = "Primary domain name (e.g., app.slipwise.in)"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth.js secret"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}
