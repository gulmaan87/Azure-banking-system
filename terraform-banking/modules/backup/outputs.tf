
output "recovery_services_vault_id" {
  description = "Resource ID of the Recovery Services Vault."
  value       = azurerm_recovery_services_vault.this.id
}

output "recovery_services_vault_name" {
  description = "Name of the Recovery Services Vault."
  value       = azurerm_recovery_services_vault.this.name
}

output "backup_policy_id" {
  description = "Resource ID of the default daily VM backup policy."
  value       = azurerm_backup_policy_vm.daily.id
}
