# Uncomment and configure this block to use S3 backend for Terraform state
# Make sure S3 bucket and DynamoDB table exist before applying

# terraform {
#   backend "s3" {
#     bucket         = "your-terraform-state-bucket"
#     key            = "ai-document-summarizer/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "terraform-locks"
#   }
# }

# For local development, Terraform will use a local state file (terraform.tfstate)
# It's recommended to add this to .gitignore
