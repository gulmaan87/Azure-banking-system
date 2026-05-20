###############################################################################
# storage_kyc.tf – Azure Blob Storage configuration for KYC documents
#
# Extends the existing storage account (mohdggulmaanbankr1) with:
#   1. KYC documents container (private, no public access)
#   2. Blob lifecycle policy — auto-delete rejected docs after 90 days
#   3. Key Vault secret — SAS token / connection string for corebank-1
#   4. VM Managed Identity → Storage Blob Data Contributor role
###############################################################################

###############################################################################
# 1. REFERENCE existing storage account (created in main.tf / module.storage)
###############################################################################
# Using module.storage directly since data block fails if not created yet

###############################################################################
# 2. KYC DOCUMENTS CONTAINER — private, no public blob access
###############################################################################
resource "azurerm_storage_container" "kyc_documents" {
  name                  = "kyc-documents"
  storage_account_name  = module.storage.storage_account_name
  container_access_type = "private"
}

###############################################################################
# 3. THUMBNAILS CONTAINER — for resized preview images (admin review)
###############################################################################
resource "azurerm_storage_container" "kyc_thumbnails" {
  name                  = "kyc-thumbnails"
  storage_account_name  = module.storage.storage_account_name
  container_access_type = "private"
}

###############################################################################
# 4. BLOB LIFECYCLE POLICY
#    - Rejected KYC documents: move to cool tier after 30d, delete after 90d
#    - Approved KYC documents: move to archive after 365d (regulatory retention)
###############################################################################
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



###############################################################################
# 6. STORE storage connection string in Key Vault (for dev/CI)
#    On VM, the Managed Identity is used instead — no connection string needed
###############################################################################
resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = module.storage.primary_connection_string
  key_vault_id = azurerm_key_vault.this.id
  tags         = local.common_tags
  content_type = "connection-string"

  depends_on = [azurerm_key_vault.this]
}

###############################################################################
# 7. OUTPUTS
###############################################################################

output "kyc_container_name" {
  value       = azurerm_storage_container.kyc_documents.name
  description = "Azure Blob container for KYC documents"
}
