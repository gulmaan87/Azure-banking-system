
data "azurerm_client_config" "current_kv" {}

resource "azurerm_key_vault" "this" {
  name                        = "${var.prefix}bankkv${var.env}"
  location                    = azurerm_resource_group.banking1.location
  resource_group_name         = azurerm_resource_group.banking1.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current_kv.tenant_id
  soft_delete_retention_days  = var.key_vault_soft_delete_days
  purge_protection_enabled    = false # Set to true in prod

  sku_name = var.key_vault_sku
  tags     = local.common_tags

  access_policy {
    tenant_id = data.azurerm_client_config.current_kv.tenant_id
    object_id = data.azurerm_client_config.current_kv.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Recover", "Backup", "Restore", "Purge", "Import"
    ]
  }
}
