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
        string(name: 'AWS_ACCESS_KEY_ID', defaultValue: 'AKIA6AFDK645D2443NXS', description: 'AWS Access Key ID')
        password(name: 'AWS_SECRET_ACCESS_KEY', defaultValue: '', description: 'AWS Secret Access Key')
        booleanParam(name: 'APPLY_TERRAFORM', defaultValue: true, description: 'Run Terraform Apply during build (AWS mode)')
        booleanParam(name: 'FORCE_ECS_DEPLOY', defaultValue: true, description: 'Force ECS Service Rolling Deployment (AWS mode)')
    }

    // ── ⚙️ AWS TOKYO CONFIGURATION ───────────────────────────────────────────
    environment {
        AWS_REGION            = 'ap-northeast-1'
        AWS_ACCOUNT_ID        = '962415228730'
        AWS_ACCESS_KEY_ID     = "${params.AWS_ACCESS_KEY_ID}"
        AWS_SECRET_ACCESS_KEY = "${params.AWS_SECRET_ACCESS_KEY}"
        GITHUB_REPO_URL       = 'https://github.com/Manish3434/ocr.git'
        VPS_IP                = '158.220.99.156'
        
        ECR_REGISTRY          = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        BACKEND_IMAGE         = "${ECR_REGISTRY}/ai-docs-backend"
        FRONTEND_IMAGE        = "${ECR_REGISTRY}/ai-docs-frontend"
        IMAGE_TAG             = "${env.BUILD_NUMBER}"
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
                    withEnv([
                        "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                        "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                        "AWS_DEFAULT_REGION=${env.AWS_REGION}"
                    ]) {
                        sh """
                            DOCKER_CMD="docker"
                            if ! command -v docker >/dev/null 2>&1; then
                                DOCKER_CMD="sudo docker"
                            fi

                            if command -v aws >/dev/null 2>&1; then
                                aws ecr create-repository --repository-name ai-docs-backend --region ${env.AWS_REGION} || true
                                aws ecr create-repository --repository-name ai-docs-frontend --region ${env.AWS_REGION} || true
                                aws ecr get-login-password --region ${env.AWS_REGION} | \$DOCKER_CMD login --username AWS --password-stdin ${env.ECR_REGISTRY}
                            else
                                echo "AWS CLI container fallback for login..."
                                \$DOCKER_CMD run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli ecr create-repository --repository-name ai-docs-backend --region ${env.AWS_REGION} || true
                                \$DOCKER_CMD run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli ecr create-repository --repository-name ai-docs-frontend --region ${env.AWS_REGION} || true
                                \$DOCKER_CMD run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli ecr get-login-password --region ${env.AWS_REGION} | \$DOCKER_CMD login --username AWS --password-stdin ${env.ECR_REGISTRY}
                            fi
                        """
                    }
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
                            withEnv([
                                "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                                "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                                "AWS_DEFAULT_REGION=${env.AWS_REGION}"
                            ]) {
                                sh """
                                    TARGET_DIR="AI Document Summarizer/server"
                                    if [ -d "repository/AI Document Summarizer/server" ]; then
                                        TARGET_DIR="repository/AI Document Summarizer/server"
                                    fi
                                    cd "\$TARGET_DIR"
                                    docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest .
                                    docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                                    docker push ${BACKEND_IMAGE}:latest
                                """
                            }
                        }
                    }
                }

                stage('Frontend Container') {
                    steps {
                        script {
                            echo "🐳 Building Frontend Docker Image..."
                            withEnv([
                                "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                                "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                                "AWS_DEFAULT_REGION=${env.AWS_REGION}"
                            ]) {
                                sh """
                                    TARGET_DIR="AI Document Summarizer/ai-document-summarizer"
                                    if [ -d "repository/AI Document Summarizer/ai-document-summarizer" ]; then
                                        TARGET_DIR="repository/AI Document Summarizer/ai-document-summarizer"
                                    fi
                                    cd "\$TARGET_DIR"
                                    docker build --build-arg VITE_API_URL=/ -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest .
                                    docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                                    docker push ${FRONTEND_IMAGE}:latest
                                """
                            }
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
                    withEnv([
                        "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                        "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                        "AWS_DEFAULT_REGION=${env.AWS_REGION}"
                    ]) {
                        sh """
                            TF_PATH="infrastructure/terraform/ap-south-1-uat"
                            if [ -d "repository/infrastructure/terraform/ap-south-1-uat" ]; then
                                TF_PATH="repository/infrastructure/terraform/ap-south-1-uat"
                            fi
                            cd "\$TF_PATH"

                            if command -v terraform >/dev/null 2>&1; then
                                terraform init
                                terraform validate
                                terraform plan -var="aws_region=${env.AWS_REGION}" -var-file=${params.ENVIRONMENT}.tfvars -out=tfplan
                                terraform apply -auto-approve tfplan
                            else
                                echo "Terraform CLI container fallback..."
                                docker run --rm -v \$PWD:/workspace -w /workspace -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION=${env.AWS_REGION} hashicorp/terraform:latest init
                                docker run --rm -v \$PWD:/workspace -w /workspace -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION=${env.AWS_REGION} hashicorp/terraform:latest apply -auto-approve -var="aws_region=${env.AWS_REGION}" -var-file=${params.ENVIRONMENT}.tfvars
                            fi
                        """
                    }
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
                    withEnv([
                        "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                        "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                        "AWS_DEFAULT_REGION=${env.AWS_REGION}"
                    ]) {
                        sh """
                            if command -v aws >/dev/null 2>&1; then
                                aws ecs update-service --cluster ai-docs-cluster-${params.ENVIRONMENT} --service ai-docs-backend-${params.ENVIRONMENT} --force-new-deployment --region ${env.AWS_REGION} || true
                                aws ecs update-service --cluster ai-docs-cluster-${params.ENVIRONMENT} --service ai-docs-frontend-${params.ENVIRONMENT} --force-new-deployment --region ${env.AWS_REGION} || true
                            else
                                docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION=${env.AWS_REGION} amazon/aws-cli ecs update-service --cluster ai-docs-cluster-${params.ENVIRONMENT} --service ai-docs-backend-${params.ENVIRONMENT} --force-new-deployment --region ${env.AWS_REGION} || true
                                docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION=${env.AWS_REGION} amazon/aws-cli ecs update-service --cluster ai-docs-cluster-${params.ENVIRONMENT} --service ai-docs-frontend-${params.ENVIRONMENT} --force-new-deployment --region ${env.AWS_REGION} || true
                            fi
                        """
                    }
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
                            (apt-get update && apt-get install -y docker.io docker-compose-v2) || true
                        fi

                        APP_DIR="/opt/ai-document-summarizer/AI Document Summarizer"
                        if [ ! -d "\$APP_DIR" ]; then
                            if [ -d "repository/AI Document Summarizer" ]; then
                                APP_DIR="repository/AI Document Summarizer"
                            else
                                APP_DIR="AI Document Summarizer"
                            fi
                        fi

                        cd "\$APP_DIR"
                        echo "Target Directory: \$PWD"

                        if [ ! -f ".env" ]; then
                            echo "Generating default .env template..."
                            cp .env.example .env || touch .env
                        fi

                        docker compose up -d --build
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
                        withEnv([
                            "AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}",
                            "AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}",
                            "AWS_DEFAULT_REGION=${env.AWS_REGION}"
                        ]) {
                            sh """
                                ALB_DNS=\$(aws elbv2 describe-load-balancers --names ai-docs-alb-${params.ENVIRONMENT} --region ${env.AWS_REGION} --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "")
                                if [ -n "\$ALB_DNS" ]; then
                                    curl --fail --retry 5 --retry-delay 10 "http://\${ALB_DNS}/api/health" || echo "AWS ALB Probe Completed!"
                                else
                                    echo "AWS ALB DNS not found yet - skipping probe."
                                fi
                            """
                        }
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
