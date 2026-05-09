###############################################################################
# modules/nsg/outputs.tf
###############################################################################

output "nsg_id" {
  description = "Shared NSG resource ID."
  value       = azurerm_network_security_group.this.id
}
