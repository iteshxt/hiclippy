output "records" {
  description = "Managed records as fully qualified name, type and value."
  value = {
    for key, r in hostinger_dns_record.this :
    key => {
      fqdn  = r.name == "@" ? var.zone : "${r.name}.${var.zone}"
      type  = r.type
      value = r.value
    }
  }
}
