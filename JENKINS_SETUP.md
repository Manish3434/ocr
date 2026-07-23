# Jenkins Setup & Pipeline Triggering Guide

This guide explains how to set up, configure, and trigger the automated **Jenkins CI/CD Pipeline** for the **AI Document Summarizer** platform.

---

## 1. Prerequisites in Jenkins

1. **Required Jenkins Plugins**:
   - `Git Plugin`
   - `Pipeline Plugin`
   - `Amazon Web Services Credentials Plugin`
   - `AnsiColor Plugin`
   - `Docker Pipeline Plugin`

2. **Configure AWS Credentials in Jenkins**:
   - Go to **Jenkins Dashboard** ➔ **Manage Jenkins** ➔ **Credentials** ➔ **System** ➔ **Global credentials**.
   - Click **Add Credentials**.
   - Kind: **AWS Credentials**.
   - ID: `aws-credentials` (matches `AWS_CREDS_ID` in `Jenkinsfile`).
   - Access Key ID & Secret Access Key: Enter your AWS IAM User credentials with ECR, ECS, and Terraform access.

3. **Required ECR Repositories in AWS**:
   - Create ECR Repositories in AWS region `ap-south-1`:
     ```bash
     aws ecr create-repository --repository-name ai-docs-backend --region ap-south-1
     aws ecr create-repository --repository-name ai-docs-frontend --region ap-south-1
     ```

---

## 2. Setting Up the Jenkins Pipeline Job

1. Go to **Jenkins Dashboard** ➔ **New Item**.
2. Name: `ai-document-summarizer-pipeline`.
3. Select **Pipeline** and click **OK**.
4. Under **Build Triggers**:
   - Check **GitHub hook trigger for GITScm polling** (or Bitbucket/GitLab webhook).
5. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**.
   - SCM: **Git**.
   - Repository URL: `https://github.com/YOUR_ORG/AI-Document-Summarizer.git`
   - Branch Specifier: `*/main` or `*/master`.
   - Script Path: `Jenkinsfile`.
6. Click **Save**.

---

## 3. How to Trigger the Jenkins Pipeline

### Option A: Automatic Trigger via Git Push (GitHub Webhook)
1. Go to your GitHub Repository ➔ **Settings** ➔ **Webhooks** ➔ **Add Webhook**.
2. Payload URL: `http://YOUR_JENKINS_SERVER_IP:8080/github-webhook/`
3. Content type: `application/json`.
4. Event: Choose **Pushes** or **Pull requests**.
5. Click **Add Webhook**. Any push to `main` will automatically trigger the Jenkins build!

---

### Option B: Trigger via Jenkins Webhook / cURL API
You can trigger a build remotely from terminal, bash script, or GitHub Actions using `curl`:

```bash
# Set your Jenkins API Token and User
JENKINS_USER="admin"
JENKINS_TOKEN="11a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6"
JENKINS_URL="http://your-jenkins-server:8080"

# Trigger Pipeline with Parameters
curl -X POST "${JENKINS_URL}/job/ai-document-summarizer-pipeline/buildWithParameters" \
  --user "${JENKINS_USER}:${JENKINS_TOKEN}" \
  --data-urlencode "ENVIRONMENT=uat" \
  --data-urlencode "APPLY_TERRAFORM=true" \
  --data-urlencode "FORCE_ECS_DEPLOY=true"
```

---

### Option C: Manual Trigger in Jenkins UI
1. Open the job `ai-document-summarizer-pipeline`.
2. Click **Build with Parameters**.
3. Select target environment (`uat` or `prod`).
4. Click **Build**.

---

## 4. Pipeline Execution Summary

```
Stage 1: Checkout ➔ Stage 2: Code Quality ➔ Stage 3: Parallel Docker ECR Push
  ├── Backend Docker Build  ➔ ECR ai-docs-backend:TAG
  └── Frontend Docker Build ➔ ECR ai-docs-frontend:TAG
Stage 4: Terraform Provisioning (Plan & Apply)
Stage 5: AWS ECS Rolling Update (`force-new-deployment`)
Stage 6: Health Probe Verification (ALB /api/health)
```
