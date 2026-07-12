

resource "azurerm_key_vault_secret" "db_server" {
  name         = "db-server"
  value        = "10.0.6.4"           # database-1 VM private IP
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "db_name" {
  name         = "db-name"
  value        = "BankingDB"
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "db_user" {
  name         = "db-user"
  value        = "bankapp"
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password    # injected from terraform.tfvars (never committed)
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags
  content_type = "password"

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "azure_tenant_id" {
  name         = "azure-tenant-id"
  value        = data.azurerm_client_config.current_kv.tenant_id
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "azure_api_client_id" {
  name         = "azure-api-client-id"
  value        = var.api_client_id   # App Registration client ID for the backend API
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "storage_account_name" {
  name         = "storage-account-name"
  value        = module.storage.storage_account_name
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}

resource "azurerm_key_vault_secret" "frontend_url" {
  name         = "frontend-url"
  value        = var.frontend_url
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this]
}



resource "azurerm_key_vault_secret" "log_workspace_id" {
  name         = "log-workspace-id"
  value        = azurerm_log_analytics_workspace.this.workspace_id
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags

  depends_on = [azurerm_key_vault.this, azurerm_log_analytics_workspace.this]
}


resource "azurerm_key_vault_access_policy" "corebank_vm" {
  key_vault_id = azurerm_key_vault.this.id
  tenant_id    = data.azurerm_client_config.current_kv.tenant_id

  object_id = lookup(
    module.vms_extended_1.vm_principal_ids,
    "corebank-1",
    ""
  )

  secret_permissions = ["Get", "List"]

  depends_on = [azurerm_key_vault.this]
}


output "key_vault_uri" {
  value       = azurerm_key_vault.this.vault_uri
  description = "Set this as KEY_VAULT_URL in the backend .env on corebank-1"
}

output "key_vault_name" {
  value       = azurerm_key_vault.this.name
  description = "Azure Key Vault name"
}
