
variable "name" {
  description = "Log Analytics Workspace name."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for the workspace."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "sku" {
  description = "Workspace SKU (PerGB2018 | Free | etc.)."
  type        = string
  default     = "PerGB2018"
}

variable "retention_in_days" {
  description = "Data retention period in days (30–730)."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
