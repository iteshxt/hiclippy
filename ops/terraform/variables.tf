# ── Credentials (sensitive, no defaults) ────────────────────────────

variable "vercel_api_token" {
  description = "Vercel access token with access to the itesh-stuff team."
  type        = string
  sensitive   = true
}

variable "render_api_key" {
  description = "Render API key (Account settings > API keys)."
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "Render owner (user or team) ID that owns the API service, e.g. usr-... or tea-..."
  type        = string
}

variable "atlas_client_id" {
  description = "MongoDB Atlas service account client ID. Use this pair or the API key pair."
  type        = string
  default     = null
  sensitive   = true
}

variable "atlas_client_secret" {
  description = "MongoDB Atlas service account client secret."
  type        = string
  default     = null
  sensitive   = true
}

variable "atlas_public_key" {
  description = "MongoDB Atlas programmatic API public key. Use this pair or the service account."
  type        = string
  default     = null
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas programmatic API private key."
  type        = string
  default     = null
  sensitive   = true
}

variable "hostinger_api_token" {
  description = "Hostinger API token (hPanel > Account > API)."
  type        = string
  sensitive   = true
}

# ── IDs of what already exists (not secret) ─────────────────────────

variable "vercel_team_id" {
  description = "Vercel team that owns the project."
  type        = string
  default     = "team_71hOPKLrF2Gc7052QhN2nGTC" # itesh-stuff
}

variable "vercel_project_id" {
  description = "Vercel project for the frontend."
  type        = string
  default     = "prj_Ac8gAi8ZZ7mcyIQETr3HlFxpBDY6" # clippy
}

variable "vercel_api_url_env_id" {
  description = "ID of the VITE_API_URL environment variable on the Vercel project. Find it with `vercel env ls` or the Vercel API (GET /v10/projects/{id}/env)."
  type        = string
}

variable "render_service_id" {
  description = "Render web service ID for the API (clippy-api.onrender.com), e.g. srv-... (shown in the service URL in the Render dashboard)."
  type        = string
}

variable "atlas_project_id" {
  description = "MongoDB Atlas project ID (Project settings)."
  type        = string
  default     = "69ce20b39f80fc9a8d322ef3" # project "clippy"
}

variable "atlas_cluster_name" {
  description = "Name of the Atlas cluster the API uses, as shown on the Atlas Clusters page."
  type        = string
  default     = "clippy" # free M0 tier, AWS, 1 region
}

variable "atlas_access_list_entry" {
  description = "The IP access list entry to import. Render's free tier has no fixed outbound IPs, so this is probably 0.0.0.0/0."
  type        = string
  default     = "0.0.0.0/0"
}

variable "dns_zone" {
  description = "Domain managed in Hostinger DNS."
  type        = string
  default     = "hiclippy.online"
}
