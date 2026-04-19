# Slipwise One — AWS Enterprise Infrastructure
# Terraform root configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "slipwise-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "slipwise-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "slipwise-one"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Secondary region provider for cross-region replication
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
