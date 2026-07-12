
variable "name" {
  description = "Key Vault name (3–24 chars, alphanumeric + hyphens)."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for Key Vault."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "sku_name" {
  description = "Key Vault SKU (standard | premium)."
  type        = string
  default     = "standard"
}

variable "tenant_id" {
  description = "Azure AD tenant ID."
  type        = string
}

variable "object_id" {
  description = "Azure AD object ID of the principal to grant access."
  type        = string
}

variable "soft_delete_retention_days" {
  description = "Soft-delete retention in days (7–90)."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
