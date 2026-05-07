# 🏦 Azure Banking System Infrastructure

![Terraform](https://img.shields.io/badge/Terraform-1.5+-623CE4.svg?style=for-the-badge&logo=terraform)
![Azure](https://img.shields.io/badge/Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![Security](https://img.shields.io/badge/Security-Strict-success?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

A highly secure, multi-region, and modular cloud infrastructure deployed on Microsoft Azure using Terraform. Designed specifically for banking and financial applications where security, high availability, and strict access controls are paramount.

---

## 🏗️ Architecture Overview

This project provisions a production-grade infrastructure distributed across two Azure regions (`East Asia` and `Southeast Asia`), leveraging a Hub-and-Spoke-like isolated virtual network design. 

```mermaid
flowchart TB
    %% --- Custom Styles ---
    classDef azureCloud fill:#f8f9fa,stroke:#0078D4,stroke-width:2px,stroke-dasharray: 5 5,color:#000000
    classDef region fill:#ffffff,stroke:#0078D4,stroke-width:2px,color:#000000,rx:8,ry:8
    classDef vnet fill:#e1f0fa,stroke:#0078D4,stroke-width:2px,color:#002050,rx:5,ry:5
    classDef nsg fill:#fdf6e3,stroke:#d83b01,stroke-width:2px,color:#000000,rx:5,ry:5
    classDef vm fill:#0078D4,stroke:#005a9e,stroke-width:2px,color:#ffffff,rx:10,ry:10
    classDef storage fill:#8661C5,stroke:#5c2d91,stroke-width:2px,color:#ffffff,rx:10,ry:10

    subgraph AzureCloud["☁️ Microsoft Azure Global Backbone"]
        direction LR

        %% REGION 1
        subgraph Region1["📍 East Asia (Primary Region)"]
            direction TB
            VNet1["🌐 VNet 1 (10.0.0.0/16)"]:::vnet
            NSG1["🛡️ Banking NSG<br/>(Deny All Inbound)"]:::nsg
            
            subgraph Subnets1["Internal Network Segments"]
                direction TB
                VM1A["💻 accounts-1<br/>(10.0.1.x)"]:::vm
                VM1B["💻 payments-1<br/>(10.0.2.x)"]:::vm
                VM1C["💻 customer-1<br/>(10.0.3.x)"]:::vm
            end
            
            Storage["💾 Diagnostic Storage"]:::storage

            VNet1 --> NSG1
            NSG1 --> VM1A
            NSG1 --> VM1B
            NSG1 --> VM1C
            VNet1 -.-> Storage
        end

        %% REGION 2
        subgraph Region2["📍 Southeast Asia (Disaster Recovery)"]
            direction TB
            VNet2["🌐 VNet 2 (10.1.0.0/16)"]:::vnet
            NSG2["🛡️ Banking NSG<br/>(Deny All Inbound)"]:::nsg
            
            subgraph Subnets2["Internal Network Segments"]
                direction TB
                VM2A["💻 loans-1<br/>(10.1.1.x)"]:::vm
                VM2B["💻 risk-1<br/>(10.1.2.x)"]:::vm
                VM2C["💻 itops-1<br/>(10.1.3.x)"]:::vm
            end

            VNet2 --> NSG2
            NSG2 --> VM2A
            NSG2 --> VM2B
            NSG2 --> VM2C
        end

        VNet1 <==>|"🔒 Encrypted VNet Peering"| VNet2
    end
    
    class AzureCloud azureCloud
    class Region1,Region2 region
```

### Key Design Principles:
- **Multi-Region Redundancy**: Workloads are distributed across two distinct geographical regions to ensure high availability.
- **VNet Peering**: Secure, backbone network connectivity is established between the two regional Virtual Networks.
- **Zero Public IPs**: Virtual machines are entirely isolated from the public internet to prevent external attack vectors.
- **Granular NSG Policies**: Strict Network Security Groups control internal traffic flow, permitting only essential protocols (e.g., restricted RDP, ICMP) via secure bastions/jump-boxes.
- **Resource Optimization**: Architected to operate efficiently within strict Azure vCPU quota constraints (utilizing `Standard_B2ats_v2` burstable instances).

---

## ✨ Features

- **Modular Architecture**: Built using highly reusable Terraform modules (`vnet`, `subnet`, `nsg`, `vm`, `storage`).
- **Standardized Naming Convention**: Adheres to a strict `[prefix]-banking-[resource]-[env]` naming strategy for perfect resource tracking.
- **Automated Deployments**: Infrastructure as Code (IaC) ensures repeatable, error-free environments.
- **Secure Storage**: Includes a centralized storage account configured for secure logging and diagnostics.
- **Scalable Design**: Easily add more VMs or Subnets without refactoring the core logic.

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
*Note: You will be prompted to enter your secure administrator password for the virtual machines.*

**4. Apply the Infrastructure**
```bash
terraform apply
```

**5. Tear Down (When finished)**
```bash
terraform destroy
```

---

## 🔒 Security Posture

This environment is built with a "Deny-by-Default" mindset:
- **No Inbound Internet**: NSGs drop all incoming traffic from `Internet` by default.
- **Internal Routing Only**: All inter-region traffic flows through the encrypted Microsoft backbone via VNet Peering.
- **Secrets Management**: Admin credentials are never hardcoded and must be passed via secure `.tfvars` or CLI during apply.

---

## 👨‍💻 Contribution
This repository is actively maintained. Infrastructure code is reviewed to ensure zero security regressions on every push.
