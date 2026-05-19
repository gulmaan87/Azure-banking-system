# 🏦 Azure Banking System Infrastructure - Detailed Project Report

## 1. Executive Summary
The Azure Banking System Infrastructure is a production-grade, highly secure, multi-region cloud environment built on Microsoft Azure. Designed specifically for financial services, this project prioritizes data security, high availability, strict compliance, and granular access controls. The entire infrastructure is codified using Terraform (Infrastructure as Code), ensuring repeatability, modularity, and error-free deployments. This project successfully provisions a robust cloud architecture while operating within the constraints of an Azure Student Subscription, demonstrating advanced DevOps and Cloud Engineering capabilities.

## 2. Project Objectives
- **High Availability & Disaster Recovery**: Ensure the banking system remains operational during regional outages by distributing workloads across multiple geographic regions.
- **Strict Security & Compliance**: Implement a "Deny-by-Default" network posture, Zero Trust micro-segmentation, and enforce organizational compliance through automated Azure Policies, Azure Firewall, and Microsoft Sentinel SIEM integration.
- **Granular Access Control**: Establish a robust Identity and Access Management (IAM) framework using Microsoft Entra ID (Azure AD) to enforce Role-Based Access Control (RBAC) and the principle of least privilege across diverse banking departments.
- **Cost-Efficient Scalability**: Architect the solution to efficiently utilize Azure resources (`Standard_B2ats_v2` burstable instances) to stay within academic vCPU quotas without compromising performance or security.
- **Modular Infrastructure as Code (IaC)**: Utilize Terraform modules to build reusable, maintainable, and scalable infrastructure components.

## 3. Architectural Design

### 3.1 High-Level Topology
The system employs a **Multi-Region Active-Passive / Disaster Recovery** architecture.
- **Primary Region**: East Asia
- **Disaster Recovery Region**: Southeast Asia

### 3.2 Network Architecture
- **Isolated Virtual Networks (VNets)**:
  - VNet 1 (East Asia): `10.0.0.0/16`
  - VNet 2 (Southeast Asia): `10.1.0.0/16`
- **Global VNet Peering**: Secure, backbone network connectivity is established between the two regional VNets. Traffic is routed internally via Microsoft's encrypted global backbone, entirely bypassing the public internet.
- **Micro-segmentation**: Strict Zero Trust hierarchical network segmentation is applied.
  - *Base Subnets*: `accounts`, `payments`, `customer`, `loans`, `risk`, `itops`.
  - *Enterprise Subnets*: `corebank`, `management`, `database`, `soc`, `executive`, `compliance`.
  - *Infrastructure Subnets*: `AzureBastionSubnet` for secure access and `AzureFirewallSubnet` for deep packet inspection.
- **Network Security Groups (NSGs)**: Act as virtual firewalls at the subnet level, strictly dropping all inbound internet traffic and enforcing per-subnet hierarchical communication.

### 3.3 Compute Infrastructure
The compute layer consists of customized Windows Server Virtual Machines (6 VMs in total, 3 per region) tailored for specific banking operations. To stay within strict vCPU quotas while deploying a realistic enterprise topology, several subnets act as network-only routing boundaries.
- **VM Instances**: 
  - East Asia: `corebank-1`, `management-1`, `database-1`
  - Southeast Asia: `loans-1`, `risk-1`, `itops-1`
- **Zero Public IPs**: VMs are explicitly barred from having Public IP configurations to prevent external attack vectors. Access is facilitated exclusively through Azure Bastion.
- **Managed Identities**: VMs are configured with System-Assigned Managed Identities, removing the need to manage static credentials or service principals manually.

## 4. Governance, Compliance, and Security

To satisfy stringent financial regulatory requirements, the environment uses Azure Policy to enforce rules and continuously audit resources. This is further enhanced by **Azure Firewall** for Zero Trust network inspection and **Microsoft Sentinel** (SIEM) for continuous threat monitoring.

| Policy Objective | Azure Policy Rule | Effect | Description |
| :--- | :--- | :--- | :--- |
| **Data Sovereignty** | `banking-allowed-locations` | **Deny** | Rejects any deployment outside `eastasia` or `southeastasia`. |
| **Attack Surface Reduction** | `banking-deny-public-ip` | **Deny** | Blocks the creation of public IP addresses on network interfaces. |
| **Financial Accountability** | `banking-require-mandatory-tags` | **Deny** | Requires `Owner`, `Environment`, and `CostCenter` tags on all deployments. |
| **Data Encryption in Transit** | Built-in Secure Transfer | **Deny** | Forces all Storage Account traffic over HTTPS. |
| **Zero-Trust Identity** | `banking-audit-vm-managed-identity` | **Audit** | Flags any VM not utilizing a System-Assigned Managed Identity. |

## 5. Identity & Access Management (RBAC)

The architecture leverages Microsoft Entra ID to implement strict **Least Privilege Access**. The organization is divided into multiple key departments, with access granted via Group memberships rather than individual assignments:

1. **Information Technology (Bank Administrators)**
   - **Role**: `Contributor`
   - **Access**: Full infrastructure management at the Resource Group level. Cannot alter global RBAC definitions.
   - **Personnel**: Mohdg Gulmaan (Head of IT Infrastructure), Walter White (Cloud Infrastructure Engineer)

2. **Risk & Compliance (Security Auditors)**
   - **Role**: `Reader`
   - **Access**: Read-only oversight. Can view metrics, logs, and policies. Cannot execute changes or view data plane secrets.
   - **Personnel**: Saul Goodman (CISO), Skyler White (Compliance Analyst)

3. **Application Engineering (Application Developers)**
   - **Role**: `Virtual Machine Contributor`
   - **Access**: Restricted to managing compute lifecycle (start, stop, restart, deploy code).
   - **Personnel**: Jesse Pinkman (Senior Software Engineer), Hank Schrader (DevOps Engineer)

4. **Data & Analytics (Data Engineers)**
   - **Role**: `Storage Blob Data Contributor`
   - **Access**: Specifically scoped to manage financial data lakes and diagnostic storage, lacking compute access.
   - **Personnel**: Gustavo Fring (Senior Data Engineer), Mike Ehrmantraut (Analytics Engineer)

*Additional Enterprise Roles include:*
- **Executive Leadership**: Hector Salamanca (CEO), Lalo Salamanca (CFO)
- **Regional Management**: Tuco Salamanca (Regional Director East Asia)
- **Department Heads**: Todd Alquist (Head of Core Banking), Lydia Rodarte-Quayle (Head of Risk Management)
- **Branch Managers**: Skinny Pete (Accounts), Badger (Payments)
- **Security Operations**: Huell Babineaux (L1 SOC Analyst)
- **IT Operations**: Steven Gomez (DevOps Automation Engineer)

## 6. Observability & Storage
A centralized **Azure Storage Account** is provisioned to act as a secure sink for diagnostics, flow logs, and system metrics. 
- **Encryption**: Data is encrypted at rest using Microsoft-managed keys.
- **Transit**: Secure transfer (HTTPS) is enforced via Azure Policy.
- **Access Control**: Access is heavily restricted, accessible only to Data Engineers and Bank Administrators.

## 7. Deployment Strategy & Technologies Used
- **Infrastructure as Code**: Terraform (v1.5+) is used for all provisioning. The code is modularized into `vnet`, `subnet`, `nsg`, `vm`, and `storage` components.
- **Cloud Provider**: Microsoft Azure
- **Automation**: The deployment process involves `terraform init`, `terraform plan`, and `terraform apply`, ensuring repeatable and predictable infrastructure rollout.
- **Constraint Management**: Engineered specifically to bypass vCPU quota limits on Azure Student Subscriptions by distributing workloads across two regions.

## 8. Conclusion
The Azure Banking System Infrastructure project successfully demonstrates the design and implementation of a highly secure, compliant, and available financial technology backbone. By integrating modern IaC practices with strict Azure governance and RBAC, the system serves as a robust blueprint for enterprise-grade cloud deployments.
