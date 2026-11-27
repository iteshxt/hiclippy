# Phase 1: bring what is already live under Terraform WITHOUT changing it.
#
# These import blocks have no matching resource blocks yet. Generate them
# from the live settings with:
#
#   terraform plan -generate-config-out=generated.tf
#
# Then review generated.tf, move each resource into its module, and repeat
# `terraform plan` until it reports "No changes". Do not run `apply` in
# this phase (see README.md).
#
# IDs that are already known are filled in. The rest come from
# terraform.tfvars (see terraform.tfvars.example).

# ── Vercel: frontend (project "hiclippy", team temp-stuff) ──────────

import {
  to = vercel_project.hiclippy
  identity = {
    project_id = var.vercel_project_id
    team_id    = var.vercel_team_id
  }
}

import {
  to = vercel_project_domain.www
  id = "${var.vercel_team_id}/${var.vercel_project_id}/www.hiclippy.online"
}

import {
  to = vercel_project_domain.apex
  id = "${var.vercel_team_id}/${var.vercel_project_id}/hiclippy.online"
}

import {
  to = vercel_project_environment_variable.api_url
  id = "${var.vercel_team_id}/${var.vercel_project_id}/${var.vercel_api_url_env_id}"
}

# ── Render: API (clippy-api.onrender.com) ───────────────────────────

import {
  to = render_web_service.api
  id = var.render_service_id
}

# ── MongoDB Atlas: database ─────────────────────────────────────────

import {
  to = mongodbatlas_project.clippy
  id = var.atlas_project_id
}

# A free M0 cluster imports as an advanced cluster. If the cluster is a
# Flex cluster instead, change the target to mongodbatlas_flex_cluster.clippy
# (same ID format).
import {
  to = mongodbatlas_advanced_cluster.clippy
  id = "${var.atlas_project_id}-${var.atlas_cluster_name}"
}

import {
  to = mongodbatlas_project_ip_access_list.render
  id = "${var.atlas_project_id}-${var.atlas_access_list_entry}"
}

# ── Hostinger: DNS for hiclippy.online ──────────────────────────────
# Values read from public DNS on 2026-11-26. Hostinger replaces a record
# on any change (delete, then create), so a careless apply here takes the
# site offline. Import only; never apply DNS edits without a plan review.

import {
  to = hostinger_dns_record.apex_a
  id = "${var.dns_zone}|@|A|216.198.79.1"
}

import {
  to = hostinger_dns_record.www_cname
  id = "${var.dns_zone}|www|CNAME|24248e9bbfc864fb.vercel-dns-017.com"
}

import {
  to = hostinger_dns_record.google_verification
  id = "${var.dns_zone}|@|TXT|google-site-verification=eulOeo-EixHrQB5P50CZONpkAw0lUXZEGxRorW0l5s4"
}
