output "service_id" {
  description = "Render service ID (srv-...)."
  value       = render_web_service.this.id
}

output "url" {
  description = "Public URL of the API."
  value       = render_web_service.this.url
}
