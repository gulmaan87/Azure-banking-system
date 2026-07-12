
output "subnet_ids" {
  description = "Map of subnet name → subnet resource ID."
  value = {
    for k, subnet in azurerm_subnet.this :
    k => subnet.id
  }
}
