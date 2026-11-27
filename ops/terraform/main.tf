# HiClippy's live infrastructure. Each module wraps one service; values
# here are today's real settings (read from the providers on 2026-11-27).

locals {
  github_repo = "iteshxt/hiclippy"

  # Hostinger DNS records, defined once and used by both the module and
  # the import blocks in imports.tf.
  dns_records = {
    apex_a = {
      name  = "@"
      type  = "A"
      value = "216.198.79.1" # Vercel
    }
    www_cname = {
      name  = "www"
      type  = "CNAME"
      value = "24248e9bbfc864fb.vercel-dns-017.com" # Vercel
    }
    google_verification = {
      name  = "@"
      type  = "TXT"
      value = "google-site-verification=eulOeo-EixHrQB5P50CZONpkAw0lUXZEGxRorW0l5s4"
    }
  }
}

module "vercel" {
  source = "./modules/vercel"

  team_id        = var.vercel_team_id
  project_name   = "hiclippy"
  github_repo    = local.github_repo
  node_version   = "26.x"
  primary_domain = "www.${var.dns_zone}"
  apex_domain    = var.dns_zone
  api_url        = var.api_url
}

module "render" {
  source = "./modules/render"

  service_name = "clippy-api"
  region       = "oregon"
  repo_url     = "https://github.com/${local.github_repo}"
}

module "atlas" {
  source = "./modules/atlas"

  org_id           = var.atlas_org_id
  project_name     = "clippy"
  cluster_name     = var.atlas_cluster_name
  region           = "AP_SOUTH_1"
  access_list_cidr = var.atlas_access_list_entry
}

module "dns" {
  source = "./modules/dns"

  zone    = var.dns_zone
  records = local.dns_records
}
