# Credentials come from variables marked sensitive. Set them through
# TF_VAR_* environment variables or a gitignored terraform.tfvars file
# (see terraform.tfvars.example). Never put a real token in a .tf file:
# this repository is public.

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id

  # Importing must never trigger a redeploy of the live API.
  skip_deploy_after_service_update = true
}

provider "mongodbatlas" {
  # Atlas service account (recommended by MongoDB) ...
  client_id     = var.atlas_client_id
  client_secret = var.atlas_client_secret

  # ... or a programmatic API key pair. Leave the other pair unset (null).
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}

provider "hostinger" {
  api_token = var.hostinger_api_token
}
