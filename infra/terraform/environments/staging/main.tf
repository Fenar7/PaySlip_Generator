# Staging Environment Configuration

module "vpc" {
  source      = "../../modules/vpc"
  vpc_cidr    = "10.1.0.0/16"
  app_name    = var.app_name
  environment = "staging"
}

module "rds" {
  source                = "../../modules/rds"
  app_name              = var.app_name
  environment           = "staging"
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id
  instance_class        = "db.t3.medium"
  allocated_storage     = 20
  max_allocated_storage = 50
  db_password           = var.db_password
}

module "s3" {
  source                      = "../../modules/s3"
  app_name                    = var.app_name
  environment                 = "staging"
  allowed_origins             = ["https://staging.slipwise.in"]
  cloudfront_distribution_arn = module.cloudfront.distribution_arn

  providers = {
    aws.replica = aws.us_east_1
  }
}

module "cloudfront" {
  source           = "../../modules/cloudfront"
  app_name         = var.app_name
  environment      = "staging"
  s3_bucket_domain = module.s3.bucket_domain
  alb_dns_name     = module.ecs.alb_dns_name
  certificate_arn  = var.certificate_arn
  cdn_aliases      = ["cdn-staging.slipwise.in"]
}

module "ecs" {
  source                = "../../modules/ecs"
  app_name              = var.app_name
  environment           = "staging"
  aws_region            = var.aws_region
  cpu                   = 1024
  memory                = 2048
  desired_count         = 1
  min_count             = 1
  max_count             = 3
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

resource "aws_secretsmanager_secret" "db_url" {
  name = "${var.app_name}/staging/database-url"
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = module.rds.database_url
}

resource "aws_secretsmanager_secret" "nextauth" {
  name = "${var.app_name}/staging/nextauth-secret"
}

resource "aws_secretsmanager_secret_version" "nextauth" {
  secret_id     = aws_secretsmanager_secret.nextauth.id
  secret_string = var.nextauth_secret
}
