###############################################################################
# provider.tf – Terraform + AzureRM provider configuration
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.48"
    }
  }
}

provider "azuread" {
  # Azure Active Directory provider configuration
}


provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      # Purge protection is enabled on the vault; allow recovery during destroy
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    virtual_machine {
      # Preserve OS disk on VM destroy (safety for banking data)
      delete_os_disk_on_deletion = false
    }
  }
}
