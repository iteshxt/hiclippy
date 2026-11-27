variable "team_id" {
  description = "Vercel team that owns the project."
  type        = string
}

variable "project_name" {
  description = "Vercel project name."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in owner/name form."
  type        = string
}

variable "production_branch" {
  description = "Branch whose pushes deploy to production."
  type        = string
  default     = "main"
}

variable "node_version" {
  description = "Node.js major version used for builds, e.g. 26.x."
  type        = string
}

variable "primary_domain" {
  description = "The domain the site is served on."
  type        = string
}

variable "apex_domain" {
  description = "The bare domain, which redirects to primary_domain."
  type        = string
}

variable "api_url" {
  description = "Base URL of the API, exposed to the frontend as VITE_API_URL."
  type        = string
}
