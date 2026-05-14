###############################################################################
# firewall.tf – Azure Firewall and Route Tables
###############################################################################

# 1. Public IP for Firewall
resource "azurerm_public_ip" "firewall" {
  count = var.enable_firewall ? 1 : 0

  name                = "${local.name_prefix}-pip-fw-${var.env}"
  location            = azurerm_resource_group.banking1.location
  resource_group_name = azurerm_resource_group.banking1.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.common_tags
}

# 2. Azure Firewall
resource "azurerm_firewall" "this" {
  count = var.enable_firewall ? 1 : 0

  name                = "${local.name_prefix}-fw-${var.env}"
  location            = azurerm_resource_group.banking1.location
  resource_group_name = azurerm_resource_group.banking1.name
  sku_name            = "AZFW_VNet"
  sku_tier            = "Standard"
  tags                = local.common_tags

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.firewall_subnet[0].id
    public_ip_address_id = azurerm_public_ip.firewall[0].id
  }
}

# 3. Route Table to Force Traffic via Firewall (Only applied if FW enabled)
resource "azurerm_route_table" "force_firewall" {
  count = var.enable_firewall ? 1 : 0

  name                          = "${local.name_prefix}-rt-firewall-${var.env}"
  location                      = azurerm_resource_group.banking1.location
  resource_group_name           = azurerm_resource_group.banking1.name
  bgp_route_propagation_enabled = true
  tags                          = local.common_tags

  route {
    name                   = "Force-Internet-via-FW"
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = azurerm_firewall.this[0].ip_configuration[0].private_ip_address
  }
}
