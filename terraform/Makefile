# Makefile for Terraform operations
# Usage: make <target> ENV=dev/staging/prod

.PHONY: help init plan apply destroy output validate format clean install-tools

ENV ?= dev
TF_VARS = environments/$(ENV).tfvars
TF_PLAN = tfplan-$(ENV)

help:
	@echo "Terraform Management Commands"
	@echo "============================="
	@echo ""
	@echo "Usage: make <target> [ENV=dev|staging|prod]"
	@echo ""
	@echo "Targets:"
	@echo "  init              - Initialize Terraform"
	@echo "  plan              - Plan infrastructure changes"
	@echo "  apply             - Apply planned changes"
	@echo "  destroy           - Destroy infrastructure"
	@echo "  output            - Display outputs"
	@echo "  validate          - Validate configuration"
	@echo "  format            - Format Terraform files"
	@echo "  clean             - Clean local Terraform files"
	@echo "  state-list        - List resources in state"
	@echo "  state-show RES=   - Show resource details"
	@echo "  refresh           - Refresh state"
	@echo "  install-tools     - Install Terraform and AWS CLI"
	@echo ""
	@echo "Examples:"
	@echo "  make plan ENV=dev"
	@echo "  make apply ENV=staging"
	@echo "  make destroy ENV=dev"
	@echo "  make output ENV=prod"
	@echo ""

init:
	@echo "Initializing Terraform..."
	terraform init

plan:
	@echo "Planning for $(ENV) environment..."
	@test -f $(TF_VARS) || (echo "Error: $(TF_VARS) not found"; exit 1)
	terraform plan -var-file="$(TF_VARS)" -out="$(TF_PLAN)"
	@echo "✓ Plan created: $(TF_PLAN)"

apply:
	@echo "⚠️  Applying changes to $(ENV) environment..."
	@test -f $(TF_VARS) || (echo "Error: $(TF_VARS) not found"; exit 1)
	@if [ -f "$(TF_PLAN)" ]; then \
		terraform apply "$(TF_PLAN)"; \
	else \
		terraform apply -var-file="$(TF_VARS)"; \
	fi

destroy:
	@echo "⚠️  WARNING: This will destroy all infrastructure in $(ENV)!"
	@read -p "Type '$(ENV)' to confirm: " CONFIRM; \
	if [ "$$CONFIRM" = "$(ENV)" ]; then \
		terraform destroy -var-file="$(TF_VARS)"; \
	else \
		echo "Cancelled"; \
		exit 1; \
	fi

output:
	@echo "Outputs for $(ENV) environment:"
	@terraform output

validate:
	@echo "Validating Terraform configuration..."
	@terraform validate
	@echo "✓ Configuration is valid"

format:
	@echo "Formatting Terraform files..."
	@terraform fmt -recursive
	@echo "✓ Files formatted"

clean:
	@echo "Cleaning Terraform files..."
	@rm -rf .terraform/
	@rm -f terraform.tfstate*
	@rm -f tfplan-*
	@rm -f .terraform.lock.hcl
	@echo "✓ Cleaned"

state-list:
	@terraform state list

state-show:
	@test -n "$(RES)" || (echo "Usage: make state-show RES=resource_name"; exit 1)
	@terraform state show $(RES)

refresh:
	@echo "Refreshing state for $(ENV) environment..."
	@terraform refresh -var-file="$(TF_VARS)"
	@echo "✓ State refreshed"

install-tools:
	@echo "Installing Terraform and AWS CLI..."
	@which terraform > /dev/null || (echo "Installing Terraform..."; brew install terraform || choco install terraform)
	@which aws > /dev/null || (echo "Installing AWS CLI..."; brew install awscli || choco install awscli)
	@echo "✓ Tools installed"
