###############################################################################
# network_security.tf – Granular NSGs for Chain-of-Command Communication
###############################################################################

# -----------------------------------------------------------------------------
# REGION 1 (EAST ASIA) - ENTERPRISE ZERO TRUST NSGs
# -----------------------------------------------------------------------------

# 1. Customer DMZ NSG
resource "azurerm_network_security_group" "customer_dmz" {
  name                = "${local.name_prefix}-nsg-customer-dmz-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-Internet-HTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Deny-Internet-All"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

# Associate Customer DMZ NSG with customer VM NICs
resource "azurerm_network_interface_security_group_association" "customer_dmz" {
  for_each = { for k, v in module.vms1.nic_ids : k => v if startswith(k, "customer-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.customer_dmz.id
}


# 2. Payments (API Gateway) NSG
resource "azurerm_network_security_group" "payments" {
  name                = "${local.name_prefix}-nsg-payments-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-Customer-DMZ-to-Payments"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = var.subnets_region1["customer"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-Accounts-to-Payments"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = var.subnets_region1["accounts"]
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "payments" {
  for_each = { for k, v in module.vms1.nic_ids : k => v if startswith(k, "payments-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.payments.id
}


# 3. Accounts NSG
resource "azurerm_network_security_group" "accounts" {
  name                = "${local.name_prefix}-nsg-accounts-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Deny-Accounts-to-Database"
    priority                   = 150
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["database"]
  }
}

resource "azurerm_network_interface_security_group_association" "accounts" {
  for_each = { for k, v in module.vms1.nic_ids : k => v if startswith(k, "accounts-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.accounts.id
}


# 4. Core Banking NSG
resource "azurerm_network_security_group" "corebank" {
  name                = "${local.name_prefix}-nsg-corebank-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-CoreBank-to-Database"
    priority                   = 130
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "1433"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["database"]
  }
}

resource "azurerm_network_interface_security_group_association" "corebank" {
  for_each = { for k, v in module.vms_extended_1.nic_ids : k => v if startswith(k, "corebank-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.corebank.id
}


# 5. Executive Tier NSG
resource "azurerm_network_security_group" "executive" {
  name                = "${local.name_prefix}-nsg-executive-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Deny-Upward-To-Executive"
    priority                   = 400
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "executive" {
  for_each = { for k, v in module.vms_extended_1.nic_ids : k => v if startswith(k, "executive-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.executive.id
}


# 6. SOC NSG
resource "azurerm_network_security_group" "soc" {
  name                = "${local.name_prefix}-nsg-soc-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-SOC-Monitor-Outbound"
    priority                   = 500
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443", "8080", "22", "3389", "1433"]
    source_address_prefix      = "*"
    destination_address_prefix = "VirtualNetwork"
  }
}

resource "azurerm_network_interface_security_group_association" "soc" {
  for_each = { for k, v in module.vms_extended_1.nic_ids : k => v if startswith(k, "soc-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.soc.id
}


# -----------------------------------------------------------------------------
# REGION 2 (SOUTHEAST ASIA) - ENTERPRISE ZERO TRUST NSGs
# -----------------------------------------------------------------------------

# 7. Loans NSG
resource "azurerm_network_security_group" "loans" {
  name                = "${local.name_prefix}-nsg-loans-${var.env}"
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-Loans-to-Risk"
    priority                   = 160
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region2["risk"]
  }
}

resource "azurerm_network_interface_security_group_association" "loans" {
  for_each = { for k, v in module.vms2.nic_ids : k => v if startswith(k, "loans-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.loans.id
}


# 8. Risk NSG
resource "azurerm_network_security_group" "risk" {
  name                = "${local.name_prefix}-nsg-risk-${var.env}"
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-Loans-to-Risk-Inbound"
    priority                   = 170
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = var.subnets_region2["loans"]
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "risk" {
  for_each = { for k, v in module.vms2.nic_ids : k => v if startswith(k, "risk-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.risk.id
}


# 9. Compliance NSG
resource "azurerm_network_security_group" "compliance" {
  name                = "${local.name_prefix}-nsg-compliance-${var.env}"
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-Compliance-to-CoreBank"
    priority                   = 180
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["corebank"]
  }
}

resource "azurerm_network_interface_security_group_association" "compliance" {
  for_each = { for k, v in module.vms_extended_2.nic_ids : k => v if startswith(k, "compliance-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.compliance.id
}
