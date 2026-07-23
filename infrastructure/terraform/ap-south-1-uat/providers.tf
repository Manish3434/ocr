terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Production S3 backend with DynamoDB locking (uncomment after initial S3 setup)
  # backend "s3" {
  #   bucket         = "ai-doc-summarizer-tfstate-ap-south-1"
  #   key            = "uat/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "ai-doc-summarizer-tflocks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "AI-Document-Summarizer"
      ManagedBy   = "Terraform"
    }
  }
}
