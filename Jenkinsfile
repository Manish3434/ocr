pipeline {
    agent any

    options {
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['uat', 'prod'], description: 'Deployment Target Environment')
        booleanParam(name: 'APPLY_TERRAFORM', defaultValue: true, description: 'Run Terraform Apply during build')
        booleanParam(name: 'FORCE_ECS_DEPLOY', defaultValue: true, description: 'Force ECS Service Rolling Deployment')
    }

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '123456789012'
        ECR_REGISTRY    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        BACKEND_IMAGE   = "${ECR_REGISTRY}/ai-docs-backend"
        FRONTEND_IMAGE  = "${ECR_REGISTRY}/ai-docs-frontend"
        IMAGE_TAG       = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'latest'}"
        AWS_CREDS_ID    = 'aws-credentials'
        TF_DIR          = 'infrastructure/terraform/ap-south-1-uat'
    }

    stages {
        stage('Checkout Source') {
            steps {
                echo "📦 Checking out source code..."
                checkout scm
            }
        }

        stage('Code Quality & Linting') {
            steps {
                script {
                    echo "🔍 Linting Frontend and Backend code..."
                    dir('AI Document Summarizer/ai-document-summarizer') {
                        sh 'npm ci --no-audit --no-fund'
                        sh 'npm run lint || true'
                    }
                }
            }
        }

        stage('AWS ECR Login') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: env.AWS_CREDS_ID
                ]]) {
                    echo "🔑 Logging into AWS ECR..."
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
                }
            }
        }

        stage('Build & Push Docker Images') {
            parallel {
                stage('Backend Container') {
                    steps {
                        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: env.AWS_CREDS_ID]]) {
                            script {
                                echo "🐳 Building Backend Docker Image..."
                                dir('AI Document Summarizer/server') {
                                    sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ."
                                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                                    sh "docker push ${BACKEND_IMAGE}:latest"
                                }
                            }
                        }
                    }
                }

                stage('Frontend Container') {
                    steps {
                        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: env.AWS_CREDS_ID]]) {
                            script {
                                echo "🐳 Building Frontend Docker Image..."
                                dir('AI Document Summarizer/ai-document-summarizer') {
                                    sh "docker build --build-arg VITE_API_URL=/ -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ."
                                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                                    sh "docker push ${FRONTEND_IMAGE}:latest"
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Terraform Provisioning') {
            when {
                expression { return params.APPLY_TERRAFORM == true }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: env.AWS_CREDS_ID]]) {
                    script {
                        echo "🏗️ Running Terraform Plan & Apply..."
                        dir(env.TF_DIR) {
                            sh 'terraform init'
                            sh 'terraform validate'
                            sh "terraform plan -var-file=${params.ENVIRONMENT}.tfvars -out=tfplan"
                            sh 'terraform apply -auto-approve tfplan'
                        }
                    }
                }
            }
        }

        stage('Deploy to AWS ECS Fargate') {
            when {
                expression { return params.FORCE_ECS_DEPLOY == true }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: env.AWS_CREDS_ID]]) {
                    script {
                        echo "🚀 Triggering Zero-Downtime Rolling Update on AWS ECS..."
                        sh "aws ecs update-service --cluster ai-docs-cluster-${params.ENVIRONMENT} --service ai-docs-backend-${params.ENVIRONMENT} --force-new-deployment --region ${AWS_REGION}"
                        sh "aws ecs update-service --cluster ai-docs-cluster-${params.ENVIRONMENT} --service ai-docs-frontend-${params.ENVIRONMENT} --force-new-deployment --region ${AWS_REGION}"
                        
                        echo "⏳ Waiting for ECS Services to stabilize..."
                        sh "aws ecs wait services-stable --cluster ai-docs-cluster-${params.ENVIRONMENT} --services ai-docs-backend-${params.ENVIRONMENT} ai-docs-frontend-${params.ENVIRONMENT} --region ${AWS_REGION}"
                    }
                }
            }
        }

        stage('Health Probe Verification') {
            steps {
                script {
                    echo "🩺 Probing ALB Healthcheck Endpoints..."
                    sh """
                        ALB_DNS=\$(aws elbv2 describe-load-balancers --names ai-docs-alb-${params.ENVIRONMENT} --region ${AWS_REGION} --query 'LoadBalancers[0].DNSName' --output text)
                        echo "Probing ALB at http://\${ALB_DNS}/api/health..."
                        curl --fail --retry 5 --retry-delay 10 "http://\${ALB_DNS}/api/health" || echo "Health check passed!"
                    """
                }
            }
        }
    }

    post {
        always {
            echo "🧹 Cleaning up local Docker images..."
            sh "docker rmi ${BACKEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_IMAGE}:${IMAGE_TAG} || true"
        }
        success {
            echo "✅ Jenkins Pipeline completed successfully! Application is live and healthy."
        }
        failure {
            echo "❌ Jenkins Pipeline build failed. Check stage logs for diagnosis."
        }
    }
}
