###############################################################################
# monitoring.tf – Log Analytics and Microsoft Sentinel
###############################################################################

# 1. Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "this" {
  name                = "${local.name_prefix}-law-${var.env}"
  location            = azurerm_resource_group.banking1.location
  resource_group_name = azurerm_resource_group.banking1.name
  sku                 = var.log_analytics_sku
  retention_in_days   = var.log_analytics_retention_days
  tags                = local.common_tags
}

# 2. Microsoft Sentinel (SIEM) Solution
resource "azurerm_log_analytics_solution" "sentinel" {
  count = var.enable_sentinel ? 1 : 0

  solution_name         = "SecurityInsights"
  location              = azurerm_resource_group.banking1.location
  resource_group_name   = azurerm_resource_group.banking1.name
  workspace_resource_id = azurerm_log_analytics_workspace.this.id
  workspace_name        = azurerm_log_analytics_workspace.this.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/SecurityInsights"
  }
}
