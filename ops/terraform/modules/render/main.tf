# The HiClippy API: backend/ built from its Dockerfile on Render's free plan.

resource "render_web_service" "this" {
  name           = var.service_name
  plan           = var.plan
  region         = var.region
  root_directory = "backend"

  runtime_source = {
    docker = {
      repo_url            = var.repo_url
      branch              = var.branch
      context             = "."
      dockerfile_path     = "./Dockerfile"
      auto_deploy         = true
      auto_deploy_trigger = "commit"
    }
  }

  maintenance_mode = {
    enabled = false
  }

  notification_override = {
    notifications_to_send         = "default"
    preview_notifications_enabled = "default"
  }

  previews = {
    generation = "off"
  }

  lifecycle {
    # Environment variables (MONGO_URI and the limits) stay managed in the
    # Render dashboard. Render never returns their values, so Terraform
    # can't compare them, and letting it write them could wipe the
    # database URI. This keeps every secret out of Terraform entirely.
    ignore_changes = [env_vars]

    # Destroying this resource deletes the API service.
    prevent_destroy = true
  }
}
