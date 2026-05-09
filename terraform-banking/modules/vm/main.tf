###############################################################################
# modules/vm/main.tf – 16 Ubuntu VMs (2 per subnet, no public IPs)
#
# VM naming: <prefix>-banking-vm-<subnet>-<index>-<env>
# NIC naming: <prefix>-banking-nic-<subnet>-<index>-<env>
###############################################################################

###############################################################################
# Network Interface Cards (one per VM, private IP only)
###############################################################################

resource "azurerm_network_interface" "this" {
  for_each = var.vm_map

  name                = "${var.name_prefix}-nic-${each.key}-${var.env}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = merge(var.tags, { VMKey = each.key })

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_ids[each.value.subnet_name]
    private_ip_address_allocation = "Dynamic"
    # Deliberately NO public IP assignment
  }
}

###############################################################################
# Linux Virtual Machines (Ubuntu 22.04 LTS)
###############################################################################

resource "azurerm_linux_virtual_machine" "this" {
  for_each = var.vm_map

  name                = "${var.name_prefix}-vm-${each.key}-${var.env}"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = each.value.vm_size
  admin_username      = var.admin_username
  tags                = merge(var.tags, { Subnet = each.value.subnet_name, VMIndex = tostring(each.value.vm_index) })

  # Password-based auth (Key Vault integration recommended for production)
  admin_password                  = var.admin_password
  disable_password_authentication = false

  network_interface_ids = [
    azurerm_network_interface.this[each.key].id
  ]

  secure_boot_enabled = true
  vtpm_enabled        = true

  identity {
    type = "SystemAssigned"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = each.value.disk_type
    disk_size_gb         = var.os_disk_size_gb
  }

  source_image_reference {
    # Standard x64 image for A/B/D-series.
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  # Boot diagnostics (uses managed storage by default – no SA needed)
  boot_diagnostics {}

  # Prevent accidental deletion in banking environments
  lifecycle {
    ignore_changes = [
      # Allow OS updates without triggering a full replacement
      source_image_reference
    ]
  }
}
