variable "service_name" {
  description = "Render service name (also the onrender.com subdomain)."
  type        = string
}

variable "plan" {
  description = "Render instance plan. The free plan sleeps after 15 minutes idle."
  type        = string
  default     = "free"
}

variable "region" {
  description = "Render region."
  type        = string
}

variable "repo_url" {
  description = "GitHub repository Render builds from."
  type        = string
}

variable "branch" {
  description = "Branch whose commits trigger a deploy."
  type        = string
  default     = "main"
}
