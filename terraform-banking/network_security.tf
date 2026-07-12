

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

resource "azurerm_network_interface_security_group_association" "customer_dmz" {
  for_each = { for k, v in module.vms1.nic_ids : k => v if startswith(k, "customer-") }
  
  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.customer_dmz.id
}


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


resource "azurerm_network_security_group" "corebank" {
  name                = "${local.name_prefix}-nsg-corebank-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-HTTPS-Inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTP-Inbound"
    priority                   = 115
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

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


resource "azurerm_network_security_group" "executive" {
  name                = "${local.name_prefix}-nsg-executive-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-ICMP-Out-to-All"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Allow-ICMP-from-R1Manager"
    priority                   = 300
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region1_extended["management"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-from-R2Manager"
    priority                   = 301
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region2["itops"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Deny-All-Other-Inbound"
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

  security_rule {
    name                       = "Allow-ICMP-In-from-Executive"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region1_extended["executive"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-Out-to-R2Manager"
    priority                   = 200
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region2["itops"]
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-R2Manager"
    priority                   = 201
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region2["itops"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Deny-ICMP-Out-to-Executive"
    priority                   = 210
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["executive"]
  }
}

resource "azurerm_network_interface_security_group_association" "loans" {
  for_each = { for k, v in module.vms2.nic_ids : k => v if startswith(k, "loans-") }

  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.loans.id
}


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

  security_rule {
    name                       = "Allow-ICMP-In-from-Executive"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region1_extended["executive"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-Out-to-R2Manager"
    priority                   = 200
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region2["itops"]
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-R2Manager"
    priority                   = 201
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region2["itops"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Deny-ICMP-Out-to-Executive"
    priority                   = 210
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["executive"]
  }
}

resource "azurerm_network_interface_security_group_association" "risk" {
  for_each = { for k, v in module.vms2.nic_ids : k => v if startswith(k, "risk-") }

  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.risk.id
}


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


resource "azurerm_network_security_group" "itops" {
  name                = "${local.name_prefix}-nsg-itops-${var.env}"
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  tags                = local.common_tags

  security_rule {
    name                         = "Allow-ICMP-Out-to-R2Employees"
    priority                     = 200
    direction                    = "Outbound"
    access                       = "Allow"
    protocol                     = "Icmp"
    source_port_range            = "*"
    destination_port_range       = "*"
    source_address_prefix        = "*"
    destination_address_prefixes = [var.subnets_region2["loans"], var.subnets_region2["risk"]]
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-Executive"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region1_extended["executive"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-R2Employees"
    priority                   = 201
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefixes    = [var.subnets_region2["loans"], var.subnets_region2["risk"]]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-Out-to-R1Manager"
    priority                   = 210
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["management"]
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-R1Manager"
    priority                   = 211
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region1_extended["management"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-Out-to-Executive"
    priority                   = 220
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["executive"]
  }
}

resource "azurerm_network_interface_security_group_association" "itops" {
  for_each = { for k, v in module.vms2.nic_ids : k => v if startswith(k, "itops-") }

  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.itops.id
}


resource "azurerm_network_security_group" "management" {
  name                = "${local.name_prefix}-nsg-management-${var.env}"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags

  security_rule {
    name                       = "Allow-ICMP-Out-to-R2Manager"
    priority                   = 200
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region2["itops"]
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-Executive"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region1_extended["executive"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-In-from-R2Manager"
    priority                   = 201
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.subnets_region2["itops"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-ICMP-Out-to-Executive"
    priority                   = 210
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = var.subnets_region1_extended["executive"]
  }

  security_rule {
    name                       = "Deny-ICMP-In-from-Employees"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "Icmp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "management" {
  for_each = { for k, v in module.vms_extended_1.nic_ids : k => v if startswith(k, "management-") }

  network_interface_id      = each.value
  network_security_group_id = azurerm_network_security_group.management.id
}
