###############################################################################
# rbac.tf – Real Banking System Roles & User Groups
###############################################################################

data "azuread_client_config" "current_ad" {}

# 1. Bank Administrators (Full management access)
resource "azuread_group" "bank_admins" {
  display_name     = "Bank Administrators"
  description      = "Senior IT admins with full Contributor access to banking infrastructure."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "bank_admins_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Contributor"
  principal_id         = azuread_group.bank_admins.object_id
}

resource "azurerm_role_assignment" "bank_admins_rg2" {
  scope                = azurerm_resource_group.banking2.id
  role_definition_name = "Contributor"
  principal_id         = azuread_group.bank_admins.object_id
}

# 2. Security Auditors (Read-only + monitoring access)
resource "azuread_group" "security_auditors" {
  display_name     = "Security Auditors"
  description      = "Compliance and security team members who monitor infrastructure."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "security_auditors_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Reader"
  principal_id         = azuread_group.security_auditors.object_id
}

resource "azurerm_role_assignment" "security_auditors_rg2" {
  scope                = azurerm_resource_group.banking2.id
  role_definition_name = "Reader"
  principal_id         = azuread_group.security_auditors.object_id
}

# 3. Application Developers (Manage VMs and Applications)
resource "azuread_group" "app_developers" {
  display_name     = "Application Developers"
  description      = "Software engineers managing the banking application deployments."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "app_devs_vm_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Virtual Machine Contributor"
  principal_id         = azuread_group.app_developers.object_id
}

resource "azurerm_role_assignment" "app_devs_vm_rg2" {
  scope                = azurerm_resource_group.banking2.id
  role_definition_name = "Virtual Machine Contributor"
  principal_id         = azuread_group.app_developers.object_id
}

# 4. Data Engineers (Manage databases and storage)
resource "azuread_group" "data_engineers" {
  display_name     = "Data Engineers"
  description      = "Data team managing banking transaction logs and storage."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "data_engineers_storage" {
  scope                = module.storage.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_group.data_engineers.object_id
}
