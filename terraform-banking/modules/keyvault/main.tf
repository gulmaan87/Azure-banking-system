
resource "azurerm_key_vault" "this" {
  name                        = var.name
  resource_group_name         = var.resource_group_name
  location                    = var.location
  sku_name                    = var.sku_name
  tenant_id                   = var.tenant_id
  soft_delete_retention_days  = var.soft_delete_retention_days
  purge_protection_enabled    = true  # Mandatory for banking compliance

  access_policy {
    tenant_id = var.tenant_id
    object_id = var.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Recover", "Backup", "Restore",
      "Encrypt", "Decrypt", "UnwrapKey", "WrapKey", "Sign", "Verify",
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore",
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Recover", "Backup", "Restore",
    ]
  }

  tags = var.tags
}
