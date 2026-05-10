# 🏦 Detailed Banking System Architecture

This document provides an in-depth technical overview of the Azure Banking System Infrastructure. It breaks down the network topology, security controls, governance policies, and identity management strategies implemented via Terraform.

---

## 1. High-Level Topology

The infrastructure employs a **Multi-Region Active-Passive / Disaster Recovery** architecture utilizing two primary Azure regions. The design guarantees high availability and regional failover capabilities for critical banking workloads.

```mermaid
flowchart TB
    classDef identity fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc,rx:8,ry:8
    classDef policy fill:#450a0a,stroke:#f87171,stroke-width:2px,color:#f8fafc,rx:8,ry:8
    classDef azureCloud fill:#f8fafc,stroke:#0284c7,stroke-width:2px,stroke-dasharray: 5 5,color:#0f172a
    classDef region fill:#ffffff,stroke:#0ea5e9,stroke-width:2px,color:#0f172a,rx:8,ry:8
    classDef vnet fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0f172a,rx:5,ry:5
    classDef subnet fill:#f0f9ff,stroke:#7dd3fc,stroke-width:1px,color:#0f172a,stroke-dasharray: 3 3,rx:5,ry:5
    classDef nsg fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#7f1d1d,rx:5,ry:5
    classDef vm fill:#0369a1,stroke:#0284c7,stroke-width:2px,color:#ffffff,rx:10,ry:10
    classDef storage fill:#581c87,stroke:#7e22ce,stroke-width:2px,color:#ffffff,rx:10,ry:10

    subgraph Governance["🏛️ Governance, Identity & Compliance"]
        direction LR
        RBAC["🔐 Microsoft Entra ID (RBAC)<br/><small>Strict segregation of duties</small>"]:::identity
        Policy["📜 Azure Policy<br/><small>Automated compliance enforcement</small>"]:::policy
    end

    subgraph AzureCloud["☁️ Microsoft Azure Global Backbone"]
        direction LR

        %% REGION 1
        subgraph Region1["📍 Primary Region (East Asia)"]
            direction TB
            VNet1["🌐 VNet 1 (10.0.0.0/16)"]:::vnet
            NSG1["🛡️ Banking NSG (Deny All Inbound)"]:::nsg
            
            subgraph Subnets1["Workload Segments"]
                direction TB
                VM1A["💻 accounts-1 (10.0.1.x)"]:::vm
                VM1B["💻 payments-1 (10.0.2.x)"]:::vm
                VM1C["💻 customer-1 (10.0.3.x)"]:::vm
            end
            
            Storage["💾 Central Diagnostic Storage"]:::storage

            VNet1 --> NSG1
            NSG1 --> Subnets1
            VNet1 -.-> Storage
        end

        %% REGION 2
        subgraph Region2["📍 DR Region (Southeast Asia)"]
            direction TB
            VNet2["🌐 VNet 2 (10.1.0.0/16)"]:::vnet
            NSG2["🛡️ Banking NSG (Deny All Inbound)"]:::nsg
            
            subgraph Subnets2["Workload Segments"]
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
    
    Governance -.->|"Applies continuous compliance"| AzureCloud
```

---

## 2. Network Architecture

### 2.1 Virtual Networks (VNets)
The system utilizes two isolated Virtual Networks to prevent lateral movement and contain potential breaches.
- **VNet 1 (East Asia)**: `10.0.0.0/16`
- **VNet 2 (Southeast Asia)**: `10.1.0.0/16`

### 2.2 Global VNet Peering
Connectivity between the East Asia and Southeast Asia regions is established exclusively through **Global VNet Peering**. 
- Traffic never transverses the public internet.
- Routing is handled internally via Microsoft's private, encrypted global backbone.

### 2.3 Micro-segmentation
Within each VNet, subnets (`/24`) isolate application domains (e.g., accounts, payments, risk). Network Security Groups (NSGs) act as virtual firewalls at the subnet level, strictly dropping all inbound internet traffic. 

---

## 3. Compute Infrastructure

The compute layer comprises customized Windows Server Virtual Machines tailored for specific banking operations.

- **VM SKU Strategy**: Uses `Standard_B2ats_v2` (Burstable) instances to maintain cost-efficiency while remaining within Azure's academic/student subscription vCPU quota limits.
- **Zero Public IPs**: Virtual Machines are explicitly barred from having Public IP configurations. Access is restricted to internal routing, Bastion hosts, or VPN gateways.
- **Identity Integration**: VMs are audited to ensure they utilize **SystemAssigned Managed Identities**, removing the need to manage static credentials or service principals manually.

---

## 4. Governance & Compliance (Azure Policy)

To satisfy financial regulatory requirements, the environment uses Azure Policy to enforce rules before resources are created, and continuously audit existing resources.

| Policy Objective | Azure Policy Rule | Effect |
| :--- | :--- | :--- |
| **Data Sovereignty** | `banking-allowed-locations` | **Deny**: Rejects any deployment outside `eastasia` or `southeastasia`. |
| **Attack Surface Reduction** | `banking-deny-public-ip` | **Deny**: Blocks the creation of public IP addresses on network interfaces. |
| **Financial Accountability** | `banking-require-mandatory-tags` | **Deny**: Requires `Owner`, `Environment`, and `CostCenter` tags on all deployments. |
| **Data Encryption in Transit** | Built-in Secure Transfer | **Deny**: Forces all Storage Account traffic over HTTPS. |
| **Zero-Trust Identity** | `banking-audit-vm-managed-identity` | **Audit**: Flags any VM not utilizing a System-Assigned Managed Identity. |

---

## 5. Identity & Access Management (RBAC)

The architecture leverages Microsoft Entra ID (formerly Azure Active Directory) to implement **Least Privilege Access**. Access is granted via Group memberships rather than assigning permissions to individual users. The organization is divided into 4 key departments, each with dedicated personnel:

```mermaid
pie title "Role Segregation (Azure AD)"
    "Bank Admins (Contributor)" : 25
    "Security Auditors (Reader)" : 25
    "App Developers (VM Contributor)" : 25
    "Data Engineers (Storage Blob Contributor)" : 25
```

### 🏢 Departmental Structure & Assigned Personnel

#### 🛡️ Information Technology (Bank Administrators)
Granted `Contributor` rights at the Resource Group level. Can modify infrastructure but cannot alter global RBAC definitions.
- **Gulmaan** – Head of IT Infrastructure
- **Priya** – Cloud Infrastructure Engineer

#### 🔎 Risk & Compliance (Security Auditors)
Granted `Reader` rights. Can view metrics, logs, and policies, but cannot execute changes or view data plane secrets.
- **Rahul** – Chief Information Security Officer (CISO)
- **Deepa** – Compliance Analyst

#### 💻 Application Engineering (Application Developers)
Granted `Virtual Machine Contributor` rights. Restricted to managing compute lifecycle (start, stop, restart, deploy code).
- **Kavya** – Senior Software Engineer
- **Rohan** – DevOps Engineer

#### 💾 Data & Analytics (Data Engineers)
Granted `Storage Blob Data Contributor` rights. Specifically scoped to manage financial data lakes and diagnostic storage, lacking compute access.
- **Ananya** – Senior Data Engineer
- **Vikram** – Analytics Engineer

---

## 6. Observability & Storage

A centralized **Azure Storage Account** is provisioned to act as a secure sink for diagnostics, flow logs, and system metrics. 
- **Encryption**: Data is encrypted at rest using Microsoft-managed keys.
- **Transit**: Secure transfer (HTTPS) is enforced via Azure Policy.
- **Access**: Access is heavily restricted, accessible only to Data Engineers and Bank Administrators.
