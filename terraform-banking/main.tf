
data "azurerm_client_config" "current" {}

locals {
  name_prefix = "${var.prefix}-${var.project}"

  rg1_name = "${local.name_prefix}-rg-region1-${var.env}"
  rg2_name = "${local.name_prefix}-rg-region2-${var.env}"

  vnet1_name = "${local.name_prefix}-vnet-region1-${var.env}"
  vnet2_name = "${local.name_prefix}-vnet-region2-${var.env}"

  subnet_vm_sizes1 = {
    for k, v in var.subnets_region1 : k => var.vm_size
  }
  
  subnet_vm_sizes2 = {
    for k, v in var.subnets_region2 : k => var.vm_size
  }

  vm_map1 = merge([
    for subnet_name, cidr in var.subnets_region1 : {
      for idx in range(1, var.vm_count_per_subnet + 1) :
      "${subnet_name}-${idx}" => {
        subnet_name = subnet_name
        vm_index    = idx
        vm_size     = local.subnet_vm_sizes1[subnet_name]
        disk_type   = "Standard_LRS"
      }
    }
  ]...)

  vm_map2 = merge([
    for subnet_name, cidr in var.subnets_region2 : {
      for idx in range(1, var.vm_count_per_subnet + 1) :
      "${subnet_name}-${idx}" => {
        subnet_name = subnet_name
        vm_index    = idx
        vm_size     = local.subnet_vm_sizes2[subnet_name]
        disk_type   = "Standard_LRS"
      }
    }
  ]...)

  common_tags = var.tags
}


resource "azurerm_resource_group" "banking1" {
  name     = local.rg1_name
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_resource_group" "banking2" {
  name     = local.rg2_name
  location = var.location2
  tags     = local.common_tags
}


module "vnet1" {
  source = "./modules/vnet"

  name                = local.vnet1_name
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  address_space       = [var.vnet_address_space]
  tags                = local.common_tags
}

module "vnet2" {
  source = "./modules/vnet"

  name                = local.vnet2_name
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  address_space       = [var.vnet2_address_space]
  tags                = local.common_tags
}


resource "azurerm_virtual_network_peering" "vnet1_to_vnet2" {
  name                         = "peer-region1-to-region2"
  resource_group_name          = azurerm_resource_group.banking1.name
  virtual_network_name         = module.vnet1.vnet_name
  remote_virtual_network_id    = module.vnet2.vnet_id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true

  depends_on = [module.subnets1, module.subnets2]
}

resource "azurerm_virtual_network_peering" "vnet2_to_vnet1" {
  name                         = "peer-region2-to-region1"
  resource_group_name          = azurerm_resource_group.banking2.name
  virtual_network_name         = module.vnet2.vnet_name
  remote_virtual_network_id    = module.vnet1.vnet_id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true

  depends_on = [module.subnets1, module.subnets2]
}


module "nsg_shared1" {
  source = "./modules/nsg"

  name_prefix         = "${local.name_prefix}-r1"
  env                 = var.env
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  tags                = local.common_tags
}

module "nsg_shared2" {
  source = "./modules/nsg"

  name_prefix         = "${local.name_prefix}-r2"
  env                 = var.env
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  tags                = local.common_tags
}


module "subnets1" {
  source = "./modules/subnet"

  name_prefix          = "${local.name_prefix}-r1"
  env                  = var.env
  resource_group_name  = azurerm_resource_group.banking1.name
  virtual_network_name = module.vnet1.vnet_name
  subnets              = var.subnets_region1
  nsg_id               = module.nsg_shared1.nsg_id
}

module "subnets2" {
  source = "./modules/subnet"

  name_prefix          = "${local.name_prefix}-r2"
  env                  = var.env
  resource_group_name  = azurerm_resource_group.banking2.name
  virtual_network_name = module.vnet2.vnet_name
  subnets              = var.subnets_region2
  nsg_id               = module.nsg_shared2.nsg_id
}


module "vms1" {
  source = "./modules/vm"

  vm_map              = {}
  name_prefix         = "${local.name_prefix}-r1"
  env                 = var.env
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  subnet_ids          = module.subnets1.subnet_ids
  admin_username      = var.vm_admin_username
  admin_password      = var.vm_admin_password
  os_disk_size_gb     = var.os_disk_size_gb
  tags                = local.common_tags

  depends_on = [module.subnets1]
}

module "vms2" {
  source = "./modules/vm"

  vm_map              = local.vm_map2
  name_prefix         = "${local.name_prefix}-r2"
  env                 = var.env
  resource_group_name = azurerm_resource_group.banking2.name
  location            = azurerm_resource_group.banking2.location
  subnet_ids          = module.subnets2.subnet_ids
  admin_username      = var.vm_admin_username
  admin_password      = var.vm_admin_password
  os_disk_size_gb     = var.os_disk_size_gb
  tags                = local.common_tags

  depends_on = [module.subnets2]
}


module "storage" {
  source = "./modules/storage"

  name                = "mohdggulmaanbankr1"
  resource_group_name = azurerm_resource_group.banking1.name
  location            = azurerm_resource_group.banking1.location
  account_tier        = var.storage_account_tier
  replication_type    = var.storage_replication_type
  tags                = local.common_tags
}


resource "azurerm_role_assignment" "vms1_storage" {
  for_each             = module.vms1.vm_principal_ids
  scope                = module.storage.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = each.value
}

resource "azurerm_role_assignment" "vms2_storage" {
  for_each             = module.vms2.vm_principal_ids
  scope                = module.storage.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = each.value
}
