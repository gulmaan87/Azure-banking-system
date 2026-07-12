

resource "azurerm_storage_container" "kyc_documents" {
  name                  = "kyc-documents"
  storage_account_name  = module.storage.storage_account_name
  container_access_type = "private"
}

resource "azurerm_storage_container" "kyc_thumbnails" {
  name                  = "kyc-thumbnails"
  storage_account_name  = module.storage.storage_account_name
  container_access_type = "private"
}

resource "azurerm_storage_management_policy" "kyc_lifecycle" {
  storage_account_id = module.storage.storage_account_id

  rule {
    name    = "kyc-rejected-cleanup"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["kyc-documents/rejected/"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        delete_after_days_since_modification_greater_than          = 90
      }
    }
  }

  rule {
    name    = "kyc-approved-archive"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["kyc-documents/approved/"]
    }

    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 365
      }
    }
  }
}



resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = module.storage.primary_connection_string
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags
  content_type = "connection-string"

  depends_on = [azurerm_key_vault.this]
}


output "kyc_container_name" {
  value       = azurerm_storage_container.kyc_documents.name
  description = "Azure Blob container for KYC documents"
}
