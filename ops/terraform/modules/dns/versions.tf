# Versions are pinned in the root module (../../versions.tf).
terraform {
  required_providers {
    hostinger = {
      source = "hostinger/hostinger"
    }
  }
}
