output "project_id" {
  description = "Vercel project ID."
  value       = vercel_project.this.id
}

output "site_url" {
  description = "Public URL of the site."
  value       = "https://${vercel_project_domain.www.domain}"
}

output "domains" {
  description = "Every domain attached to the project."
  value       = [vercel_project_domain.www.domain, vercel_project_domain.apex.domain]
}
