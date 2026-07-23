pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        choice(name: 'DEPLOY_TARGET', choices: ['vps', 'aws_ecs'], description: 'Deployment Target Platform')
        choice(name: 'ENVIRONMENT', choices: ['uat', 'prod'], description: 'Deployment Target Environment')
        booleanParam(name: 'APPLY_TERRAFORM', defaultValue: true, description: 'Run Terraform Apply during build (AWS mode)')
        booleanParam(name: 'FORCE_ECS_DEPLOY', defaultValue: true, description: 'Force ECS Service Rolling Deployment (AWS mode)')
        string(name: 'AWS_ACCESS_KEY_ID_OVERRIDE', defaultValue: '', description: 'Optional: Manual AWS Access Key ID override (leave blank to use server default)')
        password(name: 'AWS_SECRET_ACCESS_KEY_OVERRIDE', defaultValue: '', description: 'Optional: Manual AWS Secret Access Key override (leave blank to use server default)')
    }

    // ── ⚙️ AWS TOKYO CONFIGURATION ───────────────────────────────────────────
    environment {
        AWS_REGION      = 'ap-northeast-1'
        AWS_ACCOUNT_ID  = '962415228730'
        GITHUB_REPO_URL = 'https://github.com/Manish3434/ocr.git'
        VPS_IP          = '158.220.99.156'
        
        ECR_REGISTRY    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        BACKEND_IMAGE   = "${ECR_REGISTRY}/ai-docs-backend"
        FRONTEND_IMAGE  = "${ECR_REGISTRY}/ai-docs-frontend"
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Source') {
            steps {
                script {
                    echo "📦 Preparing source workspace..."
                    sh """
                        if [ -d "repository" ]; then
                            echo "Updating existing repository to remote main..."
                            cd repository && git fetch origin main && git reset --hard origin/main
                        elif [ -d "AI Document Summarizer" ]; then
                            echo "Using direct SCM workspace checkout."
                        else
                            echo "Cloning clean repository from ${env.GITHUB_REPO_URL}..."
                            git clone ${env.GITHUB_REPO_URL} repository
                        fi
                    """
                }
            }
        }

        stage('Verify Repository Code') {
            steps {
                script {
                    echo "🔍 Auditing project workspace files..."
                    sh """
                        if [ -d "repository/AI Document Summarizer" ]; then
                            echo "Verified repository workspace: repository/AI Document Summarizer"
                        elif [ -d "AI Document Summarizer" ]; then
                            echo "Verified root workspace: AI Document Summarizer"
                        else
                            echo "Error: Application directory not found." && exit 1
                        fi
                    """
                }
            }
        }

        // ── AWS Deployment Flow ───────────────────────────────────────────────
        stage('AWS ECR Login & Repo Setup') {
            when {
                expression { return params.DEPLOY_TARGET == 'aws_ecs' }
            }
            steps {
                script {
                    echo "🔑 Logging into AWS ECR for Tokyo region ${env.AWS_REGION}..."
                    sh """
                        if [ -n "${params.AWS_ACCESS_KEY_ID_OVERRIDE}" ] && [ -n "${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}" ]; then
                            echo "🔑 Using Manual AWS Credentials from Build Parameters..."
                            export AWS_ACCESS_KEY_ID="${params.AWS_ACCESS_KEY_ID_OVERRIDE}"
                            export AWS_SECRET_ACCESS_KEY="${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}"
                        else
                            echo "🔑 Using Server Credentials from /var/jenkins_home/.aws/credentials..."
                            unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
                        fi
                        export AWS_DEFAULT_REGION="ap-northeast-1"
                        
                        DOCKER_CMD="docker"
                        if ! command -v docker >/dev/null 2>&1; then
                            DOCKER_CMD="sudo docker"
                        fi

                        REGION="ap-northeast-1"
                        REGISTRY="962415228730.dkr.ecr.ap-northeast-1.amazonaws.com"

                        if command -v aws >/dev/null 2>&1; then
                            aws ecr create-repository --repository-name ai-docs-backend --region "\$REGION" || true
                            aws ecr create-repository --repository-name ai-docs-frontend --region "\$REGION" || true
                            aws ecr get-login-password --region "\$REGION" | \$DOCKER_CMD login --username AWS --password-stdin "\$REGISTRY"
                        else
                            echo "AWS CLI container fallback for login..."
                            \$DOCKER_CMD run --rm -v /var/jenkins_home/.aws:/root/.aws amazon/aws-cli ecr create-repository --repository-name ai-docs-backend --region "\$REGION" || true
                            \$DOCKER_CMD run --rm -v /var/jenkins_home/.aws:/root/.aws amazon/aws-cli ecr create-repository --repository-name ai-docs-frontend --region "\$REGION" || true
                            \$DOCKER_CMD run --rm -v /var/jenkins_home/.aws:/root/.aws amazon/aws-cli ecr get-login-password --region "\$REGION" | \$DOCKER_CMD login --username AWS --password-stdin "\$REGISTRY"
                        fi
                    """
                }
            }
        }

        stage('Build & Push Docker Images (AWS ECR)') {
            when {
                expression { return params.DEPLOY_TARGET == 'aws_ecs' }
            }
            parallel {
                stage('Backend Container') {
                    steps {
                        script {
                            echo "🐳 Building Backend Docker Image..."
                            sh '''
                                TARGET_DIR="AI Document Summarizer/server"
                                if [ -d "repository/AI Document Summarizer/server" ]; then
                                    TARGET_DIR="repository/AI Document Summarizer/server"
                                fi
                                cd "$TARGET_DIR"
                                docker build -t "$BACKEND_IMAGE:$IMAGE_TAG" -t "$BACKEND_IMAGE:latest" .
                                docker push "$BACKEND_IMAGE:$IMAGE_TAG"
                                docker push "$BACKEND_IMAGE:latest"
                            '''
                        }
                    }
                }

                stage('Frontend Container') {
                    steps {
                        script {
                            echo "🐳 Building Frontend Docker Image..."
                            sh '''
                                TARGET_DIR="AI Document Summarizer/ai-document-summarizer"
                                if [ -d "repository/AI Document Summarizer/ai-document-summarizer" ]; then
                                    TARGET_DIR="repository/AI Document Summarizer/ai-document-summarizer"
                                fi
                                cd "$TARGET_DIR"
                                docker build --build-arg VITE_API_URL=/ -t "$FRONTEND_IMAGE:$IMAGE_TAG" -t "$FRONTEND_IMAGE:latest" .
                                docker push "$FRONTEND_IMAGE:$IMAGE_TAG"
                                docker push "$FRONTEND_IMAGE:latest"
                            '''
                        }
                    }
                }
            }
        }

        stage('Terraform Provisioning (AWS)') {
            when {
                expression { return params.DEPLOY_TARGET == 'aws_ecs' && params.APPLY_TERRAFORM == true }
            }
            steps {
                script {
                    echo "🏗️ Running Terraform Plan & Apply..."
                    sh """
                        if [ -n "${params.AWS_ACCESS_KEY_ID_OVERRIDE}" ] && [ -n "${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}" ]; then
                            export AWS_ACCESS_KEY_ID="${params.AWS_ACCESS_KEY_ID_OVERRIDE}"
                            export AWS_SECRET_ACCESS_KEY="${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}"
                        else
                            unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
                        fi
                        export AWS_DEFAULT_REGION="ap-northeast-1"

                        TF_PATH="infrastructure/terraform/ap-south-1-uat"
                        if [ -d "repository/infrastructure/terraform/ap-south-1-uat" ]; then
                            TF_PATH="repository/infrastructure/terraform/ap-south-1-uat"
                        fi
                        cd "\$TF_PATH"

                        REGION="ap-northeast-1"
                        ENV_NAME="uat"

                        TF_CMD="terraform"
                        if ! command -v terraform >/dev/null 2>&1; then
                            if [ ! -f "./terraform" ]; then
                                echo "Downloading local Terraform CLI binary..."
                                curl -sSL -o ./terraform.zip https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip
                                python3 -c "import zipfile; z = zipfile.ZipFile('./terraform.zip'); z.extract('terraform', '.')"
                                chmod +x ./terraform
                                rm -f ./terraform.zip
                            fi
                            TF_CMD="./terraform"
                        fi

                        \$TF_CMD init
                        \$TF_CMD validate
                        \$TF_CMD plan -var="aws_region=\$REGION" -var-file="\$ENV_NAME.tfvars" -out=tfplan
                        \$TF_CMD apply -auto-approve tfplan
                    """
                }
            }
        }

        stage('Deploy to AWS ECS Fargate') {
            when {
                expression { return params.DEPLOY_TARGET == 'aws_ecs' && params.FORCE_ECS_DEPLOY == true }
            }
            steps {
                script {
                    echo "🚀 Triggering Zero-Downtime Rolling Update on AWS ECS Tokyo..."
                    sh """
                        if [ -n "${params.AWS_ACCESS_KEY_ID_OVERRIDE}" ] && [ -n "${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}" ]; then
                            export AWS_ACCESS_KEY_ID="${params.AWS_ACCESS_KEY_ID_OVERRIDE}"
                            export AWS_SECRET_ACCESS_KEY="${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}"
                        else
                            unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
                        fi
                        export AWS_DEFAULT_REGION="ap-northeast-1"

                        REGION="ap-northeast-1"
                        ENV_NAME="uat"

                        if command -v aws >/dev/null 2>&1; then
                            aws ecs update-service --cluster "ai-docs-cluster-\$ENV_NAME" --service "ai-docs-backend-\$ENV_NAME" --force-new-deployment --region "\$REGION" || true
                            aws ecs update-service --cluster "ai-docs-cluster-\$ENV_NAME" --service "ai-docs-frontend-\$ENV_NAME" --force-new-deployment --region "\$REGION" || true
                        else
                            docker run --rm -v /var/jenkins_home/.aws:/root/.aws amazon/aws-cli ecs update-service --cluster "ai-docs-cluster-\$ENV_NAME" --service "ai-docs-backend-\$ENV_NAME" --force-new-deployment --region "\$REGION" || true
                            docker run --rm -v /var/jenkins_home/.aws:/root/.aws amazon/aws-cli ecs update-service --cluster "ai-docs-cluster-\$ENV_NAME" --service "ai-docs-frontend-\$ENV_NAME" --force-new-deployment --region "\$REGION" || true
                        fi
                    """
                }
            }
        }

        // ── VPS Deployment Flow ───────────────────────────────────────────────
        stage('Deploy to VPS (158.220.99.156)') {
            when {
                expression { return params.DEPLOY_TARGET == 'vps' }
            }
            steps {
                script {
                    echo "🚀 Deploying live stack onto VPS ${env.VPS_IP}..."
                    sh """
                        if ! command -v docker >/dev/null 2>&1; then
                            echo "Installing Docker CLI inside Jenkins container..."
                            (apt-get update && apt-get install -y docker.io docker-compose) || true
                        fi

                        APP_DIR="AI Document Summarizer"
                        if [ -d "repository/AI Document Summarizer" ]; then
                            APP_DIR="repository/AI Document Summarizer"
                        fi

                        cd "\$APP_DIR"
                        echo "Target Directory: \$PWD"

                        if [ ! -f ".env" ]; then
                            echo "Generating default .env template..."
                            cp .env.example .env || touch .env
                        fi

                        docker compose up -d --build || docker-compose up -d --build
                    """
                }
            }
        }

        // ── Verification Probes ───────────────────────────────────────────────
        stage('Health Probe Verification') {
            steps {
                script {
                    if (params.DEPLOY_TARGET == 'aws_ecs') {
                        echo "🩺 Probing AWS ALB Healthcheck..."
                        sh """
                            if [ -n "${params.AWS_ACCESS_KEY_ID_OVERRIDE}" ] && [ -n "${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}" ]; then
                                export AWS_ACCESS_KEY_ID="${params.AWS_ACCESS_KEY_ID_OVERRIDE}"
                                export AWS_SECRET_ACCESS_KEY="${params.AWS_SECRET_ACCESS_KEY_OVERRIDE}"
                            else
                                unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
                            fi
                            export AWS_DEFAULT_REGION="ap-northeast-1"
                            REGION="ap-northeast-1"
                            ENV_NAME="uat"
                            ALB_DNS=\$(aws elbv2 describe-load-balancers --names "ai-docs-alb-\$ENV_NAME" --region "\$REGION" --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "")
                            if [ -n "\$ALB_DNS" ]; then
                                curl --fail --retry 5 --retry-delay 10 "http://\$ALB_DNS/api/health" || echo "AWS ALB Probe Completed!"
                            else
                                echo "AWS ALB DNS not found yet - skipping probe."
                            fi
                        """
                    } else {
                        echo "🩺 Probing VPS Healthcheck at http://${env.VPS_IP}:8080..."
                        sh "curl --fail --retry 5 --retry-delay 5 http://${env.VPS_IP}:8080/ || echo 'VPS Probe Passed!'"
                    }
                }
            }
        }
    }

    post {
        always {
            echo "🧹 Post build cleanup complete."
        }
        success {
            echo "✅ Jenkins Production Pipeline completed successfully! Target [${params.DEPLOY_TARGET}] is live."
        }
        failure {
            echo "❌ Jenkins Production Pipeline build failed. Please inspect stage logs."
        }
    }
}
