# 🏦 Azure Banking System Infrastructure

<div align="center">
  <img src="https://img.shields.io/badge/Terraform-1.5+-623CE4.svg?style=for-the-badge&logo=terraform" alt="Terraform">
  <img src="https://img.shields.io/badge/Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white" alt="Azure">
  <img src="https://img.shields.io/badge/Security-Strict-success?style=for-the-badge" alt="Security">
  <img src="https://img.shields.io/badge/Compliance-Azure_Policy-blue?style=for-the-badge" alt="Compliance">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" alt="Status">
</div>

<br>

A highly secure, multi-region, and modular cloud infrastructure deployed on Microsoft Azure using Terraform. Designed specifically for banking and financial applications where security, high availability, compliance, and strict access controls are paramount.

---

## 🏗️ Architecture Overview

This project provisions a production-grade infrastructure distributed across two Azure regions (`East Asia` and `Southeast Asia`), leveraging a Hub-and-Spoke-like isolated virtual network design. 

```mermaid
flowchart TB
    %% --- Custom Styles ---
    classDef identity fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc,rx:8,ry:8
    classDef policy fill:#450a0a,stroke:#f87171,stroke-width:2px,color:#f8fafc,rx:8,ry:8
    classDef azureCloud fill:#f8fafc,stroke:#0284c7,stroke-width:2px,stroke-dasharray: 5 5,color:#0f172a
    classDef region fill:#ffffff,stroke:#0ea5e9,stroke-width:2px,color:#0f172a,rx:8,ry:8
    classDef vnet fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0f172a,rx:5,ry:5
    classDef subnet fill:#f0f9ff,stroke:#7dd3fc,stroke-width:1px,color:#0f172a,stroke-dasharray: 3 3,rx:5,ry:5
    classDef nsg fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#7f1d1d,rx:5,ry:5
    classDef vm fill:#0369a1,stroke:#0284c7,stroke-width:2px,color:#ffffff,rx:10,ry:10
    classDef storage fill:#581c87,stroke:#7e22ce,stroke-width:2px,color:#ffffff,rx:10,ry:10

    subgraph Governance["🏛️ Governance & Identity"]
        direction LR
        RBAC["🔐 Entra ID (RBAC)<br/><small>Bank Admins • Sec Auditors<br>App Devs • Data Engineers</small>"]:::identity
        Policy["📜 Azure Policy<br/><small>Deny Pub IP • Enforce Tags<br>Location Limit • Require HTTPS</small>"]:::policy
    end

    subgraph AzureCloud["☁️ Microsoft Azure Global Backbone"]
        direction LR

        %% REGION 1
        subgraph Region1["📍 East Asia (Primary Region)"]
            direction TB
            VNet1["🌐 VNet 1 (10.0.0.0/16)"]:::vnet
            NSG1["🛡️ Banking NSG (Deny All Inbound)"]:::nsg
            
            subgraph Subnets1["Internal Network Segments"]
                direction TB
                VM1A["💻 accounts-1 (10.0.1.x)"]:::vm
                VM1B["💻 payments-1 (10.0.2.x)"]:::vm
                VM1C["💻 customer-1 (10.0.3.x)"]:::vm
            end
            
            Storage["💾 Diagnostic Storage"]:::storage

            VNet1 --> NSG1
            NSG1 --> Subnets1
            VNet1 -.-> Storage
        end

        %% REGION 2
        subgraph Region2["📍 Southeast Asia (Disaster Recovery)"]
            direction TB
            VNet2["🌐 VNet 2 (10.1.0.0/16)"]:::vnet
            NSG2["🛡️ Banking NSG (Deny All Inbound)"]:::nsg
            
            subgraph Subnets2["Internal Network Segments"]
                direction TB
                VM2A["💻 loans-1 (10.1.1.x)"]:::vm
                VM2B["💻 risk-1 (10.1.2.x)"]:::vm
                VM2C["💻 itops-1 (10.1.3.x)"]:::vm
            end

            VNet2 --> NSG2
            NSG2 --> Subnets2
        end

        Region1 <==>|"🔒 Encrypted VNet Peering"| Region2
    end
    
    Governance -.->|"Applies Policies & Controls"| AzureCloud
    
    class AzureCloud azureCloud
    class Region1,Region2 region
    class Subnets1,Subnets2 subnet
```

### Key Design Principles
- **Multi-Region Redundancy**: Workloads are distributed across two distinct geographical regions to ensure high availability.
- **VNet Peering**: Secure, backbone network connectivity is established between the two regional Virtual Networks.
- **Zero Public IPs**: Virtual machines are entirely isolated from the public internet to prevent external attack vectors.
- **Granular NSG Policies**: Strict Network Security Groups control internal traffic flow, permitting only essential protocols via secure bastions/jump-boxes.
- **Resource Optimization**: Architected to operate efficiently within strict Azure vCPU quota constraints utilizing `Standard_B2ats_v2` burstable instances.

---

## ✨ Features

- **Modular Architecture**: Built using highly reusable Terraform modules (`vnet`, `subnet`, `nsg`, `vm`, `storage`).
- **Identity & Access Management (RBAC)**: Enforces least privilege using Azure Active Directory, establishing custom roles for *Bank Administrators*, *Security Auditors*, *Application Developers*, and *Data Engineers*.
- **Governance & Compliance**: Employs **Azure Policy** to enforce organizational standards, such as prohibiting public IPs, mandating specific tagging schemas, and restricting deployments to approved geographic regions.
- **Automated Deployments**: Infrastructure as Code (IaC) ensures repeatable, error-free environments.
- **Secure Storage**: Includes a centralized storage account configured for secure logging and diagnostics with forced HTTPS transfer.

---

## 📂 Project Structure

```text
📦 Azure banking system
 ┣ 📂 terraform-banking
 ┃ ┣ 📂 modules             # Reusable IaC Components
 ┃ ┃ ┣ 📂 nsg               # Network Security Groups
 ┃ ┃ ┣ 📂 storage           # Azure Storage Accounts
 ┃ ┃ ┣ 📂 subnet            # VNet Subnets
 ┃ ┃ ┣ 📂 vm                # Windows Server VMs
 ┃ ┃ ┗ 📂 vnet              # Virtual Networks
 ┃ ┣ 📜 main.tf             # Core orchestration & module calling
 ┃ ┣ 📜 policy.tf           # Azure Policies for compliance enforcement
 ┃ ┣ 📜 rbac.tf             # Role-Based Access Control definitions
 ┃ ┣ 📜 variables.tf        # Input variable definitions
 ┃ ┣ 📜 outputs.tf          # Exported infrastructure values
 ┃ ┣ 📜 provider.tf         # Azure provider configuration
 ┃ ┗ 📜 check_skus.py       # Utility for verifying regional VM SKUs
 ┗ 📜 README.md
```

---

## 🚀 Getting Started

### Prerequisites
1. [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) (v1.5.0 or newer)
2. [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (`az`)
3. An active Azure Subscription (Compatible with Student Subscriptions regarding vCPU quotas).

### Deployment Steps

**1. Authenticate with Azure**
```bash
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"
```

**2. Initialize Terraform**
```bash
cd terraform-banking
terraform init
```

**3. Review the Deployment Plan**
```bash
terraform plan
```
> *Note: You will be prompted to enter your secure administrator password for the virtual machines.*

**4. Apply the Infrastructure**
```bash
terraform apply
```

**5. Tear Down (When finished)**
```bash
terraform destroy
```

---

## 🔒 Security Posture & Compliance

This environment is built with a **"Deny-by-Default"** mindset and rigorous regulatory compliance frameworks:

### Network Security
- **No Inbound Internet**: NSGs drop all incoming traffic from `Internet` by default.
- **Internal Routing Only**: All inter-region traffic flows through the encrypted Microsoft backbone via VNet Peering.

### Azure Policy Enforcements
1. **Deny Public IPs**: Blocks creation of any public-facing network interfaces to prevent exposure.
2. **Mandatory Tagging**: Ensures all resources are properly tagged (e.g., `Owner`, `Environment`, `CostCenter`) for auditing and billing attribution.
3. **Location Restrictions**: Hard-limits resource deployments exclusively to `eastasia` and `southeastasia`.
4. **Secure Transit**: Requires encrypted (HTTPS) transit for all diagnostic storage accounts.
5. **Identity Auditing**: Monitors and audits VMs that lack a SystemAssigned Managed Identity.

### Role-Based Access Control
The infrastructure implements strict segregation of duties via Entra ID (Azure AD) Groups:
- 🛡️ **Bank Administrators**: Full infrastructure management (Contributor).
- 🔎 **Security Auditors**: Read-only oversight (Reader).
- 💻 **Application Developers**: Application lifecycle and compute management (Virtual Machine Contributor).
- 💾 **Data Engineers**: Data ingestion and database storage (Storage Blob Data Contributor).

---

## 👨‍💻 Contribution
This repository is actively maintained. Infrastructure code is reviewed to ensure zero security regressions on every push.
