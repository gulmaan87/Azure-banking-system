###############################################################################
# modules/storage/main.tf – Shared Storage Account
#
# Name constraints: 3-24 chars, lowercase alphanumeric only
# "mohdgbankingdev" = 15 chars – valid
###############################################################################

resource "azurerm_storage_account" "this" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.account_tier
  account_replication_type = var.replication_type

  # Security hardening
  https_traffic_only_enabled       = true
  min_tls_version                  = "TLS1_2"
  allow_nested_items_to_be_public  = false
  shared_access_key_enabled        = true

  blob_properties {
    delete_retention_policy {
      days = 7
    }
    versioning_enabled = true
  }

  tags = var.tags
}
