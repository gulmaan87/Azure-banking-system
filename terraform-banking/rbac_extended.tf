
resource "azuread_group" "executives" {
  display_name     = "Executives"
  description      = "Executive Leadership team with global read visibility."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "executives_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Reader"
  principal_id         = azuread_group.executives.object_id
}

resource "azurerm_role_assignment" "executives_rg2" {
  scope                = azurerm_resource_group.banking2.id
  role_definition_name = "Reader"
  principal_id         = azuread_group.executives.object_id
}

resource "azuread_group" "regional_auth" {
  display_name     = "Regional Authorities"
  description      = "Regional managers monitoring infrastructure health."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "regional_auth_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Monitoring Reader"
  principal_id         = azuread_group.regional_auth.object_id
}

resource "azuread_group" "dept_heads" {
  display_name     = "Department Heads"
  description      = "Department leaders managing their specific teams."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azuread_group" "branch_managers" {
  display_name     = "Branch Managers"
  description      = "Branch-level management and oversight."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azuread_group" "banking_employees" {
  display_name     = "Banking Employees"
  description      = "Standard banking operators."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azuread_group" "soc_analysts" {
  display_name     = "SOC Analysts"
  description      = "Security Operations Center monitoring identity and security."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "soc_analysts_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Security Reader"
  principal_id         = azuread_group.soc_analysts.object_id
}

resource "azurerm_role_assignment" "soc_analysts_rg2" {
  scope                = azurerm_resource_group.banking2.id
  role_definition_name = "Security Reader"
  principal_id         = azuread_group.soc_analysts.object_id
}

resource "azuread_group" "devops_engineers" {
  display_name     = "DevOps Engineers"
  description      = "Automation and infrastructure deployment."
  owners           = [data.azuread_client_config.current_ad.object_id]
  security_enabled = true
}

resource "azurerm_role_assignment" "devops_rg1" {
  scope                = azurerm_resource_group.banking1.id
  role_definition_name = "Virtual Machine Contributor"
  principal_id         = azuread_group.devops_engineers.object_id
}
