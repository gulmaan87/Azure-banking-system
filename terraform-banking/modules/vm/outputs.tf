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
