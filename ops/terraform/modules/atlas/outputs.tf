output "project_id" {
  description = "Atlas project ID."
  value       = mongodbatlas_project.this.id
}

output "cluster_state" {
  description = "Cluster state, e.g. IDLE when healthy."
  value       = mongodbatlas_advanced_cluster.this.state_name
}

output "mongodb_version" {
  description = "Exact MongoDB version the cluster runs."
  value       = mongodbatlas_advanced_cluster.this.mongo_db_version
}
