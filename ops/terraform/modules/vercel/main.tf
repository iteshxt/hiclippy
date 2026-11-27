# The HiClippy frontend: a Vite app built from frontend/ on every push to main.

resource "vercel_project" "this" {
  name           = var.project_name
  team_id        = var.team_id
  framework      = "vite"
  root_directory = "frontend"
  node_version   = var.node_version

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }

  # Settings as they are today, recorded so drift shows up in `plan`.
  auto_assign_custom_domains                        = true
  automatically_expose_system_environment_variables = true
  build_machine_type                                = "basic"
  customer_success_code_visibility                  = false
  directory_listing                                 = false
  enable_affected_projects_deployments              = true
  function_failover                                 = false
  git_fork_protection                               = true
  git_lfs                                           = false
  manage_deployment_protection                      = true
  manage_passport                                   = true
  on_demand_concurrent_builds                       = false
  preview_deployments_disabled                      = false
  prioritise_production_builds                      = true
  protected_sourcemaps                              = true

  git_comments = {
    on_commit       = false
    on_pull_request = true
  }

  oidc_token_config = {
    issuer_mode = "team"
  }

  passport = {
    enabled = false
  }

  resource_config = {
    fluid                    = true
    function_default_regions = ["iad1"]
  }

  # Preview deployments need a Vercel login; the custom domains are public.
  vercel_authentication = {
    deployment_type = "standard_protection_new"
  }

  lifecycle {
    # Destroying this resource deletes the project and takes the site down.
    prevent_destroy = true
  }
}

resource "vercel_project_domain" "www" {
  team_id    = var.team_id
  project_id = vercel_project.this.id
  domain     = var.primary_domain
}

# The bare domain permanently redirects (308) to www.
resource "vercel_project_domain" "apex" {
  team_id              = var.team_id
  project_id           = vercel_project.this.id
  domain               = var.apex_domain
  redirect             = vercel_project_domain.www.domain
  redirect_status_code = 308
}

# Where the frontend sends API calls. Not secret: it is visible in the
# built JavaScript.
resource "vercel_project_environment_variable" "api_url" {
  team_id    = var.team_id
  project_id = vercel_project.this.id
  key        = "VITE_API_URL"
  value      = var.api_url
  target     = ["preview", "production"]
  sensitive  = false
  visibility = "config"
}
