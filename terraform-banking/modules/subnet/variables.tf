###############################################################################
# modules/subnet/variables.tf
###############################################################################

variable "name_prefix" {
  description = "Naming prefix (prefix-project)."
  type        = string
}

variable "env" {
  description = "Environment label."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing the VNet."
  type        = string
}

variable "virtual_network_name" {
  description = "Name of the parent VNet."
  type        = string
}

variable "subnets" {
  description = "Map of subnet name → CIDR."
  type        = map(string)
}

variable "nsg_id" {
  description = "Shared NSG resource ID."
  type        = string
}
