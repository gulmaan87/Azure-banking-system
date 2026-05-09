###############################################################################
# modules/vm/variables.tf
###############################################################################

variable "vm_map" {
  description = "Flat map of 'subnet-index' → { subnet_name, vm_index, vm_size }."
  type = map(object({
    subnet_name = string
    vm_index    = number
    vm_size     = string
    disk_type   = string
  }))
}

variable "name_prefix" {
  description = "Naming prefix (prefix-project)."
  type        = string
}

variable "env" {
  description = "Environment label."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for VMs."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "subnet_ids" {
  description = "Map of subnet name → subnet resource ID."
  type        = map(string)
}

variable "admin_username" {
  description = "Local admin username."
  type        = string
}

variable "admin_password" {
  description = "Local admin password (sensitive)."
  type        = string
  sensitive   = true
}

variable "os_disk_size_gb" {
  description = "OS disk size in GB."
  type        = number
  default     = 64
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
