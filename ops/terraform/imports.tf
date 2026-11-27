# Adopt what is already live into Terraform's state, WITHOUT changing it.
#
# `terraform plan` must show "N to import, 0 to add, 0 to change,
# 0 to destroy" before these are applied. Applying them only records the
# resources in state; nothing in production changes. Once imported, these
# blocks can stay: Terraform ignores imports for resources it already has.

# ── Vercel: frontend (project "hiclippy", team temp-stuff) ──────────

import {
  to = module.vercel.vercel_project.this
  identity = {
    project_id = var.vercel_project_id
    team_id    = var.vercel_team_id
  }
}

import {
  to = module.vercel.vercel_project_domain.www
  id = "${var.vercel_team_id}/${var.vercel_project_id}/www.${var.dns_zone}"
}

import {
  to = module.vercel.vercel_project_domain.apex
  id = "${var.vercel_team_id}/${var.vercel_project_id}/${var.dns_zone}"
}

import {
  to = module.vercel.vercel_project_environment_variable.api_url
  id = "${var.vercel_team_id}/${var.vercel_project_id}/${var.vercel_api_url_env_id}"
}

# ── Render: API (clippy-api.onrender.com) ───────────────────────────

import {
  to = module.render.render_web_service.this
  id = var.render_service_id
}

# ── MongoDB Atlas: database ─────────────────────────────────────────

import {
  to = module.atlas.mongodbatlas_project.this
  id = var.atlas_project_id
}

import {
  to = module.atlas.mongodbatlas_advanced_cluster.this
  id = "${var.atlas_project_id}-${var.atlas_cluster_name}"
}

import {
  to = module.atlas.mongodbatlas_project_ip_access_list.this
  id = "${var.atlas_project_id}-${var.atlas_access_list_entry}"
}

# ── Hostinger: DNS ──────────────────────────────────────────────────
# Import ID format: zone|name|type|value

import {
  for_each = local.dns_records
  to       = module.dns.hostinger_dns_record.this[each.key]
  id       = "${var.dns_zone}|${each.value.name}|${each.value.type}|${each.value.value}"
}
