#!/bin/bash

# This script provides helpful commands for managing Terraform infrastructure

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if environment is provided
if [ $# -lt 1 ]; then
    echo "Usage: ./terraform.sh <command> [environment]"
    echo ""
    echo "Commands:"
    echo "  init       - Initialize Terraform"
    echo "  plan       - Plan changes for an environment (requires environment argument)"
    echo "  apply      - Apply changes for an environment (requires environment argument)"
    echo "  destroy    - Destroy infrastructure for an environment (requires environment argument)"
    echo "  output     - Show outputs for an environment (requires environment argument)"
    echo "  format     - Format Terraform files"
    echo "  validate   - Validate Terraform configuration"
    echo "  state      - Show state information"
    echo "  refresh    - Refresh state"
    echo ""
    echo "Environments: dev, staging, prod"
    echo ""
    echo "Examples:"
    echo "  ./terraform.sh init"
    echo "  ./terraform.sh plan dev"
    echo "  ./terraform.sh apply staging"
    echo "  ./terraform.sh destroy prod"
    exit 1
fi

COMMAND=$1
ENVIRONMENT=${2:-dev}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]] && [[ "$COMMAND" != "init" ]] && [[ "$COMMAND" != "format" ]] && [[ "$COMMAND" != "validate" ]] && [[ "$COMMAND" != "state" ]] && [[ "$COMMAND" != "refresh" ]]; then
    print_warning "Invalid environment: $ENVIRONMENT. Use dev, staging, or prod."
    exit 1
fi

# Execute commands
case $COMMAND in
    init)
        print_header "Initializing Terraform"
        terraform init
        print_success "Terraform initialized"
        ;;
    plan)
        print_header "Planning for $ENVIRONMENT environment"
        terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="tfplan-${ENVIRONMENT}"
        print_success "Plan created: tfplan-${ENVIRONMENT}"
        ;;
    apply)
        print_header "Applying changes to $ENVIRONMENT environment"
        print_warning "This will modify your infrastructure!"
        read -p "Are you sure? (yes/no): " confirmation
        if [ "$confirmation" = "yes" ]; then
            terraform apply "tfplan-${ENVIRONMENT}" || terraform apply -var-file="environments/${ENVIRONMENT}.tfvars"
            print_success "Infrastructure updated"
        else
            echo "Cancelled"
        fi
        ;;
    destroy)
        print_header "Destroying infrastructure in $ENVIRONMENT environment"
        print_warning "THIS WILL PERMANENTLY DELETE YOUR INFRASTRUCTURE!"
        read -p "Type '$ENVIRONMENT' to confirm: " confirmation
        if [ "$confirmation" = "$ENVIRONMENT" ]; then
            terraform destroy -var-file="environments/${ENVIRONMENT}.tfvars"
            print_success "Infrastructure destroyed"
        else
            echo "Cancelled"
        fi
        ;;
    output)
        print_header "Outputs for $ENVIRONMENT environment"
        terraform output
        ;;
    format)
        print_header "Formatting Terraform files"
        terraform fmt -recursive
        print_success "Files formatted"
        ;;
    validate)
        print_header "Validating Terraform configuration"
        terraform validate
        print_success "Configuration is valid"
        ;;
    state)
        print_header "State information"
        terraform state list
        ;;
    refresh)
        print_header "Refreshing state for $ENVIRONMENT environment"
        terraform refresh -var-file="environments/${ENVIRONMENT}.tfvars"
        print_success "State refreshed"
        ;;
    *)
        echo "Unknown command: $COMMAND"
        exit 1
        ;;
esac
