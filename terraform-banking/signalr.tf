###############################################################################
# signalr.tf – Azure SignalR Service for real-time AML alerts & live data
###############################################################################

resource "azurerm_signalr_service" "banking" {
  name                = "${local.name_prefix}-signalr-${var.env}"
  location            = azurerm_resource_group.banking1.location
  resource_group_name = azurerm_resource_group.banking1.name
  tags                = local.common_tags

  sku {
    name     = "Free_F1"  # Free tier — 20 concurrent connections, 20k messages/day
    capacity = 1
  }

  # "Default" mode: clients connect through the SignalR service
  # Backend calls REST API to broadcast — no persistent WS from backend needed
  service_mode = "Serverless"

  cors {
    allowed_origins = [
      var.frontend_url,
      "http://localhost:5173",
      "https://localhost:5173",
    ]
  }

  connectivity_logs_enabled = true
  messaging_logs_enabled    = true

  lifecycle {
    ignore_changes = [cors]
  }
}

###############################################################################
# Grant corebank-1 VM Managed Identity → SignalR App Server role
# This allows the backend API to broadcast messages without a connection string
###############################################################################

resource "azurerm_role_assignment" "corebank_signalr" {
  for_each = {
    for k, v in module.vms_extended_1.vm_principal_ids :
    k => v if k == "corebank-1"
  }

  scope                = azurerm_signalr_service.banking.id
  role_definition_name = "SignalR App Server"
  principal_id         = each.value
}

###############################################################################
# Store SignalR connection string in Key Vault
###############################################################################

resource "azurerm_key_vault_secret" "signalr_connection_string" {
  name         = "signalr-connection-string"
  value        = azurerm_signalr_service.banking.primary_connection_string
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

###############################################################################
# Outputs
###############################################################################

output "signalr_hostname" {
  value       = azurerm_signalr_service.banking.hostname
  description = "SignalR service hostname — needed for CORS config"
}

output "signalr_connection_string" {
  value       = azurerm_signalr_service.banking.primary_connection_string
  sensitive   = true
  description = "Primary connection string — stored in Key Vault automatically"
}
