
resource "azuread_user" "ceo_hector" {
  user_principal_name   = "hector@${local.domain}"
  display_name          = "Hector Salamanca"
  job_title             = "Chief Executive Officer"
  department            = "Executive Leadership"
  mail_nickname         = "hector"
  password              = "BkExec#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "ceo_hector_member" {
  group_object_id  = azuread_group.executives.object_id
  member_object_id = azuread_user.ceo_hector.object_id
}

resource "azuread_user" "cfo_lalo" {
  user_principal_name   = "lalo@${local.domain}"
  display_name          = "Lalo Salamanca"
  job_title             = "Chief Financial Officer"
  department            = "Executive Leadership"
  mail_nickname         = "lalo"
  password              = "BkExec#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "cfo_lalo_member" {
  group_object_id  = azuread_group.executives.object_id
  member_object_id = azuread_user.cfo_lalo.object_id
}

resource "azuread_user" "regional_tuco" {
  user_principal_name   = "tuco@${local.domain}"
  display_name          = "Tuco Salamanca"
  job_title             = "Regional Director East Asia"
  department            = "Regional Management"
  mail_nickname         = "tuco"
  password              = "BkRegion#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "regional_tuco_member" {
  group_object_id  = azuread_group.regional_auth.object_id
  member_object_id = azuread_user.regional_tuco.object_id
}

resource "azuread_user" "dept_todd" {
  user_principal_name   = "todd@${local.domain}"
  display_name          = "Todd Alquist"
  job_title             = "Head of Core Banking"
  department            = "Core Banking"
  mail_nickname         = "todd"
  password              = "BkDept#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "dept_todd_member" {
  group_object_id  = azuread_group.dept_heads.object_id
  member_object_id = azuread_user.dept_todd.object_id
}

resource "azuread_user" "dept_lydia" {
  user_principal_name   = "lydia@${local.domain}"
  display_name          = "Lydia Rodarte-Quayle"
  job_title             = "Head of Risk Management"
  department            = "Risk"
  mail_nickname         = "lydia"
  password              = "BkDept#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "dept_lydia_member" {
  group_object_id  = azuread_group.dept_heads.object_id
  member_object_id = azuread_user.dept_lydia.object_id
}

resource "azuread_user" "branch_skinny_pete" {
  user_principal_name   = "skinnypete@${local.domain}"
  display_name          = "Skinny Pete"
  job_title             = "Branch Manager Accounts"
  department            = "Accounts"
  mail_nickname         = "skinnypete"
  password              = "BkBranch#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "branch_skinny_pete_member" {
  group_object_id  = azuread_group.branch_managers.object_id
  member_object_id = azuread_user.branch_skinny_pete.object_id
}

resource "azuread_user" "branch_badger" {
  user_principal_name   = "badger@${local.domain}"
  display_name          = "Badger"
  job_title             = "Branch Manager Payments"
  department            = "Payments"
  mail_nickname         = "badger"
  password              = "BkBranch#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "branch_badger_member" {
  group_object_id  = azuread_group.branch_managers.object_id
  member_object_id = azuread_user.branch_badger.object_id
}

resource "azuread_user" "soc_huell" {
  user_principal_name   = "huell@${local.domain}"
  display_name          = "Huell Babineaux"
  job_title             = "L1 SOC Analyst"
  department            = "Security Operations"
  mail_nickname         = "huell"
  password              = "BkSoc#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "soc_huell_member" {
  group_object_id  = azuread_group.soc_analysts.object_id
  member_object_id = azuread_user.soc_huell.object_id
}

resource "azuread_user" "devops_gomez" {
  user_principal_name   = "gomez@${local.domain}"
  display_name          = "Steven Gomez"
  job_title             = "DevOps Automation Engineer"
  department            = "IT Operations"
  mail_nickname         = "gomez"
  password              = "BkDevops#Secure@2024"
  force_password_change = true
}

resource "azuread_group_member" "devops_gomez_member" {
  group_object_id  = azuread_group.devops_engineers.object_id
  member_object_id = azuread_user.devops_gomez.object_id
}
