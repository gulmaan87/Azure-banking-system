
output "resource_group1_name" {
  value = azurerm_resource_group.banking1.name
}

output "resource_group2_name" {
  value = azurerm_resource_group.banking2.name
}

output "vnet1_id" {
  value = module.vnet1.vnet_id
}

output "vnet2_id" {
  value = module.vnet2.vnet_id
}

output "vm_ids_region1" {
  value = module.vms1.vm_ids
}

output "vm_ids_region2" {
  value = module.vms2.vm_ids
}

output "vm_private_ips_region1" {
  value = module.vms1.vm_private_ips
}

output "vm_private_ips_region2" {
  value = module.vms2.vm_private_ips
}

output "storage_account_name" {
  value = module.storage.storage_account_name
}

output "corebank_public_ip" {
  description = "The public IP of corebank-1 VM"
  value       = lookup(module.vms_extended_1.vm_public_ips, "corebank-1", "")
}

output "corebank_fqdn" {
  description = "The FQDN of corebank-1 VM"
  value       = lookup(module.vms_extended_1.vm_fqdns, "corebank-1", "")
}

