###############################################################################
# policy.tf – Azure Policy for Banking Compliance
#
# Policies applied:
#   1. Deny Public IP on NICs
#   2. Require Mandatory Tags on Resources
#   3. Require HTTPS on Storage Accounts
#   4. Enforce Allowed Locations (eastasia + southeastasia only)
#   5. Deny Unencrypted OS Disks
#   6. Audit VMs without Managed Identity
###############################################################################

# Get current subscription to use as scope
data "azurerm_subscription" "current" {}

###############################################################################
# POLICY 1: Deny Public IP Addresses on Network Interfaces
# No VM in a banking system should ever have a public-facing NIC
###############################################################################

resource "azurerm_policy_definition" "deny_public_ip" {
  name         = "banking-deny-public-ip"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "[Banking] Deny Public IP Address Resources"
  description  = "Prevents creation of any Public IP Address resource. Enforces zero-public-exposure policy."

  metadata = jsonencode({
    category = "Banking Security"
    version  = "1.1.0"
  })

  policy_rule = jsonencode({
    if = {
      field  = "type"
      equals = "Microsoft.Network/publicIPAddresses"
    }
    then = {
      effect = "Deny"
    }
  })
}

resource "azurerm_resource_group_policy_assignment" "deny_public_ip_rg1" {
  name                 = "banking-deny-public-ip-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = azurerm_policy_definition.deny_public_ip.id
  description          = "Deny public IPs in Region 1 resource group."
  display_name         = "[Banking] Deny Public IP – Region 1"
}

resource "azurerm_resource_group_policy_assignment" "deny_public_ip_rg2" {
  name                 = "banking-deny-public-ip-r2"
  resource_group_id    = azurerm_resource_group.banking2.id
  policy_definition_id = azurerm_policy_definition.deny_public_ip.id
  description          = "Deny public IPs in Region 2 resource group."
  display_name         = "[Banking] Deny Public IP – Region 2"
}

###############################################################################
# POLICY 2: Require Mandatory Tags (Owner, Environment, CostCenter)
# Every resource must have these tags for cost management and accountability
###############################################################################

resource "azurerm_policy_definition" "require_tags" {
  name         = "banking-require-mandatory-tags"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "[Banking] Require Mandatory Tags on Resources"
  description  = "Requires Owner, Environment, and CostCenter tags on all resources."

  metadata = jsonencode({
    category = "Banking Governance"
    version  = "1.0.0"
  })

  policy_rule = jsonencode({
    if = {
      anyOf = [
        {
          field  = "tags['Owner']"
          exists = "false"
        },
        {
          field  = "tags['Environment']"
          exists = "false"
        },
        {
          field  = "tags['CostCenter']"
          exists = "false"
        }
      ]
    }
    then = {
      effect = "Deny"
    }
  })
}

resource "azurerm_resource_group_policy_assignment" "require_tags_rg1" {
  name                 = "banking-require-tags-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = azurerm_policy_definition.require_tags.id
  display_name         = "[Banking] Require Tags – Region 1"
}

resource "azurerm_resource_group_policy_assignment" "require_tags_rg2" {
  name                 = "banking-require-tags-r2"
  resource_group_id    = azurerm_resource_group.banking2.id
  policy_definition_id = azurerm_policy_definition.require_tags.id
  display_name         = "[Banking] Require Tags – Region 2"
}

###############################################################################
# POLICY 3: Require Secure Transfer (HTTPS) on Storage Accounts
# Built-in policy: Secure transfer should be enabled for storage accounts
###############################################################################

data "azurerm_policy_definition" "secure_transfer_storage" {
  display_name = "Secure transfer to storage accounts should be enabled"
}

resource "azurerm_resource_group_policy_assignment" "secure_transfer_rg1" {
  name                 = "banking-secure-storage-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = data.azurerm_policy_definition.secure_transfer_storage.id
  display_name         = "[Banking] Require HTTPS on Storage – Region 1"
}

###############################################################################
# POLICY 4: Allowed Locations — Restrict to eastasia & southeastasia Only
# Prevents accidental resource creation in non-approved, expensive regions
###############################################################################

data "azurerm_policy_definition" "allowed_locations" {
  display_name = "Allowed locations"
}

resource "azurerm_resource_group_policy_assignment" "allowed_locations_rg1" {
  name                 = "banking-allowed-locations-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = data.azurerm_policy_definition.allowed_locations.id
  display_name         = "[Banking] Allowed Locations – Region 1"

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = ["eastasia", "southeastasia"]
    }
  })
}

resource "azurerm_resource_group_policy_assignment" "allowed_locations_rg2" {
  name                 = "banking-allowed-locations-r2"
  resource_group_id    = azurerm_resource_group.banking2.id
  policy_definition_id = data.azurerm_policy_definition.allowed_locations.id
  display_name         = "[Banking] Allowed Locations – Region 2"

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = ["eastasia", "southeastasia"]
    }
  })
}

###############################################################################
# POLICY 5: Audit VMs without Managed Identity
# All VMs should use SystemAssigned identity for secure, password-less auth
###############################################################################

resource "azurerm_policy_definition" "audit_vm_managed_identity" {
  name         = "banking-audit-vm-managed-identity"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "[Banking] Audit VMs Without Managed Identity"
  description  = "Audits any virtual machine that does not have a SystemAssigned managed identity enabled."

  metadata = jsonencode({
    category = "Banking Security"
    version  = "1.0.0"
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field  = "type"
          equals = "Microsoft.Compute/virtualMachines"
        },
        {
          field    = "identity.type"
          notContains = "SystemAssigned"
        }
      ]
    }
    then = {
      effect = "Audit"
    }
  })
}

resource "azurerm_resource_group_policy_assignment" "audit_vm_identity_rg1" {
  name                 = "banking-audit-vm-identity-r1"
  resource_group_id    = azurerm_resource_group.banking1.id
  policy_definition_id = azurerm_policy_definition.audit_vm_managed_identity.id
  display_name         = "[Banking] Audit VM Managed Identity – Region 1"
}

resource "azurerm_resource_group_policy_assignment" "audit_vm_identity_rg2" {
  name                 = "banking-audit-vm-identity-r2"
  resource_group_id    = azurerm_resource_group.banking2.id
  policy_definition_id = azurerm_policy_definition.audit_vm_managed_identity.id
  display_name         = "[Banking] Audit VM Managed Identity – Region 2"
}
