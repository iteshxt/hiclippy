# What Nagios (and people) need to know about the live setup. Phase 3 of
# docs/plan-ops.md generates the Nagios host config from these.

output "site_url" {
  description = "Public URL of the frontend."
  value       = module.vercel.site_url
}

output "site_domains" {
  description = "Every domain serving the frontend."
  value       = module.vercel.domains
}

output "api_url" {
  description = "Public URL of the API (its /health endpoint is monitored)."
  value       = module.render.url
}

output "api_health_url" {
  description = "URL Nagios checks for API health."
  value       = "${module.render.url}/health"
}

output "dns_records" {
  description = "DNS records managed in Hostinger."
  value       = module.dns.records
}

output "database_cluster_state" {
  description = "Atlas cluster state; IDLE means healthy."
  value       = module.atlas.cluster_state
}
