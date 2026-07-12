
variable "name" {
  description = "Storage account name (3–24 chars, lowercase alphanumeric)."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for the storage account."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "account_tier" {
  description = "Performance tier (Standard | Premium)."
  type        = string
  default     = "Standard"
}

variable "replication_type" {
  description = "Replication type (LRS | GRS | RAGRS | ZRS)."
  type        = string
  default     = "LRS"
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
