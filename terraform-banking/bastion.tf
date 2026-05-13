###############################################################################
# bastion.tf – Azure Bastion for Secure VM Access
###############################################################################

# 1. Public IP for Bastion
resource "azurerm_public_ip" "bastion" {
  count = var.enable_bastion ? 1 : 0

  name                = "${local.name_prefix}-pip-bastion-${var.env}"
  location            = azurerm_resource_group.banking1.location
  resource_group_name = azurerm_resource_group.banking1.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.common_tags
}

# 2. Bastion Host
resource "azurerm_bastion_host" "this" {
  count = var.enable_bastion ? 1 : 0

  name                = "${local.name_prefix}-bastion-${var.env}"
  location            = azurerm_resource_group.banking1.location
  resource_group_name = azurerm_resource_group.banking1.name
  sku                 = "Standard"
  tags                = local.common_tags

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.bastion_subnet[0].id
    public_ip_address_id = azurerm_public_ip.bastion[0].id
  }
}
