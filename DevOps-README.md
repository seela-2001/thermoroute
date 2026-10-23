# ThermoRoute — DevOps Documentation

ThermoRoute is a cloud-native heat-aware route planning platform built with a Django backend, React frontend, PostgreSQL, and an AI explanation layer.

This document focuses on the DevOps architecture, deployment, automation, security, and operational workflow.

## 1. DevOps Architecture

```text
                         GitHub Repository
                                |
                +---------------+---------------+
                |                               |
          GitHub Actions                   GitOps / Helm
                |                               |
       Build & Test / Docker                ArgoCD
                |                               |
                v                               v
          Docker Hub  <---------------- Kubernetes Manifests
                |                               |
                |                         AWS EKS Cluster
                |                               |
                |                +--------------+--------------+
                |                |              |              |
                |           Frontend         Backend       PostgreSQL
                |                |              |
                |                +------ Service +------+
                |                               |
                v                               v
             AWS ALB  <-------------------- Backend API
                |
             End User
```

### Main DevOps components

| Component | Purpose |
|---|---|
| Docker | Containerization |
| GitHub Actions | CI/CD automation |
| Docker Hub | Container image registry |
| Kubernetes | Container orchestration |
| Helm | Kubernetes package/configuration management |
| ArgoCD | GitOps continuous delivery |
| ArgoCD Image Updater | Automated image tag updates |
| Sealed Secrets | Kubernetes secret management |
| HPA | Automatic pod scaling |
| NetworkPolicies | Pod-level network isolation |
| AWS EKS | Managed Kubernetes cluster |
| AWS ALB Ingress | External application access |
| Terraform | Infrastructure as Code |

## 2. Containerization

ThermoRoute uses separate containers for the frontend and backend.

### Backend

```text
sohila12/thermoroute-backend:<tag>
```

### Frontend

```text
sohila12/thermoroute-frontend:<tag>
```

Images are tagged using versioned tags and/or Git commit SHA values instead of relying only on `latest`, making deployments traceable to a specific application version.

## 3. CI/CD with GitHub Actions

The CI/CD workflow is separated into application pipelines for the frontend and backend.

```text
Developer
   |
   v
Git Push
   |
   v
GitHub Actions
   |
   +--> Test / Build
   |
   +--> Docker Build
   |
   +--> Push Image
   |
   v
Docker Hub
```

The pipeline automates repository checkout, application validation/testing, Docker image building, Docker Hub authentication, image pushing, and versioned image tagging.

## 4. GitOps with ArgoCD

ArgoCD synchronizes the Kubernetes cluster with the application's Git repository.

```text
Git Repository
      |
      v
 Helm Chart
      |
      v
    ArgoCD
      |
      v
   AWS EKS
```

The ArgoCD application uses the ThermoRoute repository, the `helm/thermoroute` deployment path, the `thermoroute` namespace, automated synchronization, automated pruning, and self-healing.

The preferred deployment model is:

```text
Helm / configuration change
        |
        v
      Git Push
        |
        v
      ArgoCD
        |
        v
 Kubernetes Cluster
```

## 5. ArgoCD Image Updater

ArgoCD Image Updater automates container image updates.

```text
GitHub Actions
      |
      v
Build Docker Image
      |
      v
Docker Hub
      |
      v
ArgoCD Image Updater
      |
      v
ArgoCD
      |
      v
AWS EKS
```

This reduces the need to manually update image tags after successful image builds.

## 6. Kubernetes

The application runs in the Kubernetes namespace:

```text
thermoroute
```

Main workloads:

```text
Frontend Deployment
Backend Deployment
PostgreSQL StatefulSet
```

Main services:

```text
thermoroute-frontend
thermoroute-backend
thermoroute-postgres
```

Frontend and backend use separate Deployments and Services so they can be scaled and updated independently.

## 7. Helm

The Kubernetes configuration is packaged as:

```text
helm/
└── thermoroute/
```

The chart manages configurable values for:

- Container images
- Replica counts
- Ports
- Resources
- Services
- Ingress
- HPA
- NetworkPolicies
- Environment configuration
- Secrets

Configuration is controlled through `values.yaml`.

## 8. Kubernetes Resource Management

Resource requests and limits are configured for application containers.

Example:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi

  limits:
    cpu: 500m
    memory: 512Mi
```

Requests provide Kubernetes with the minimum expected resources, while limits constrain resource consumption.

## 9. Horizontal Pod Autoscaling

The backend uses a Horizontal Pod Autoscaler.

Configured strategy:

```text
Minimum replicas: 2
Maximum replicas: 5
Target CPU utilization: 70%
```

Conceptually:

```text
Low traffic
   |
   v
2 pods

High CPU / traffic
   |
   v
3 -> 4 -> 5 pods
```

## 10. Health Probes

The backend includes Kubernetes health checks.

### Liveness Probe

Determines whether the application container is still functioning. An unhealthy container can be restarted by Kubernetes.

### Readiness Probe

Determines whether the application is ready to receive traffic. An unhealthy readiness state prevents traffic from being routed to that pod.

## 11. Network Policies

NetworkPolicies restrict pod-to-pod communication.

The intended application flow is:

```text
Frontend
   |
   v
Backend
   |
   v
PostgreSQL
```

This avoids unrestricted network communication between all application pods and adds a Kubernetes-level security layer.

## 12. Secrets and Configuration

Sensitive configuration is managed separately from normal application configuration.

Sensitive values include:

```text
SECRET_KEY
DB_PASSWORD
POSTGRES_PASSWORD
FORTYGUARD_API_KEY
GEOAPIFY_API_KEY
TOMTOM_API_KEY
```

Sealed Secrets are used to manage encrypted Kubernetes secrets through GitOps.

```text
Encrypted Secret
      |
      v
Git Repository
      |
      v
ArgoCD
      |
      v
Sealed Secrets Controller
      |
      v
Kubernetes Secret
```

Non-sensitive configuration can be managed separately from secret values.

## 13. AWS EKS Deployment

ThermoRoute is deployed to Amazon Elastic Kubernetes Service (EKS).

```text
                         Internet
                            |
                            v
                     AWS ALB Ingress
                            |
                            v
                    Frontend Service
                            |
                            v
                    Frontend Pods
                            |
                            v
                    Backend Service
                            |
                            v
                    Backend Pods
                            |
                            v
                  PostgreSQL Service
                            |
                            v
                    PostgreSQL Pod
```

EKS provides the managed Kubernetes control plane while application workloads run on the configured worker nodes.

## 14. AWS ALB Ingress

The application uses an AWS Application Load Balancer through the Kubernetes AWS Load Balancer Controller.

```text
Browser
   |
   v
AWS ALB
   |
   v
Kubernetes Ingress
   |
   v
Frontend Service
   |
   v
Frontend Pods
```

The frontend communicates with the backend through the Kubernetes service.

## 15. Infrastructure as Code with Terraform

AWS infrastructure is managed using Terraform.

The Terraform layer defines infrastructure such as:

```text
AWS Provider
     |
     v
VPC
├── Public Subnets
├── Private Subnets
└── NAT Gateway
     |
     v
EKS Cluster
     |
     v
EKS Node Group
```

Terraform provides reproducible, version-controlled, declarative infrastructure management.

Typical workflow:

```bash
terraform init
terraform plan
terraform apply
```

To remove infrastructure:

```bash
terraform destroy
```

> Run `terraform destroy` only when the entire environment is intentionally being removed.

## 16. Deployment Workflow

The complete deployment flow is:

```text
1. Developer pushes code
            |
            v
2. GitHub Actions
            |
            +----> Tests / Validation
            |
            +----> Docker Build
            |
            v
3. Docker Hub
            |
            v
4. ArgoCD Image Updater
            |
            v
5. ArgoCD
            |
            v
6. Helm
            |
            v
7. Kubernetes / AWS EKS
            |
            v
8. AWS ALB
            |
            v
9. End User
```

## 17. Useful Kubernetes Commands

Check application resources:

```bash
kubectl get all -n thermoroute
```

Check pods:

```bash
kubectl get pods -n thermoroute
```

Check services:

```bash
kubectl get svc -n thermoroute
```

Check ingress:

```bash
kubectl get ingress -n thermoroute
```

Check pod logs:

```bash
kubectl logs <pod-name> -n thermoroute
```

Describe a pod:

```bash
kubectl describe pod <pod-name> -n thermoroute
```

Check HPA:

```bash
kubectl get hpa -n thermoroute
```

Check NetworkPolicies:

```bash
kubectl get networkpolicy -n thermoroute
```

## 18. Useful Helm Commands

Render the chart locally:

```bash
helm template thermoroute ./helm/thermoroute -n thermoroute
```

Validate the chart:

```bash
helm lint ./helm/thermoroute
```

Install or upgrade:

```bash
helm upgrade --install thermoroute ./helm/thermoroute   -n thermoroute   --create-namespace
```

Check release:

```bash
helm list -n thermoroute
```

Check release history:

```bash
helm history thermoroute -n thermoroute
```

## 19. Useful ArgoCD Commands

List applications:

```bash
kubectl get applications -n argocd
```

Inspect ThermoRoute:

```bash
kubectl get application thermoroute-application -n argocd
```

Check ArgoCD application details:

```bash
kubectl describe application thermoroute-application -n argocd
```

The preferred approach is to make configuration changes in Git and allow ArgoCD to synchronize them instead of manually changing resources in the cluster.

## 20. Troubleshooting Approach

For deployment problems, use the following order:

### 1. Check pods

```bash
kubectl get pods -n thermoroute
```

Look for:

```text
Running
Pending
CrashLoopBackOff
ImagePullBackOff
```

### 2. Check pod events

```bash
kubectl describe pod <pod-name> -n thermoroute
```

### 3. Check logs

```bash
kubectl logs <pod-name> -n thermoroute
```

### 4. Check services

```bash
kubectl get svc -n thermoroute
```

### 5. Check endpoints

```bash
kubectl get endpoints -n thermoroute
```

### 6. Check ingress

```bash
kubectl get ingress -n thermoroute
```

### 7. Check ArgoCD

```bash
kubectl get application thermoroute-application -n argocd
```

This helps identify whether an issue is at the application, container, Kubernetes, service, ingress, or GitOps layer.

## 21. Key DevOps Practices Implemented

- Containerized frontend and backend
- Automated CI/CD
- Versioned Docker images
- Kubernetes orchestration
- Helm-based deployments
- GitOps with ArgoCD
- Automated image updates
- AWS EKS deployment
- AWS ALB-based ingress
- Horizontal Pod Autoscaling
- CPU/memory resource management
- Liveness and readiness probes
- Kubernetes NetworkPolicies
- Sealed Secrets
- Infrastructure as Code with Terraform
- Reproducible and version-controlled deployment configuration

## 22. Project Outcome

ThermoRoute is deployed as a cloud-native application using AWS EKS and Kubernetes.

The project combines application development with production-oriented DevOps practices:

```text
Application
    +
Containerization
    +
CI/CD
    +
GitOps
    +
Kubernetes
    +
AWS EKS
    +
Infrastructure as Code
    +
Security & Reliability
```

The resulting architecture provides an automated and reproducible path from source code changes to a running application in AWS.
