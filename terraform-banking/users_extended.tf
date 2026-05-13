###############################################################################
# users_extended.tf – Additional Users for the Banking Hierarchy
###############################################################################

# -----------------------------------------------------------------------------
# EXECUTIVES
# -----------------------------------------------------------------------------
resource "azuread_user" "ceo_sharma" {
  user_principal_name   = "ceo_sharma@${local.domain}"
  display_name          = "CEO Sharma"
  job_title             = "Chief Executive Officer"
  department            = "Executive Leadership"
  mail_nickname         = "ceosharma"
  password              = "BkExec#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "ceo_sharma_member" {
  group_object_id  = azuread_group.executives.object_id
  member_object_id = azuread_user.ceo_sharma.object_id
}

resource "azuread_user" "cfo_nair" {
  user_principal_name   = "cfo_nair@${local.domain}"
  display_name          = "CFO Nair"
  job_title             = "Chief Financial Officer"
  department            = "Executive Leadership"
  mail_nickname         = "cfonair"
  password              = "BkExec#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "cfo_nair_member" {
  group_object_id  = azuread_group.executives.object_id
  member_object_id = azuread_user.cfo_nair.object_id
}

# -----------------------------------------------------------------------------
# REGIONAL AUTHORITIES
# -----------------------------------------------------------------------------
resource "azuread_user" "regional_rajan" {
  user_principal_name   = "rajan@${local.domain}"
  display_name          = "Rajan"
  job_title             = "Regional Director East Asia"
  department            = "Regional Management"
  mail_nickname         = "rajan"
  password              = "BkRegion#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "regional_rajan_member" {
  group_object_id  = azuread_group.regional_auth.object_id
  member_object_id = azuread_user.regional_rajan.object_id
}

# -----------------------------------------------------------------------------
# DEPARTMENT HEADS
# -----------------------------------------------------------------------------
resource "azuread_user" "dept_suresh" {
  user_principal_name   = "suresh@${local.domain}"
  display_name          = "Suresh"
  job_title             = "Head of Core Banking"
  department            = "Core Banking"
  mail_nickname         = "suresh"
  password              = "BkDept#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "dept_suresh_member" {
  group_object_id  = azuread_group.dept_heads.object_id
  member_object_id = azuread_user.dept_suresh.object_id
}

resource "azuread_user" "dept_lakshmi" {
  user_principal_name   = "lakshmi@${local.domain}"
  display_name          = "Lakshmi"
  job_title             = "Head of Risk Management"
  department            = "Risk"
  mail_nickname         = "lakshmi"
  password              = "BkDept#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "dept_lakshmi_member" {
  group_object_id  = azuread_group.dept_heads.object_id
  member_object_id = azuread_user.dept_lakshmi.object_id
}

# -----------------------------------------------------------------------------
# BRANCH MANAGERS
# -----------------------------------------------------------------------------
resource "azuread_user" "branch_arjun" {
  user_principal_name   = "arjun@${local.domain}"
  display_name          = "Arjun"
  job_title             = "Branch Manager Accounts"
  department            = "Accounts"
  mail_nickname         = "arjun"
  password              = "BkBranch#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "branch_arjun_member" {
  group_object_id  = azuread_group.branch_managers.object_id
  member_object_id = azuread_user.branch_arjun.object_id
}

resource "azuread_user" "branch_meera" {
  user_principal_name   = "meera@${local.domain}"
  display_name          = "Meera"
  job_title             = "Branch Manager Payments"
  department            = "Payments"
  mail_nickname         = "meera"
  password              = "BkBranch#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "branch_meera_member" {
  group_object_id  = azuread_group.branch_managers.object_id
  member_object_id = azuread_user.branch_meera.object_id
}

# -----------------------------------------------------------------------------
# SOC ANALYSTS
# -----------------------------------------------------------------------------
resource "azuread_user" "soc_arun" {
  user_principal_name   = "arun@${local.domain}"
  display_name          = "Arun"
  job_title             = "L1 SOC Analyst"
  department            = "Security Operations"
  mail_nickname         = "arun"
  password              = "BkSoc#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "soc_arun_member" {
  group_object_id  = azuread_group.soc_analysts.object_id
  member_object_id = azuread_user.soc_arun.object_id
}

# -----------------------------------------------------------------------------
# DEVOPS ENGINEERS
# -----------------------------------------------------------------------------
resource "azuread_user" "devops_shreya" {
  user_principal_name   = "shreya@${local.domain}"
  display_name          = "Shreya"
  job_title             = "DevOps Automation Engineer"
  department            = "IT Operations"
  mail_nickname         = "shreya"
  password              = "BkDevops#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "devops_shreya_member" {
  group_object_id  = azuread_group.devops_engineers.object_id
  member_object_id = azuread_user.devops_shreya.object_id
}
