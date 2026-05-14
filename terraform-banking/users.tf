###############################################################################
# users.tf – 8 Banking System Users (Indian Names)
#
# Departments:
#   Bank Admins       → 2 users (IT leadership)
#   Security Auditors → 2 users (Compliance & Risk)
#   App Developers    → 2 users (Engineering)
#   Data Engineers    → 2 users (Data & Analytics)
#
# Note: Azure AD requires passwords do NOT contain the username/display name.
###############################################################################

# Fetch the Azure AD domain for user UPNs
data "azuread_domains" "current" {
  only_initial = true
}

locals {
  domain = data.azuread_domains.current.domains[0].domain_name
}

###############################################################################
# BANK ADMINISTRATORS (2 users)
###############################################################################

resource "azuread_user" "admin_mohdg_gulmaan" {
  user_principal_name   = "mohdg_gulmaan@${local.domain}"
  display_name          = "Mohdg Gulmaan"
  job_title             = "Head of IT Infrastructure"
  department            = "Information Technology"
  mail_nickname         = "mohdg_gulmaan"
  password              = "BkAdmin#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "admin_walter" {
  user_principal_name   = "walter@${local.domain}"
  display_name          = "Walter White"
  job_title             = "Cloud Infrastructure Engineer"
  department            = "Information Technology"
  mail_nickname         = "walter"
  password              = "BkAdmin#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "admin_mohdg_gulmaan_member" {
  group_object_id  = azuread_group.bank_admins.object_id
  member_object_id = azuread_user.admin_mohdg_gulmaan.object_id
}

resource "azuread_group_member" "admin_walter_member" {
  group_object_id  = azuread_group.bank_admins.object_id
  member_object_id = azuread_user.admin_walter.object_id
}

###############################################################################
# SECURITY AUDITORS (2 users)
###############################################################################

resource "azuread_user" "auditor_saul" {
  user_principal_name   = "saul@${local.domain}"
  display_name          = "Saul Goodman"
  job_title             = "Chief Information Security Officer"
  department            = "Risk & Compliance"
  mail_nickname         = "saul"
  password              = "BkAudit#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "auditor_skyler" {
  user_principal_name   = "skyler@${local.domain}"
  display_name          = "Skyler White"
  job_title             = "Compliance Analyst"
  department            = "Risk & Compliance"
  mail_nickname         = "skyler"
  password              = "BkAudit#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "auditor_saul_member" {
  group_object_id  = azuread_group.security_auditors.object_id
  member_object_id = azuread_user.auditor_saul.object_id
}

resource "azuread_group_member" "auditor_skyler_member" {
  group_object_id  = azuread_group.security_auditors.object_id
  member_object_id = azuread_user.auditor_skyler.object_id
}

###############################################################################
# APPLICATION DEVELOPERS (2 users)
###############################################################################

resource "azuread_user" "dev_jesse" {
  user_principal_name   = "jesse@${local.domain}"
  display_name          = "Jesse Pinkman"
  job_title             = "Senior Software Engineer"
  department            = "Application Engineering"
  mail_nickname         = "jesse"
  password              = "BkDev#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "dev_hank" {
  user_principal_name   = "hank@${local.domain}"
  display_name          = "Hank Schrader"
  job_title             = "DevOps Engineer"
  department            = "Application Engineering"
  mail_nickname         = "hank"
  password              = "BkDev#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "dev_jesse_member" {
  group_object_id  = azuread_group.app_developers.object_id
  member_object_id = azuread_user.dev_jesse.object_id
}

resource "azuread_group_member" "dev_hank_member" {
  group_object_id  = azuread_group.app_developers.object_id
  member_object_id = azuread_user.dev_hank.object_id
}

###############################################################################
# DATA ENGINEERS (2 users)
###############################################################################

resource "azuread_user" "data_gustavo" {
  user_principal_name   = "gustavo@${local.domain}"
  display_name          = "Gustavo Fring"
  job_title             = "Senior Data Engineer"
  department            = "Data & Analytics"
  mail_nickname         = "gustavo"
  password              = "BkData#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "data_mike" {
  user_principal_name   = "mike@${local.domain}"
  display_name          = "Mike Ehrmantraut"
  job_title             = "Analytics Engineer"
  department            = "Data & Analytics"
  mail_nickname         = "mike"
  password              = "BkData#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "data_gustavo_member" {
  group_object_id  = azuread_group.data_engineers.object_id
  member_object_id = azuread_user.data_gustavo.object_id
}

resource "azuread_group_member" "data_mike_member" {
  group_object_id  = azuread_group.data_engineers.object_id
  member_object_id = azuread_user.data_mike.object_id
}
