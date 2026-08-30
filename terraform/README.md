# ThermoRoute Infrastructure
 
Terraform configuration for provisioning the AWS infrastructure used by ThermoRoute.
 
## Architecture
 
Terraform provisions:
 
- AWS VPC
- Public subnets
- Private subnets
- Internet Gateway
- NAT Gateway
- Amazon EKS cluster
- EKS managed node group
## Architecture Flow
 
```text
AWS
│
└── VPC
    │
    ├── Public Subnets
    │   └── NAT Gateway
    │
    └── Private Subnets
        └── EKS Worker Nodes
            └── ThermoRoute Pods
```
 
## Requirements
 
- Terraform >= 1.6
- AWS CLI
- AWS account
- kubectl
## AWS Authentication
 
Configure AWS credentials using AWS CLI:
 
```bash
aws configure
```
 
Verify:
 
```bash
aws sts get-caller-identity
```
 
## Configuration
 
Copy the example variables file:
 
```bash
cp terraform.tfvars.example terraform.tfvars
```
 
Update the values if required.
 
## Initialize Terraform
 
```bash
terraform init
```
 
## Validate
 
```bash
terraform validate
```
 
## Format
 
```bash
terraform fmt -recursive
```
 
## Plan
 
```bash
terraform plan
```
 
## Apply
 
```bash
terraform apply
```
 
Review the resources and confirm with:
 
```bash
yes
```
 
## Configure kubectl
 
After EKS is created:
 
```bash
aws eks update-kubeconfig \
  --region eu-north-1 \
  --name thermoroute-dev
```
 
Verify:
 
```bash
kubectl get nodes
```
 
## Destroy
 
Only use this when the infrastructure is no longer needed:
 
```bash
terraform destroy
```
 
## Infrastructure Responsibilities
 
- **Terraform** is responsible for infrastructure provisioning.
- **Helm** is responsible for application packaging.
- **ArgoCD** is responsible for GitOps deployment.
- **GitHub Actions** is responsible for CI/CD.
- **ArgoCD Image Updater** is responsible for updating container image versions.
- **Kubernetes** is responsible for running the application workloads.
 