###############################################################################
# modules/subnet/main.tf – Creates one subnet per entry in var.subnets
#                          and associates the shared NSG
#
# Subnet naming: <prefix>-banking-subnet-<name>-<env>
###############################################################################

resource "azurerm_subnet" "this" {
  for_each = var.subnets

  name                 = "${var.name_prefix}-subnet-${each.key}-${var.env}"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.virtual_network_name
  address_prefixes     = [each.value]
}

# Associate each subnet with the shared NSG (or custom NSG if overridden)
resource "azurerm_subnet_network_security_group_association" "this" {
  for_each = var.subnets

  subnet_id                 = azurerm_subnet.this[each.key].id
  network_security_group_id = lookup(var.custom_nsg_ids, each.key, var.nsg_id)
}
