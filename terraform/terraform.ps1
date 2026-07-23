# Windows PowerShell script for Terraform operations
# Usage: .\terraform.ps1 -Command init -Environment dev

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('init', 'plan', 'apply', 'destroy', 'output', 'validate', 'format', 'clean', 'refresh')]
    [string]$Command,

    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev'
)

# Colors
$Green = 'Green'
$Yellow = 'Yellow'
$Red = 'Red'
$Blue = 'Cyan'

function Write-Header {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

# Variables
$TfVarsFile = "environments\$Environment.tfvars"
$TfPlanFile = "tfplan-$Environment"

# Check if environment file exists (for commands that need it)
if ($Command -ne 'init' -and $Command -ne 'format' -and $Command -ne 'validate' -and $Command -ne 'clean' -and $Command -ne 'refresh') {
    if (-not (Test-Path $TfVarsFile)) {
        Write-Error "Environment file not found: $TfVarsFile"
        exit 1
    }
}

# Execute commands
switch ($Command) {
    'init' {
        Write-Header "Initializing Terraform"
        terraform init
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Terraform initialized"
        }
    }

    'plan' {
        Write-Header "Planning for $Environment environment"
        terraform plan -var-file=$TfVarsFile -out=$TfPlanFile
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Plan created: $TfPlanFile"
        }
    }

    'apply' {
        Write-Header "Applying changes to $Environment environment"
        Write-Warning "This will modify your infrastructure!"
        
        $Response = Read-Host "Continue? (yes/no)"
        if ($Response -eq 'yes') {
            if (Test-Path $TfPlanFile) {
                terraform apply $TfPlanFile
            } else {
                terraform apply -var-file=$TfVarsFile
            }
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Infrastructure updated"
            }
        } else {
            Write-Host "Cancelled"
        }
    }

    'destroy' {
        Write-Header "Destroying infrastructure in $Environment environment"
        Write-Warning "THIS WILL PERMANENTLY DELETE YOUR INFRASTRUCTURE!"
        
        $Response = Read-Host "Type '$Environment' to confirm"
        if ($Response -eq $Environment) {
            terraform destroy -var-file=$TfVarsFile
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Infrastructure destroyed"
            }
        } else {
            Write-Host "Cancelled"
        }
    }

    'output' {
        Write-Header "Outputs for $Environment environment"
        terraform output
    }

    'validate' {
        Write-Header "Validating Terraform configuration"
        terraform validate
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Configuration is valid"
        }
    }

    'format' {
        Write-Header "Formatting Terraform files"
        terraform fmt -recursive
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Files formatted"
        }
    }

    'clean' {
        Write-Header "Cleaning Terraform files"
        Remove-Item -Recurse -Force .terraform -ErrorAction SilentlyContinue
        Remove-Item -Force terraform.tfstate* -ErrorAction SilentlyContinue
        Remove-Item -Force tfplan-* -ErrorAction SilentlyContinue
        Remove-Item -Force .terraform.lock.hcl -ErrorAction SilentlyContinue
        Write-Success "Cleaned"
    }

    'refresh' {
        Write-Header "Refreshing state for $Environment environment"
        terraform refresh -var-file=$TfVarsFile
        if ($LASTEXITCODE -eq 0) {
            Write-Success "State refreshed"
        }
    }

    default {
        Write-Error "Unknown command: $Command"
        exit 1
    }
}
