###############################################################################
# modules/nsg/main.tf – Single Shared Network Security Group
#
# NSG naming:  <prefix>-banking-nsg-shared-<env>
###############################################################################

resource "azurerm_network_security_group" "this" {
  name                = "${var.name_prefix}-nsg-shared-${var.env}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = merge(var.tags, { Purpose = "Shared NSG to optimize Student Subscription quota" })

  # ── INBOUND: allow health probes from Azure Load Balancer ─────────────────
  security_rule {
    name                       = "Allow-AzureLoadBalancer-Inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }

  # ── INBOUND: allow intra-VNet traffic ────────────────────────
  security_rule {
    name                       = "Allow-Intra-VNet-Inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  # ── INBOUND DEFAULT DENY (lowest priority) ─────────────────────────────────
  security_rule {
    name                       = "Deny-All-Inbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # ── OUTBOUND DEFAULT ALLOW (Azure management traffic) ─────────────────────
  security_rule {
    name                       = "Allow-Azure-Outbound"
    priority                   = 4000
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureCloud"
  }
}
