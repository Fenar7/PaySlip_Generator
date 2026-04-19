# Production Environment Configuration

module "vpc" {
  source      = "../../modules/vpc"
  vpc_cidr    = var.vpc_cidr
  app_name    = var.app_name
  environment = "production"
}

module "rds" {
  source                = "../../modules/rds"
  app_name              = var.app_name
  environment           = "production"
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id
  instance_class        = "db.r6g.large"
  allocated_storage     = 100
  max_allocated_storage = 500
  db_password           = var.db_password
}

module "s3" {
  source                      = "../../modules/s3"
  app_name                    = var.app_name
  environment                 = "production"
  allowed_origins             = ["https://app.slipwise.in", "https://slipwise.in"]
  cloudfront_distribution_arn = module.cloudfront.distribution_arn

  providers = {
    aws.replica = aws.us_east_1
  }
}

module "cloudfront" {
  source           = "../../modules/cloudfront"
  app_name         = var.app_name
  environment      = "production"
  s3_bucket_domain = module.s3.bucket_domain
  alb_dns_name     = module.ecs.alb_dns_name
  certificate_arn  = var.certificate_arn
  cdn_aliases      = ["cdn.slipwise.in"]
}

module "ecs" {
  source                = "../../modules/ecs"
  app_name              = var.app_name
  environment           = "production"
  aws_region            = var.aws_region
  cpu                   = 2048
  memory                = 4096
  desired_count         = 3
  min_count             = 3
  max_count             = 20
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.vpc.alb_security_group_id
  ecs_security_group_id = module.vpc.ecs_security_group_id
  certificate_arn       = var.certificate_arn
  s3_bucket_arn         = module.s3.bucket_arn
  db_url_secret_arn     = aws_secretsmanager_secret.db_url.arn
  nextauth_secret_arn   = aws_secretsmanager_secret.nextauth.arn
}

# Secrets Manager
resource "aws_secretsmanager_secret" "db_url" {
  name = "${var.app_name}/production/database-url"
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = module.rds.database_url
}

resource "aws_secretsmanager_secret" "nextauth" {
  name = "${var.app_name}/production/nextauth-secret"
}

resource "aws_secretsmanager_secret_version" "nextauth" {
  secret_id     = aws_secretsmanager_secret.nextauth.id
  secret_string = var.nextauth_secret
}
