# Phase 3 of docs/plan-ops.md: the infrastructure drives the monitoring.
#
# Terraform renders ops/nagios/etc/hiclippy.cfg from its own values (the
# site and API addresses, the domain's redirect, every DNS record it manages),
# then validates the new config inside the running Nagios container and
# reloads Nagios without downtime. Change a domain or a DNS record here and
# one `terraform apply` updates both the infrastructure and its monitoring.

locals {
  site_host = "www.${var.dns_zone}"
  api_url   = trimsuffix(module.render.url, "/")
  api_host  = replace(local.api_url, "/^https?:///", "")

  # Which DNS records Nagios checks, and under what name. The names are
  # Nagios service names, so keep them stable: Nagios keys check history by
  # them. Records not listed here (the Google verification TXT) aren't checked.
  dns_check_names = {
    apex_a    = "DNS A record to Vercel"
    www_cname = "DNS www CNAME to Vercel"
  }

  dns_checks = [
    for key, description in local.dns_check_names : {
      description = description
      type        = local.dns_records[key].type
      value       = local.dns_records[key].value
      fqdn        = local.dns_records[key].name == "@" ? var.dns_zone : "${local.dns_records[key].name}.${var.dns_zone}"
      # The record is checked on the Nagios host it belongs to.
      host = local.dns_records[key].name == "@" ? var.dns_zone : "${local.dns_records[key].name}.${var.dns_zone}"
    }
  ]
}

resource "local_file" "nagios_config" {
  filename        = "${path.module}/../nagios/etc/hiclippy.cfg"
  file_permission = "0644"
  content = templatefile("${path.module}/templates/nagios-hiclippy.cfg.tftpl", {
    site_host  = local.site_host
    site_url   = "https://${local.site_host}"
    apex_host  = var.dns_zone
    api_url    = local.api_url
    api_host   = local.api_host
    dns_checks = local.dns_checks
  })
}

# Whenever the rendered config changes, validate it in the running container
# (`nagios -v`) and reload Nagios. An invalid config fails the apply and
# Nagios keeps running the previous one. With no container running, this
# only reports that the new config will be used on the next start.
resource "terraform_data" "nagios_reload" {
  count = var.nagios_reload ? 1 : 0

  triggers_replace = sha256(local_file.nagios_config.content)

  provisioner "local-exec" {
    command = "${path.module}/../nagios/reload.sh ${var.nagios_container}"
  }
}
