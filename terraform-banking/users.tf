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

resource "azuread_user" "admin_gulmaan" {
  user_principal_name   = "gulmaan@${local.domain}"
  display_name          = "Gulmaan"
  job_title             = "Head of IT Infrastructure"
  department            = "Information Technology"
  mail_nickname         = "gulmaan"
  password              = "BkAdmin#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "admin_priya" {
  user_principal_name   = "priya@${local.domain}"
  display_name          = "Priya"
  job_title             = "Cloud Infrastructure Engineer"
  department            = "Information Technology"
  mail_nickname         = "priya"
  password              = "BkAdmin#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "admin_gulmaan_member" {
  group_object_id  = azuread_group.bank_admins.object_id
  member_object_id = azuread_user.admin_gulmaan.object_id
}

resource "azuread_group_member" "admin_priya_member" {
  group_object_id  = azuread_group.bank_admins.object_id
  member_object_id = azuread_user.admin_priya.object_id
}

###############################################################################
# SECURITY AUDITORS (2 users)
###############################################################################

resource "azuread_user" "auditor_rahul" {
  user_principal_name   = "rahul@${local.domain}"
  display_name          = "Rahul"
  job_title             = "Chief Information Security Officer"
  department            = "Risk & Compliance"
  mail_nickname         = "rahul"
  password              = "BkAudit#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "auditor_deepa" {
  user_principal_name   = "deepa@${local.domain}"
  display_name          = "Deepa"
  job_title             = "Compliance Analyst"
  department            = "Risk & Compliance"
  mail_nickname         = "deepa"
  password              = "BkAudit#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "auditor_rahul_member" {
  group_object_id  = azuread_group.security_auditors.object_id
  member_object_id = azuread_user.auditor_rahul.object_id
}

resource "azuread_group_member" "auditor_deepa_member" {
  group_object_id  = azuread_group.security_auditors.object_id
  member_object_id = azuread_user.auditor_deepa.object_id
}

###############################################################################
# APPLICATION DEVELOPERS (2 users)
###############################################################################

resource "azuread_user" "dev_kavya" {
  user_principal_name   = "kavya@${local.domain}"
  display_name          = "Kavya"
  job_title             = "Senior Software Engineer"
  department            = "Application Engineering"
  mail_nickname         = "kavya"
  password              = "BkDev#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "dev_rohan" {
  user_principal_name   = "rohan@${local.domain}"
  display_name          = "Rohan"
  job_title             = "DevOps Engineer"
  department            = "Application Engineering"
  mail_nickname         = "rohan"
  password              = "BkDev#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "dev_kavya_member" {
  group_object_id  = azuread_group.app_developers.object_id
  member_object_id = azuread_user.dev_kavya.object_id
}

resource "azuread_group_member" "dev_rohan_member" {
  group_object_id  = azuread_group.app_developers.object_id
  member_object_id = azuread_user.dev_rohan.object_id
}

###############################################################################
# DATA ENGINEERS (2 users)
###############################################################################

resource "azuread_user" "data_ananya" {
  user_principal_name   = "ananya@${local.domain}"
  display_name          = "Ananya"
  job_title             = "Senior Data Engineer"
  department            = "Data & Analytics"
  mail_nickname         = "ananya"
  password              = "BkData#Secure@2024"
  force_password_change = true
}

resource "azuread_user" "data_vikram" {
  user_principal_name   = "vikram@${local.domain}"
  display_name          = "Vikram"
  job_title             = "Analytics Engineer"
  department            = "Data & Analytics"
  mail_nickname         = "vikram"
  password              = "BkData#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "data_ananya_member" {
  group_object_id  = azuread_group.data_engineers.object_id
  member_object_id = azuread_user.data_ananya.object_id
}

resource "azuread_group_member" "data_vikram_member" {
  group_object_id  = azuread_group.data_engineers.object_id
  member_object_id = azuread_user.data_vikram.object_id
}
