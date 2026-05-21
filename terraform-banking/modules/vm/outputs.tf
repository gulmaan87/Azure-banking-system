###############################################################################
# modules/vm/outputs.tf
###############################################################################

output "vm_ids" {
  description = "Map of vm_key → VM resource ID."
  value = {
    for k, vm in azurerm_linux_virtual_machine.this :
    k => vm.id
  }
}

output "vm_private_ips" {
  description = "Map of vm_key → private IP address."
  value = {
    for k, nic in azurerm_network_interface.this :
    k => nic.private_ip_address
  }
}

output "vm_principal_ids" {
  description = "Map of vm_key → SystemAssigned Principal ID."
  value = {
    for k, vm in azurerm_linux_virtual_machine.this :
    k => vm.identity[0].principal_id
  }
}

output "nic_ids" {
  description = "Map of vm_key → NIC resource ID."
  value = {
    for k, nic in azurerm_network_interface.this :
    k => nic.id
  }
}

output "vm_public_ips" {
  description = "Map of vm_key → public IP address."
  value = {
    for k, pip in azurerm_public_ip.vm_pip :
    k => pip.ip_address
  }
}

output "vm_fqdns" {
  description = "Map of vm_key → FQDN."
  value = {
    for k, pip in azurerm_public_ip.vm_pip :
    k => pip.fqdn
  }
}

