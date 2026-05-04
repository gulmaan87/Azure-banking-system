###############################################################################
# variables.tf – All configurable inputs for the banking project
###############################################################################

# ── Identity / naming ────────────────────────────────────────────────────────

variable "prefix" {
  description = "Project owner / team prefix used in all resource names."
  type        = string
  default     = "gulmaan"
}

variable "project" {
  description = "Project name – forms part of every resource name."
  type        = string
  default     = "banking"
}

variable "env" {
  description = "Deployment environment (dev | staging | prod)."
  type        = string
  default     = "dev"
}

# ── Region ───────────────────────────────────────────────────────────────────

variable "location" {
  description = "Primary Azure region for all resources. Set to eastasia for Student Subscription support."
  type        = string
  default     = "eastasia"
}

variable "location2" {
  description = "Secondary Azure region for resources. Set to southeastasia for Student Subscription support."
  type        = string
  default     = "southeastasia"
}

# ── Networking ───────────────────────────────────────────────────────────────

variable "vnet_address_space" {
  description = "CIDR block for the primary virtual network (eastasia)."
  type        = string
  default     = "10.0.0.0/16"
}

variable "vnet2_address_space" {
  description = "CIDR block for the secondary virtual network (southeastasia)."
  type        = string
  default     = "10.1.0.0/16"
}

variable "subnets_region1" {
  description = "Map of subnet names to their CIDR prefixes in eastasia."
  type        = map(string)
  default = {
    accounts  = "10.0.1.0/24"
    payments  = "10.0.2.0/24"
    customer  = "10.0.3.0/24"
  }
}

variable "subnets_region2" {
  description = "Map of subnet names to their CIDR prefixes in southeastasia."
  type        = map(string)
  default = {
    loans     = "10.1.1.0/24"
    risk      = "10.1.2.0/24"
    itops     = "10.1.3.0/24"
  }
}

# ── Virtual Machines ─────────────────────────────────────────────────────────

variable "vm_count_per_subnet" {
  description = "Number of VMs per active subnet. Constrained to 1 due to 6-core regional vCPU quota in southeastasia (Standard_B2ps_v2 = 2 vCPU each, 3 subnets × 1 VM = 6 cores)."
  type        = number
  default     = 1
}

variable "vm_size" {
  description = "Azure VM SKU for all banking workload VMs."
  type        = string
  # Standard_B2ats_v2 is available in eastasia
  default     = "Standard_B2ats_v2"
}

variable "vm_admin_username" {
  description = "Local administrator username on each VM."
  type        = string
  default     = "azureadmin"
}

variable "vm_admin_password" {
  description = "Local administrator password – override with Key Vault reference in production."
  type        = string
  sensitive   = true
  default     = "Gulmaan@5004"
}

variable "os_disk_size_gb" {
  description = "OS disk size in GB for each VM."
  type        = number
  default     = 64
}

# ── Storage ───────────────────────────────────────────────────────────────────

variable "storage_account_tier" {
  description = "Performance tier of the shared storage account."
  type        = string
  default     = "Standard"
}

variable "storage_replication_type" {
  description = "Replication type for the shared storage account."
  type        = string
  default     = "LRS"
}

# ── Key Vault ─────────────────────────────────────────────────────────────────

variable "key_vault_sku" {
  description = "SKU for Key Vault (standard | premium)."
  type        = string
  default     = "standard"
}

variable "key_vault_soft_delete_days" {
  description = "Soft-delete retention in days."
  type        = number
  default     = 7
}

# ── Log Analytics ─────────────────────────────────────────────────────────────

variable "log_analytics_sku" {
  description = "SKU for the Log Analytics workspace."
  type        = string
  default     = "PerGB2018"
}

variable "log_analytics_retention_days" {
  description = "Data retention period in days for Log Analytics."
  type        = number
  default     = 30
}

# ── Tags ─────────────────────────────────────────────────────────────────────

variable "tags" {
  description = "Common tags applied to every resource."
  type        = map(string)
  default = {
    Owner       = "gulmaan"
    Project     = "banking"
    Environment = "dev"
    ManagedBy   = "terraform"
    CostCenter  = "banking-ops"
  }
}
