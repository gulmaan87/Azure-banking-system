###############################################################################
# sentinel.tf – Extends monitoring.tf with:
#   1. Data Collection Endpoint (DCE) + Data Collection Rule (DCR)
#      for banking audit logs → Custom Log table in Log Analytics
#   2. VM Diagnostic Settings → forwards VM metrics/logs to Workspace
#   3. Key Vault Diagnostic Settings → audit KV access in Sentinel
#   4. SignalR Diagnostic Settings
#   5. Sentinel Analytics Rules — AML, brute force, suspicious admin actions
###############################################################################

###############################################################################
# 1. DATA COLLECTION ENDPOINT
#    The backend API calls this HTTPS endpoint to POST audit log batches
###############################################################################

# resource "azurerm_monitor_data_collection_endpoint" "banking" { ... }
# resource "azurerm_monitor_data_collection_rule" "banking_audit" { ... }
# resource "azurerm_role_assignment" "corebank_dcr" { ... }

###############################################################################
# 4. VM DIAGNOSTIC SETTINGS → Log Analytics
#    Forwards VM-level logs (syslog, perf counters) from corebank-1 + database-1
###############################################################################

resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "kv-diag-to-sentinel"
  target_resource_id         = azurerm_key_vault.this.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

resource "azurerm_monitor_diagnostic_setting" "signalr" {
  name                       = "signalr-diag-to-sentinel"
  target_resource_id         = azurerm_signalr_service.banking.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  # ConnectivityLogs is not supported on Free/Standard tier SignalR
  # enabled_log {
  #   category = "ConnectivityLogs"
  # }
  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

###############################################################################
# 5. SENTINEL ANALYTICS RULES
#    Auto-trigger incidents in Sentinel based on KQL queries
###############################################################################

resource "time_sleep" "wait_for_sentinel" {
  count           = var.enable_sentinel ? 1 : 0
  create_duration = "30s"
  depends_on      = [azurerm_log_analytics_solution.sentinel]
}



# Rule 1: Critical AML Flag — account flagged as structuring
resource "azurerm_sentinel_alert_rule_scheduled" "aml_critical" {
  count = var.enable_sentinel ? 1 : 0

  name                       = "BankAML-CriticalFlag"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  display_name               = "Banking: Critical AML Flag Detected"
  description                = "A banking transaction was flagged as STRUCTURING or triggered multiple AML rules. Immediate review required."
  severity                   = "High"
  enabled                    = true

  query = <<-KQL
    BankingAuditLogs_CL
    | where action_s == "AML_FLAG"
    | extend details = parse_json(details_s)
    | where details.rules has "STRUCTURING" or array_length(details.rules) >= 2
    | project TimeGenerated, performed_by_s, entity_id_s, details
  KQL

  query_frequency = "PT5M"
  query_period    = "PT5M"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  incident {
    create_incident_enabled = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT1H"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }

  depends_on = [
    azurerm_log_analytics_solution.sentinel[0],
    time_sleep.wait_for_sentinel
  ]
}

# Rule 2: Mass customer deletions (possible insider threat)
resource "azurerm_sentinel_alert_rule_scheduled" "mass_delete" {
  count = var.enable_sentinel ? 1 : 0

  name                       = "BankInsider-MassDelete"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  display_name               = "Banking: Mass Customer Deletion (Insider Threat)"
  description                = "More than 3 customer accounts deleted by a single employee within 10 minutes. Possible insider threat or compromised account."
  severity                   = "High"
  enabled                    = true

  query = <<-KQL
    BankingAuditLogs_CL
    | where action_s == "DELETE_CUSTOMER"
    | summarize count() by performed_by_s, bin(TimeGenerated, 10m)
    | where count_ > 3
  KQL

  query_frequency = "PT10M"
  query_period    = "PT10M"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  incident {
    create_incident_enabled = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT1H"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }

  depends_on = [
    azurerm_log_analytics_solution.sentinel[0],
    time_sleep.wait_for_sentinel
  ]
}

# Rule 3: After-hours admin activity (outside 06:00–22:00 UTC)
resource "azurerm_sentinel_alert_rule_scheduled" "after_hours" {
  count = var.enable_sentinel ? 1 : 0

  name                       = "BankAdmin-AfterHours"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  display_name               = "Banking: Admin Activity Outside Business Hours"
  description                = "A bank employee performed write operations outside of 06:00-22:00 UTC. May indicate compromised credentials."
  severity                   = "Medium"
  enabled                    = true

  query = <<-KQL
    BankingAuditLogs_CL
    | where action_s in ("CREATE_CUSTOMER","UPDATE_CUSTOMER","DELETE_CUSTOMER","FREEZE_ACCOUNT","FLAG_CUSTOMER")
    | extend hour = hourofday(TimeGenerated)
    | where hour < 6 or hour >= 22
    | project TimeGenerated, action_s, performed_by_s, entity_id_s, ip_address_s
  KQL

  query_frequency = "PT1H"
  query_period    = "PT1H"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  incident {
    create_incident_enabled = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT2H"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }

  depends_on = [
    azurerm_log_analytics_solution.sentinel[0],
    time_sleep.wait_for_sentinel
  ]
}

# Rule 4: Single IP performing actions on many accounts
resource "azurerm_sentinel_alert_rule_scheduled" "ip_enumeration" {
  count = var.enable_sentinel ? 1 : 0

  name                       = "BankAdmin-IPEnumeration"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  display_name               = "Banking: Rapid Account Enumeration from Single IP"
  description                = "A single IP address accessed more than 20 distinct customer records within 5 minutes. Possible data scraping."
  severity                   = "Medium"
  enabled                    = true

  query = <<-KQL
    BankingAuditLogs_CL
    | where isnotempty(ip_address_s)
    | summarize accounts = dcount(entity_id_s) by ip_address_s, bin(TimeGenerated, 5m)
    | where accounts > 20
  KQL

  query_frequency = "PT5M"
  query_period    = "PT5M"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  incident {
    create_incident_enabled = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT30M"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }

  depends_on = [
    azurerm_log_analytics_solution.sentinel[0],
    time_sleep.wait_for_sentinel
  ]
}

###############################################################################
# 6. OUTPUTS
###############################################################################

output "log_analytics_workspace_id" {
  value       = azurerm_log_analytics_workspace.this.id
  description = "Log Analytics Workspace ID — needed for backend LOG_ANALYTICS_WORKSPACE_ID"
}

# output "data_collection_endpoint_url" {
#   value       = azurerm_monitor_data_collection_endpoint.banking.logs_ingestion_endpoint
#   description = "Set this as LOG_INGESTION_ENDPOINT in backend .env"
# }

# output "data_collection_rule_immutable_id" {
#   value       = azurerm_monitor_data_collection_rule.banking_audit.immutable_id
#   description = "Set this as LOG_DCR_IMMUTABLE_ID in backend .env"
# }
