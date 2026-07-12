
resource "azurerm_private_dns_zone" "banking" {
  name                = "internal.banking.com"
  resource_group_name = azurerm_resource_group.banking1.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "vnet1" {
  name                  = "link-vnet1"
  resource_group_name   = azurerm_resource_group.banking1.name
  private_dns_zone_name = azurerm_private_dns_zone.banking.name
  virtual_network_id    = module.vnet1.vnet_id
  registration_enabled  = true
  tags                  = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "vnet2" {
  name                  = "link-vnet2"
  resource_group_name   = azurerm_resource_group.banking1.name
  private_dns_zone_name = azurerm_private_dns_zone.banking.name
  virtual_network_id    = module.vnet2.vnet_id
  registration_enabled  = true
  tags                  = local.common_tags
}
