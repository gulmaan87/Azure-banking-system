
resource "azurerm_recovery_services_vault" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Standard"

  soft_delete_enabled = true

  tags = var.tags
}


resource "azurerm_backup_policy_vm" "daily" {
  name                = "${var.name}-policy-daily"
  resource_group_name = var.resource_group_name
  recovery_vault_name = azurerm_recovery_services_vault.this.name

  backup {
    frequency = "Daily"
    time      = "02:00"   # Off-peak UTC time for banking systems
  }

  retention_daily {
    count = 30
  }

  retention_weekly {
    count    = 12
    weekdays = ["Sunday"]
  }

  retention_monthly {
    count    = 6
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }
}
