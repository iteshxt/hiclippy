# DNS for the domain, hosted by Hostinger.
#
# Hostinger replaces a record on ANY change (delete, then create), so
# editing one briefly takes that name offline. Review `plan` output for
# "must be replaced" before applying anything here.

resource "hostinger_dns_record" "this" {
  for_each = var.records

  zone  = var.zone
  name  = each.value.name
  type  = each.value.type
  value = each.value.value
  ttl   = each.value.ttl

  lifecycle {
    prevent_destroy = true
  }
}
