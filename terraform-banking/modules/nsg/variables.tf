
variable "name_prefix" {
  description = "Naming prefix (prefix-project)."
  type        = string
}

variable "env" {
  description = "Environment label."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for NSGs."
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
