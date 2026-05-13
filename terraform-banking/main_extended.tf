###############################################################################
# main_extended.tf – New enterprise subnets, VMs, Bastion, and Firewall wiring
###############################################################################

# -----------------------------------------------------------------------------
# EXTENDED SUBNETS (Region 1)
# -----------------------------------------------------------------------------
module "subnets_extended_1" {
  source = "./modules/subnet"

  name_prefix          = "${local.name_prefix}-ext-r1"
  env                  = var.env
  resource_group_name  = azurerm_resource_group.banking1.name
  virtual_network_name = module.vnet1.vnet_name
  subnets              = var.subnets_region1_extended
  nsg_id               = module.nsg_shared1.nsg_id
}

# -----------------------------------------------------------------------------
# EXTENDED SUBNETS (Region 2)
# -----------------------------------------------------------------------------
module "subnets_extended_2" {
  source = "./modules/subnet"

  name_prefix          = "${local.name_prefix}-ext-r2"
  env                  = var.env
  resource_group_name  = azurerm_resource_group.banking2.name
  virtual_network_name = module.vnet2.vnet_name
  subnets              = var.subnets_region2_extended
  nsg_id               = module.nsg_shared2.nsg_id
}

# -----------------------------------------------------------------------------
# AZURE BASTION SUBNET (Standalone, must not have standard NSG attached)
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "bastion_subnet" {
  count = var.enable_bastion ? 1 : 0

  name                 = "AzureBastionSubnet"
  resource_group_name  = azurerm_resource_group.banking1.name
  virtual_network_name = module.vnet1.vnet_name
  address_prefixes     = [var.bastion_subnet_cidr]
}

# -----------------------------------------------------------------------------
# AZURE FIREWALL SUBNET (Standalone, must not have standard NSG attached)
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "firewall_subnet" {
  count = var.enable_firewall ? 1 : 0

  name                 = "AzureFirewallSubnet"
  resource_group_name  = azurerm_resource_group.banking1.name
  virtual_network_name = module.vnet1.vnet_name
  address_prefixes     = [var.firewall_subnet_cidr]
}

# -----------------------------------------------------------------------------
# EXTENDED VMs (Region 1)
# -----------------------------------------------------------------------------
locals {
  subnet_vm_sizes1_ext = {
    for k, v in var.subnets_region1_extended : k => var.vm_size
  }
  
  subnet_vm_sizes2_ext = {
    for k, v in var.subnets_region2_extended : k => var.vm_size
  }

  vm_map1_ext = merge([
    for subnet_name, cidr in var.subnets_region1_extended : {
      for idx in range(1, var.vm_count_per_subnet + 1) :
      "${subnet_name}-${idx}" => {
        subnet_name = subnet_name
        vm_index    = idx
        vm_size     = local.subnet_vm_sizes1_ext[subnet_name]
        disk_type   = "Standard_LRS"
      }
    }
  ]...)

  vm_map2_ext = merge([
    for subnet_name, cidr in var.subnets_region2_extended : {
      for idx in range(1, var.vm_count_per_subnet + 1) :
      "${subnet_name}-${idx}" => {
        subnet_name = subnet_name
        vm_index    = idx
        vm_size     = local.subnet_vm_sizes2_ext[subnet_name]
        disk_type   = "Standard_LRS"
      }
    }
  ]...)
}

module "vms_extended_1" {
  source = "./modules/vm"

  vm_map              = local.vm_map1_ext
  name_prefix         = "${local.name_prefix}-ext-r1"
  env                 = var.env
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  subnet_ids          = module.subnets_extended_1.subnet_ids
  admin_username      = var.vm_admin_username
  admin_password      = var.vm_admin_password
  os_disk_size_gb     = var.os_disk_size_gb
  tags                = local.common_tags

  depends_on = [module.subnets_extended_1]
}

module "vms_extended_2" {
  source = "./modules/vm"

  vm_map              = local.vm_map2_ext
  name_prefix         = "${local.name_prefix}-ext-r2"
  env                 = var.env
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  subnet_ids          = module.subnets_extended_2.subnet_ids
  admin_username      = var.vm_admin_username
  admin_password      = var.vm_admin_password
  os_disk_size_gb     = var.os_disk_size_gb
  tags                = local.common_tags

  depends_on = [module.subnets_extended_2]
}

# -----------------------------------------------------------------------------
# RBAC FOR EXTENDED VMs (Storage Blob Data Contributor)
# -----------------------------------------------------------------------------
resource "azurerm_role_assignment" "vms_extended_1_storage" {
  for_each             = module.vms_extended_1.vm_principal_ids
  scope                = module.storage.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = each.value
}

resource "azurerm_role_assignment" "vms_extended_2_storage" {
  for_each             = module.vms_extended_2.vm_principal_ids
  scope                = module.storage.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = each.value
}
