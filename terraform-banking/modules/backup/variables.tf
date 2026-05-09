###############################################################################
# modules/backup/variables.tf
###############################################################################

variable "name" {
  description = "Recovery Services Vault name."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for the vault."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
