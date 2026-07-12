
resource "azurerm_policy_definition" "require_managed_identity" {
  name         = "banking-require-managed-identity"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "[Banking] Require Managed Identities"
  description  = "Requires all virtual machines and app services to have a SystemAssigned identity for Zero Trust auth."

  metadata = jsonencode({
    category = "Banking Security"
    version  = "1.0.0"
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field = "type"
          in    = ["Microsoft.Compute/virtualMachines", "Microsoft.Web/sites"]
        },
        {
          field = "identity.type"
          notEquals = "SystemAssigned"
        }
      ]
    }
    then = {
      effect = "Audit"
    }
  })
}

resource "azurerm_resource_group_policy_assignment" "require_mi_rg1" {
  name                 = "banking-req-mi-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = azurerm_policy_definition.require_managed_identity.id
  display_name         = "[Banking] Require Managed Identities – Region 1"
}

resource "azurerm_policy_definition" "audit_subnet_nsg" {
  name         = "banking-audit-subnet-nsg"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "[Banking] Audit Subnets without NSGs"
  description  = "Ensure every subnet is protected by a Network Security Group to enforce Zero Trust."

  metadata = jsonencode({
    category = "Banking Security"
    version  = "1.0.0"
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field  = "type"
          equals = "Microsoft.Network/virtualNetworks/subnets"
        },
        {
          field  = "Microsoft.Network/virtualNetworks/subnets/networkSecurityGroup.id"
          exists = "false"
        },
        {
          field  = "name"
          notEquals = "AzureBastionSubnet"
        },
        {
          field  = "name"
          notEquals = "AzureFirewallSubnet"
        }
      ]
    }
    then = {
      effect = "Audit"
    }
  })
}

resource "azurerm_resource_group_policy_assignment" "audit_subnet_nsg_rg1" {
  name                 = "banking-audit-snet-nsg-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = azurerm_policy_definition.audit_subnet_nsg.id
  display_name         = "[Banking] Audit Subnets without NSGs – Region 1"
}
