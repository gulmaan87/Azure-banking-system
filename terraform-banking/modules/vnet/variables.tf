
variable "name" {
  description = "Name of the virtual network."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group to deploy into."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "address_space" {
  description = "List of CIDR blocks for the VNet."
  type        = list(string)
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
