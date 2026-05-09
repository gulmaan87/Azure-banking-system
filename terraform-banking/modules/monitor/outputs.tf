###############################################################################
# modules/monitor/outputs.tf
###############################################################################

output "log_analytics_workspace_id" {
  description = "Resource ID of the Log Analytics workspace."
  value       = azurerm_log_analytics_workspace.this.id
}

output "log_analytics_workspace_key" {
  description = "Primary shared key (sensitive)."
  value       = azurerm_log_analytics_workspace.this.primary_shared_key
  sensitive   = true
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace."
  value       = azurerm_log_analytics_workspace.this.name
}
